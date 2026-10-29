---
name: desarrollo-buenas-practicas
description: >
  Convenciones del equipo para frontend Angular 22+ (signals, zoneless, Signal Forms, Resource API, SCSS con BEM, HTML semántico y WCAG AA, seguridad Red/Blue Team, sin archivos de test) y forma de trabajar del agente (caveman, graphify, subagentes). Usar siempre, antes de la primera herramienta, en cualquier repo con angular.json o con código .ts, .html, .scss o .css, para cualquier pedido: preguntas, explicaciones, revisión, depuración, refactor o cambios, aunque no mencione Angular. Incluye pedidos sobre pantallas, componentes, formularios, tablas, modales, estilos, layout o texto que rompe la UI; llamadas al backend (Request / Response, mapeo, httpResource, interceptores); tiempo real (WebSocket, SignalR) y microfrontends (Native Federation); rendimiento, accesibilidad, SEO o despliegue en IIS; seguridad del front ("auditá la seguridad", "¿es seguro?"); y auditorías ("auditá", "optimizá", "limpiá"): calidad, eficiencia, código duplicado y sin uso.
metadata:
  version: 1.32.0
  triggers:
    files:
      - angular.json
      - "**/*.ts"
      - "**/*.html"
      - "**/*.scss"
      - "**/*.css"
    keywords:
      - angular
      - componente
      - pantalla
      - formulario
      - tabla
      - modal
      - estilos
      - scss
      - layout
      - signals
      - httpResource
      - interceptor
      - request
      - response
      - mapeo
      - accesibilidad
      - performance
      - seo
      - iis
      - websocket
      - signalr
      - tiempo real
      - microfrontend
      - native federation
      - seguridad
      - auditá
      - código sin usar
      - código duplicado
---

# Desarrollo Frontend — Buenas Prácticas del Equipo (Angular 22+)

Convenciones **obligatorias** del equipo para Angular 22+ y frontend moderno, más las reglas de cómo trabaja el agente. Ejecutar primero el Paso 0 (graphify); después leer las reglas y el modo de operación; el detalle vive en `references/`.

> **Regla maestra**: si una API legacy tiene equivalente moderno (signals, control flow nativo, `inject()`, `input()`, `httpResource`, Signal Forms, `host: {}`, interceptores funcionales), **siempre el moderno**. Todo uso legacy se justifica por interoperabilidad con código existente y se documenta en el PR.

> **Regla de alcance**:
> - Las referencias son **convenciones con ejemplos**, no el código del proyecto. Nunca describir la app con los ejemplos de la skill: responder solo con lo que existe en el repo (`archivo:línea`). Si algo no está, decirlo.
> - Las reglas aplican al código que se escribe o modifica. Nombres y APIs de librerías externas (`node_modules`, paquetes de la empresa) no se juzgan ni se renombran.
> - La skill no es motivo para negarse. Hacer lo pedido con las convenciones; si hay un enfoque mejor, proponerlo en una línea y que el usuario decida. Única excepción: seguridad (§15).

> **Regla de simplicidad**: la solución más simple que resuelve lo pedido. Sin abstracciones, capas, genéricos, tokens ni librerías "por si acaso": se abstrae recién cuando el código aparece por segunda vez (§11.7.1).

---

### Paso 0 — Arranque de graphify (obligatorio, antes de cualquier otra acción)

Primera acción de cada sesión, en cualquier repo, antes de buscar, leer o editar, también en tareas chicas (una consulta al grafo cuesta menos que leer los archivos que reemplaza). Sin preguntar:

```bash
graphify --help                  # ¿existe? ¿warning de versión? (primeras líneas)
graphify hook status             # ¿hooks git instalados?
graphify update .                # grafo al día (solo código, sin LLM, sin costo)
```

Según el resultado: `command not found` → `pip install graphifyy && graphify install`; `warning: skill is from graphify X, package is Y` → `pip install --upgrade graphifyy && graphify install`; `post-commit: not installed` → `graphify hook install`; agente sin integración → `graphify <agente> install`; sin grafo → `/graphify .`. Tabla completa en [14-agent-efficiency.md](./references/14-agent-efficiency.md) §14.5 "Si algo falla".

