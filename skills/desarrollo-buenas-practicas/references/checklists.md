## Checklist rápido al generar/revisar código Angular

### TypeScript / Componente
- [ ] ¿Componente standalone, **sin** `standalone: true` y **sin** `changeDetection: OnPush` explícito?
- [ ] ¿Archivo y clase **sin sufijos** legacy (`.component`, `.service`)? ¿kebab-case?
- [ ] ¿Se usan `input()` / `input.required()` / `model()` / `output()` (no decoradores) y marcados `readonly`?
- [ ] ¿Los miembros que solo usa el template están `protected`?
- [ ] ¿No hay `@HostBinding` ni `@HostListener` (todo en `host: {}`)?
- [ ] ¿Las propiedades `private` tienen prefijo `_`? ¿No hay `public` explícito?
- [ ] ¿Estado escribible encapsulado: `private _signal` + `readonly` + método mutador?
- [ ] ¿Handlers de eventos del usuario nombrados con prefijo `on` y sufijo descriptivo?
- [ ] ¿Se usa `inject()` (no constructor injection)? ¿Servicios nuevos con `@Service()`?
- [ ] ¿Modales creados por TS reciben `nzViewContainerRef` cuando comparten providers?
- [ ] ¿No hay `any`? (`unknown` si es incierto) ¿Tipos explícitos cuando la inferencia no alcanza?
- [ ] ¿El estado usa **signals**? ¿El derivado usa `computed()` / `linkedSignal()`?
- [ ] ¿Sin `mutate()` y sin mutación in-place de arrays/objetos en signals?
- [ ] **¿CERO `effect()`?** ¿Cada caso resuelto con computed / linkedSignal / resource / interceptor?
- [ ] **¿CERO `Observable` / `Subject` / `BehaviorSubject` / `subscribe` guardado como estado?**
- [ ] ¿Orden de declaraciones: injects → inputs/outputs → variables → signals → constructor → ngOnInit → públicas (onXxx primero) → privadas?
- [ ] ¿Imports ordenados: Angular → terceros → propios (core → shared → feature)?
- [ ] ¿Servicios y modelos ubicados según su **alcance** (§1.1)? ¿Modelos fuera del componente?
- [ ] ¿DTOs **uno por operación** en `models/dtos/`?
- [ ] ¿Decimales que pueden venir `null` controlados antes de cualquier cálculo?
- [ ] ¿Servicios divididos correctamente (HTTP puro vs lógica)?

### Resource / HTTP
- [ ] ¿GET reactivos por URL con `httpResource()`? ¿Observable existente con `rxResource()` (`params` + `stream`)?
- [ ] ¿Los signals dentro de `params` están **invocados** (`this.x()`, no `this.x`)?
- [ ] ¿Fetch condicional devolviendo `undefined` ⇒ idle cuando no hay valor válido?
- [ ] ¿El `value()` se mapea/filtra con `computed` (no con `effect`)?
- [ ] ¿Las lecturas de `value()` están guardadas con `hasValue()` / `@else if`, o hay `defaultValue`?
- [ ] ¿Mutaciones (POST/PUT/DELETE) van por `HttpClient` directo, **no** por resource?
- [ ] ¿Params de query armados con `HttpParams` u objeto `params` del resource, no concatenando strings?
- [ ] ¿Se valida el shape (Zod/Valibot) cuando corresponde?

### Interceptores / concerns transversales
- [ ] ¿Spinner y errores resueltos por **interceptores funcionales**, NO por `effect` por recurso?
- [ ] ¿El spinner usa un **contador de peticiones** (sin parpadeo con requests concurrentes)?
- [ ] ¿El interceptor de errores mapea el **status real** y delega en `ErrorNotifier`?
- [ ] ¿La librería del modal está aislada en `ErrorNotifier` (el interceptor no la conoce)?
- [ ] ¿Hay tokens de contexto (`SKIP_SPINNER`, `SKIP_ERROR_HANDLER`) para opt-out por request?
- [ ] ¿Interceptores registrados en orden correcto en `app.config.ts`? ¿Sin `withFetch()`?

### Formularios
- [ ] ¿Es **Signal Forms**? (cero `FormGroup`/`FormControl`/`ngModel`/`valueChanges`)
- [ ] ¿El `<form>` tiene `[formRoot]` y los campos `[formField]`?
- [ ] ¿Los errores se muestran solo con `touched() && invalid()`?
- [ ] ¿El submit se habilita con el estado del form (`form().valid()`)?
- [ ] ¿`disabled`/`readonly`/`hidden` declarados en el schema con `when`, no en el template?
- [ ] ¿Controles propios implementan `FormValueControl` / `FormCheckboxControl` (no `ControlValueAccessor`)?

