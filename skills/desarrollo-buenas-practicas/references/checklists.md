## Checklists de verificación y code review

Usar antes de entregar código o al revisar un PR. Cada ítem enlaza a la referencia que lo explica.
Un ítem en "no" bloquea la entrega salvo excepción justificada en el PR.

Índice: Angular (TypeScript / Componente · Estructura y tamaño · Resource / HTTP · Interceptores ·
Formularios · HTML / Template · SCSS · Testing · Performance / Zoneless) · HTML5 / CSS3 ·
Proceso del agente.

---

## Checklist Angular

### TypeScript / Componente ([02](./02-typescript-signals.md))
- [ ] ¿Componente standalone, **sin** `standalone: true` y **sin** `changeDetection` declarado?
- [ ] ¿Archivo y clase **sin sufijos** legacy (`.component`, `.service`)? ¿kebab-case? ([01](./01-project-structure.md) §1.3)
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
- [ ] **¿CERO `effect()` para sincronizar estado?** ¿Cada caso resuelto con computed / linkedSignal / resource / interceptor?
- [ ] **¿CERO `Observable` / `Subject` / `BehaviorSubject` / `subscribe` guardado como estado?**
- [ ] ¿Debounce con `debounced()` (leído con `.value()`), no con `debounceTime` a mano?
- [ ] ¿Orden de declaraciones: injects → inputs/outputs → variables → signals → constructor → ngOnInit → públicas (onXxx primero) → privadas? (§2.6)
- [ ] ¿Imports ordenados: Angular → terceros → propios (core → shared → feature)?
- [ ] ¿DTOs **uno por operación** en `models/dtos/`? ¿Nulos del backend controlados antes de calcular? (§2.11)

### Estructura y tamaño ([01](./01-project-structure.md))
- [ ] ¿Servicios y modelos ubicados según su **alcance** (§1.1)? ¿Modelos fuera del componente?
- [ ] ¿Servicios divididos por responsabilidad (HTTP puro vs lógica vs mappers)? (§1.4.2)
- [ ] **¿Tamaños dentro del límite?** Componente `.ts` ≤ 200 líneas, template `.html` ≤ 200, servicio ≤ 250, `.scss` ≤ 150. (§1.4)
- [ ] ¿Componentes particionados en **Smart** (página/orquestador) vs **Dumb** (hijos presentacionales)?
- [ ] ¿Subcomponentes anidados **directamente** en la carpeta del padre (`detalle/subdetalle/subdetalle-cabecera/`)?
- [ ] **¿CERO carpetas `components/`** fuera de `shared/components/`?
- [ ] ¿Sin barrel files (`index.ts`)? ¿Sin imports cruzados entre features?

### Resource / HTTP ([04](./04-resource-api.md))
- [ ] ¿GET reactivos por URL con `httpResource()`? ¿Observable existente con `rxResource()` (`params` + `stream`)?
- [ ] ¿Los signals dentro de `params` están **invocados** (`this.x()`, no `this.x`)?
- [ ] ¿Fetch condicional devolviendo `undefined` ⇒ `idle` cuando no hay valor válido? (§4.5)
- [ ] ¿El `value()` se mapea/filtra con `computed` (no con `effect`)?
- [ ] ¿Las lecturas de `value()` están guardadas con `hasValue()` / `@else if`, o hay `defaultValue`?
- [ ] ¿Se manejan los estados `loading` / `error` en el template, no solo el éxito?
- [ ] ¿Mutaciones (POST/PUT/DELETE) por `HttpClient` en el servicio + `reload()` / `update()`, **no** por resource? (§4.12)
- [ ] ¿Params de query con `HttpParams` u objeto `params`, no concatenando strings?
- [ ] ¿Se valida el shape de la respuesta (`parse` con Zod/Valibot) cuando el contrato no es confiable?

### Interceptores / concerns transversales ([05](./05-http-interceptors.md))
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

### SCSS ([07](./07-styles-scss.md))
- [ ] ¿`@use` / `@forward`, nunca `@import`? (§7.1)
- [ ] ¿Colores, breakpoints y tamaños desde tokens globales? ¿Tipografía fluida con `clamp()`? (§7.2)
- [ ] ¿Estilos anidados bajo el bloque BEM, máximo 3 niveles? (§7.3)
- [ ] ¿Sin `::ng-deep` ni `:host-context()`? ¿NG-ZORRO personalizado por theming o clases globales con prefijo? (§7.4, §7.5)
- [ ] ¿`:focus-visible` para foco accesible? ¿`prefers-reduced-motion` contemplado? (§7.7)