Con el instalador (`npx github:MRydex/skills-frontend-mrydex`) ya está hecho: el chequeo igual se corre y solo confirma. Después: agregar al `.gitignore` lo que creó graphify (§10.9) y avisar en una línea (`graphify OK: vX, N nodos`).

**Si algo falla** (instalación, hooks, integración, armado del grafo, o `Rebuild failed` / `worker failed` / `Nothing to update or rebuild failed` aunque el exit code sea 0): **siempre avisar** con el comando, el error exacto y la causa probable; nunca seguir en silencio; recién después búsqueda normal. Causas conocidas (Python, wheels de tree-sitter, MAX_PATH, sin git) en §14.5. Lo mismo al actualizar el grafo al final de la tarea.

**Durante la tarea**: la primera búsqueda sobre el código es `graphify query`, antes de `grep`, `Glob` o leer archivos. Excepción: el usuario nombró archivo y línea exactos.

---

### Las reglas que más se violan (leer siempre)

1. **Nunca `effect()`.** Derivar con `computed()` / `linkedSignal()`, datos con la Resource API, concerns transversales con interceptores. Por qué: crea cascadas de escrituras difíciles de razonar y testear. Ver [02](./references/02-typescript-signals.md).
2. **Nunca `Observable` / `Subject` / `BehaviorSubject` como estado.** Estado siempre en signals. RxJS solo dentro de servicios, para flujos (`rxResource`, eventos). Ver [02](./references/02-typescript-signals.md).
3. **Nunca Reactive Forms ni `ngModel`.** Solo **Signal Forms** (`@angular/forms/signals`). Ver [06](./references/06-signal-forms.md).
4. **`changeDetection` según `@angular/core` en `package.json`.** v22+: **no declararlo** (OnPush es default). Menor a v22: **siempre** `ChangeDetectionStrategy.OnPush`. `standalone: true` solo en v18 o menor. Ver [02](./references/02-typescript-signals.md) §2.2.
5. **Nunca `*ngIf` / `*ngFor` / `*ngSwitch` / `[ngClass]` / `[ngStyle]`.** Control flow nativo y `[class.x]` / `[style.x]`. Ver [03](./references/03-html-templates.md).
6. **Nunca archivos monolíticos.** Máximo: componente `.ts` 200 líneas, `.html` 200, servicio 250, `.scss` 150. Si se pasa, dividir por responsabilidad (subcomponentes presentacionales con `input()` / `output()`, sub-servicios de lógica / HTTP). **Dentro del límite no se divide**: no componentizar bloques chicos usados una vez (§1.4). Ver [01](./references/01-project-structure.md).
7. **Nunca carpeta `components/` para subcomponentes.** Cada hijo anidado en la carpeta del padre: `detalle/subdetalle/subdetalle-cabecera/` (el árbol de carpetas = árbol de componentes). Única excepción: `shared/components/` para lo reutilizado por varias features. UI repetida = **un solo componente reutilizable**, nunca copias adaptadas. Ver §1.5.
8. **Nunca sufijos `.component` / `.service` / `.directive` / `Component` / `Service` / `Directive`.** `user-list.ts` exporta `UserList`. Pipes, guards, resolvers e interceptors sí: `currency-format-pipe.ts` → `CurrencyFormatPipe`, `auth-guard.ts` → `authGuard`. Ver [01](./references/01-project-structure.md).
9. **Nunca reescribir la clase BEM completa en SCSS.** Elementos y modificadores anidados con `&__` / `&--`: `.card { &__title { &--big {} } }`; nunca `.card__title` ni `.card__title--big` como selector propio, ni `&__title--big`. Ver [07](./references/07-styles-scss.md) §7.3.

Ejemplo antes / después: [checklists.md](./references/checklists.md) "Verificación rápida (Do & Don't)".

---

### Modo de operación del agente

Rige toda la sesión desde que la skill se carga. Para sesiones que no tocan Angular, instalar los archivos puente (`--bridge`: `CLAUDE.md`, `AGENTS.md`, `.cursorrules`). Las `§14.x` están en [14-agent-efficiency.md](./references/14-agent-efficiency.md): leer solo la sección necesaria.

