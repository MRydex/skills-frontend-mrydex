---
name: desarrollo-buenas-practicas
version: 1.14.0
description: >
  Convenciones oficiales del equipo para proyectos Angular 22+ (2026) y Frontend Moderno, con seguridad por defecto (Red Team / Blue Team, OWASP Top 10): standalone components, signals como único modelo de reactividad, zoneless, OnPush por defecto, control flow nativo (@if/@for/@switch/@let), Signal Forms, Resource API (httpResource/rxResource/resource), interceptores funcionales (spinner/errores), TypeScript 6 estricto, HTML5 semántico y accesible (WCAG AA / @angular/aria), BEM, SCSS anidado, layouts fluidos (Flexbox/Grid), animaciones modernas, sin archivos de test, performance y despliegue en IIS/.NET. Usar siempre, antes de la primera herramienta, ante cualquier pedido en un proyecto frontend (preguntas, explicaciones, revisión, depuración o cambios): crear, modificar, revisar, depurar, explicar o refactorizar código Angular, TypeScript de proyectos Angular, HTML o SCSS/CSS, aunque el usuario no mencione Angular explícitamente. Define además cómo trabaja el agente en cualquier herramienta (Claude Code, Codex, Antigravity, Cursor, Copilot): modo caveman, modelo fuerte que orquesta y revisa con subagentes baratos, graphify, autocompactación y preguntas previas.
---

# Desarrollo Frontend — Buenas Prácticas del Equipo (Angular 22+)

Convenciones **obligatorias** del equipo para Angular 22+ y frontend moderno, más las reglas de cómo trabaja el agente. Ejecutar primero el Paso 0 (graphify); después leer las 8 reglas y el modo de operación; el detalle vive en `references/`.

> **Regla maestra**: si una API legacy tiene un equivalente moderno (signals, control flow nativo, `inject()`, `input()`, `httpResource`, Signal Forms, `host: {}`, interceptores funcionales), **siempre usar el moderno**. Cualquier uso de la API legacy debe estar justificado por interoperabilidad con código existente y documentado en el PR.

> **Regla de alcance de la skill**:
> - Las referencias de esta skill son **convenciones con ejemplos**, no el código del proyecto. Nunca
>   describir la app con los ejemplos de la skill: responder solo con lo que existe en el repo
>   (`archivo:línea`). Si algo no está en el repo, decirlo.
> - Las reglas aplican al código que se escribe o modifica. Nombres y APIs de librerías externas
>   (`node_modules`, paquetes de la empresa) no se juzgan ni se renombran.
> - La skill no es motivo para negarse a lo pedido. Hacer lo que pide el usuario con las convenciones
>   de la skill; si la skill sugiere un enfoque mejor, proponerlo en una línea y dejar que el usuario
>   decida. Única excepción: seguridad (§15).

> **Regla de simplicidad**: la solución más simple que resuelve lo pedido. Sin abstracciones, capas,
> genéricos, tokens ni librerías "por si acaso": se abstrae recién cuando el código aparece por segunda
> vez. Ver [11-workflow-orchestration.md](./references/11-workflow-orchestration.md) §11.7.1.

---

### Paso 0 — Arranque de graphify (obligatorio, antes de cualquier otra acción)

Primera acción de cada sesión, en cualquier repo, **antes** de buscar, leer o editar código. No es
opcional ni se saltea "porque la tarea es chica". Sin preguntar:

```bash
graphify --help 2>&1 | head -3   # ¿existe? ¿warning de versión?
graphify hook status             # ¿hooks git instalados?
graphify update .                # grafo al día (solo código, sin LLM, sin costo)
```

| Resultado | Acción |
| :--- | :--- |
| `command not found` | `pip install graphifyy && graphify install` (`--platform <agente>` fuera de Claude Code) |
| `warning: skill is from graphify X, package is Y` | `pip install --upgrade graphifyy && graphify install` |
| `post-commit: not installed` | `graphify hook install` |
| El agente no tiene la integración (Claude Code: sin `hook-guard` en `.claude/settings.json`) | `graphify <agente> install` (tabla en §14.5) |
| `graphify update .` falla porque no hay grafo | `/graphify .` dentro del asistente (build completo) |
| La salida de `graphify update .` dice `Rebuild failed`, `worker failed` o `Nothing to update or rebuild failed` | Falló aunque el exit code sea 0. Ver "Si algo falla" |

Si el proyecto se configuró con el instalador (`npx skills-frontend-mrydex` en el proyecto), todo esto
ya está hecho: el chequeo igual se corre y solo confirma. Después: agregar al `.gitignore` lo que haya
creado graphify (§10.9) y avisar en una línea (`graphify OK: vX, N nodos`).