### HTML / Template
- [ ] ¿Pasa AXE y cumple WCAG AA? ¿Usa `@angular/aria` para patrones complejos?
- [ ] ¿Usa landmarks (`<section>`, `<header>`, `<main>`, `<nav>`) y `aria-*` apropiados?
- [ ] ¿Las clases siguen **BEM** estricto?
- [ ] ¿Control flow nativo (`@if`, `@for` con `track`, `@switch`, `@empty`, `@let`, `@defer`)?
- [ ] ¿**Sin `[ngClass]` ni `[ngStyle]`** (usar `[class]` / `[class.x]` / `[style.x]`)?
- [ ] ¿Templates simples, sin funciones del `.ts` ni lógica compleja?
- [ ] ¿`NgOptimizedImage` para imágenes estáticas? ¿`priority` en el LCP?
- [ ] ¿Two-way binding con `model()`?
- [ ] ¿Estilos de bloque dentro de un `<div>` en los `<td>`, nunca en el `<td>`?
- [ ] ¿Sin mediciones de layout (`scrollHeight`, `clientHeight`, `offsetWidth`…) en el template? (usar `appOverflowDetector`, §3.8)

### SCSS
- [ ] ¿Estilos anidados bajo el bloque raíz BEM?
- [ ] ¿Colores, breakpoints y tamaños de fuente desde el archivo de variables global (`@use ... as var`)?
- [ ] ¿Tipografía con tokens fluidos `clamp()` en lugar de tamaños fijos repetidos?
- [ ] ¿`:focus-visible` para foco accesible? ¿Sin `::ng-deep`?

### Testing
- [ ] ¿Test `*.spec.ts` con Vitest, junto al archivo probado?
- [ ] ¿`await fixture.whenStable()` en vez de `detectChanges()` cuando hay async/signals?
- [ ] ¿`provideHttpClientTesting()` para mockear HTTP?

### Performance / Zoneless
- [ ] ¿Sin Zone.js, sin `provideZoneChangeDetection`, sin `Eager` innecesario?
- [ ] ¿Rutas pesadas detrás de `loadChildren`? ¿Componentes pesados detrás de `@defer`?
- [ ] ¿Servicios pesados detrás de `injectAsync` (+ `prefetch: onIdle` si corresponde)?

---


---

## Checklist rápido — HTML5 / CSS3

### HTML
- [ ] ¿`<!DOCTYPE html>`, `<html lang>`, `<meta charset>` y `<meta viewport>` presentes?
- [ ] ¿Un único `<h1>` y jerarquía `<h2>`–`<h6>` correcta?
- [ ] ¿Landmarks (`<main>`, `<header>`, `<nav>`, `<section>`, `<article>`, `<aside>`, `<footer>`)
      en lugar de `<div>` genéricos?
- [ ] ¿`<img>` con `alt`? ¿`loading="lazy"` solo fuera del *above the fold*?
- [ ] ¿`<label>` asociado a cada input (envoltura o `for`/`id`)?
- [ ] ¿Tipos de input semánticos + `required`/`pattern` para validación nativa?
- [ ] ¿Enlaces externos con `target="_blank"` llevan `rel="noreferrer"`?
- [ ] ¿Se usa el elemento nativo antes que `role="…"`?

### CSS
- [ ] ¿`box-sizing: border-box` aplicado globalmente?
- [ ] ¿Sin `!important` (salvo excepción justificada) ni IDs como selectores de estilo?
- [ ] ¿`gap` en vez de márgenes para separar hijos de flex/grid?
- [ ] ¿Contenedor con padding lateral fijo + contenido en `%`/`vw`/`vh` (§16.0) antes de media queries?
- [ ] ¿Tipografía fluida con `clamp()` en tokens (§7.1)?
- [ ] ¿Layouts responsive con `auto-fill`/`auto-fit` + `minmax()` antes que media queries?
- [ ] ¿`z-index` aplicado sobre un stacking context real?
- [ ] ¿Transiciones declaran propiedades concretas (no `all` cuando importa el costo)?
- [ ] ¿Se anima `transform`/`opacity` y no propiedades de layout?
- [ ] ¿Aparición/desaparición de `<dialog>`/popovers con `@starting-style` + `allow-discrete`?
- [ ] ¿`field-sizing: content` para auto-resize de textareas (con fallback)?
- [ ] ¿Animaciones a `auto` con `interpolate-size` bajo `@supports` (o el truco `0fr → 1fr`)?
- [ ] ¿El contenedor de un despliegue animado tiene `overflow: hidden` / `clip`?
- [ ] ¿Tema claro/oscuro con `color-scheme` + `light-dark()` en vez de duplicar reglas?
- [ ] ¿APIs muy recientes (`base-select`, `field-sizing`, scroll-driven) con mejora progresiva?
- [ ] ¿`@media (prefers-reduced-motion: reduce)` contemplado?