0. **Adaptarse al agente y modelos en uso.** Detectar el agente (Claude Code, Codex, Antigravity, Cursor, Copilot, Gemini CLI, otro) y sus modelos. Todo nombre concreto (Opus, Sonnet, Haiku, `/compact`, `AskUserQuestion`, `SendMessage`, `Agent`) es **ejemplo**: traducirlo; sin equivalente, el fallback documentado. Las reglas no cambian, solo la sintaxis. §14.7.
1. **Caveman siempre, conciso y corto**, en todo lo que emite la skill (respuestas, reportes, avisos, preguntas, subagentes). Una línea de estado por fase o paso largo. Reporte final: qué cambió, qué falló, qué decide el usuario; sin resúmenes por sección; linkear archivos. Términos, código y errores exactos. Nunca omitir negaciones. Prosa normal solo en seguridad, acciones irreversibles, código, commits, PRs y docs. §14.1.
2. **Librerías: preguntar antes de investigar.** Primero otra sesión/agente abierto que la conozca (Claude Code: `ListAgents` + `SendMessage`), luego MCP de docs, `node_modules`, último la web. §14.2.
3. **El modelo seleccionado orquesta; delega solo si ahorra tokens.** Delegar búsquedas/lecturas grandes (3+ archivos, logs, docs) y ediciones mecánicas en 8+ archivos (en 3 archivos delegar costó 38% más). Tareas chicas, decisiones y revisión final: el orquestador. Si lo que habría que leer es 3x o más lo que hace falta saber, delegar. Solo por uno de 4 motivos nombrados (exploración grande, escritores en paralelo, respaldo de contexto, verificador de riesgo alto); ante la duda, no delegar. 5+ unidades independientes en todo el codebase: proponer `/batch <instrucción>`. Brief en `tasks/brief-<tarea>.md` con solo las reglas compactas que aplican; el ejecutor no adivina (`NECESITA_ADVISOR: <duda>`); el orquestador interviene tras la orientación, cuando se traba y antes de terminar. Advisor nativo (`/advisor`) apagado por defecto; si el usuario lo activa, consultarlo en esos 3 momentos. §14.3.4, §14.3.5.
4. **Preguntar todo antes de empezar.** En tareas no triviales, todas las dudas que cambian el resultado de una vez, con opciones y una recomendada (Claude Code: `AskUserQuestion`); no preguntar lo que se resuelve leyendo el repo (§11.6). Pedido de solo lectura: no editar. **Chica** si se retoma con el pedido + `git diff` (directo); **grande** si no (`tasks/todo.md` con L1 literal, Specs, Tasks con riesgo y Log; tarea por tarea; commits de ~400 líneas). Revisión según riesgo trivial / medio / alto (§11.2, §11.3).
5. **Autocompactar.** Al cerrar fase o antes de tarea nueva: estado en `tasks/todo.md` y proponer compactar con foco (Claude Code: `/compact Conservar: decisiones, archivos tocados, pendientes`; el agente no puede correrlo solo). Nunca con un cambio a medio aplicar ni una pregunta pendiente. §14.4.
6. **Graphify primero.** Paso 0 en cada sesión. Toda pregunta sobre el código: `graphify query` antes de `grep` o leer. Tras editar (antes de la respuesta final) o antes de compactar: `graphify update .` (sin LLM). §14.5.
7. **Herramientas del agente, siempre.** ponytail (código mínimo, `ponytail-review` sobre el diff en todo cambio no trivial, §11.3); agent-skills por fase, nunca las de tests; claude-code-setup en repos sin setup; Headroom arranca solo en Claude Code, Copilot CLI y Codex en macOS/Linux; Codex en Windows, Cursor y VS Code Copilot con `headroom wrap <agente>`. Si falta una, instalarla y avisar en una línea. §14.8.
8. **Seguridad siempre (Red + Blue Team).** Todo cambio pasa la tabla rápida de §15.2; riesgo alto suma la revisión ofensiva profunda (§11.3). Nunca desactivar protecciones (sanitizador, CSP, XSRF, validación del backend). Nunca secretos en el front. Toda vulnerabilidad se reporta, aunque esté fuera del alcance. "Auditá" a secas o pedido de seguridad ("auditá la seguridad", "¿es seguro?", "pentest"): auditoría completa red + blue + network de §15.14 (modelo de amenazas, todas las áreas OK / hallazgo / N/A, TLS, superficie expuesta y WebSocket, skills por área (`offensive-*`), `security-audit` + `claude-security`, priorizar por OWASP, corregir lo que esté en alcance, reportar cobertura). **`npm audit` siempre**: al empezar en un proyecto y tras cada cambio en `package.json`/lockfile; reportar todo hallazgo y avisar `high`/`critical` de runtime (§15.10). Ver [15-security.md](./references/15-security.md).
9. **Archivos de IA en `.gitignore`.** Al empezar, verificar que excluya todo lo de IA y agentes (`.claude/`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `graphify-out/`, `tasks/todo.md`, etc.); agregar lo que falte; preguntar antes de `git rm --cached`. §10.9.
10. **Auditar = control de calidad completo.** Todo pedido de auditoría (app completa, feature, carpeta o diff; sin alcance, la app completa) revisa calidad, eficiencia, código duplicado y sin uso (§11.9). Cada candidato verificado contra uso dinámico; reporte con cobertura por área y `archivo:línea`. Corrige en tandas chicas sin cambiar comportamiento: borra lo sin uso, unifica duplicados, optimiza; pregunta antes solo cambios visibles, API pública o refactors grandes. "Auditá" a secas suma la auditoría de seguridad completa de §15.14 (regla 8); solo seguridad corre solo §15.14; solo calidad ("optimizá", "limpiá") suma la seguridad base (§15.2, `npm audit`).

