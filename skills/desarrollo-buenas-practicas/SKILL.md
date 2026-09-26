---
name: desarrollo-buenas-practicas
version: 1.2.0
description: >
  Convenciones oficiales del equipo para proyectos Angular 22+ (2026) y Frontend Moderno: standalone components, signals como único modelo de reactividad, zoneless, OnPush por defecto, control flow nativo (@if/@for/@switch/@let), Signal Forms, Resource API (httpResource/rxResource/resource), interceptores funcionales (spinner/errores), TypeScript 6 estricto, HTML5 semántico y accesible (WCAG AA / @angular/aria), BEM, SCSS anidado, layouts fluidos (Flexbox/Grid), animaciones modernas, testing con Vitest, performance y despliegue en IIS/.NET. Usar siempre que se pida crear, modificar, revisar, testear, depurar o refactorizar código Angular, TypeScript de proyectos Angular, HTML o SCSS/CSS, aunque el usuario no mencione Angular explícitamente. Define además cómo trabaja el agente en cualquier herramienta (Claude Code, Codex, Antigravity, Cursor, Copilot): modo caveman, modelo fuerte que orquesta y revisa con subagentes baratos, graphify, autocompactación y preguntas previas.
---

# Desarrollo Frontend — Buenas Prácticas del Equipo (Angular 22+)

Convenciones **obligatorias** del equipo para Angular 22+ y frontend moderno, más las reglas de cómo trabaja el agente. Leer primero las 8 reglas y el modo de operación; el detalle vive en `references/`.

> **Regla maestra**: si una API legacy tiene un equivalente moderno (signals, control flow nativo, `inject()`, `input()`, `httpResource`, Signal Forms, `host: {}`, interceptores funcionales), **siempre usar el moderno**. Cualquier uso de la API legacy debe estar justificado por interoperabilidad con código existente y documentado en el PR.

---

### Las 8 reglas que más se violan (leer siempre)

1. **Nunca `effect()` para sincronizar estado.** Derivar con `computed()` / `linkedSignal()`, cargar datos con la Resource API y resolver concerns transversales con interceptores. Por qué: `effect()` crea cascadas de escrituras difíciles de razonar y de testear. Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
2. **Nunca `Observable` / `Subject` / `BehaviorSubject` como estado.** El estado es siempre signals. RxJS solo dentro de servicios, para flujos (`rxResource`, eventos). Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
3. **Nunca Reactive Forms ni `ngModel`.** Solo **Signal Forms** (`@angular/forms/signals`). Ver [06-signal-forms.md](./references/06-signal-forms.md).
4. **`changeDetection` según la versión de `@angular/core` en `package.json`.** v22 o mayor: **no declararlo** (OnPush es el default). Menor a v22: **siempre** `changeDetection: ChangeDetectionStrategy.OnPush`. `standalone: true` solo en v18 o menor (default desde v19). Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
5. **Nunca `*ngIf` / `*ngFor` / `*ngSwitch` / `[ngClass]` / `[ngStyle]`.** Usar control flow nativo y bindings `[class.x]` / `[style.x]`. Ver [03-html-templates.md](./references/03-html-templates.md).
6. **Nunca archivos monolíticos.** Máximo: componente `.ts` 200 líneas, template `.html` 200, servicio 250, `.scss` 150. Si se pasa, dividir por responsabilidad: subcomponentes presentacionales (`input()` / `output()`) y sub-servicios (lógica / HTTP). Ver [01-project-structure.md](./references/01-project-structure.md).
7. **Nunca carpeta `components/` para subcomponentes.** Cada hijo se anida dentro de la carpeta del padre que lo usa: `detalle/subdetalle/subdetalle-cabecera/`. El árbol de carpetas refleja el árbol de componentes. Única excepción: `shared/components/`, para componentes reutilizados por varias features. Ver [01-project-structure.md](./references/01-project-structure.md).
8. **Nunca sufijos `.component` / `.service` / `Component` / `Service`.** Archivo `user-list.ts` exporta `UserList`. Ver [01-project-structure.md](./references/01-project-structure.md).

---

### Modo de operación del agente

Rige durante toda la sesión desde que la skill se carga. Para que rija también en sesiones que no tocan Angular, instalar los archivos puente en el repo (`--bridge`: `CLAUDE.md`, `AGENTS.md`, `.cursorrules`), que el agente lee siempre.

