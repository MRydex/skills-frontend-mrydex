## Checklists de verificación y code review

Usar antes de entregar código o al revisar un PR. Cada ítem enlaza a la referencia que lo explica.
Un ítem en "no" bloquea la entrega salvo excepción justificada en el PR.

Índice: Angular (TypeScript / Componente · Estructura y tamaño · Resource / HTTP · Interceptores ·
Formularios · HTML / Template · SCSS · Sin tests · Performance / Zoneless · Tiempo real · Microfrontends) ·
HTML5 / CSS3 · Seguridad ·
Proceso del agente · Verificación rápida (Do & Don't).

---

## Checklist Angular

### TypeScript / Componente ([02](./02-typescript-signals.md))
- [ ] ¿`changeDetection` según versión? v22+: sin declarar. Menor a v22: `ChangeDetectionStrategy.OnPush` en todo componente. ¿`standalone: true` solo en v18 o menor? (§2.2)
- [ ] ¿Archivo y clase **sin sufijos** legacy (`.component`, `.service`, `.directive`), y pipes, guards, resolvers e interceptors con sufijo? ¿kebab-case? ([01](./01-project-structure.md) §1.3)
- [ ] ¿`input()` / `input.required()` / `model()` / `output()` (no decoradores), marcados `readonly`?
- [ ] ¿Los miembros que solo usa el template están `protected`?
- [ ] ¿Sin `@HostBinding` ni `@HostListener` (todo en `host: {}`)?
- [ ] ¿Las propiedades `private` tienen prefijo `_`? ¿Sin `public` explícito?
- [ ] ¿Estado escribible encapsulado: `private _signal` + `readonly` + método mutador?
- [ ] ¿Handlers de eventos del usuario con prefijo `on` y sufijo descriptivo?
- [ ] ¿`inject()` (no constructor injection)? ¿Servicios nuevos con `@Service()`?
- [ ] ¿Modales creados por TS reciben `nzViewContainerRef` cuando comparten providers?
- [ ] ¿Sin `any`? (`unknown` si es incierto) ¿Tipos explícitos cuando la inferencia no alcanza?
- [ ] ¿El estado usa **signals**? ¿El derivado usa `computed()` / `linkedSignal()`?
- [ ] ¿Sin mutación in-place de arrays/objetos dentro de signals (siempre nueva referencia)?
- [ ] ¿Lecturas dentro de `computed()` que no deben recalcular envueltas en `untracked()`? (§2.5)
- [ ] **¿CERO `effect()`?** ¿Cada caso resuelto con computed / linkedSignal / resource / interceptor?
- [ ] **¿CERO `Observable` / `Subject` / `BehaviorSubject` / `subscribe` guardado como estado?**
- [ ] ¿Debounce con `debounced()` (leído con `.value()`), no con `debounceTime` a mano?
- [ ] ¿Orden de declaraciones: injects → inputs/outputs → variables → signals → constructor → ngOnInit → públicas (onXxx primero) → privadas? (§2.6)
- [ ] ¿Imports ordenados: Angular → terceros → propios (core → shared → feature)?
- [ ] ¿Contrato con el back en `models/dtos/`: `<Accion><Entidad>Request` lo enviado, `<Entidad>Response` lo recibido, uno por operación y con el mismo nombre que en C#? ¿Se mapea a un modelo del front solo si la vista necesita otra forma, con `to<Destino>()` en `[feature]-mappers.ts`? ¿El servicio HTTP desenvuelve `ApiResponse<T>` cuando viene y devuelve siempre el `Response`? ¿Nulos del backend controlados antes de calcular? (§2.11)

### Estructura y tamaño ([01](./01-project-structure.md))
- [ ] ¿Servicios y modelos ubicados según su **alcance** (§1.1)? ¿Modelos fuera del componente?
- [ ] ¿Servicios divididos por responsabilidad (HTTP puro vs lógica vs mappers)? (§1.4.2)
- [ ] **¿Tamaños dentro del límite?** Componente `.ts` ≤ 200 líneas, template `.html` ≤ 200, servicio ≤ 250, `.scss` ≤ 150. (§1.4)
- [ ] ¿Si se dividió, partido en **Smart** (página/orquestador) vs **Dumb** (hijos presentacionales)?
- [ ] ¿Subcomponentes anidados **directamente** en la carpeta del padre (`detalle/subdetalle/subdetalle-cabecera/`)?
- [ ] **¿CERO carpetas `components/`** fuera de `shared/components/`?
- [ ] ¿Sin barrel files (`index.ts`)? ¿Sin imports cruzados entre features?
- [ ] ¿Se buscó un componente existente antes de crear uno nuevo? ¿UI repetida unificada en un solo componente reutilizable (o reportada si está fuera del alcance)? (§1.5)

### Resource / HTTP ([04](./04-resource-api.md))
- [ ] ¿GET reactivos por URL con `httpResource()`? ¿Observable existente con `rxResource()` (`params` + `stream`)?
- [ ] ¿Los signals dentro de `params` están **invocados** (`this.x()`, no `this.x`)?
- [ ] ¿Fetch condicional devolviendo `undefined` ⇒ `idle` cuando no hay valor válido? (§4.5)
- [ ] ¿El `value()` se mapea/filtra con `computed` (no con `effect`)?
- [ ] ¿Las lecturas de `value()` están guardadas con `hasValue()` / `@else if`, o hay `defaultValue`?
- [ ] ¿Se manejan los estados `loading` / `error` en el template, no solo el éxito?
- [ ] ¿Mutaciones (POST/PUT/DELETE) por `HttpClient` en el servicio + `reload()` / `update()`, **no** por resource? (§4.12)
- [ ] ¿Params de query con `HttpParams` u objeto `params`, no concatenando strings?
- [ ] ¿Datos de ruta con `resources` en la `Route` (no `ResolveFn` nuevo)? ¿`nonBlocking()` solo para lo secundario, con `error()` manejado en el template? ([09](./09-performance-zoneless.md) §9.6.2)
- [ ] ¿Se valida el shape de la respuesta (`parse` con Zod/Valibot) cuando el contrato no es confiable?

### Interceptores / concerns transversales ([05](./05-http-interceptors.md))
- [ ] ¿`ErrorHandler` global que filtra `HttpErrorResponse` (ya notificado) + `provideBrowserGlobalErrorListeners()`? (§5.3.1)
- [ ] ¿Spinner y errores resueltos por **interceptores funcionales**, NO por `effect` por recurso?
- [ ] ¿El spinner usa un **contador de peticiones** (sin parpadeo con requests concurrentes)?
- [ ] ¿El interceptor de errores mapea el **status real** y delega en `ErrorNotifier`?
- [ ] ¿La librería del modal está aislada en `ErrorNotifier` (el interceptor no la conoce)?
- [ ] ¿Tokens de contexto (`SKIP_SPINNER`, `SKIP_ERROR_HANDLER`) para opt-out por request?
- [ ] ¿Interceptores registrados en el orden correcto en `app.config.ts`? ¿Sin `withFetch()` (fetch es el default)?
- [ ] ¿Retries solo en métodos idempotentes y con límite?

### Formularios ([06](./06-signal-forms.md))
- [ ] ¿Es **Signal Forms**? (cero `FormGroup` / `FormControl` / `ngModel` / `valueChanges`)
- [ ] ¿El `<form>` tiene `[formRoot]` y los campos `[formField]`?
- [ ] ¿Un solo envoltorio genérico (`<ng-content>`) que lee `required` / errores del `FieldTree`, sin reexponer atributos del control? ¿Layout con SCSS propio (BEM + Grid), sin `nz-row` / `nz-col` / `nz-form-item` ni `row` / `col-md-*`, reutilizando el `@mixin` de grilla si ya existe? (§7.11) ([06](./06-signal-forms.md) §6.10)
- [ ] ¿Controles de NG-ZORRO si está instalado, si no Angular Material, si no propios? ¿Una sola librería por formulario? (§6.10)
- [ ] ¿Cero `effect()`? Campos dependientes con opciones `computed()` y, si hace falta, `validate()` / `validateTree()` (§6.10)
- [ ] ¿Los campos `hidden` usan `valueOf(path.x)` en el schema y `@if (!f.x().hidden())` en el template?
- [ ] ¿Validaciones en el schema (`required`, `email`, `validateTree` para cruzadas, `validateAsync` / `validateHttp` para async)?
- [ ] ¿Errores visibles solo con `touched() && invalid()`, con `aria-invalid` y `aria-describedby`?
- [ ] ¿El submit se habilita con el estado del form (`form().valid()`)?
- [ ] ¿`disabled` / `readonly` / `hidden` declarados en el schema con `when`, no en el template? ¿Campos `hidden` envueltos en `@if`?
- [ ] ¿Controles propios implementan `FormValueControl` / `FormCheckboxControl` (no `ControlValueAccessor`)?

### HTML / Template ([03](./03-html-templates.md))
- [ ] ¿Pasa AXE y cumple WCAG AA? ¿Usa `@angular/aria` para patrones complejos?
- [ ] ¿Landmarks (`<main>`, `<header>`, `<nav>`, `<section>`) y `aria-*` solo donde el HTML nativo no alcanza?
- [ ] ¿Clases con **BEM** estricto?
- [ ] ¿Control flow nativo (`@if`, `@for` con `track` por identidad, `@switch`, `@empty`, `@let`, `@defer`)?
- [ ] ¿**Sin `[ngClass]` ni `[ngStyle]`** (usar `[class.x]` / `[style.x]`)?
- [ ] ¿Templates simples, sin llamadas a métodos del `.ts` ni lógica compleja (usar `computed` / `@let`)? (§3.5)
- [ ] ¿`NgOptimizedImage` para imágenes estáticas? ¿`priority` en la imagen LCP?
- [ ] ¿Two-way binding con `model()`?
- [ ] ¿Estilos de bloque dentro de un `<div>` en los `<td>`, nunca en el `<td>`?
- [ ] ¿Sin mediciones de layout (`scrollHeight`, `offsetWidth`…) en el template? (usar `appOverflowDetector`, §3.8)
- [ ] ¿Componentes pesados o diferidos (modales, drawers, auditorías) envueltos en `@defer`?
- [ ] ¿Widgets que pueden fallar al renderizar envueltos en `@boundary` con `@error` + `$reset()`, sin mostrar detalles internos? (§3.12)
- [ ] ¿Textos y acciones de contenedores (diálogos, tarjetas) por `<ng-content>`, no un `input()` por texto? (§3.13)
- [ ] ¿`$event.stopPropagation()` inline, sin directiva para eso? (§3.14)
- [ ] ¿Directivas con selector sobre lo existente, exclusión con `:not([x])`, alias en el input homónimo y estilos por `host: {}`? (§3.15)

### SCSS ([07](./07-styles-scss.md))
- [ ] ¿`@use` / `@forward`, nunca `@import`? ¿`@use` sin ruta relativa (`@use 'modulo/modulo-parte' as x`, vía `includePaths`)? ¿Partials en `assets/styles/<modulo>/`? (§7.1)
- [ ] ¿Colores, breakpoints y tamaños desde tokens globales? ¿Tipografía fluida con `clamp()`? (§7.2)
- [ ] ¿Estilos anidados bajo el bloque BEM, máximo 3 niveles? (§7.3)
- [ ] ¿Elementos y modificadores con `&__` / `&--`, sin reescribir la clase completa ni juntar `&__elemento--modificador`? (§7.3)
- [ ] ¿Sin `::ng-deep` ni `:host-context()`? ¿NG-ZORRO personalizado por theming o clases globales con prefijo? (§7.4, §7.5)
- [ ] ¿`:focus-visible` para foco accesible? ¿`prefers-reduced-motion` contemplado? (§7.7)
- [ ] ¿Sin SCSS duplicado? Lo repetido extraído a su capa ITCSS (token, `@mixin`, `.o-*`, `.u-*`); sin `@extend`; el componente solo hace `@use` de `_index.scss` y de la carpeta de su módulo. (§7.10)

### Sin tests ([08](./08-sin-tests.md))
- [ ] ¿Ningún `*.spec.ts` / `*.test.ts` nuevo? ¿`angular.json` con `skipTests: true` en los schematics? (§8.1)
- [ ] ¿Verificado con `ng build`, lint y prueba manual en la app? (§8.3)

### Performance / Zoneless ([09](./09-performance-zoneless.md))
- [ ] ¿Sin Zone.js, sin `provideZoneChangeDetection`, sin `Eager`?
- [ ] ¿Sin `setTimeout` / promesas sueltas que esperen refrescar la vista? (§9.1)
- [ ] ¿Rutas pesadas con `loadComponent` / `loadChildren`? ¿Componentes pesados detrás de `@defer`?
- [ ] ¿Links a la misma ruta recrean el componente (`shouldReuseRoute = () => false` + `onSameUrlNavigation: 'reload'`) en vez de limpiar estado a mano? ¿Estrategia restaurada en `onDestroy`? (§9.6.1)
- [ ] ¿Servicios pesados con `injectAsync()` (+ `prefetch: onIdle` si corresponde)?
- [ ] ¿Listas largas con virtual scroll (CDK o `nzVirtualScroll`)? (§9.9)
- [ ] ¿Subscripciones inevitables cerradas con `takeUntilDestroyed()` / `DestroyRef`? (§9.11)
- [ ] ¿Sin `withExperimentalPlatformNavigation()` en producción? (§9.6.3)
- [ ] ¿Budgets de `angular.json` respetados?

### Tiempo real / SignalR ([16](./16-websocket-signalr.md))
- [ ] ¿Un servicio singleton por hub y una sola conexión por pestaña, también al navegar? (§16.2)
- [ ] ¿URL del hub desde config en runtime, `wss://`, mismo origen? (§16.3)
- [ ] ¿`withAutomaticReconnect` con política propia que no se rinde, y reintento del primer `start()`? (§16.3, §16.5)
- [ ] ¿Estado en signals `asReadonly()`, sin `Subject` ni `effect()`, listas acotadas? (§16.4)
- [ ] ¿`start` / `stop` serializados e idempotentes, `hub.on` una vez por hub, `stop()` en logout sin que `onclose` reconecte? (§16.5, §16.6)
- [ ] ¿Al reconectar se vuelve a unir a los grupos y se recarga por HTTP lo perdido? ¿Estado visible con `aria-live`? (§16.6)
- [ ] ¿Eventos en objeto `as const` 1:1 con el back, payload `unknown` + parser? (§16.7)
- [ ] ¿Todo handler de un consumidor que se destruye tiene su `off`, registrado antes del primer `await`? (§16.8)
- [ ] ¿Identidad solo por token (`accessTokenFactory`), nunca `?username=`? (§16.9)

### Microfrontends ([17](./17-microfrontends.md))
- [ ] ¿Adopción justificada con ADR (equipos o deploys independientes), no para reusar componentes? (§17.1)
- [ ] ¿Native Federation v4 con el mismo major que Angular, y versión exacta de todo lo compartido en shell y remotes? (§17.2, §17.10)
- [ ] ¿`federation.config.mjs` con `singleton` + `strictVersion`, `ignoreUnusedDeps`, `exposes` solo rutas o un componente de entrada? (§17.4)
- [ ] ¿Shell y remotes con la misma estrategia de `shared`, la cadena completa de libs con DI en el `remoteEntry.json` del shell, y versiones **instaladas** idénticas? (§17.4, §17.10)
- [ ] ¿`loadRemoteModule` del resultado de `initFederation` (por DI), no el importado del paquete? (§17.3)
- [ ] ¿URLs de remotes solo en `federation.manifest.json` por entorno? (§17.5, §17.12)
- [ ] ¿`loadRemoteModule` con fallback y guard `canMatch` en el shell? (§17.6)
- [ ] ¿Estado de negocio dentro de cada microfrontend? ¿Lo compartido es URL, inputs/outputs, servicio singleton de la librería o eventos tipados? (§17.7)
- [ ] ¿Remote sin `provideHttpClient` ni login propio, sin importar código de otro remote? (§17.8)
- [ ] ¿El Bearer llega al API del remote (su prefijo como destino propio en el interceptor de auth del shell) y un 401 del remote no cierra la sesión del shell? (§17.8)
- [ ] ¿Tema global solo en el shell? ¿Estilos del remote encapsulados, `ViewEncapsulation.None` solo en el componente expuesto y bajo su clase? (§17.9)
- [ ] ¿Estilos globales del remote dentro del componente expuesto: partial propio con `@use` y la librería con `meta.load-css` acotado? (§17.9)
- [ ] ¿Clase de overlay en todo overlay del remote? ¿Íconos nuevos en la librería, no en una copia del remote? (§17.9)
- [ ] ¿Widget expuesto cargado con `resource` + `loadRemoteModule`, contrato por inputs/outputs, modo embebido que no toca título, favicon, tema ni sesión del shell? (§17.6.1)
- [ ] ¿`remoteEntry.json` y manifest sin cache, CORS con origen exacto? (§17.11)

---

## Checklist HTML5 / CSS3

### HTML ([12](./12-html5-semantics-seo.md))
- [ ] ¿`<!DOCTYPE html>`, `<html lang>`, `<meta charset>` y `<meta viewport>` presentes?
- [ ] ¿Un único `<h1>` y jerarquía `<h2>`–`<h6>` sin saltos?
- [ ] ¿Landmarks en lugar de `<div>` genéricos?
- [ ] ¿`<img>` con `alt`? ¿`loading="lazy"` solo fuera del *above the fold*?
- [ ] ¿`<label>` asociado a cada input? ¿`autocomplete` e `inputmode` correctos?
- [ ] ¿Tipos de input semánticos + `required` / `pattern` para validación nativa?
- [ ] ¿Enlaces externos con `target="_blank"` llevan `rel="noopener noreferrer"`?
- [ ] ¿Elemento nativo antes que `role="…"`? (sin ARIA es mejor que ARIA mal puesta, §12.6)
- [ ] ¿`<title>` por ruta (`title` en `Route` / `TitleStrategy`) y metadatos SEO? (§12.8)
- [ ] ¿Foco gestionado al navegar entre vistas? (§12.9)

### CSS ([13](./13-css3-layouts-animations.md))
- [ ] ¿`box-sizing: border-box` global?
- [ ] ¿Sin `!important` (salvo excepción justificada) ni IDs como selectores de estilo?
- [ ] ¿`gap` en vez de márgenes para separar hijos de flex/grid?
- [ ] ¿Texto del back o del usuario con `overflow-wrap: anywhere` (no `word-break: break-word` ni `break-all`) y `min-width: 0` en hijos de flex/grid, para que un texto largo no rompa la UI? (§13.5)
- [ ] ¿Contenedor con padding lateral fijo + contenido en `%` / `vw` / `vh` antes de media queries? (§13.11)
- [ ] ¿Layouts responsive con `auto-fill` / `auto-fit` + `minmax()` o `@container` antes que media queries?
- [ ] ¿`z-index` aplicado sobre un stacking context real?
- [ ] ¿Transiciones con propiedades concretas (no `all`)? ¿Se anima `transform` / `opacity`, no layout?
- [ ] ¿Aparición/desaparición de `<dialog>` / popovers con `@starting-style` + `allow-discrete`?
- [ ] ¿Tema claro/oscuro con `color-scheme` + `light-dark()` en vez de duplicar reglas?
- [ ] ¿APIs que no son Baseline (`interpolate-size`, `base-select`, scroll-driven, anchor positioning) bajo `@supports` con fallback?
- [ ] ¿Fondos por densidad con `image-set()` (y `<img>` con `NgOptimizedImage`)? (§13.24)
- [ ] ¿Entrada/salida de `@if` / `@for` con `animate.enter` / `animate.leave` y un solo `@keyframes` (`reverse` para salir), sin `@angular/animations`? (§13.25)
- [ ] ¿`@media (prefers-reduced-motion: reduce)` contemplado?

---

## Checklist de seguridad ([15](./15-security.md))
- [ ] ¿Revisión Red Team del cambio hecha (tabla de §15.2) y sin respuestas "sí"?
- [ ] ¿Sin `bypassSecurityTrust*` con datos externos, sin `nativeElement.innerHTML`, `eval` ni `new Function`? ¿Pipes que devuelven HTML escapan la entrada? (§15.3)
- [ ] ¿`autoCsp` activo en producción? ¿CSP nueva desplegada primero como Report-Only? (§15.4)
- [ ] ¿Token en memoria o cookie `HttpOnly`, nunca en `localStorage`? ¿`authInterceptor` compara origen con `URL`? ¿Autorización validada en backend? (§15.5)
- [ ] ¿XSRF configurado con sesión por cookie? ¿Sin mutaciones por `GET`? (§15.6)
- [ ] ¿`returnUrl` validado como ruta interna? ¿`postMessage` valida `event.origin`? ¿Links externos con `rel="noopener noreferrer"`? (§15.7)
- [ ] ¿Sin secretos en `environment.ts` / `appsettings.json`? ¿Sin PII ni tokens en `console` o storage? ¿Errores genéricos al usuario? (§15.8)
- [ ] ¿Cabeceras de seguridad en `web.config`? (§15.9)
- [ ] ¿`npm audit` y `npm audit --omit=dev` corridos después del último cambio de dependencias, con los hallazgos reportados y sin `high`/`critical` de runtime nuevos? ¿`npm ci` en CI? ¿Dependencia nueva evaluada? ¿SRI en scripts externos? (§15.10)
- [ ] ¿Eventos de seguridad reportados sin datos sensibles? (§15.11)
- [ ] ¿Payload XSS probado a mano en componentes/pipes que renderizan datos externos? (§15.12)

---

## Checklist de proceso del agente ([11](./11-workflow-orchestration.md), [14](./14-agent-efficiency.md))
- [ ] ¿Se leyó el código existente y sus usos antes de editar? (§11.1)
- [ ] ¿`.gitignore` del proyecto excluye todo lo de IA y agentes? (§10.9)
- [ ] ¿Las dudas que cambian el resultado se preguntaron juntas, antes de empezar, con opción recomendada? (§11.6)
- [ ] ¿Estado guardado en `tasks/todo.md` y compactación propuesta al cerrar cada fase? (§14.4)
- [ ] ¿Paso 0 de graphify corrido al inicio de la sesión (instalado, versión al día, hooks, `graphify update .`)?
- [ ] ¿Se consultó `graphify query` antes de buscar o leer archivos? ¿`graphify update .` al cerrar la tarea? (§14.5)
- [ ] ¿Todo resultado de un ejecutor revisado por el modelo seleccionado antes de entregarlo? (§14.3.5)
- [ ] ¿Tarea clasificada chica/grande? ¿La grande tiene `tasks/todo.md` con L1, Specs, Tasks y Log? (§11.2)
- [ ] ¿Revisión según el riesgo del cambio (trivial / medio / alto)? (§11.3)
- [ ] ¿Build y lint (más prueba manual salvo riesgo trivial) antes de reportar "terminado"? (§11.3)
- [ ] ¿El cambio se limita a lo pedido (sin refactors "de paso")? (§11.5)
- [ ] ¿Sin subcomponentes innecesarios? Solo se dividió por límite, reutilización o lógica propia. (§1.4)
- [ ] ¿Sin sobreingeniería? Cada archivo, clase, input y parámetro nuevo tiene un uso hoy; nada "por si acaso". (§11.7.1)
- [ ] ¿Se delegó solo lo que bajaba el total de tokens (lecturas 3+ archivos, ediciones 8+ archivos) y lo chico se hizo directo? (§14.3.4)
- [ ] ¿Respuestas al usuario en modo caveman (salvo excepciones de seguridad y artefactos persistidos)? (§14.1)

---

## Verificación rápida (Do & Don't)

Antes / después de las reglas que más se violan (`SKILL.md`), en un solo componente.

```typescript
// ❌ Legacy en v22+: standalone/changeDetection declarados, decoradores, constructor injection, Observable como estado
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div *ngIf="user$ | async as user" [ngClass]="{active: isActive}">{{ user.name }}</div>` })
export class UserProfileComponent {
  @Input() userId!: string;
  user$ = this.http.get<User>(`/api/users/${this.userId}`);
  constructor(private http: HttpClient) {}
}

// ✅ Angular 22+ (en v19-21 sumar changeDetection: ChangeDetectionStrategy.OnPush)
@Component({
  selector: 'app-user-profile',
  template: `
    @if (userResource.hasValue()) {
      @let user = userResource.value();
      <article class="user-profile" [class.user-profile--active]="isActive()">
        <h2 class="user-profile__name">{{ user.name }}</h2>
        <button type="button" (click)="onSelect()">Seleccionar</button>
      </article>
    } @else if (userResource.isLoading()) {
      <p>Cargando…</p>
    }
  `,
})
export class UserProfile {
  readonly userId = input.required<string>();
  readonly selected = output<string>();
  protected readonly userResource = httpResource<User>(() => `/api/users/${this.userId()}`);
  protected readonly isActive = computed(() => this.userResource.value()?.active ?? false);

  protected onSelect(): void {
    this.selected.emit(this.userId());
  }
}
```