---

## 0. Stack y supuestos del proyecto

- **Angular 22+**; lo marcado "v21" sigue valiendo salvo indicación. **Standalone first**: sin `NgModule` salvo legacy de terceros.
- **Zoneless** (`provideZonelessChangeDetection()`, default v21+). **Nunca** `zone.js` ni `provideZoneChangeDetection()`.
- **`OnPush` default desde v22**; `Default` se renombró a **`Eager`** (deprecada). Regla 4.
- **TypeScript 6** estricto (`strict`, `noImplicitAny`, `strictTemplates`); TS 5.9 no soportado. Node 26 sí, Node 20 no.
- **`HttpClient` usa `FetchBackend`** por defecto: `withFetch()` innecesario y deprecado. Progreso de subida: `withXhr()` (§5.9).
- **Sin tests**: nunca `*.spec.ts` ni ningún archivo de test; `skipTests: true` en schematics; verificar con build, lint y prueba manual. Ver [08](./references/08-sin-tests.md).
- Incremental Hydration activa por defecto con `provideClientHydration()`. Imágenes estáticas con `NgOptimizedImage`.
- Accesibilidad: AXE limpio + WCAG **AA** mínimo; primitivas headless con **`@angular/aria`** (v22+).
- **Librería de componentes** (mirar `package.json`): **NG-ZORRO** si está; si no, **Angular Material**; si no, **controles propios**. Nunca mezclar dos ni instalar una para un solo control. §6.10.

---

## Índice de referencias (progressive disclosure)

Leer solo la referencia de la tarea. Cada archivo de más de 100 líneas empieza con su índice: saltar a la sección.

