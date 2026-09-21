## 2. TypeScript — Convenciones

### 2.1 Strict typing

- `strict: true`, `noImplicitAny: true`, `strictTemplates: true` siempre activos.
- Preferir **inferencia** cuando el tipo es obvio (no anotar `: string` si la asignación lo dice).
- **Nunca usar `any`**. Si el tipo es incierto, usar `unknown` y angostar con type guards.
- Toda variable que **no** se puede inferir lleva tipo explícito.
- Los genéricos de signals/resources se declaran siempre: `signal<number>(0)`, `httpResource<User[]>`.

```ts
// ❌ MAL
filterSelectIsOpen = false;
let data: any;

// ✅ BIEN
filterSelectIsOpen: boolean = false;  // si la inferencia es ambigua o expresiva
let data: unknown;                    // tipo incierto
```

### 2.2 Componentes — reglas generales

- **Standalone siempre**. **No usar NgModules**. **No declarar `standalone: true`** (default v19+).
- **No declarar `changeDetection: ChangeDetectionStrategy.OnPush`**: es el **default desde v22**.
  Solo se declara `ChangeDetectionStrategy.Eager` en componentes legacy que todavía dependen del
  chequeo completo del árbol, y con un comentario que lo justifique.
- `input()` / `input.required()` / `model()` / `output()` en lugar de `@Input` / `@Output`.
- **Marcar `readonly`** todas las propiedades que inicializa Angular: `input()`, `model()`,
  `output()`, `viewChild()`, `contentChild()`.
- **Marcar `protected`** los miembros que solo consume el template (no son API pública del
  componente).
- **Nunca** `@HostBinding` ni `@HostListener` → usar la propiedad `host: {}` en `@Component` /
  `@Directive`.
- Usar `NgOptimizedImage` para todas las imágenes estáticas (no aplica a base64 inline).
- Templates y estilos **externos** (`templateUrl` / `styleUrl`) con rutas relativas al `.ts`. Inline
  solo para componentes triviales (< 5 líneas de template).
- Componente raíz del template: siempre un `<section>` (o el landmark adecuado) con clase BEM del
  bloque (ver §3).
- Componentes chicos y con una sola responsabilidad; la lógica que no es de UI se factoriza afuera.

```ts
// ✅ BIEN — Angular 22
@Component({
  selector: 'app-users',
  templateUrl: './users.html',
  styleUrl: './users.scss',
  // sin changeDetection: OnPush ya es el default
  host: {
    '[class.users--loading]': 'isLoading()',
    '(document:keydown.escape)': 'onEscape()',
  },
  imports: [NgOptimizedImage, /* otros standalone */],
})
export class Users {
  readonly userId = input.required<number>();      // input requerido tipado
  readonly showAvatar = input<boolean>(true);      // input opcional con default
  readonly searchTerm = model<string>('');         // two-way binding moderno
  readonly userSelected = output<User>();          // output como función

  protected readonly titulo = computed(() => `Usuario ${this.userId()}`); // solo template
}
```

### 2.3 Visibilidad y naming

- **No declarar `public`** explícito (es el default y genera ruido).
- Declarar siempre `private` o `protected` cuando corresponda.
- Las propiedades `private` llevan **prefijo `_`**.
- Usar `protected` para lo que solo lee el template; `private _` para lo interno.
- **Encapsulación de estado escribible** (regla de oro del equipo): lo que deba estar protegido se
  guarda en un `private _signal` **escribible**, se expone una **`readonly` derivada**
  (`asReadonly()` / `computed`), y para mutarlo se ofrece un **método público** (`setX()` /
  `updateX()` / `addX()`). Nunca exponer el writable directamente.

```ts
// ❌ MAL
public displayedColumns = Object.values(matColumnDef);
private getLocalStorageItemsPerPage() { ... }

// ✅ BIEN
displayedColumns = Object.values(matColumnDef);
private _getLocalStorageItemsPerPage() { ... }

// ✅ BIEN — encapsulación de estado escribible
private _count = signal<number>(0);
readonly count = this._count.asReadonly();   // lectura pública

increment(): void {                          // única vía de mutación
  this._count.update(v => v + 1);
}
```

#### Naming de handlers de eventos: prefijo `on`

