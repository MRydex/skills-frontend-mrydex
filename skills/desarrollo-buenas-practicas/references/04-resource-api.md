## 4. Datos asíncronos — Resource API (`httpResource` / `rxResource` / `resource`)

Índice: [4.1](#41-cuándo-usar-cada-uno) Cuándo usar cada uno · [4.2](#42-estados-y-miembros-del-resource) Estados y miembros ·
[4.3](#43-httpresource--get-reactivo-por-url) `httpResource` · [4.4](#44-rxresource--envolviendo-un-observable-del-servicio-params--stream) `rxResource` ·
[4.5](#45-fetch-condicional-undefined--idle) Fetch condicional · [4.6](#46-derivar--mapear-el-value-con-computed) Derivar con `computed` ·
[4.7](#47-en-el-template) En el template · [4.8](#48-migración-desde-subject--switchmap--rxresource) Migración desde `Subject` ·
[4.9](#49-reglas-de-oro-de-resource) Reglas de oro · [4.10](#410-composición-de-resources-snapshot--resourcefromsnapshots) Composición con `snapshot` ·
[4.11](#411-resource--loader-custom-no-http-y-cancelación-con-abortsignal) `resource()` custom y cancelación ·
[4.12](#412-mutaciones-httpclient--reload-update-nunca-resource-para-escribir) Mutaciones · [4.13](#413-debounce-de-params) Debounce de `params`

La **Resource API es estable desde Angular 22** (`resource`, `rxResource`, `httpResource`). Es la
**única** forma admitida de incorporar lecturas asíncronas al modelo de signals: un resource toma un
**signal de entrada (params)**, ejecuta un **loader** cuando ese signal cambia, **cancela
automáticamente** la petición anterior en vuelo (mismo efecto que `switchMap`, pero sin streams a
mano) y expone el resultado como signals de estado.

### 4.1 Cuándo usar cada uno

| Caso                                            | API recomendada                       |
|-------------------------------------------------|---------------------------------------|
| GET reactivo simple (por URL)                   | `httpResource()`                      |
| GET con method/headers/body/params reactivos    | `httpResource()` en forma de objeto   |
| Tu servicio ya devuelve un `Observable`         | `rxResource()` (`params` + `stream`)  |
| Lógica custom de fetch (no HTTP, ej. IndexedDB) | `resource()` (`loader` async, §4.11)  |
| **POST / PUT / DELETE / PATCH (mutaciones)**    | **`HttpClient` directo**, NO resource (§4.12) |

> `httpResource` y `rxResource` usan `HttpClient` por debajo ⇒ **heredan automáticamente los
> interceptores** (spinner, errores, auth). Esto es clave: el spinner y el manejo global de errores
> de [05-http-interceptors.md](./05-http-interceptors.md) cubren a los resources **sin** cablear nada por recurso.

### 4.2 Estados y miembros del resource

| Miembro          | Tipo                          | Para qué                                                                    |
|------------------|--------------------------------|-----------------------------------------------------------------------------|
| `isLoading()`    | `Signal<boolean>`              | Hay una petición en vuelo (`loading` o `reloading`).                        |
| `error()`        | `Signal<Error \| undefined>`   | Error de la última carga. En `httpResource` suele ser un `HttpErrorResponse` (subclase de `Error`); en `resource`/`rxResource` es lo que lance el `loader`/`stream`. |
| `value()`        | `Signal<T>`                    | El valor. **Lanza** si el resource está en error → leer tras `hasValue()`.  |
| `hasValue()`     | `Signal<boolean>`              | Guarda segura antes de `value()`. También actúa como *type guard* (`this is ResourceRef<Exclude<T, undefined>>`). |
| `status()`       | `Signal<ResourceStatus>`       | `'idle' \| 'loading' \| 'reloading' \| 'resolved' \| 'error' \| 'local'`.   |
| `snapshot()`     | `Signal<ResourceSnapshot<T>>`  | Estado completo (status + value/error) como objeto, para composición (§4.10). |
| `reload()`       | `() => boolean`                | Re-ejecuta el loader manualmente. Devuelve `false` si no había una request válida para recargar (p. ej. el resource está `idle`). |
| `set(valor)`     | `(value: T) => void`           | Fija el valor **localmente**, sin pasar por el loader. El resource pasa a `status() === 'local'`. |
| `update(fn)`     | `(updater: (value: T) => T) => void` | Igual que `set`, pero a partir del valor anterior (update optimista tras una mutación, §4.12). |

`defaultValue` evita que el componente vea `undefined` al arranque:

```ts
readonly flights = httpResource<Flight[]>(() => `${environment.API_URL}flight`, { defaultValue: [] });
```

### 4.3 `httpResource` — GET reactivo por URL

```ts
export class UserDetail {
  readonly userId = input.required<number>();

  // Reactivo: cuando userId() cambia, se re-fetchea y se cancela el request anterior.
  protected readonly user = httpResource<User>(() => `${environment.API_URL}users/${this.userId()}`);
}
```

Forma **objeto** (método, headers, body o params reactivos):

```ts
protected readonly results = httpResource<Result[]>(() => ({
  url: `${environment.API_URL}search`,
  method: 'POST',
  body: { query: this.query(), page: this.page() },
}));
```

**Parseo de la respuesta.** Por defecto `httpResource` parsea la respuesta como **JSON**. Para otros
formatos existen las variantes `httpResource.text()`, `httpResource.blob()` y
`httpResource.arrayBuffer()`, con la misma firma (`url`/`request`, `options`):

```ts
protected readonly reporteCsv = httpResource.text(() => `${environment.API_URL}reportes/export`);
protected readonly avatar = httpResource.blob(() => `${environment.API_URL}usuarios/${this.userId()}/foto`);
```

**Opciones (`HttpResourceOptions`)**:

| Opción        | Para qué                                                                              |
|---------------|-----------------------------------------------------------------------------------------|
| `parse`       | Transforma/valida el `raw` antes de exponerlo (Zod/Valibot, o mapear DTO→modelo).        |
| `defaultValue`| Valor mientras está `idle`/`loading`, en vez de `undefined`.                             |
| `equal`       | Función de igualdad custom: evita recomputar `computed()`/re-renderizar si el nuevo valor es "igual" al anterior (útil con arrays/objetos grandes). |
| `injector`    | Injector explícito si el resource se crea fuera de un contexto de inyección.             |
| `debugName`   | Nombre visible en Angular DevTools.                                                       |

```ts
readonly user = httpResource<User>(
  () => `${environment.API_URL}users/${this.userId()}`,
  { parse: userSchema.parse },
);
```

### 4.4 `rxResource` — envolviendo un `Observable` del servicio (`params` + `stream`)

Cuando el servicio ya devuelve un `Observable` (lo normal con `HttpClient`), `rxResource` es lo que
mejor calza: `params` declara **qué se observa** y `stream` produce el Observable. Cambia el params →
cancela el request anterior y dispara uno nuevo. **Reemplaza al patrón `Subject` + `switchMap` +
`subscribe`/`unsubscribe`.**

```ts
@Service()
export class HomeService {
  private readonly _http = inject(HttpClient);
  private readonly _GET_JUICIOS = `${environment.API_URL}juicios`;

  // Entrada reactiva: la "bandeja" / filtro seleccionado.
  private readonly _dato = signal<string | undefined>(undefined);

  readonly juiciosResource = rxResource({
    params: () => ({ dato: 0 }),
    stream: ({ params }) =>
      this._http
        .get<ApiResponse<Juicio[]>>(`${this._GET_JUICIOS}/${params.dato}`)
        .pipe(map((res) => res.data ?? [])),
  });

  // Fetch CONDICIONAL: si no hay dato, params devuelve undefined ⇒ el loader NO corre (idle).
  readonly juiciosResourceBusqueda = rxResource({
    params: () => {
      const dato = this._dato();
      return dato ? { dato } : undefined;      // undefined => idle
    },
    stream: ({ params }) =>
      this._http
        .get<ApiResponse<Juicio[]>>(`${this._GET_JUICIOS}/${params.dato}`)
        .pipe(map((res) => res.data ?? [])),
  });

  buscar(dato: string): void { this._dato.set(dato); }
}
```

> **Error frecuente**: olvidarse de **invocar** el signal dentro de `params` (escribir
> `this._dato` en vez de `this._dato()`). Sin la invocación no hay dependencia reactiva y el resource
> nunca se vuelve a disparar.

> El `Observable` de `stream` **debe** emitir al menos un valor o un error antes de completar. Si
> completa sin emitir nada (p. ej. `catchError(() => EMPTY)`), Angular lanza `NG0991`
> (`RESOURCE_COMPLETED_BEFORE_PRODUCING_VALUE`): no tiene qué mostrar. Dejá que el error se propague
> (`catchError(() => throwError(() => err))`) y manejalo con `error()` o con el interceptor de errores.

> **SSR**: `rxResource`/`resource` aceptan un `id` (string) para cachear el resultado en el
> `TransferState` y no repetir la petición al hidratar en el navegador. Debe ser el mismo valor en
> servidor y cliente (p. ej. derivado del `userId`, no un `Math.random()`).

### 4.5 Fetch condicional: `undefined` ⇒ `idle`

Si el `params` (o el callback de `httpResource`) devuelve `undefined`, el loader **no corre** y el
resource queda en `idle`. Es el patrón estándar para "no pedir hasta que haya un valor válido".

```ts
readonly etapasEstados = httpResource<ApiResponse<EtapasEstados[]>>(() => {
  const perfilId = this.mainSidebarService.perfilSeleccionado().id;
  if (perfilId === 0) return undefined;        // sin perfil ⇒ idle (no pega)
  return `${environment.API_URL}Juicios/GetEtapasEstados/${perfilId}`;
});
```

### 4.6 Derivar / mapear el `value()` con `computed`

Para transformar la respuesta (mapear DTO→modelo, filtrar, ordenar) se usa un `computed` que lee
`value()` con `?.` y un fallback. **Nunca un `effect`.**

```ts
// ✅ BIEN — mapeo derivado del resource (una sola fuente de verdad)
readonly juicios = computed<JuicioVm[]>(
  () => this._homeService.juiciosResource.value()?.map((elem) => this._mapJuicio(elem)) ?? []
);
```

### 4.7 En el template

```html
@if (user.isLoading()) {
  <app-spinner />
} @else if (user.error()) {
  <p class="error">No se pudo cargar el usuario.</p>
} @else if (user.hasValue()) {
  <app-user-card [user]="user.value()" />
}
```

Sobre un `value()` ya mapeado con `computed` (§4.6) se itera directo:

```html
@for (j of juicios(); track j.id) {
  <app-card [data]="j" />
} @empty {
  <p>Sin resultados.</p>
}
```

### 4.8 Migración desde `Subject` + `switchMap` → `rxResource`

| Lo que hacías a mano                               | Lo que te da `rxResource` gratis                                 |
|----------------------------------------------------|--------------------------------------------------------------------|
| `switchMap` para cancelar                          | Cancelación automática del request anterior al cambiar el signal |
| `isLoading`, `errorMsg` manuales                   | `isLoading()`, `error()`, `value()`, `hasValue()`, `status()`    |
| `subscribe` / `unsubscribe` / `takeUntilDestroyed` | El resource se limpia solo al destruirse el contexto             |
| Re-fetch imperativo                                | `resource.reload()`                                               |
| `debounceTime`                                     | Debounce del signal de entrada (§4.13)                             |

> **Nota de refactor**: migrar un servicio grande que hoy mezcla filtros + mensajes + spinner +
> estado imperativo es un cambio mayor; no hace falta hacerlo para arreglar un bug puntual. Para
> modernizar el flujo entero, `rxResource` + interceptores ([05-http-interceptors.md](./05-http-interceptors.md)) es el camino.

### 4.9 Reglas de oro de Resource

- **Leer `value()` siempre detrás de `hasValue()`** (o del bloque `@else if (hasValue())`):
  `value()` **lanza** si el resource está en error. Con `defaultValue` el riesgo baja, pero la guarda
  sigue siendo la regla.
- **No usar resources para mutaciones.** POST/PUT/DELETE van por `HttpClient`; después se recarga con
  `.reload()` o se ajusta el signal de `params` (ver §4.12 para el patrón completo).
- **No derivar estado con `effect`**: mapear/filtrar el `value()` va en un `computed` (§4.6).
- **La cancelación es automática**: al cambiar `params`/la URL, el resource cancela la petición en
  vuelo (vía `AbortSignal` internamente) antes de lanzar la siguiente. No hace falta `switchMap` ni
  banderas manuales (§4.11 muestra cómo aprovechar ese `AbortSignal` en un `resource()` custom).
- Validar el shape con `parse:` (Zod / Valibot) cuando corresponda (§4.3).
- En SSR, los resources precargados en el servidor se integran con el **HTTP Transfer State**: no se
  repite la petición en el primer render del navegador (usar `id` en `rxResource`/`resource`, §4.4).

### 4.10 Composición de resources: `snapshot` + `resourceFromSnapshots`

Para **derivar un resource de otro** (filtrar, transformar, o conservar el valor anterior mientras
recarga) sin tocar la lógica de carga original, se usa el `snapshot()` del resource y
`resourceFromSnapshots()`. `ResourceSnapshot<T>` es una unión discriminada por `status`:

```ts
type ResourceSnapshot<T> =
  | { readonly status: 'idle'; readonly value: T }
  | { readonly status: 'loading' | 'reloading'; readonly value: T }
  | { readonly status: 'resolved' | 'local'; readonly value: T }
  | { readonly status: 'error'; readonly error: Error };
```

> Solo la rama `'error'` tiene `error`; el resto tiene `value` (en `loading`/`reloading` es el valor
> anterior, si lo hay). Por eso el código de composición siempre chequea `status` antes de leer.

```ts
// Filtrar el resultado de un resource sin duplicar la carga
export function withMinWeight(
  input: Resource<Luggage[]>,
  minWeight: Signal<number>,
): Resource<Luggage[]> {
  const derived = linkedSignal<
    { snap: ResourceSnapshot<Luggage[]>; min: number },
    ResourceSnapshot<Luggage[]>
  >({
    source: () => ({ snap: input.snapshot(), min: minWeight() }),
    computation: ({ snap, min }) =>
      snap.status === 'resolved'
        ? { ...snap, value: snap.value.filter((item) => item.weight >= min) }
        : snap,
  });

  return resourceFromSnapshots(derived);
}

// Mantener el último valor cargado mientras recarga (en vez de mostrar undefined)
export function withPreviousValue<T>(input: Resource<T>): Resource<T> {
  const derived = linkedSignal<ResourceSnapshot<T>, ResourceSnapshot<T>>({
    source: input.snapshot,
    computation: (snap, previous) => {
      // `previous` es { source, value } del linkedSignal: previous.value es el ResourceSnapshot anterior.
      if (snap.status === 'loading' && previous && previous.value.status !== 'error') {
        return { status: 'loading' as const, value: previous.value.value };
      }
      return snap;
    },
  });

  return resourceFromSnapshots(derived);
}
```

```ts
@Component({ /* ... */ })
export class AwesomeProfile {
  userId = input.required<number>();
  user = withPreviousValue(httpResource(() => `/user/${this.userId()}`));
  // Al cambiar userId, user.value() conserva el usuario anterior hasta que llega el nuevo.
}
```

### 4.11 `resource()` — loader custom (no HTTP) y cancelación con `AbortSignal`

`resource()` es la base de `httpResource`/`rxResource`: se usa cuando la fuente de datos no es HTTP
(IndexedDB, un SDK propio, `localStorage` asíncrono, etc.). Su `loader` recibe `{ params, previous,
abortSignal }`:

```ts
const userId: Signal<string> = getUserId();

const userResource = resource({
  params: () => ({ id: userId() }),
  loader: ({ params, abortSignal }): Promise<User> => {
    // `fetch` cancela la petición HTTP en curso cuando `abortSignal` se dispara
    // (el resource lo dispara solo al cambiar `params` o destruirse).
    return fetch(`users/${params.id}`, { signal: abortSignal }).then((r) => r.json());
  },
});
```

Si la fuente async **no** es de una sola vez (WebSocket, Server-Sent Events, `onSnapshot` de
Firestore), se usa `stream` en vez de `loader`: `stream` devuelve un signal que puede seguir
actualizándose, en lugar de resolver una sola vez.

### 4.12 Mutaciones: `HttpClient` + `reload()`/`update()` (nunca resource para escribir)

Las mutaciones se hacen con `HttpClient` directo en el servicio (ver
[02-typescript-signals.md](./02-typescript-signals.md) para el patrón de suscripción única). Después
de que la mutación resuelve, hay dos formas de reflejarla en la UI:

```ts
@Service()
export class UsuariosService {
  private readonly _http = inject(HttpClient);
  private readonly _BASE = `${environment.API_URL}usuarios`;

  readonly usuarios = httpResource<Usuario[]>(() => this._BASE, { defaultValue: [] });

  // Opción A — recarga simple: vuelve a pegarle al backend, fuente de verdad = servidor.
  async eliminar(id: number): Promise<void> {
    await firstValueFrom(this._http.delete<void>(`${this._BASE}/${id}`));
    this.usuarios.reload();
  }

  // Opción B — update optimista: sin ida y vuelta extra al servidor.
  // El resource pasa a status() === 'local' hasta el próximo reload/cambio de params.
  async renombrar(id: number, nombre: string): Promise<void> {
    const actualizado = await firstValueFrom(
      this._http.patch<Usuario>(`${this._BASE}/${id}`, { nombre }),
    );
    this.usuarios.update((lista) => lista.map((u) => (u.id === id ? actualizado : u)));
  }
}
```

Usar **update optimista** solo cuando el backend devuelve el recurso actualizado (o se puede derivar
sin ambigüedad); ante la duda, `reload()` es más simple y menos propenso a desincronizarse.

### 4.13 Debounce de `params`

El resource **no** debouncea por sí mismo: si `params` cambia en cada tecla, el loader corre en cada
tecla (se cancela el anterior, pero igual sale un request por letra). El debounce se aplica **al
signal de entrada**, antes de que llegue a `params`, con `debounced()` de `@angular/core` (experimental en v22; devuelve un `Resource`, leer con `.value()`; ver
[02-typescript-signals.md](./02-typescript-signals.md) §2.5):

```ts
protected readonly termino = signal('');
protected readonly terminoDebounced = debounced(this.termino, 300);

protected readonly resultados = httpResource<Resultado[]>(() => {
  const t = this.terminoDebounced.value();
  return t ? `${environment.API_URL}buscar?q=${encodeURIComponent(t)}` : undefined;
});
```

No mezclar el debounce con lógica de carga dentro del `loader`/callback de `httpResource`: el resource
debe reaccionar a un signal ya estable, no decidir cuándo dispararse.

---
