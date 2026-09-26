---
name: desarrollo-buenas-practicas
version: 1.0.0
description: >
  Convenciones oficiales del equipo para proyectos Angular 22+ (2026) y Frontend Moderno: standalone components, signals como único modelo de reactividad, zoneless, OnPush por defecto, control flow nativo (@if/@for/@switch/@let), Signal Forms, Resource API (httpResource/rxResource/resource), interceptores funcionales (spinner/errores), TypeScript 6 estricto, HTML5 semántico y accesible (WCAG AA / @angular/aria), BEM, SCSS anidado, layouts fluidos (Flexbox/Grid), animaciones modernas, testing con Vitest, performance y despliegue en IIS/.NET. Usar siempre que se pida crear, modificar, revisar, testear, depurar o refactorizar código Angular, TypeScript, HTML o SCSS/CSS, aunque el usuario no mencione Angular explícitamente. Define además cómo trabaja el agente: respuestas en modo caveman, consulta de librerías a otros agentes abiertos y delegación a subagentes de menor potencia.
---

# Desarrollo Frontend — Buenas Prácticas del Equipo (Angular 22+)

Este skill codifica las convenciones **obligatorias** del equipo para proyectos **Angular 22+** y desarrollo Frontend de alta calidad: standalone components, **signals como único modelo de reactividad**, **zoneless**, **OnPush por defecto**, control flow nativo, **Signal Forms** (estables en v22), la **Resource API** (`httpResource` / `rxResource` / `resource`), **interceptores funcionales** para concerns transversales (spinner, errores) y las convenciones de naming oficiales (sin sufijos `.component`, `.service`).

> **Regla maestra**: si una API legacy tiene un equivalente moderno (signals, control flow nativo, `inject()`, `input()`, `httpResource`, Signal Forms, `host: {}`, interceptores funcionales), **siempre usar el moderno**. Cualquier uso de la API legacy debe estar justificado por interoperabilidad con código existente y documentado en el PR.

---

### Las 8 reglas que más se violan (leer siempre)

1. **Nunca `effect()` para sincronizar estado.** Derivar con `computed()` / `linkedSignal()`, cargar datos con la Resource API y resolver concerns transversales con interceptores. Por qué: `effect()` crea cascadas de escrituras difíciles de razonar y de testear. Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
2. **Nunca `Observable` / `Subject` / `BehaviorSubject` como estado.** El estado es siempre signals. RxJS solo dentro de servicios, para flujos (`rxResource`, eventos). Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
3. **Nunca Reactive Forms ni `ngModel`.** Solo **Signal Forms** (`@angular/forms/signals`). Ver [06-signal-forms.md](./references/06-signal-forms.md).
4. **Nunca declarar `changeDetection` ni `standalone: true`.** OnPush y standalone son el default en v22. Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
5. **Nunca `*ngIf` / `*ngFor` / `*ngSwitch` / `[ngClass]` / `[ngStyle]`.** Usar control flow nativo y bindings `[class.x]` / `[style.x]`. Ver [03-html-templates.md](./references/03-html-templates.md).
6. **Nunca archivos monolíticos.** Máximo: componente `.ts` 200 líneas, template `.html` 200, servicio 250, `.scss` 150. Si se pasa, dividir por responsabilidad: subcomponentes presentacionales (`input()` / `output()`) y sub-servicios (lógica / HTTP). Ver [01-project-structure.md](./references/01-project-structure.md).
7. **Nunca carpeta `components/` para subcomponentes.** Cada hijo se anida dentro de la carpeta del padre que lo usa: `detalle/subdetalle/subdetalle-cabecera/`. El árbol de carpetas refleja el árbol de componentes. Única excepción: `shared/components/`, para componentes reutilizados por varias features. Ver [01-project-structure.md](./references/01-project-structure.md).
8. **Nunca sufijos `.component` / `.service` / `Component` / `Service`.** Archivo `user-list.ts` exporta `UserList`. Ver [01-project-structure.md](./references/01-project-structure.md).

---

### Modo de operación del agente (siempre activo)

1. **Responder en modo caveman.** Frases cortas, sin relleno ni cortesías, sin narrar tool calls. Términos técnicos, código y errores exactos. Nunca omitir negaciones. Prosa normal solo en advertencias de seguridad, acciones irreversibles, código, commits, PRs y docs.
2. **Librerías: preguntar antes de investigar.** Si hay otra sesión/agente abierto que conozca la librería (Claude Code: `ListAgents` + `SendMessage`), consultarle primero. Luego MCP de docs, luego `node_modules`, último la web.
3. **Orquestar, no ejecutar.** El modelo principal planifica, decide y verifica. Búsquedas, lecturas grandes, ediciones mecánicas y boilerplate van a subagentes de menor potencia (`model: haiku` / `sonnet`), en paralelo cuando sean independientes, con prompt autocontenido y salida comprimida.

Detalle, excepciones y ejemplos en [14-agent-efficiency.md](./references/14-agent-efficiency.md).

---

## 0. Stack y supuestos del proyecto

- **Angular 22+** (v22.x). Todo lo marcado como "v21" sigue siendo válido salvo que se indique.
- **Zoneless**: `provideZonelessChangeDetection()` / default en v21+.
  - **Nunca** importar `zone.js` ni usar `provideZoneChangeDetection()`.
- **`OnPush` es la estrategia de detección de cambios por defecto desde v22.** La antigua `Default` se renombró a **`Eager`** y está deprecada. **No declarar `changeDetection` en componentes nuevos.**
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
| [14-agent-efficiency.md](./references/14-agent-efficiency.md) | Modo caveman, consultar librerías a otros agentes abiertos, orquestador + subagentes de menor potencia. | Siempre: define cómo responde el agente y cómo reparte el trabajo. |
| [checklists.md](./references/checklists.md) | Checklists de Angular, HTML5/CSS3 y proceso del agente, con enlace a cada referencia. | Antes de entregar código o al revisar un PR. |

---

## Verificación Rápida (Do & Don't)

```typescript
// ❌ INCORRECTO (Legacy / Prohibido)
@Component({
  selector: 'app-user-profile',
  standalone: true, // Innecesario en v22
  changeDetection: ChangeDetectionStrategy.OnPush, // Innecesario: OnPush es default
  template: `
    <div *ngIf="user$ | async as user" [ngClass]="{'active': isActive}">
      <span *ngFor="let item of items">{{ item }}</span>
    </div>
  `
})
export class UserProfileComponent {
  @Input() userId!: string;
  @Output() updated = new EventEmitter<void>();
  user$ = this.http.get<User>(`/api/users/${this.userId}`);
  constructor(private http: HttpClient) {}
}

// ✅ CORRECTO (Angular 22+)
@Component({
  selector: 'app-user-profile',
  template: `
    @if (userResource.value(); as user) {
      <div class="user-profile" [class.user-profile--active]="isActive()">
        @for (item of items(); track item.id) {
          <span class="user-profile__item">{{ item.name }}</span>
        }
      </div>
    }
  `
})
export class UserProfile {
  readonly userId = input.required<string>();
  readonly updated = output<void>();
  readonly isActive = signal(false);
  readonly items = signal<Item[]>([]);

  readonly userResource = httpResource<User>(() => `/api/users/${this.userId()}`);
}
```