Toda función (pública o privada) **atada a un evento del usuario** comienza con `on`, para que sea
identificable de un vistazo como manejador de evento y no como método de negocio. Cuando aporta
claridad, incluir también el **tipo de evento**.

| Evento (template)      | Nombre de la función      |
|------------------------|---------------------------|
| `(click)`              | `onAddElement()`          |
| `(change)`             | `onChangeElement()`       |
| `(click)` guardar      | `onClickGuardar()`        |
| `(keyup)` buscar       | `onKeyupBuscar()`         |
| `(submit)`             | `onSubmitFormulario()`    |

```html
<!-- ✅ BIEN — el nombre revela que es un handler del usuario -->
<button class="lista__add" (click)="onAddElement()">Agregar</button>
<input class="lista__search" (keyup)="onKeyupBuscar($event)" />
```

```ts
// ✅ BIEN — handler de usuario, separado de la lógica privada
onAddElement(): void {
  this._agregarElemento();   // delega a la lógica privada
}

private _agregarElemento(): void { /* ... */ }
```

> **Divergencia consciente con el style guide oficial**: angular.dev sugiere nombrar el handler por
> lo que hace (`saveUserData()`) y no por el evento. El equipo prioriza poder distinguir de un
> vistazo qué métodos son entrada del usuario. **El sufijo descriptivo sigue siendo obligatorio**:
> `onClickGuardarJuicio()`, no `onClick()`.

### 2.4 Inyección de dependencias

- **Siempre** `inject()`. **Nunca** inyectar por constructor.
- Servicios singleton nuevos: decorador **`@Service()`** (v22+), que equivale a
  `@Injectable({ providedIn: 'root' })` pero sin la configuración repetida.
  - `@Service({ autoProvided: false })` si el servicio se va a proveer a mano (en `app.config.ts`,
    en un componente o en una ruta).
  - `@Injectable()` sigue siendo válido y necesario cuando hace falta otra configuración de
    provider. No hace falta migrar servicios existentes de golpe.
- Carga perezosa de servicios pesados: **`injectAsync()`** (+ `prefetch: onIdle` cuando conviene
  precargar el bundle en un hueco de inactividad del navegador). El servicio inyectado así debe ser
  auto-provided (`@Service()` o `providedIn: 'root'`).

```ts
// ❌ MAL
constructor(private juiciosService: JuiciosService, private router: Router) {}

// ✅ BIEN
private readonly _juiciosService = inject(JuiciosService);
private readonly _router = inject(Router);
protected readonly mainSidebarService = inject(MainSidebarService);  // el template la usa
```

```ts
// ✅ BIEN — servicio singleton v22
import { Service } from '@angular/core';

@Service()
export class JuiciosHttp { /* ... */ }
```

```ts
// ✅ BIEN — dependencia pesada, cargada solo cuando se usa
private readonly _exportadorPdf = injectAsync(
  () => import('./exportador-pdf').then(m => m.ExportadorPdf),
  { prefetch: onIdle },
);

async onClickExportar(): Promise<void> {
  const exportador = await this._exportadorPdf();
  exportador.exportar(this.juicios());
}
```

#### Compartir el estado de los providers con un modal creado desde TS

Cuando se abre un modal **programáticamente** (por ejemplo `NzModalService.create()`), el componente
del modal se instancia **fuera** del árbol de inyección del componente que lo abre, así que **no ve
sus providers** (servicios provistos a nivel de componente o de ruta, tokens, etc.). Para que los
comparta, se le pasa el `ViewContainerRef` del componente que lo crea:

```ts
// en el componente que abre el modal
private readonly _viewContainerRef = inject(ViewContainerRef);

onClickAbrirModal(): void {
  this._modalService.create({
    nzTitle: 'Editar juicio',
    nzContent: EditarJuicio,
    nzViewContainerRef: this._viewContainerRef,   // ← comparte el injector / los providers
    nzData: { idJuicio: this.idJuicio() },
  });
}
```

- Sin `nzViewContainerRef`, cualquier servicio provisto a nivel de componente/ruta se resuelve
  contra el injector raíz y el modal recibe **otra instancia** (o falla con `NullInjectorError`).
- Los servicios `@Service()` / `providedIn: 'root'` no necesitan esto: ya son singletons globales.
- El equivalente en Angular Material es la opción `viewContainerRef` de `MatDialog.open()`.

