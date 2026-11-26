## 5. Interceptores HTTP — spinner, errores y concerns transversales

Índice: [5.1](#51-por-qué-no-el-patrón-effect-por-recurso-resourceerrorhandler) Por qué no `effect` por recurso ·
[5.2](#52-spinner--interceptor--servicio-con-contador-de-peticiones) Spinner · [5.3](#53-errores--interceptor--fachada-de-modal-lib-agnóstica) Errores (§5.3.1 `ErrorHandler`, §5.3.2 telemetría de salida con `keepalive`) ·
[5.4](#54-opt-out-por-request-con-httpcontext-tokens) `HttpContext` opt-out · [5.5](#55-registro-en-appconfigts-el-orden-importa) Registro y orden ·
[5.6](#56-cómo-se-combina-con-la-resource-api) Combinación con Resource API · [5.7](#57-retries) Retries (§5.7.1 `Idempotency-Key`) ·
[5.8](#58-funcionales-vs-basados-en-clase-di) Funcionales vs. basados en clase (DI) · [5.9](#59-withxhr-vs-fetch-y-progreso-de-subida) `withXhr` vs. fetch ·
[5.10](#510-interceptor-de-fechas-solo-si-el-contrato-lo-pide) Interceptor de fechas

> **Regla del equipo:** spinner global, manejo global de errores, headers de auth, retries y logging
> son **concerns transversales** y van en **interceptores funcionales** (`HttpInterceptorFn`),
> registrados una sola vez. **No** se resuelven con `effect()` por recurso ni con lógica repetida en
> cada servicio/componente.

### 5.1 Por qué NO el patrón "effect por recurso" (`resourceErrorHandler(...)`)

El anti-patrón a erradicar es un helper que, por **cada** resource, monta un `effect` que mira
`isLoading()` / `error()` y prende/apaga el spinner y abre el modal de error:

```ts
// ❌ MAL — un effect por cada resource, llamado a mano en el constructor de cada servicio
resourceErrorHandler(service) {
  effect(() => {
    const error = service.error();
    const loading = service.isLoading();
    if (loading) this.spinnerService.show(); else this.spinnerService.hide();
    if (!error) return;
    if (error instanceof HttpErrorResponse) {
      this.showMessage({ title: ERROR.ERROR_500.TITLE, message: ERROR.ERROR_500.MESSAGE });
    }
  });
}
constructor() {
  this.utils.resourceErrorHandler(this.itemsResource);
  this.utils.resourceErrorHandler(this.itemsResourceBusqueda);   // hay que acordarse SIEMPRE
}
```

Qué está **mal**:

1. **Cableado manual y frágil:** hay que llamar al helper por cada resource. Si te olvidás de uno,
   ese resource no tiene spinner ni manejo de error. No escala.
2. **El spinner parpadea con peticiones concurrentes:** cada effect llama `hide()` por su cuenta. Si
   el resource A termina mientras B sigue cargando, el `hide()` de A apaga el spinner. **Falta un
   contador de peticiones activas.**
3. **Concern transversal disperso:** spinner y errores quedan esparcidos en effects dentro de
   servicios; cada servicio termina acoplado a `spinner` + `message`.
4. **Mismo mensaje para todo:** siempre muestra `ERROR_500`, ignorando el status real (404, 403,
   timeout). Mala UX.
5. **No cubre el `HttpClient` "pelado":** un `http.post(...)` de una mutación queda sin spinner ni
   manejo de error.

Un **interceptor** resuelve los 5 puntos de una sola vez: aplica a **todas** las peticiones HTTP
(incluidas las que hacen `httpResource`/`rxResource` por debajo, ver [04-resource-api.md](./04-resource-api.md)),
con contador y con mapeo de status.

### 5.2 Spinner — interceptor + servicio con contador de peticiones

```ts
// shared/services/spinner-state.ts
@Service()
export class SpinnerState {
  private readonly _activeRequests = signal<number>(0);
  readonly isVisible = computed(() => this._activeRequests() > 0);

  show(): void { this._activeRequests.update((n) => n + 1); }
  hide(): void { this._activeRequests.update((n) => Math.max(0, n - 1)); }
}
```

```ts
// interceptors/spinner-interceptor.ts
export const spinnerInterceptor: HttpInterceptorFn = (req, next) => {
  const spinner = inject(SpinnerState);

  if (req.context.get(SKIP_SPINNER)) return next(req);   // opt-out por request (§5.4)

  spinner.show();
  return next(req).pipe(finalize(() => spinner.hide())); // finalize corre en éxito, error y cancelación
};
```

```html
<!-- shared/components/spinner/spinner.html — overlay global montado una vez en app.html -->
@if (spinner.isVisible()) {
  <div class="spinner" role="status" aria-live="polite" aria-label="Cargando">
    <div class="spinner__circle"></div>
  </div>
}
```

### 5.3 Errores — interceptor + fachada de modal lib-agnóstica

El interceptor mapea el **status real** a un mensaje y delega la presentación en un servicio
**fachada** (`ErrorNotifier`). **Qué librería de modal se usa depende del proyecto** (NzModal,
SweetAlert2, `MatDialog`, un toast propio…): el interceptor **no debe conocerla**. Solo
`ErrorNotifier` la importa; cambiar de librería es tocar un único archivo.

```ts
// shared/services/error-notifier.ts — única clase que conoce la librería de UI
const VENTANA_AVISO_MS = 5_000; // un mismo aviso no se repite dentro de esta ventana

@Service()
export class ErrorNotifier {
  private readonly _modal = inject(NzModalService);   // o MatDialog / MessageService / Swal...
  private _ultimo = { titulo: '', en: 0 };

  handle(error: HttpErrorResponse): void {
    const { title, message } = this._mapError(error);
    // Con la API caída, N requests fallan juntos: sin esto, N modales iguales apilados.
    const ahora = Date.now();
    if (this._ultimo.titulo === title && ahora - this._ultimo.en < VENTANA_AVISO_MS) return;
    this._ultimo = { titulo: title, en: ahora };
    this._modal.error({ nzTitle: title, nzContent: message });
  }

  private _mapError(error: HttpErrorResponse): { title: string; message: string } {
    switch (error.status) {
      case 0:   return { title: 'Sin conexión', message: 'No se pudo contactar al servidor.' };
      case 400: return { title: 'Solicitud inválida', message: error.error?.message ?? 'Revisá los datos.' };
      // 401 no pasa por acá: lo resuelve el authInterceptor (renovar token o cerrar sesión, [15](./15-security.md) §15.5.3)
      case 403: return { title: 'Sin permisos', message: 'No tenés acceso a este recurso.' };
      case 404: return { title: 'No encontrado', message: 'El recurso no existe.' };
      case 500: return { title: 'Error del servidor', message: 'Ocurrió un error inesperado.' };
      default:  return { title: 'Error', message: 'Ocurrió un error. Intentá de nuevo.' };
    }
  }
}
```

```ts
// interceptors/error-interceptor.ts
// 401: lo maneja el authInterceptor, una sola vez por ráfaga (modal propio por request = N "Sesión expirada").
// 409: conflicto de edición (`rowVersion`) o Idempotency-Key en curso: tiene que llegar a quien llamó,
// que muestra "otro usuario modificó este registro". Un modal genérico lo taparía.
const LOS_MANEJA_OTRO = [401, 409];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(ErrorNotifier);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!req.context.get(SKIP_ERROR_HANDLER) && !LOS_MANEJA_OTRO.includes(error.status)) notifier.handle(error);
      return throwError(() => error);   // re-propaga: el resource sigue viendo error() para UI inline
    }),
  );
};
```

Quien llama a un alta/edición con `rowVersion` ([04](./04-resource-api.md)) o `Idempotency-Key` (§5.7.1)
atiende el `409` en su `error:` (`error.status === 409`); el `retryInterceptor` tampoco lo reintenta
(no está en `REINTENTABLE`).

#### 5.3.1 Errores fuera de HTTP: `ErrorHandler` global

El interceptor cubre HTTP. Lo demás (errores de render no atrapados por `@boundary`, promesas sin
`catch`, scripts de terceros) llega al `ErrorHandler`. Un solo handler, filtrando por tipo:

```ts
// shared/services/app-error-handler.ts
@Service({ autoProvided: false })
export class AppErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    // HTTP ya lo notificó el errorInterceptor: no duplicar el modal
    if (error instanceof HttpErrorResponse) return;
    console.error(error); // o el logger del proyecto, si existe
  }
}

// app.config.ts
provideBrowserGlobalErrorListeners(), // window.onerror + unhandledrejection al ErrorHandler (v20+)
{ provide: ErrorHandler, useClass: AppErrorHandler },
```

- **Filtrar por tipo**: el handler recibe cualquier error. Sin filtro, un `HttpErrorResponse` ya
  notificado muestra un segundo modal. Con `provideBrowserGlobalErrorListeners()` también llegan errores
  de fuera de Angular (una imagen que no carga, errores inocuos de una librería): se filtran antes de
  reportar o de avisarle al usuario.
- Loguear sin PII ni tokens (§15). Nunca mostrar el stack al usuario.
- API que responde 200 con `{ success: false }`: normalizar una sola vez en un interceptor que lance
  `HttpErrorResponse`, para que el resto de la app vea un error real.

#### 5.3.2 Telemetría de salida y reporte de crashes (`pagehide` + `keepalive`)

**Cuándo**: telemetría al salir de la página (tiempo en pantalla, última ruta), reporte de crashes
desde el `ErrorHandler` de §5.3.1 y auditoría de uso. Un singleton `@Service()` registra el listener
una sola vez y vive toda la app: no necesita `removeEventListener`.

```ts
// shared/services/telemetria.ts
@Service()
export class Telemetria {
  private readonly http = inject(HttpClient);
  private salidaEnviada = false;

  constructor() {
    if (!('addEventListener' in globalThis)) return; // SSR
    // pagehide: compatible con bfcache ([16](./16-websocket-signalr.md) §16.5). visibilitychange → hidden:
    // lo último que se dispara de forma confiable en móvil cuando el SO mata el proceso.
    globalThis.addEventListener('pagehide', () => this.avisarSalida());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.avisarSalida();
      else this.salidaEnviada = false; // volvió (pestaña o bfcache): puede salir otra vez
    });
  }

  enviar(evento: string, datos: string): void {
    // keepalive (v20.1+, solo con FetchBackend): la request sobrevive a la navegación. Body máximo 64 KiB.
    // `error: () => {}`: si el POST falla NO lanza; si lanzara, ErrorHandler → enviar('crash') → falla → bucle.
    this.http
      .post<void>(`${environment.API_URL}telemetria`, { evento, datos }, { keepalive: true })
      .subscribe({ error: () => {} });
  }

  private avisarSalida(): void {
    if (this.salidaEnviada) return;
    this.salidaEnviada = true;
    this.enviar('salida_pagina', location.pathname); // ruta sin query string: puede traer ids o tokens
  }
}

// shared/services/app-error-handler.ts (amplía §5.3.1)
const MAX_CRASHES_POR_SESION = 10; // un error de render en bucle dispararía un POST por frame

@Service({ autoProvided: false })
export class AppErrorHandler implements ErrorHandler {
  private readonly telemetria = inject(Telemetria);
  private readonly _crashesEnviados = new Set<string>();

  handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse) return; // ya lo notificó el errorInterceptor
    console.error(error);
    const mensaje = (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 2_000);
    // el mismo mensaje se manda una vez, y con tope por sesión
    if (this._crashesEnviados.has(mensaje) || this._crashesEnviados.size >= MAX_CRASHES_POR_SESION) return;
    this._crashesEnviados.add(mensaje);
    this.telemetria.enviar('crash', mensaje); // sin stack: suele traer URLs con datos
  }
}
```

- `keepalive` pasa por los interceptores (auth, XSRF): el endpoint de telemetría puede exigir auth.
  Con `withXhr()` (§5.9) se ignora y avisa `NG02813`. No leer la respuesta: la página ya no está.
- La entrega **no está garantizada** (`pagehide` no se dispara si el SO mata el proceso; por eso
  también `visibilitychange`). El dato confiable de salida lo tiene el backend (sesión, `OnDisconnectedAsync`).
- `navigator.sendBeacon` solo si el endpoint es anónimo y sin cabeceras (no pasa por interceptores
  ni manda `Authorization` / XSRF). Con endpoint propio, `HttpClient` + `keepalive`.
- Nunca `unload` (saca la página del bfcache) ni `beforeunload` como señal de salida
  ([16](./16-websocket-signalr.md) §16.5). Nunca `effect()` para esto: es un listener del DOM en un servicio ([02](./02-typescript-signals.md) §2.13).
- Seguridad ([15](./15-security.md) §15.8, §15.11): nunca PII, tokens, cuerpos de request ni stack
  completo en el payload; endpoint del mismo origen, con auth y rate limit en el backend.

### 5.4 Opt-out por request con `HttpContext` tokens

`HttpContextToken<T>` es la forma tipada de pasar metadata por-request a través de la cadena de
interceptores, sin ensuciar headers ni la URL. Se declara con un valor por defecto (`() => T`):

```ts
// interceptors/http-context.ts
export const SKIP_SPINNER = new HttpContextToken<boolean>(() => false);
export const SKIP_ERROR_HANDLER = new HttpContextToken<boolean>(() => false);
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false); // login y renovación de token ([15](./15-security.md) §15.5.3)

// uso en una petición puntual (polling silencioso, error mostrado inline, etc.)
this._http.get<Data>('/api/poll', {
  context: new HttpContext().set(SKIP_SPINNER, true).set(SKIP_ERROR_HANDLER, true),
});
```

Pantalla que muestra el error inline (con Reintentar) en un repo cuyo interceptor ya abre un modal:
si el token no existe, el error queda avisado dos veces. Proponer el token en una línea y no agregarlo
sin pedido si toca un interceptor compartido.

### 5.5 Registro en `app.config.ts` (el orden importa)

Desde v21 `HttpClient` se inyecta sin registrar nada. `provideHttpClient(...)` solo hace falta para
configurarlo: interceptores, `withXhr()`, XSRF. Con interceptores (este caso), siempre:

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      // fetch es el backend por defecto de HttpClient: sin withFetch() (§5.9)
      withInterceptors([
        authInterceptor,      // 1) agrega token a la request saliente
        spinnerInterceptor,   // 2) prende/apaga el overlay durante TODO el ciclo, reintentos incluidos
        errorInterceptor,     // 3) captura el fallo final (después de agotar reintentos)
        retryInterceptor,     // 4) el más cercano al backend: reintenta antes de que nadie más se entere
      ]),
    ),
  ],
};
```

> **Cómo se ejecuta la cadena.** Para la **request saliente**, los interceptores corren en el orden
> configurado (`authInterceptor` primero). Para la **respuesta entrante** ocurre lo inverso: el
> **último** interceptor de la lista es el más cercano al backend, así que es el **primero** en ver la
> respuesta/error crudos, y cada interceptor anterior los ve después (porque su `next(req)` es,
> literalmente, la llamada al siguiente interceptor envuelta en su propio `.pipe(...)`).
>
> Por eso el orden de arriba no es arbitrario:
> - `retryInterceptor` va **al final** (el más cercano al backend): reintenta la petición fallida
>   antes de que `errorInterceptor` se entere, así el usuario no ve un modal de error por cada intento.
> - `errorInterceptor` va **antes** que `retry`: solo actúa sobre el fallo **final**, una vez agotados
>   los reintentos.
> - `spinnerInterceptor` va **antes** que ambos (más lejos del backend, más "afuera"): su
>   `finalize()` envuelve toda la secuencia de reintentos, así el spinner no parpadea entre intento e
>   intento.
> - `authInterceptor` va primero: agrega el header a la request saliente y, al ser el más externo, ve el
>   401 **después** de `error` y `retry`. Ahí renueva el token y reintenta la request una vez
>   ([15](./15-security.md) §15.5.3); `errorInterceptor` ignora el 401 para no abrir un modal por request.

### 5.6 Cómo se combina con la Resource API

Con los interceptores puestos, los `httpResource` / `rxResource` **ya tienen** spinner global y modal
de error **sin** cablear nada. El `error()` del resource sigue disponible para **UI contextual /
inline** (mostrar el error dentro de una sección concreta, con botón de reintento).

| Concern                                            | Dónde se resuelve                                                    |
|----------------------------------------------------|------------------------------------------------------------------------|
| Spinner overlay global                             | `spinnerInterceptor` + `SpinnerState`                              |
| Modal/toast genérico de error inesperado           | `errorInterceptor` + `ErrorNotifier`                                 |
| Error **inline** ("esta lista falló, reintentar")  | `resource.error()` / `resource.status()` en el template (ver [04-resource-api.md](./04-resource-api.md) §4.7) |
| Solo inline, sin modal global                      | `SKIP_ERROR_HANDLER` + `resource.error()`                            |
| Mutaciones (POST/PUT/DELETE)                       | `HttpClient` directo → spinner/errores vía interceptor, automáticos  |

### 5.7 Retries

Reintentar peticiones fallidas (timeouts, `502`/`503` puntuales) también es un concern transversal: va
en un interceptor, no repetido con el operador `retry` de RxJS en cada servicio.

```ts
// interceptors/retry-interceptor.ts
// Solo se reintenta lo que puede arreglarse solo: sin red (0), timeout (408), límite (429) y 5xx.
// Un 400/401/403/404 no cambia esperando: falla enseguida.
const REINTENTABLE = (status: number) => status === 0 || status === 408 || status === 429 || status >= 500;
const MAX_ESPERA_MS = 10_000; // si el servidor pide esperar más, no se reintenta: el spinner no cuelga tanto

// `Retry-After`: segundos ("120") o fecha HTTP ("Wed, 21 Oct 2026 07:28:00 GMT"). null si falta o no se entiende.
const retryAfterMs = (error: HttpErrorResponse): number | null => {
  const valor = error.headers?.get('Retry-After');
  if (!valor) return null;
  const ms = /^\d+$/.test(valor.trim()) ? Number(valor) * 1000 : Date.parse(valor) - Date.now();
  return Number.isNaN(ms) ? null : Math.max(0, ms);
};

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Reintentar solo métodos idempotentes seguros por defecto: GET (y HEAD, si aplica).
  // PUT/DELETE son idempotentes en teoría, pero acá NO se reintentan: sumarlos a esta condición
  // de forma explícita solo si el backend garantiza esa idempotencia real.
  if (req.method !== 'GET') return next(req);

  return next(req).pipe(
    retry({
      count: 3, // siempre acotado
      delay: (error: HttpErrorResponse, attempt) => {
        if (!REINTENTABLE(error.status)) return throwError(() => error);
        const espera = retryAfterMs(error) ?? 2 ** attempt * 500; // backoff exponencial: 1 s, 2 s, 4 s
        if (espera > MAX_ESPERA_MS) return throwError(() => error);
        return timer(espera + Math.random() * 500); // jitter: sin él, los clientes sincronizados reintentan juntos
      },
    }),
  );
};
```

> Cortar por `status < 500` deja sin reintento al `0` (sin red), que es justo el caso que más se arregla
> solo: la lista de reintentables es explícita.
>
> `Retry-After` manda sobre el backoff (el servidor sabe cuándo se libera). Entre origen distinto, el
> navegador solo lo deja leer si el backend manda `Access-Control-Expose-Headers: Retry-After`.
>
> **Nunca** reintentar POST/PUT/PATCH/DELETE a ciegas: si la primera petición sí llegó a impactar en
> el servidor pero la respuesta se perdió, un retry automático puede duplicar la operación (alta doble,
> pago doble). Si hace falta reintentar una mutación, eso va explícito en el servicio, con una
> idempotency key o confirmación del backend (§5.7.1), no en el interceptor global.

#### 5.7.1 `Idempotency-Key` en altas que no admiten duplicado

**Solo** para altas donde un duplicado hace daño (pagos, pedidos, envíos de trámites). Un alta
común, una edición o un borrado no la llevan: es complejidad sin motivo. Contrato con el backend:
header `Idempotency-Key`; si la misma key sigue en curso responde `409`; si ya terminó, devuelve el
resultado guardado (el reintento no crea nada nuevo).

La key se genera **una vez por intención del usuario** (un envío del formulario), no por clic ni por
request, y se **reutiliza** si esa misma intención se reintenta, también con el botón "Reintentar"
tras un error de red. Una intención nueva lleva una key nueva.

```ts
export class NuevoPedido {
  private readonly _http = inject(HttpClient);
  private _claveEnvio: string | null = null;   // una por intención; null = la próxima es intención nueva

  enviar(pedido: PedidoRequest): void {
    const clave = (this._claveEnvio ??= crypto.randomUUID());   // el reintento reutiliza la misma
    this._http
      .post<PedidoResponse>(`${environment.API_URL}pedidos`, pedido, { headers: { 'Idempotency-Key': clave } })
      .subscribe({
        next: () => { this._claveEnvio = null; },   // cumplida: la siguiente intención usa otra key
        error: (e: HttpErrorResponse) => {
          // se conserva la key: reintentar es la misma intención. 409 = ya se está procesando.
          if (e.status === 409) this._avisarEnCurso();
        },
      });
  }
}
```

- Si el usuario **cambia los datos** después de un error, es otra intención: `this._claveEnvio = null`.
  Mismo key con otro body es un error de uso (el backend puede rechazarlo).
- `crypto.randomUUID()` solo en contexto seguro (HTTPS o `localhost`).
- `errorInterceptor` deja pasar el `409` a quien llama (§5.3); el reintento automático sigue siendo solo `GET`.

### 5.8 Funcionales vs. basados en clase (DI)

`HttpClient` admite dos formas de interceptor: **funcionales** (`HttpInterceptorFn`, con
`withInterceptors([...])`) y **basados en clase** (`HttpInterceptor`, con
`HTTP_INTERCEPTORS`/`withInterceptorsFromDi()`). El equipo usa **siempre funcionales**: tienen un
orden de ejecución predecible (el orden del array), mientras que el orden de los basados en clase
depende del árbol de DI y es difícil de predecir en apps con inyección jerárquica. Los
`HttpInterceptor` de clase solo aparecen si hay que integrar una librería de terceros que ya viene
así.

### 5.9 `withXhr` vs. fetch, y progreso de subida

`HttpClient` usa **`fetch`** como backend por defecto (no hace falta `withFetch()`). Si el proyecto
necesita **progreso de subida** de archivos (`reportUploadProgress`), hay que agregar `withXhr()`,
porque `fetch` no soporta eventos de progreso de subida:

```ts
export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withXhr(), withInterceptors([...]))],
};
```

Para progreso de **bajada** alcanza `reportDownloadProgress` con el default (`fetch`), sin `withXhr()`.

Si el proyecto no sube archivos con barra de progreso, dejar el default (`fetch`): es la API más
moderna y la que usan `httpResource`/`rxResource` internamente.

Con SSR, nunca `withXhr()` en el servidor: está deprecado y se elimina en v23 (puede reenviar el
header `Authorization` en redirects cross-origin). Si hace falta progreso de subida, registrar
`withXhr()` solo en el `app.config.ts` del navegador.

JSONP (`HttpClient.jsonp`, `HttpClientJsonpModule`) está deprecado desde v22.1: no usarlo en
código nuevo, ni `withJsonpSupport()`, que solo sirve para eso. Una API de terceros que solo ofrece JSONP se consume a través
del backend .NET, que la llama y expone JSON con CORS.

### 5.10 Interceptor de fechas (solo si el contrato lo pide)

**Aplica solo si** el contrato con el backend espera fechas **locales sin offset**
(`yyyy-MM-ddTHH:mm:ss`), acordado con el equipo de backend. Si la API usa ISO UTC o `DateTimeOffset`
(el `Date` se serializa solo con `toISOString()`), **no agregues este interceptor**.

`JSON.stringify` convierte un `Date` a UTC (`toISOString()`), y el backend que espera hora local
recibe un desfase. El interceptor convierte los `Date` del body **antes** de serializar:

```ts
// interceptors/date-interceptor.ts
const pad = (n: number): string => String(n).padStart(2, '0');