0. **Adaptarse al agente y a los modelos en uso.** Al empezar, detectar en qué agente corre la skill (Claude Code, Codex, Antigravity, Cursor, Copilot, Gemini CLI, otro) y qué modelos tiene disponibles. Todo nombre concreto de esta skill (Opus, Sonnet, Haiku, `/compact`, `AskUserQuestion`, `SendMessage`, `Agent`) es un **ejemplo**: traducirlo al equivalente del agente en uso. Si no hay equivalente, aplicar el fallback documentado. Las reglas no cambian; cambia solo la sintaxis. Ver [14-agent-efficiency.md](./references/14-agent-efficiency.md) §14.7.
1. **Responder en modo caveman.** Frases cortas, sin relleno ni cortesías, sin narrar tool calls. Términos técnicos, código y errores exactos. Nunca omitir negaciones. Prosa normal solo en advertencias de seguridad, acciones irreversibles, código, commits, PRs y docs. Ver §14.1.
2. **Librerías: preguntar antes de investigar.** Si hay otra sesión/agente abierto que conozca la librería (Claude Code: `ListAgents` + `SendMessage`), consultarle primero. Luego MCP de docs, luego `node_modules`, último la web. Ver §14.2.
3. **El modelo fuerte orquesta y revisa; modelos baratos ejecutan (estrategia advisor emulada).** Vale para cualquier agente y proveedor. El modelo fuerte (ej. Opus / GPT effort alto / Gemini Pro) planifica, decide, reparte y revisa **siempre** el resultado. Búsquedas, lecturas grandes, ediciones y boilerplate van a subagentes de menor nivel (ej. Sonnet, Haiku / mini / Flash), en paralelo cuando sean independientes. Si el agente no lanza subagentes con otro modelo, cambiar de modelo por fase. Contexto compartido en `tasks/brief-<tarea>.md`. El ejecutor no adivina: si se traba devuelve `NECESITA_ADVISOR: <duda>`. El modelo fuerte interviene después de la orientación, cuando el ejecutor se traba y antes de dar por terminado. Ver §14.3.
4. **Preguntar todo antes de empezar.** En tareas no triviales, juntar todas las dudas que cambian el resultado y preguntarlas de una sola vez, con opciones y una recomendada (Claude Code: `AskUserQuestion`). No preguntar lo que se resuelve leyendo el repo. Ver [11-workflow-orchestration.md](./references/11-workflow-orchestration.md) §11.6.
5. **Autocompactar el contexto.** Al cerrar cada fase o antes de una tarea nueva: guardar el estado en `tasks/todo.md` y compactar con foco (`/compact Conservar: decisiones, archivos tocados, pendientes`). Nunca con un cambio a medio aplicar ni con una pregunta pendiente. Ver §14.4.
6. **Graphify primero.** Si falta, instalarlo sin preguntar (`pip install graphifyy && graphify install`, con `--platform <agente>` fuera de Claude Code) e integrarlo en el repo (`graphify hook install` + `graphify <agente> install` según el agente que corre). Ante cualquier pregunta sobre el código, consultar `graphify query` antes de `grep` o leer archivos. Tras una tarea que tocó 3+ archivos o antes de compactar: `graphify update .` (sin LLM). Ver §14.5.

Las `§14.x` están en [14-agent-efficiency.md](./references/14-agent-efficiency.md): leer solo la sección que hace falta.

---

## 0. Stack y supuestos del proyecto

- **Angular 22+** (v22.x). Todo lo marcado como "v21" sigue siendo válido salvo que se indique.
- **Zoneless**: `provideZonelessChangeDetection()` / default en v21+.
  - **Nunca** importar `zone.js` ni usar `provideZoneChangeDetection()`.
- **`OnPush` es la estrategia de detección de cambios por defecto desde v22.** La antigua `Default` se renombró a **`Eager`** y está deprecada. En v22+ **no declarar `changeDetection`**; en proyectos con versión menor, forzar `OnPush` (regla 4).
- **Standalone first**: sin `NgModule` salvo dependencias legacy de terceros.
- **TypeScript 6** (v22 lo exige; TS 5.9 ya no está soportado). Node 26 soportado, Node 20 no.
- **`HttpClient` usa `FetchBackend` por defecto** en v22 → `withFetch()` es innecesario y está deprecado. Si se necesita progreso de **subida**, hace falta `provideHttpClient(withXhr())` + `reportUploadProgress`; para progreso de bajada alcanza `reportDownloadProgress`.
- **Vitest** como test runner (no Karma/Jasmine).
- **TypeScript estricto** (`strict`, `noImplicitAny`, `strictTemplates`).
- **Incremental Hydration** viene activada por defecto con `provideClientHydration()` (desactivable con `withNoIncrementalHydration()`).
- Imágenes estáticas vía `NgOptimizedImage`.
- Accesibilidad: AXE limpio + WCAG **AA** mínimo. Para primitivas headless accesibles usar **`@angular/aria`** (estable desde v22).
- **NG-ZORRO** como librería de componentes en la mayoría de los proyectos del equipo.

---

## Índice de referencias (progressive disclosure)

Leer solo la referencia que corresponde a la tarea. Cada archivo de más de 100 líneas empieza con su propio índice: saltar a la sección necesaria.