### 2.5 Estado — Signals como única fuente de verdad

- Estado local del componente: **signals**.
- Estado derivado: `computed()`.
- Estado derivado de **varias** fuentes reactivas que además debe seguir siendo escribible:
  `linkedSignal()`.
- Escritura: `set()` o `update()`. **Nunca `mutate()`** (no existe).
- **Nunca** mutar el contenido de un signal (comparan por **referencia**). Para arrays y objetos,
  **siempre devolver una nueva referencia**.
- Estado derivado de async: `resource()` / `httpResource()` / `rxResource()` (ver §4).
- Debouncing sobre signals: `debounced(signal, ms)` (v22) — devuelve un `Resource`; su `status`
  indica si el valor todavía está dentro de la ventana de espera. Nada de `debounceTime` a mano.

```ts
// ✅ BIEN
count = signal<number>(0);
double = computed(() => this.count() * 2);

increment(): void {
  this.count.update(v => v + 1);
}

// ❌ MAL — mutación in-place
addItem(item: Item): void {
  this.items().push(item);                   // ❌ no dispara reactividad
  this.items.mutate(arr => arr.push(item));  // ❌ mutate() ya no existe
}

// ✅ BIEN — nueva referencia
items = signal<readonly Item[]>([]);
addItem(item: Item): void {
  this.items.update(arr => [...arr, item]);
}

// ✅ BIEN — linkedSignal: valor por defecto reactivo pero editable por el usuario
selectedTab = linkedSignal(() => this.tabs()[0]?.id);

// ✅ BIEN — debouncing sin RxJS
protected readonly filtro = signal<string>('');
protected readonly filtroDebounced = debounced(this.filtro, 300);
```

### 2.6 Orden de declaraciones (y de imports)

**Orden obligatorio dentro de la clase:**

```
1.  inject() de servicios
2.  input() / model() / output() / viewChild() / contentChild()
3.  Variables y constantes (incluye readonly de URLs, enums, columnas)
4.  Signals: signal() / computed() / linkedSignal() / httpResource() / rxResource()
5.  constructor()
6.  ngOnInit() (solo si es estrictamente necesario; preferir constructor)
7.  Otros lifecycle hooks (afterNextRender / afterRenderEffect / ngOnDestroy si hacen falta)
8.  Funciones públicas — handlers de evento (onXxx) primero, luego el resto
9.  Funciones privadas (con prefijo _)
```

> No hay un paso de "effects": **los effects están prohibidos** (§2.7).

**Orden de los imports del archivo** (bloques separados por línea en blanco):

```ts
// 1. Angular core / framework
import { Component, computed, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { form, FormField, required } from '@angular/forms/signals';

// 2. Librerías de terceros (NG-ZORRO, etc.)
import { NzTableModule } from 'ng-zorro-antd/table';

// 3. Código propio: core → shared → feature (de lo más general a lo más local)
import { environment } from '../../../environments/environment';
import { SpinnerService } from '../../shared/services/spinner';
import { JuiciosHttp } from './services/juicios-http';
import { Juicio } from './models/juicio';
```

Con `"source.organizeImports": "explicit"` en VS Code (ver §10.4) el orden alfabético dentro de cada
bloque se mantiene solo.

### 2.7 Effects — PROHIBIDOS

> **Regla del equipo: no se escriben `effect()`.** Si estás por escribir uno, hay una API declarativa
> que resuelve el caso mejor. Un `effect` es código imperativo colgado del grafo reactivo: se ejecuta
> en momentos difíciles de razonar, se re-dispara solo, y esconde dependencias.