**Si algo falla** (instalación, hooks, integración o armado del grafo): **siempre avisar al usuario**
con el comando, el error exacto y la causa probable. Nunca seguir en silencio. Recién después seguir
con búsqueda normal. Causas conocidas:

- Sin Python/pip → instalar Python 3.10+ y repetir el Paso 0.
- `[Errno 2] No such file or directory` en `graphify-out/cache` (Windows) → ruta del proyecto
  demasiado larga (MAX_PATH). Proponer mover el repo a una ruta corta o habilitar rutas largas
  (`LongPathsEnabled` en el registro, requiere admin). El usuario decide.
- Sin repo git → no hay hooks: el grafo solo se actualiza con `graphify update .` manual.

La misma regla vale al actualizar el grafo al final de la tarea (§14.5 paso 5). Detalle en
[14-agent-efficiency.md](./references/14-agent-efficiency.md) §14.5.

**Durante la tarea**: la primera búsqueda sobre el código es siempre `graphify query`. `grep`,
`Glob` o leer archivos para explorar sin una consulta previa al grafo es una violación de la skill.
Única excepción: el usuario nombró el archivo y la línea exactos.

---

### Las 8 reglas que más se violan (leer siempre)

1. **Nunca `effect()` para sincronizar estado.** Derivar con `computed()` / `linkedSignal()`, cargar datos con la Resource API y resolver concerns transversales con interceptores. Por qué: `effect()` crea cascadas de escrituras difíciles de razonar y de testear. Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
2. **Nunca `Observable` / `Subject` / `BehaviorSubject` como estado.** El estado es siempre signals. RxJS solo dentro de servicios, para flujos (`rxResource`, eventos). Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
3. **Nunca Reactive Forms ni `ngModel`.** Solo **Signal Forms** (`@angular/forms/signals`). Ver [06-signal-forms.md](./references/06-signal-forms.md).
4. **`changeDetection` según la versión de `@angular/core` en `package.json`.** v22 o mayor: **no declararlo** (OnPush es el default). Menor a v22: **siempre** `changeDetection: ChangeDetectionStrategy.OnPush`. `standalone: true` solo en v18 o menor (default desde v19). Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
5. **Nunca `*ngIf` / `*ngFor` / `*ngSwitch` / `[ngClass]` / `[ngStyle]`.** Usar control flow nativo y bindings `[class.x]` / `[style.x]`. Ver [03-html-templates.md](./references/03-html-templates.md).
6. **Nunca archivos monolíticos.** Máximo: componente `.ts` 200 líneas, template `.html` 200, servicio 250, `.scss` 150. Si se pasa, dividir por responsabilidad: subcomponentes presentacionales (`input()` / `output()`) y sub-servicios (lógica / HTTP). **Dentro del límite no se divide**: nada de componentizar bloques chicos usados una sola vez (§1.4 "Cuándo dividir"). Ver [01-project-structure.md](./references/01-project-structure.md).
7. **Nunca carpeta `components/` para subcomponentes.** Cada hijo se anida dentro de la carpeta del padre que lo usa: `detalle/subdetalle/subdetalle-cabecera/`. El árbol de carpetas refleja el árbol de componentes. Única excepción: `shared/components/`, para componentes reutilizados por varias features. UI repetida (selector de usuario, tabla, buscador) = **un solo componente reutilizable**, nunca copias adaptadas. Ver [01-project-structure.md](./references/01-project-structure.md) §1.5.
8. **Nunca sufijos `.component` / `.service` / `Component` / `Service`.** Archivo `user-list.ts` exporta `UserList`. Ver [01-project-structure.md](./references/01-project-structure.md).

---

### Modo de operación del agente

Rige durante toda la sesión desde que la skill se carga. Para que rija también en sesiones que no tocan Angular, instalar los archivos puente en el repo (`--bridge`: `CLAUDE.md`, `AGENTS.md`, `.cursorrules`), que el agente lee siempre.