| Archivo | Temas | Cuándo leerlo |
| :--- | :--- | :--- |
| [01-project-structure.md](./references/01-project-structure.md) | Carpetas, alias `@/`, ubicación por alcance, naming, anidación, límites de tamaño, partir monolitos, UI reutilizable. | Al crear archivos o carpetas, o si algo supera el límite de líneas. |
| [02-typescript-signals.md](./references/02-typescript-signals.md) | TS 6, `input()` / `output()` / `model()`, `host: {}`, `inject()`, signals, `linkedSignal`, `untracked()`, `debounced()`, `injectAsync()`, `@Service()`, por qué no `effect()`, RxJS acotado, servicios, Request / Response y mapeo. | Al escribir lógica de componentes, servicios o estado. |
| [03-html-templates.md](./references/03-html-templates.md) | Control flow, `@let`, `@defer`, `@boundary`, content projection, bindings, `@angular/aria`, tablas NG-ZORRO, directivas del equipo. | Al escribir o modificar templates. |
| [04-resource-api.md](./references/04-resource-api.md) | `httpResource`, `rxResource`, `resource`, estados, fetch condicional, mutaciones + `reload()`, debounce. | Al leer datos asíncronos o hacer POST/PUT/DELETE. |
| [05-http-interceptors.md](./references/05-http-interceptors.md) | Interceptores funcionales (spinner, errores, retries), `HttpContextToken`, `ErrorHandler`, orden, fetch vs `withXhr`. | Al configurar infraestructura HTTP. |
| [06-signal-forms.md](./references/06-signal-forms.md) | `form()`, schema, validadores, `validateTree`, `applyEach`, errores accesibles, controles propios y NG-ZORRO. | Al crear o modificar formularios. |
| [07-styles-scss.md](./references/07-styles-scss.md) | `@use` / `@forward`, partials, tokens, BEM anidado, `:host`, theming NG-ZORRO sin `::ng-deep`, ITCSS, layout propio (nunca `nz-row` / `nz-col` / `nz-form-item`). | Al escribir estilos de componentes. |
| [08-sin-tests.md](./references/08-sin-tests.md) | Sin archivos de test, `skipTests`, specs existentes, verificar sin tests. | Al generar archivos con el CLI o al verificar una tarea. |
| [09-performance-zoneless.md](./references/09-performance-zoneless.md) | Change detection zoneless, `@defer`, `track`, lazy routes, router resources, `shouldReuseRoute`, Navigation API, virtual scroll, hidratación, budgets, leaks, profiling. | Al diagnosticar performance o si la vista no se actualiza. |
| [10-environment-tooling.md](./references/10-environment-tooling.md) | Schematics, `web.config` IIS, contrato con .NET, config en runtime, VS Code, Graphify, MCP, `.gitignore` de IA. | Al crear proyectos, desplegar o integrar con el backend. |
| [11-workflow-orchestration.md](./references/11-workflow-orchestration.md) | Explorar antes de editar, `tasks/todo.md`, verificación, commits chicos, alcance, preguntas, lecciones, auditoría de código sin usar y duplicado (§11.9). | En toda tarea no trivial y en todo pedido de auditoría. |
| [12-html5-semantics-seo.md](./references/12-html5-semantics-seo.md) | HTML5 semántico, landmarks, ARIA, formularios nativos, SEO, `TitleStrategy`, foco. | Al maquetar HTML o auditar accesibilidad/SEO. |
| [13-css3-layouts-animations.md](./references/13-css3-layouts-animations.md) | Cascada, `@layer`, `:has()`, Flexbox, Grid, `@container`, anchor positioning, transiciones, `animate.enter` / `animate.leave`, `@starting-style`, scroll-driven, `base-select`, `field-sizing`, `image-set()`, Baseline. | Al diseñar layouts o animaciones. |
| [14-agent-efficiency.md](./references/14-agent-efficiency.md) | Caveman, librerías, orquestador + subagentes, advisor, autocompactación, graphify (y "Si algo falla"), adaptación al agente, herramientas del agente. | Siempre: cómo responde el agente y cómo reparte el trabajo. |
| [15-security.md](./references/15-security.md) | Red Team por cambio, XSS, CSP, `autoCsp`, Trusted Types, tokens, XSRF, open redirect, SRI, secretos, cabeceras IIS, supply chain, Blue Team, OWASP Top 10, auditoría completa (§15.14). | Siempre: en todo cambio y code review; §15.14 cuando se pide seguridad a secas. |
| [16-websocket-signalr.md](./references/16-websocket-signalr.md) | SignalR estándar, singleton por hub, reconexión, estado en signals, ciclo de vida, contrato tipado, token (`accessTokenFactory`), WebSocket nativo (`rxjs/webSocket`). | Al crear o tocar una conexión en tiempo real (chat, presencia, notificaciones). |
| [17-microfrontends.md](./references/17-microfrontends.md) | Cuándo sí / no (por defecto librería npm), Native Federation v4, shell + remotes, manifest, comunicación, auth, estilos, versiones, IIS, seguridad, diagnóstico por síntoma (`NG0201`, `NG0912`). | Al evaluar, crear o tocar un microfrontend. |
| [checklists.md](./references/checklists.md) | Checklists Angular, HTML5/CSS3, seguridad y proceso; ejemplo Do & Don't. | Antes de entregar código o al revisar un PR. |