| Lo que ibas a hacer con `effect`                | Lo que corresponde usar                                  |
|-------------------------------------------------|----------------------------------------------------------|
| Derivar un valor de otros signals               | `computed()`                                             |
| Derivar un valor que además debe ser editable   | `linkedSignal()`                                         |
| Cargar datos cuando cambia un signal            | `httpResource()` / `rxResource()` (§4)                   |
| Mapear / filtrar / ordenar el `value()` de un resource | `computed()` sobre `value()` (§4.6)                |
| Mostrar u ocultar el spinner                    | `spinnerInterceptor` + `SpinnerService` (§5.2)           |
| Abrir el modal de error                         | `errorInterceptor` + `ErrorNotifier` (§5.3)              |
| Reaccionar a lo que hizo un componente hermano  | Servicio con signal + `linkedSignal` (§2.12)             |
| Refrescar tras una mutación                     | Cambiar el signal de `params`, o `resource.reload()`     |
| Debouncing                                      | `debounced()` (§2.5)                                     |
| Transformar un resource entero                  | `snapshot` + `resourceFromSnapshots()` (§4.10)           |
| Tocar el DOM después del primer render          | `afterNextRender()` / `afterRenderEffect()`              |

```ts
// ❌ MAL — effect anónimo en el constructor, derivando estado
constructor() {
  effect(() => {
    if (this.mainSidebarService.perfilSeleccionado()?.id !== 0) {
      this.renderDataTable();
    }
  });
}

// ❌ MAL (menos malo, pero sigue siendo un effect)
renderDataTableEffect = effect(() => { /* ... */ });

// ✅ BIEN — derivación pura
filteredJuicios = computed(() =>
  this._juicios().filter(j => j.perfilId === this.mainSidebarService.perfilSeleccionado()?.id)
);

// ✅ BIEN — carga reactiva declarativa (se re-dispara y cancela sola)
juiciosResource = httpResource<Juicio[]>(() => {
  const perfilId = this.mainSidebarService.perfilSeleccionado()?.id;
  return perfilId ? `${environment.API_URL}juicios/${perfilId}` : undefined;
});
```

**Única excepción admitida** (documentada en el PR): sincronizar con una API externa **no reactiva y
sin alternativa declarativa** — por ejemplo alimentar una librería de gráficos imperativa de un
tercero. En ese caso el effect va **como propiedad de clase, con nombre descriptivo**, nunca anónimo
dentro del constructor, y nunca escribe signals que él mismo lee.

### 2.8 Constructor vs ngOnInit vs afterNextRender

- `ngOnInit` está **casi obsoleto** con signals. Reglas:
  - Asignación de variables / configuración inicial → al **inicializador** del campo (`= signal(0)`).
  - Lectura de `localStorage`, setup inicial que no depende de inputs → **constructor**.
  - Lógica que necesita inputs ya resueltos → un `computed`/`resource` que los lea (los inputs son
    signals); **no** un `effect`.
  - Manipulación del DOM tras el primer render → `afterNextRender()` / `afterRenderEffect()`.
- Si igual hace falta `ngOnInit`, mantenerlo **corto**: llamadas a métodos bien nombrados, e
  `implements OnInit`.

```ts
// ❌ MAL
ngOnInit() {
  this.getLocalStorageShort();
  this.getLocalStorageItemsPerPage();
}

// ✅ BIEN
constructor() {
  this._getLocalStorageShort();
  this._getLocalStorageItemsPerPage();
}
```

### 2.9 RxJS — fuera del código de aplicación

> **Regla del equipo: el estado es siempre signals. Nada de `Observable`, `Subject`,
> `BehaviorSubject`, `ReplaySubject` ni `subscribe()` para manejar estado.**

**Prohibido:**

- `BehaviorSubject` / `Subject` / `ReplaySubject` como estado compartido o como bus de eventos entre
  componentes → usar un servicio con signals (§2.12).
- `subscribe()` guardado en una variable `Subscription` + `unsubscribe()` en `ngOnDestroy`.
- `switchMap` / `debounceTime` / `combineLatest` para orquestar peticiones → eso lo hace la Resource
  API (`params` reactivos, cancelación automática) y `debounced()`.
- `valueChanges` / `statusChanges` de formularios → con Signal Forms el estado ya son signals (§6).
- `toSignal()` / `toObservable()` como parche para seguir modelando el estado con streams.

**Único uso admitido de RxJS:**

1. Dentro de los **interceptores funcionales** (`catchError`, `finalize`, `retry`) — §5.
2. Como **transporte** de una llamada `HttpClient` puntual, porque `HttpClient` devuelve
   `Observable`. Esa llamada se envuelve siempre en un `rxResource` (lecturas) o se consume una sola
   vez para una **mutación** (§4.1).