const toLocalIso = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
  `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const isPlain = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

const convert = (value: unknown): unknown => {
  if (value instanceof Date) return toLocalIso(value);
  if (Array.isArray(value)) return value.map(convert);
  if (isPlain(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, convert(v)]));
  }
  return value;   // dayjs, Luxon, clases con toJSON, etc.: tal cual, JSON.stringify decide
};

const isPlainJsonBody = (body: unknown): boolean => Array.isArray(body) || isPlain(body);
// solo objetos planos y arrays: saltea FormData, Blob, ArrayBuffer, typed arrays, streams,
// HttpParams, URLSearchParams y strings

export const dateInterceptor: HttpInterceptorFn = (req, next) => {
  const hasBody = req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH';
  if (!hasBody || !isPlainJsonBody(req.body)) return next(req);
  return next(req.clone({ body: convert(req.body) }));   // copia: nunca muta el body original
};
```

- **Solo POST / PUT / PATCH con body JSON.** Se saltean `FormData`, `Blob`, `ArrayBuffer`,
  `HttpParams` y `URLSearchParams` (subidas, descargas, formularios `x-www-form-urlencoded`).
- **Copia recursiva, sin mutar**: el objeto del componente (y el `model` de un Signal Forms) sigue con
  sus `Date`.
- **Posición en el orden** (§5.5): antes de los que miran el body (logging) y independiente del
  resto; típicamente después de `authInterceptor`. Registrarlo en `withInterceptors([...])` como los
  demás.
- **`DateOnly` del backend (`yyyy-MM-dd`) viaja como `string`**, nunca como `Date`: el interceptor la
  mandaría como `...T00:00:00` y `System.Text.Json` la rechaza. Tampoco `new Date('yyyy-MM-dd')`: es
  medianoche UTC y en UTC-3 muestra el día anterior. Si hace falta un `Date` para mostrar, armarlo con
  componentes: `new Date(y, m - 1, d)`. Solo si el contrato del backend usa `DateOnly`.
- Solo toca el **envío**. Las fechas que llegan en la respuesta son `string`: convertirlas en el mapeo
  Response a modelo ([02](./02-typescript-signals.md) §2.11), no en este interceptor.
- Para `GET`, las fechas en query params se formatean donde se arma la URL, no acá.

---