### Testing ([08](./08-testing-vitest.md))
- [ ] ¿Test `*.spec.ts` con Vitest, junto al archivo probado?
- [ ] ¿Estructura AAA y nombre del `it` que describe comportamiento, no implementación?
- [ ] ¿`await fixture.whenStable()` en vez de `detectChanges()` con zoneless? ¿Sin `fakeAsync`?
- [ ] ¿Inputs seteados con `fixture.componentRef.setInput()`?
- [ ] ¿HTTP mockeado con `provideHttpClientTesting()` + `HttpTestingController` y `verify()` al final?
- [ ] ¿Queries por rol / `aria-*` en vez de clases CSS?

### Performance / Zoneless ([09](./09-performance-zoneless.md))
- [ ] ¿Sin Zone.js, sin `provideZoneChangeDetection`, sin `Eager`?
- [ ] ¿Sin `setTimeout` / promesas sueltas que esperen refrescar la vista? (§9.1)
- [ ] ¿Rutas pesadas con `loadComponent` / `loadChildren`? ¿Componentes pesados detrás de `@defer`?
- [ ] ¿Servicios pesados con `injectAsync()` (+ `prefetch: onIdle` si corresponde)?
- [ ] ¿Listas largas con virtual scroll (CDK o `nzVirtualScroll`)? (§9.9)
- [ ] ¿Subscripciones inevitables cerradas con `takeUntilDestroyed()` / `DestroyRef`? (§9.11)
- [ ] ¿Budgets de `angular.json` respetados?

---

## Checklist HTML5 / CSS3

### HTML ([12](./12-html5-semantics-seo.md))
- [ ] ¿`<!DOCTYPE html>`, `<html lang>`, `<meta charset>` y `<meta viewport>` presentes?
- [ ] ¿Un único `<h1>` y jerarquía `<h2>`–`<h6>` sin saltos?
- [ ] ¿Landmarks en lugar de `<div>` genéricos?
- [ ] ¿`<img>` con `alt`? ¿`loading="lazy"` solo fuera del *above the fold*?
- [ ] ¿`<label>` asociado a cada input? ¿`autocomplete` e `inputmode` correctos?
- [ ] ¿Tipos de input semánticos + `required` / `pattern` para validación nativa?
- [ ] ¿Enlaces externos con `target="_blank"` llevan `rel="noreferrer"`?
- [ ] ¿Elemento nativo antes que `role="…"`? (sin ARIA es mejor que ARIA mal puesta, §12.6)
- [ ] ¿`<title>` por ruta (`title` en `Route` / `TitleStrategy`) y metadatos SEO? (§12.8)
- [ ] ¿Foco gestionado al navegar entre vistas? (§12.9)

### CSS ([13](./13-css3-layouts-animations.md))
- [ ] ¿`box-sizing: border-box` global?
- [ ] ¿Sin `!important` (salvo excepción justificada) ni IDs como selectores de estilo?
- [ ] ¿`gap` en vez de márgenes para separar hijos de flex/grid?
- [ ] ¿Contenedor con padding lateral fijo + contenido en `%` / `vw` / `vh` antes de media queries? (§13.11)
- [ ] ¿Layouts responsive con `auto-fill` / `auto-fit` + `minmax()` o `@container` antes que media queries?
- [ ] ¿`z-index` aplicado sobre un stacking context real?
- [ ] ¿Transiciones con propiedades concretas (no `all`)? ¿Se anima `transform` / `opacity`, no layout?
- [ ] ¿Aparición/desaparición de `<dialog>` / popovers con `@starting-style` + `allow-discrete`?
- [ ] ¿Tema claro/oscuro con `color-scheme` + `light-dark()` en vez de duplicar reglas?
- [ ] ¿APIs que no son Baseline (`interpolate-size`, `base-select`, scroll-driven, anchor positioning) bajo `@supports` con fallback?
- [ ] ¿`@media (prefers-reduced-motion: reduce)` contemplado?

---

## Checklist de proceso del agente ([11](./11-workflow-orchestration.md), [14](./14-agent-efficiency.md))
- [ ] ¿Se leyó el código existente y sus usos antes de editar?
- [ ] ¿Tarea de 3+ pasos con plan previo en `tasks/todo.md`?
- [ ] ¿Tests, build y lint corridos antes de reportar "terminado"?
- [ ] ¿El cambio se limita a lo pedido (sin refactors "de paso")?
- [ ] ¿Trabajo mecánico delegado a subagentes de menor potencia cuando era posible?
- [ ] ¿Respuestas al usuario en modo caveman (salvo excepciones de seguridad y artefactos persistidos)?