3. Interoperabilidad con una librería de terceros que solo expone Observables — se convierte a signal
   con `toSignal()` **en el borde** y de ahí para adentro todo es signals.

```ts
// ❌ MAL — estado con BehaviorSubject
private _perfil$ = new BehaviorSubject<Perfil | null>(null);
perfil$ = this._perfil$.asObservable();

// ❌ MAL — subscripción manual guardada
public getPerfilesSub: Subscription;
this.getPerfilesSub = this._juiciosService.getPerfiles().subscribe(...);
ngOnDestroy() { this.getPerfilesSub.unsubscribe(); }

// ❌ MAL — Subject + switchMap para buscar
private _buscar$ = new Subject<string>();
this._buscar$.pipe(switchMap(t => this._http.buscar(t))).subscribe(r => this.resultados = r);

// ✅ BIEN — estado con signals
private _perfil = signal<Perfil | null>(null);
readonly perfil = this._perfil.asReadonly();

// ✅ BIEN — búsqueda reactiva con cancelación automática
protected readonly termino = signal<string>('');
protected readonly terminoDebounced = debounced(this.termino, 300);

protected readonly resultados = httpResource<Resultado[]>(() => {
  const t = this.terminoDebounced.value();
  return t ? `${environment.API_URL}buscar?q=${encodeURIComponent(t)}` : undefined;
});
```

**Mutaciones (POST/PUT/DELETE)**: son la única llamada donde se consume el Observable directamente.
Se hace una sola vez, sin guardar `Subscription` (el observable de `HttpClient` completa solo), y el
resultado se vuelca a signals o se refresca el resource.

```ts
// ✅ BIEN — mutación puntual
onClickGuardar(): void {
  this._juiciosHttp.actualizar(this.form().value()).subscribe({
    next: () => this.juiciosResource.reload(),
  });
}

// ✅ BIEN — alternativa async/await, sin RxJS a la vista
async onClickGuardar(): Promise<void> {
  await firstValueFrom(this._juiciosHttp.actualizar(this.form().value()));
  this.juiciosResource.reload();
}
```

### 2.10 Servicios

- Un servicio = **una responsabilidad**.
- HTTP puro va en `*-http.ts`. Lógica/orquestación va en `*.ts`.
- Singletons nuevos: `@Service()`. Ubicación según §1.1 (alcance).
- `inject()` también dentro de servicios, nunca constructor injection.
- Estado compartido entre componentes → **servicio con signals** (`asReadonly()` para exponer).
- Los servicios **no** conocen la librería de UI (modales, toasts): eso se aísla en una fachada
  (§5.3).

```ts
// users-http.ts — solo HTTP
@Service()
export class UsersHttp {
  private readonly _http = inject(HttpClient);
  private readonly _URL = `${environment.API_URL}users`;

  list(): Observable<ApiResponse<User[]>> {
    return this._http.get<ApiResponse<User[]>>(this._URL);
  }

  create(user: CreateUserDto): Observable<ApiResponse<User>> {
    return this._http.post<ApiResponse<User>>(this._URL, user);
  }
}

// users.ts — orquestación + signals
@Service()
export class Users {
  private readonly _selectedId = signal<number | null>(null);
  readonly selectedId = this._selectedId.asReadonly();

  // Resource reactivo: re-fetch automático cuando cambia _selectedId
  readonly selectedUser = httpResource<User>(() => {
    const id = this._selectedId();
    return id ? `${environment.API_URL}users/${id}` : undefined;   // undefined => idle
  });

  select(id: number): void {
    this._selectedId.set(id);
  }
}
```

#### Parámetros en GET/POST/PUT/PATCH/DELETE

Los parámetros de query se arman con `HttpParams` (nunca concatenando strings a mano), respetando
**exactamente** el casing que espera el backend:

```ts
getEvaluacionCompetencia(
  idUser: string,
  idDestinatario: string,
  rolIdDestinatario: number,
  rolIdUser: number,
): Observable<ApiResponse<GetEvaluationCompetencies>> {
  const parameters = new HttpParams()
    .set('IdUser', idUser)
    .set('IdDestinatario', idDestinatario)
    .set('RolIdDestinatario', rolIdDestinatario)
    .set('RolIdUser', rolIdUser);

  return this._http.get<ApiResponse<GetEvaluationCompetencies>>(this._URL, { params: parameters });
}
```