| Archivo | Temas | Cuándo leerlo |
| :--- | :--- | :--- |
| [01-project-structure.md](./references/01-project-structure.md) | Carpetas `core` / `shared` / `features`, regla de ubicación por alcance, naming sin sufijos, anidación de subcomponentes, límites de tamaño, cómo partir componentes y servicios monolíticos. | Al crear archivos o carpetas, o cuando algo supera el límite de líneas. |
| [02-typescript-signals.md](./references/02-typescript-signals.md) | TS 6 estricto, `input()` / `output()` / `model()`, `host: {}`, `inject()`, `@Service()`, `injectAsync()`, signals, `linkedSignal`, `debounced()`, por qué no `effect()`, RxJS acotado, servicios, DTOs, comunicación entre hermanos. | Al escribir lógica de componentes, servicios o estado. |
| [03-html-templates.md](./references/03-html-templates.md) | Control flow nativo, `@let`, `@switch` exhaustivo, `@defer` e hidratación incremental, bindings de clase/estilo, `@angular/aria`, tablas NG-ZORRO, directivas del equipo. | Al escribir o modificar templates. |
| [04-resource-api.md](./references/04-resource-api.md) | `httpResource` (y `.text` / `.blob`), `rxResource`, `resource` con `AbortSignal`, estados, `hasValue()`, fetch condicional, mutaciones con `HttpClient` + `reload()`, debounce de params, snapshots. | Al leer datos asíncronos o hacer POST/PUT/DELETE. |
| [05-http-interceptors.md](./references/05-http-interceptors.md) | Interceptores funcionales para spinner, errores y retries, `HttpContextToken` para opt-out, orden de registro, fetch vs `withXhr`. | Al configurar infraestructura HTTP. |
| [06-signal-forms.md](./references/06-signal-forms.md) | `form()`, schema, validadores sync/async/HTTP, `validateTree` para validación cruzada, arrays con `applyEach`, errores accesibles, `reset()`, controles propios y NG-ZORRO. | Al crear o modificar formularios. |
| [07-styles-scss.md](./references/07-styles-scss.md) | `@use` / `@forward`, tokens SCSS vs custom properties, BEM anidado (máx 3 niveles), encapsulación y `:host`, theming de NG-ZORRO sin `::ng-deep`, container queries, reduced motion. | Al escribir estilos de componentes. |
| [08-testing-vitest.md](./references/08-testing-vitest.md) | Vitest (`@angular/build:unit-test`), TestBed zoneless con `whenStable()`, inputs/outputs, servicios, `HttpTestingController`, interceptores, Signal Forms, mocks y timers, queries por rol. | Al escribir o corregir tests. |
| [09-performance-zoneless.md](./references/09-performance-zoneless.md) | Qué dispara change detection en zoneless, errores de migración, `@defer`, `track`, `NgOptimizedImage`, lazy routes, hidratación, budgets, virtual scroll, memory leaks, profiling. | Al diagnosticar performance o cuando la vista no se actualiza. |
| [10-environment-tooling.md](./references/10-environment-tooling.md) | Schematics del equipo, `web.config` para IIS (rewrite + cache), contrato con .NET (CORS, `ProblemDetails`, fechas ISO), config en runtime con `provideAppInitializer`, VS Code, Graphify, MCP de Angular CLI. | Al crear proyectos, desplegar o integrar con el backend. |
| [11-workflow-orchestration.md](./references/11-workflow-orchestration.md) | Explorar antes de editar, plan en `tasks/todo.md`, verificación antes de "terminado", commits chicos, no ampliar alcance, cuándo preguntar, lecciones en `tasks/lessons.md`. | En toda tarea no trivial. |
| [12-html5-semantics-seo.md](./references/12-html5-semantics-seo.md) | HTML5 semántico, landmarks y headings, las 5 reglas de ARIA, formularios nativos, SEO con `Title` / `Meta` / `TitleStrategy`, gestión de foco. | Al maquetar HTML o auditar accesibilidad/SEO. |
| [13-css3-layouts-animations.md](./references/13-css3-layouts-animations.md) | Cascada, `@layer`, `:has()`, `@scope`, box model, Flexbox, Grid, `@container`, anchor positioning, transiciones, `@starting-style`, scroll-driven, `base-select`, `field-sizing`, soporte Baseline. | Al diseñar layouts o animaciones. |
| [14-agent-efficiency.md](./references/14-agent-efficiency.md) | Modo caveman, consultar librerías a otros agentes abiertos, orquestador + subagentes de menor potencia, autocompactación del contexto, estrategia advisor emulada para cualquier agente, graphify (instalar, integrar, consultar, actualizar), adaptación al agente y modelos en uso. | Siempre: define cómo responde el agente y cómo reparte el trabajo. |
| [checklists.md](./references/checklists.md) | Checklists de Angular, HTML5/CSS3 y proceso del agente, con enlace a cada referencia. | Antes de entregar código o al revisar un PR. |

---

## Verificación rápida (Do & Don't)

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