0. **Adaptarse al agente y a los modelos en uso.** Al empezar, detectar en qué agente corre la skill (Claude Code, Codex, Antigravity, Cursor, Copilot, Gemini CLI, otro) y qué modelos tiene disponibles. Todo nombre concreto de esta skill (Opus, Sonnet, Haiku, `/compact`, `AskUserQuestion`, `SendMessage`, `Agent`) es un **ejemplo**: traducirlo al equivalente del agente en uso. Si no hay equivalente, aplicar el fallback documentado. Las reglas no cambian; cambia solo la sintaxis. Ver [14-agent-efficiency.md](./references/14-agent-efficiency.md) §14.7.
1. **Responder en modo caveman, siempre, conciso y corto.** Todo lo que emite la skill (respuestas, reportes, avisos, preguntas, reportes de subagentes). Frases cortas, sin relleno ni cortesías, sin narrar tool calls. Reporte final: máximo ~8 viñetas, sin resúmenes por sección; linkear archivos en vez de repetirlos. Términos técnicos, código y errores exactos. Nunca omitir negaciones. Prosa normal solo en advertencias de seguridad, acciones irreversibles, código, commits, PRs y docs. Ver §14.1.
2. **Librerías: preguntar antes de investigar.** Si hay otra sesión/agente abierto que conozca la librería (Claude Code: `ListAgents` + `SendMessage`), consultarle primero. Luego MCP de docs, luego `node_modules`, último la web. Ver §14.2.
3. **El modelo seleccionado orquesta; delega solo si ahorra tokens.** Delegar búsquedas y lecturas grandes (3+ archivos, logs, docs) y ediciones mecánicas en 8+ archivos a subagentes baratos (medido: en 3 archivos delegar costó 38% más). Tareas chicas, decisiones y revisión final: las hace el orquestador. Regla práctica: si lo que habría que leer es 3 veces o más lo que hace falta saber, delegar (§14.3.4). Contexto compartido en `tasks/brief-<tarea>.md`. El ejecutor no adivina: si se traba devuelve `NECESITA_ADVISOR: <duda>`. El modelo fuerte interviene después de la orientación, cuando el ejecutor se traba y antes de dar por terminado. Ver §14.3.
4. **Preguntar todo antes de empezar.** En tareas no triviales, juntar todas las dudas que cambian el resultado y preguntarlas de una sola vez, con opciones y una recomendada (Claude Code: `AskUserQuestion`). No preguntar lo que se resuelve leyendo el repo. Ver [11-workflow-orchestration.md](./references/11-workflow-orchestration.md) §11.6.
5. **Autocompactar el contexto.** Al cerrar cada fase o antes de una tarea nueva: guardar el estado en `tasks/todo.md` y compactar con foco (`/compact Conservar: decisiones, archivos tocados, pendientes`). Nunca con un cambio a medio aplicar ni con una pregunta pendiente. Ver §14.4.
6. **Graphify primero.** Arranque obligatorio del **Paso 0** al empezar cada sesión: instalar, actualizar la versión, integrar y poner el grafo al día. Ante cualquier pregunta sobre el código, `graphify query` antes de `grep` o leer archivos. Tras una tarea que tocó 3+ archivos o antes de compactar: `graphify update .` (sin LLM). Ver §14.5.

