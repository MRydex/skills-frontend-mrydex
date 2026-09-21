## 4. Datos asíncronos — Resource API (`httpResource` / `rxResource` / `resource`)

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
| Lógica custom de fetch (no HTTP, ej. IndexedDB) | `resource()` (`loader` async)         |
| **POST / PUT / DELETE / PATCH (mutaciones)**    | **`HttpClient` directo**, NO resource |

> `httpResource` y `rxResource` usan `HttpClient` por debajo ⇒ **heredan automáticamente los
> interceptores** (spinner, errores, auth). Esto es clave: el spinner y el manejo global de errores
> de §5 cubren a los resources **sin** cablear nada por recurso.

### 4.2 Estados del resource

| Miembro          | Tipo              | Para qué                                                                    |
|------------------|-------------------|-----------------------------------------------------------------------------|
| `isLoading()`    | `Signal<boolean>` | Hay una petición en vuelo.                                                  |
| `error()`        | `Signal<unknown>` | Error de la última carga (o `undefined`).                                   |
| `value()`        | `Signal<T>`       | El valor. **Lanza** si el resource está en error → leer tras `hasValue()`.  |
| `hasValue()`     | `Signal<boolean>` | Guarda segura antes de `value()`.                                           |
| `status()`       | `Signal<...>`     | `'idle' \| 'loading' \| 'reloading' \| 'resolved' \| 'error' \| 'local'`.   |
| `snapshot()`     | `Signal<...>`     | Estado completo (status + value) como objeto, para composición (§4.10).      |
| `reload()`       | `() => void`      | Re-ejecuta el loader manualmente (ej. tras una mutación).                    |

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
|----------------------------------------------------|------------------------------------------------------------------|
| `switchMap` para cancelar                          | Cancelación automática del request anterior al cambiar el signal |
| `isLoading`, `errorMsg` manuales                   | `isLoading()`, `error()`, `value()`, `hasValue()`, `status()`    |
| `subscribe` / `unsubscribe` / `takeUntilDestroyed` | El resource se limpia solo al destruirse el contexto             |
| Re-fetch imperativo                                | `resource.reload()`                                              |
| `debounceTime`                                     | `debounced()` (§2.5)                                             |

> **Nota de refactor**: migrar un servicio grande que hoy mezcla filtros + mensajes + spinner +
> estado imperativo es un cambio mayor; no hace falta hacerlo para arreglar un bug puntual. Para
> modernizar el flujo entero, `rxResource` + interceptores (§5) es el camino.

### 4.9 Reglas de oro de Resource

- **Leer `value()` siempre detrás de `hasValue()`** (o del bloque `@else if (hasValue())`):
  `value()` **lanza** si el resource está en error. Con `defaultValue` el riesgo baja, pero la guarda
  sigue siendo la regla.
- **No usar resources para mutaciones.** POST/PUT/DELETE van por `HttpClient`; después se recarga con
  `.reload()` o se ajusta el signal de `params`.
- **No derivar estado con `effect`**: mapear/filtrar el `value()` va en un `computed` (§4.6).
- Validar el shape con `parse:` (Zod / Valibot) cuando corresponda:
  ```ts
  readonly user = httpResource<User>(
    () => `${environment.API_URL}users/${this.userId()}`,
    { parse: userSchema.parse },
  );
  ```
- En SSR, los resources precargados en el servidor se integran con el **HTTP Transfer State**: no se
  repite la petición en el primer render del navegador.

### 4.10 Composición de resources: `snapshot` + `resourceFromSnapshots`

Para **derivar un resource de otro** (filtrar, transformar, o conservar el valor anterior mientras
recarga) sin tocar la lógica de carga original, se usa el `snapshot()` del resource y
`resourceFromSnapshots()`.

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
    computation: (snap, previous) =>
      snap.status === 'loading' && previous?.value?.status === 'resolved'
        ? { ...snap, value: previous.value.value }
        : snap,
  });

  return resourceFromSnapshots(derived);
}
```

---
