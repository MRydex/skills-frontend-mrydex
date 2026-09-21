## 5. Interceptores HTTP — spinner, errores y concerns transversales

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
(incluidas las que hacen `httpResource`/`rxResource` por debajo), con contador y con mapeo de status.

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
      // withFetch() ya NO hace falta: Fetch es el default en v22
      withInterceptors([
        authInterceptor,      // 1) agrega token a la request saliente
        spinnerInterceptor,   // 2) prende/apaga el overlay
        errorInterceptor,     // 3) captura el error en la respuesta entrante
      ]),
    ),
  ],
};
```

> Los interceptores se ejecutan en orden para la **request** y en orden **inverso** para la
> **response**. Por eso `errorInterceptor` va al final: ve el error después de los demás.
> Si el proyecto necesita progreso de **subida** de archivos, agregar `withXhr()` (Fetch no lo
> soporta) y usar `reportUploadProgress`.

### 5.6 Cómo se combina con la Resource API

Con los interceptores puestos, los `httpResource` / `rxResource` **ya tienen** spinner global y modal
de error **sin** cablear nada. El `error()` del resource sigue disponible para **UI contextual /
inline** (mostrar el error dentro de una sección concreta, con botón de reintento).

| Concern                                            | Dónde se resuelve                                                    |
|----------------------------------------------------|----------------------------------------------------------------------|
| Spinner overlay global                             | `spinnerInterceptor` + `SpinnerService`                              |
| Modal/toast genérico de error inesperado           | `errorInterceptor` + `ErrorNotifier`                                 |
| Error **inline** ("esta lista falló, reintentar")  | `resource.error()` / `resource.status()` en el template              |
| Solo inline, sin modal global                      | `SKIP_ERROR_HANDLER` + `resource.error()`                            |
| Mutaciones (POST/PUT/DELETE)                       | `HttpClient` directo → spinner/errores vía interceptor, automáticos  |

---