7. **Seguridad siempre (Red Team + Blue Team).** Todo cambio pasa la revisión ofensiva de §15.2 antes de entregarse. Nunca desactivar protecciones (sanitizador, CSP, XSRF, validación del backend). Nunca secretos en el front. Toda vulnerabilidad encontrada se reporta, aunque esté fuera del alcance. Ver [15-security.md](./references/15-security.md).
8. **Archivos de IA en `.gitignore`.** Al empezar en un proyecto, verificar que `.gitignore` excluya todo lo de IA y agentes (`.claude/`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `graphify-out/`, `tasks/todo.md`, etc.). Agregar lo que falte. Preguntar antes de `git rm --cached`. Ver [10-environment-tooling.md](./references/10-environment-tooling.md) §10.9.

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
- **Sin tests**: nunca generar `*.spec.ts` ni ningún archivo de test. `angular.json` con `skipTests: true` en los schematics. Se verifica con build, lint y prueba manual. Ver [08-sin-tests.md](./references/08-sin-tests.md).
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
| [01-project-structure.md](./references/01-project-structure.md) | Carpetas `core` / `shared` / `features`, regla de ubicación por alcance, naming sin sufijos, anidación de subcomponentes, límites de tamaño, cómo partir componentes y servicios monolíticos, un solo componente reutilizable para UI repetida. | Al crear archivos o carpetas, o cuando algo supera el límite de líneas. |
| [02-typescript-signals.md](./references/02-typescript-signals.md) | TS 6 estricto, `input()` / `output()` / `model()`, `host: {}`, `inject()`, `@Service()`, `injectAsync()`, signals, `linkedSignal`, `debounced()`, por qué no `effect()`, RxJS acotado, servicios, DTOs, comunicación entre hermanos. | Al escribir lógica de componentes, servicios o estado. |
| [03-html-templates.md](./references/03-html-templates.md) | Control flow nativo, `@let`, `@switch` exhaustivo, `@defer` e hidratación incremental, bindings de clase/estilo, `@angular/aria`, tablas NG-ZORRO, directivas del equipo. | Al escribir o modificar templates. |
| [04-resource-api.md](./references/04-resource-api.md) | `httpResource` (y `.text` / `.blob`), `rxResource`, `resource` con `AbortSignal`, estados, `hasValue()`, fetch condicional, mutaciones con `HttpClient` + `reload()`, debounce de params, snapshots. | Al leer datos asíncronos o hacer POST/PUT/DELETE. |
| [05-http-interceptors.md](./references/05-http-interceptors.md) | Interceptores funcionales para spinner, errores y retries, `HttpContextToken` para opt-out, orden de registro, fetch vs `withXhr`. | Al configurar infraestructura HTTP. |
| [06-signal-forms.md](./references/06-signal-forms.md) | `form()`, schema, validadores sync/async/HTTP, `validateTree` para validación cruzada, arrays con `applyEach`, errores accesibles, `reset()`, controles propios y NG-ZORRO. | Al crear o modificar formularios. |
| [07-styles-scss.md](./references/07-styles-scss.md) | `@use` / `@forward` sin rutas relativas (`includePaths`), partials en `assets/styles/<modulo>/`, tokens SCSS vs custom properties, BEM anidado (máx 3 niveles), encapsulación y `:host`, theming de NG-ZORRO sin `::ng-deep`, container queries, reduced motion, SCSS repetido en capas ITCSS (triángulo invertido). | Al escribir estilos de componentes. |
| [08-sin-tests.md](./references/08-sin-tests.md) | Regla sin archivos de test, `skipTests` en `angular.json`, qué hacer con specs existentes, cómo verificar sin tests. | Al generar archivos con el CLI o al verificar una tarea. |
| [09-performance-zoneless.md](./references/09-performance-zoneless.md) | Qué dispara change detection en zoneless, errores de migración, `@defer`, `track`, `NgOptimizedImage`, lazy routes, recrear componente en la misma ruta (`shouldReuseRoute`), hidratación, budgets, virtual scroll, memory leaks, profiling. | Al diagnosticar performance o cuando la vista no se actualiza. |
| [10-environment-tooling.md](./references/10-environment-tooling.md) | Schematics del equipo, `web.config` para IIS (rewrite + cache), contrato con .NET (CORS, `ProblemDetails`, fechas ISO), config en runtime con `provideAppInitializer`, VS Code, Graphify, MCP de Angular CLI, archivos de IA en `.gitignore`. | Al crear proyectos, desplegar o integrar con el backend. |
| [11-workflow-orchestration.md](./references/11-workflow-orchestration.md) | Explorar antes de editar, plan en `tasks/todo.md`, verificación antes de "terminado", commits chicos, no ampliar alcance, cuándo preguntar, lecciones en `tasks/lessons.md`. | En toda tarea no trivial. |
| [12-html5-semantics-seo.md](./references/12-html5-semantics-seo.md) | HTML5 semántico, landmarks y headings, las 5 reglas de ARIA, formularios nativos, SEO con `Title` / `Meta` / `TitleStrategy`, gestión de foco. | Al maquetar HTML o auditar accesibilidad/SEO. |
| [13-css3-layouts-animations.md](./references/13-css3-layouts-animations.md) | Cascada, `@layer`, `:has()`, `@scope`, box model, Flexbox, Grid, `@container`, anchor positioning, transiciones, `@starting-style`, scroll-driven, `base-select`, `field-sizing`, soporte Baseline. | Al diseñar layouts o animaciones. |
| [14-agent-efficiency.md](./references/14-agent-efficiency.md) | Modo caveman, consultar librerías a otros agentes abiertos, orquestador + subagentes de menor potencia, autocompactación del contexto, estrategia advisor emulada para cualquier agente, graphify (instalar, integrar, consultar, actualizar), adaptación al agente y modelos en uso. | Siempre: define cómo responde el agente y cómo reparte el trabajo. |
| [15-security.md](./references/15-security.md) | Revisión Red Team de cada cambio, XSS y `DomSanitizer`, CSP (`autoCsp`, nonce, Trusted Types), tokens y `authInterceptor` por origen, XSRF, open redirect, secretos y PII, cabeceras en IIS, supply chain (`npm audit`, SRI), Blue Team (logging, CSP reports, respuesta), tests de seguridad, mapa OWASP Top 10 2025. | Siempre: en todo cambio y en todo code review. |
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
