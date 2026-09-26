## 5. Interceptores HTTP — spinner, errores y concerns transversales

Índice: [5.1](#51-por-qué-no-el-patrón-effect-por-recurso-resourceerrorhandler) Por qué no `effect` por recurso ·
[5.2](#52-spinner--interceptor--servicio-con-contador-de-peticiones) Spinner · [5.3](#53-errores--interceptor--fachada-de-modal-lib-agnóstica) Errores ·
[5.4](#54-opt-out-por-request-con-httpcontext-tokens) `HttpContext` opt-out · [5.5](#55-registro-en-appconfigts-el-orden-importa) Registro y orden ·
[5.6](#56-cómo-se-combina-con-la-resource-api) Combinación con Resource API · [5.7](#57-retries) Retries ·
[5.8](#58-funcionales-vs-basados-en-clase-di) Funcionales vs. basados en clase (DI) · [5.9](#59-withxhr-vs-fetch-y-progreso-de-subida) `withXhr` vs. fetch

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
  this.utils.resourceErrorHandler(this.juiciosResource);
  this.utils.resourceErrorHandler(this.juiciosResourceBusqueda);   // hay que acordarse SIEMPRE
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
// shared/services/spinner.ts
@Service()
export class SpinnerService {
  private readonly _activeRequests = signal<number>(0);
  readonly isVisible = computed(() => this._activeRequests() > 0);

  show(): void { this._activeRequests.update((n) => n + 1); }
  hide(): void { this._activeRequests.update((n) => Math.max(0, n - 1)); }
}
```

```ts
// core/http/spinner-interceptor.ts
export const spinnerInterceptor: HttpInterceptorFn = (req, next) => {
  const spinner = inject(SpinnerService);

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
@Service()
export class ErrorNotifier {
  private readonly _modal = inject(NzModalService);   // o MatDialog / MessageService / Swal...

  handle(error: HttpErrorResponse): void {
    const { title, message } = this._mapError(error);
    this._modal.error({ nzTitle: title, nzContent: message });
  }

  private _mapError(error: HttpErrorResponse): { title: string; message: string } {
    switch (error.status) {
      case 0:   return { title: 'Sin conexión', message: 'No se pudo contactar al servidor.' };
      case 400: return { title: 'Solicitud inválida', message: error.error?.message ?? 'Revisá los datos.' };
      case 401: return { title: 'Sesión expirada', message: 'Volvé a iniciar sesión.' };
      case 403: return { title: 'Sin permisos', message: 'No tenés acceso a este recurso.' };
      case 404: return { title: 'No encontrado', message: 'El recurso no existe.' };
      case 500: return { title: 'Error del servidor', message: 'Ocurrió un error inesperado.' };
      default:  return { title: 'Error', message: 'Ocurrió un error. Intentá de nuevo.' };
    }
  }
}
```

```ts
// core/http/error-interceptor.ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(ErrorNotifier);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!req.context.get(SKIP_ERROR_HANDLER)) notifier.handle(error);
      return throwError(() => error);   // re-propaga: el resource sigue viendo error() para UI inline
    }),
  );
};
```

### 5.4 Opt-out por request con `HttpContext` tokens

`HttpContextToken<T>` es la forma tipada de pasar metadata por-request a través de la cadena de
interceptores, sin ensuciar headers ni la URL. Se declara con un valor por defecto (`() => T`):

```ts
// core/http/http-context.ts
export const SKIP_SPINNER = new HttpContextToken<boolean>(() => false);
export const SKIP_ERROR_HANDLER = new HttpContextToken<boolean>(() => false);

// uso en una petición puntual (polling silencioso, error mostrado inline, etc.)
this._http.get<Data>('/api/poll', {
  context: new HttpContext().set(SKIP_SPINNER, true).set(SKIP_ERROR_HANDLER, true),
});
```

### 5.5 Registro en `app.config.ts` (el orden importa)

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      // withFetch() ya NO hace falta: fetch es el backend por defecto de HttpClient (§5.9)
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
> - `authInterceptor` va primero porque solo necesita tocar la request saliente (agregar el header)
>   antes de que se dispare cualquier otra cosa.

### 5.6 Cómo se combina con la Resource API

Con los interceptores puestos, los `httpResource` / `rxResource` **ya tienen** spinner global y modal
de error **sin** cablear nada. El `error()` del resource sigue disponible para **UI contextual /
inline** (mostrar el error dentro de una sección concreta, con botón de reintento).

| Concern                                            | Dónde se resuelve                                                    |
|----------------------------------------------------|------------------------------------------------------------------------|
| Spinner overlay global                             | `spinnerInterceptor` + `SpinnerService`                              |
| Modal/toast genérico de error inesperado           | `errorInterceptor` + `ErrorNotifier`                                 |
| Error **inline** ("esta lista falló, reintentar")  | `resource.error()` / `resource.status()` en el template (ver [04-resource-api.md](./04-resource-api.md) §4.7) |
| Solo inline, sin modal global                      | `SKIP_ERROR_HANDLER` + `resource.error()`                            |
| Mutaciones (POST/PUT/DELETE)                       | `HttpClient` directo → spinner/errores vía interceptor, automáticos  |

### 5.7 Retries

Reintentar peticiones fallidas (timeouts, `502`/`503` puntuales) también es un concern transversal: va
en un interceptor, no repetido con el operador `retry` de RxJS en cada servicio.

```ts
// core/http/retry-interceptor.ts
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo reintentar operaciones idempotentes: GET (y opcionalmente PUT/DELETE si el backend lo garantiza).
  if (req.method !== 'GET') return next(req);

  return next(req).pipe(
    retry({
      count: 2,
      delay: (_error, attempt) => timer(attempt * 500), // backoff simple: 500ms, 1000ms
    }),
  );
};
```

> **Nunca** reintentar POST/PUT/PATCH/DELETE a ciegas: si la primera petición sí llegó a impactar en
> el servidor pero la respuesta se perdió, un retry automático puede duplicar la operación (alta doble,
> pago doble). Si hace falta reintentar una mutación, eso va explícito en el servicio, con una
> idempotency key o confirmación del backend, no en el interceptor global.

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

Si el proyecto no sube archivos con barra de progreso, dejar el default (`fetch`): es la API más
moderna y la que usan `httpResource`/`rxResource` internamente.

---