Con `httpResource` en su forma de objeto, los params van declarativos y reactivos:

```ts
readonly evaluacion = httpResource<GetEvaluationCompetencies>(() => ({
  url: this._URL,
  params: { IdUser: this.idUser(), RolIdUser: this.rolIdUser() },
}));
```

### 2.11 Null safety y contratos con el backend (DTOs por operación)

- **El backend devuelve valores por defecto, nunca `null`.** Si una variable se puede elegir desde el
  back, debe llegar con su valor por defecto (`0`, `''`, `false`, `[]`). Así el front siempre conoce
  los valores posibles del objeto.
- **Un DTO por operación.** Nunca reutilizar el mismo DTO para varias operaciones: uno para
  **agregar** (`CreateXDto`), otro para **modificar** (`UpdateXDto`), otro para **consultar**
  (`XQueryDto` / `XResponse`) y otro para **eliminar** (`DeleteXDto`). Da certeza sobre qué campos
  están presentes y son obligatorios en cada caso.
- **Decimales que pueden ser `null`:** controlarlos en el front **antes de cualquier cálculo**. Un
  cálculo con `null` propaga `NaN` o rompe en silencio.

```ts
// models/dtos/ — un DTO por operación
export interface CreateJuicioDto { caratula: string; monto: number; }
export interface UpdateJuicioDto { id: number; caratula: string; monto: number; }
export interface DeleteJuicioDto { id: number; }
export interface JuicioResponse  { id: number; caratula: string; monto: number; saldo: number; }

// ✅ BIEN — guarda de null antes de operar con decimales
readonly total = computed(() => {
  const monto = this._monto() ?? 0;     // null => 0 antes del cálculo
  const tasa  = this._tasa()  ?? 0;
  return monto * (1 + tasa / 100);
});
```

### 2.12 Comunicación entre componentes hermanos — servicio con signals

Cuando dos componentes **hermanos** (mismo padre, sin relación `input`/`output` directa) tienen que
coordinarse, la solución es un **servicio con estado en signals**, no un `viewChild` del padre que
alcance un método del hijo y lo invoque imperativamente (ni un `Subject` que emita eventos).

**Por qué NO `output` + `viewChild` + método imperativo**

```ts
// ❌ MAL — el padre orquesta imperativamente y alcanza un método del hijo
export default class Admin {
  private readonly _historic = viewChild.required(AdminAreaHistoric);

  onAreaChanged(user: User): void {
    this._historic().showMovimientosByUsuario(user);   // llamada imperativa al hijo
  }
}

// ❌ MAL — método imperativo en el hijo + reload() manual
showMovimientosByUsuario(user: User): void {
  const sameUser = this.selectedUser()?.idUsuario === user.idUsuario;
  this.selectedUser.set(user);
  if (sameUser) this.movimientosResource.reload();     // refetch a mano
}
```

- **Acoplamiento vía el padre**: el padre tiene que conocer la API interna del hijo. Si aparece un
  tercer componente que también debe reaccionar, hay que volver a tocar el padre.
- **Imperativo, no reactivo**: va contra el modelo de signals. El refetch debería caer solo cuando
  cambian los `params` del resource.
- **`viewChild` para lógica de negocio**: `viewChild` es para interactuar con el DOM/UI de un hijo
  (foco, medir, scrollear, `.showModal()`), no para pasar datos de dominio entre hermanos.

**Cómo SÍ — servicio con signal + `linkedSignal` en el consumidor**

El **productor** escribe en un servicio (estado encapsulado: `private _signal` + `readonly` + método
mutador). El **consumidor** deriva su estado con `linkedSignal`, así reacciona al cambio pero
**conserva edición local**. Al cambiar el `linkedSignal`, cambian los `params` del resource y el
refetch ocurre solo — **sin `reload()`**.

```ts
// admin/services/admin-area.ts — estado compartido entre hermanos
@Service()
export class AdminArea {
  private readonly _usuarioCambiado = signal<User | null>(null);
  readonly usuarioCambiado = this._usuarioCambiado.asReadonly();

  notificarCambioArea(user: User): void {
    this._usuarioCambiado.set(user);
  }
}

// admin-area-change.ts (PRODUCTOR) — escribe en el servicio tras la mutación exitosa
private readonly _adminArea = inject(AdminArea);

private _setUsuarioIdArea(user: User, idArea: number): void {
  this._areasHttp.setUsuarioIdArea(user, idArea, user.idUsuario).subscribe({
    next: (response) => this._adminArea.notificarCambioArea(response.data),  // notifica; no conoce al hermano
  });
}

// admin-area-historic.ts (CONSUMIDOR) — linkedSignal: reacciona pero queda editable
private readonly _adminArea = inject(AdminArea);

// Reacciona al usuario notificado, y el dropdown puede seguir seteándolo con .set()
protected readonly selectedUser = linkedSignal<User | null>(() => this._adminArea.usuarioCambiado());

protected readonly movimientosResource = rxResource({
  params: () => ({
    idUsuario: this.selectedUser()?.idUsuario ?? 0,
    fechaDesde: this._toApiDate(this.dateRange()?.[0]),
    fechaHasta: this._toApiDate(this.dateRange()?.[1]),
  }),
  stream: ({ params }) => this._movimientosHttp.getMovimientos(params),
});
```

El **padre queda limpio** (sin `viewChild` ni handlers): los hermanos no se conocen, solo conocen el
servicio.

| Punto                          | `viewChild` imperativo            | Servicio + `linkedSignal`                        |
|--------------------------------|-----------------------------------|--------------------------------------------------|
| Acoplamiento                   | Hermanos vía el padre             | Desacoplados; solo dependen del servicio         |
| Modelo                         | Imperativo (`reload()`, método)   | Reactivo (cambian `params` ⇒ refetch automático) |
| Escalar a N consumidores       | Tocar el padre cada vez           | Cada consumidor inyecta el servicio y deriva     |
| Edición local del consumidor   | Se pisa a mano                    | `linkedSignal` la conserva (`.set` sigue válido) |

**Detalle clave: el caso "mismo valor".** Con `linkedSignal` no hace falta `reload()` ni siquiera
cuando la acción se repite sobre el mismo registro: si el backend devuelve un objeto nuevo en cada
respuesta (lo habitual), el signal cambia de **referencia**, el `linkedSignal` recomputa, `params`
cambia y el resource refetchea. Si tu fuente pudiera emitir la **misma referencia**, recién ahí
agregá un disparador explícito (un signal contador `version` incluido en `params`).

**Cuándo SÍ usar `viewChild`**: para interactuar con la **UI** de un hijo — dar foco, medir el DOM,
scrollear, llamar `.showModal()` de un `<dialog>`. Para datos de dominio entre hermanos, siempre
servicio con signals.

### 2.13 APIs del navegador en servicios (ejemplo: Notifications)

Cuando se envuelve una API del navegador, hacerlo en un **servicio** siguiendo las convenciones:
`inject()`, métodos públicos como handlers (`onXxx`) y lógica interna en privados con `_`. Guardas
de disponibilidad con `globalThis` (zoneless-safe, sin asumir `window`).

```ts
@Service()
export class DesktopNotifier {
  // Disparar SIEMPRE desde un gesto del usuario: los navegadores bloquean el prompt si no.
  onSolicitarNotificacion(): void {
    if (!('Notification' in globalThis)) {
      globalThis.alert?.('Este navegador no soporta notificaciones de escritorio.');
      return;
    }

    switch (Notification.permission) {
      case 'granted':
        this._crearNotificacion();
        break;
      case 'denied':
        console.warn('Notificaciones bloqueadas: restablecer desde el candado de la barra de URL.');
        break;
      default:
        Notification.requestPermission().then((permiso) => {
          if (permiso === 'granted') this._crearNotificacion();
          else console.warn(`Permiso no otorgado (estado: ${permiso}).`);
        });
    }
  }

  private _crearNotificacion(): void {
    new Notification('¡Hola!', {
      body: 'Esta es una notificación de escritorio simple.',
      icon: 'assets/icono.png',
    });
  }
}
```

> Requisitos: contexto **HTTPS**, **gesto del usuario** para pedir permiso, ícono opcional en
> `assets/`. No usar `setTimeout` para "forzar" el prompt: en zoneless no aporta nada y el navegador
> igual exige el gesto.

---
