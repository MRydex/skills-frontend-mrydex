---
name: desarrollo-buenas-practicas
description: >
  Convenciones del equipo para frontend Angular 22+ (signals, zoneless, Signal Forms, Resource API, SCSS con BEM, HTML semántico y WCAG AA, seguridad Red/Blue Team, sin archivos de test) y forma de trabajar del agente (caveman, graphify, subagentes). Usar siempre, antes de la primera herramienta, en cualquier repo con angular.json o con código .ts, .html, .scss o .css, para cualquier pedido: preguntas, explicaciones, revisión, depuración, refactor o cambios, aunque no mencione Angular. Incluye pedidos sobre pantallas, componentes, formularios, tablas, modales, estilos, layout o texto que rompe la UI; llamadas al backend (Request / Response, mapeo, httpResource, interceptores); tiempo real (WebSocket, SignalR) y microfrontends (Native Federation); rendimiento, accesibilidad, SEO o despliegue en IIS; seguridad del front ("auditá la seguridad", "¿es seguro?"); y auditorías ("auditá", "optimizá", "limpiá"): calidad, eficiencia, código duplicado y sin uso.
metadata:
  version: 1.48.10
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

Convenciones **obligatorias** del equipo para Angular 22+ y frontend moderno, más las reglas de cómo trabaja el agente. Leer las reglas y el modo de operación; el detalle vive en `references/`. Graphify no tiene paso de arranque (ver abajo).

> **Regla maestra**: si una API legacy tiene equivalente moderno (signals, control flow nativo, `inject()`, `input()`, `httpResource`, Signal Forms, `host: {}`, interceptores funcionales), **siempre el moderno**. Todo uso legacy se justifica por interoperabilidad con código existente y se documenta en el PR.

> **Regla de alcance**:
> - Las referencias son **convenciones con ejemplos**, no el código del proyecto. Nunca describir la app con los ejemplos de la skill: responder solo con lo que existe en el repo (`archivo:línea`). Si algo no está, decirlo.
> - Las reglas aplican al código que se escribe o modifica. Nombres y APIs de librerías externas (`node_modules`, paquetes de la empresa) no se juzgan ni se renombran.
> - La skill no es motivo para negarse. Hacer lo pedido con las convenciones; si hay un enfoque mejor, proponerlo en una línea y que el usuario decida. Única excepción: seguridad (§15).
> - **Versión y forma del repo.** Lo marcado v21 / v22 aplica según `@angular/core` en `package.json`: en versiones previas, la API equivalente que exista (tabla de §20.8), sin migrar sin pedido. Si el repo ya resuelve algo de otra manera (otra librería de UI, otro store, otro esquema de auth, sufijos de archivo como `-service`), el código nuevo sigue su patrón, salvo las reglas 1-3 y la seguridad, que no bajan; lo legacy que se toca se moderniza solo dentro del alcance (regla maestra): las líneas que el pedido cambia, no otro control o método del mismo archivo. La seguridad no baja nunca. En una auditoría, una convención de la skill que el repo no usa se reporta como mejora (BAJO), no como bug. Los textos de UI van en el idioma de la app. Ni el código ni sus comentarios citan la skill (`§6`, "según la skill"): el motivo se escribe con palabras propias.
> - **Pedido de solo lectura** (pregunta, explicación, revisión o auditoría "solo reportá"): no editar, no instalar, no escribir archivos. Del Paso 0 queda solo `graphify query` si el grafo existe (sin grafo, `grep`); `.gitignore`, herramientas o skills que falten se reportan en una línea; `npm audit` solo en una revisión o auditoría (no escribe); en una pregunta o explicación `npm audit` no corre, ni se cargan skills externas de §14.9 salvo `security-audit` en modo guía (y `security-and-hardening` para el STRIDE) si la pregunta es de seguridad. **Pedido mixto** ("¿es seguro? si hay un bug, arreglalo"): se corrige lo que el usuario autorizó y el resto se reporta.
> - **Repo con front y back** (también se activa `desarrollo-backend-buenas-practicas`): cada skill rige sus archivos (esta, `.ts` / `.html` / `.scss` / `.css`); el Paso 0 y lo de "una vez por sesión" corren una sola vez. Sin `angular.json` (scripts sueltos, `wwwroot`): solo seguridad, accesibilidad y HTML/CSS; las reglas de Angular no aplican.

> **Regla de simplicidad**: la solución más simple que resuelve lo pedido. Sin abstracciones, capas, genéricos, tokens ni librerías "por si acaso": se abstrae recién cuando el código aparece por segunda vez (§11.7.1).

---

### Graphify (sin paso de arranque)

No hay comando al empezar ni al cerrar la tarea. El grafo (`graphify-out/graph.json`) lo mantiene el hook git
`post-commit` que deja el instalador; `graphify update .` se corre **solo justo antes de un `graphify query`**,
y ese query es raro (ver abajo). Medido: `graphify update .` sin cambios tarda 0,7 s en 584 nodos, 1 s en 1.247
y 17,4 s en 12.598; correrlo al arrancar y tras cada edición gastaba casi un minuto por tarea en un repo grande
para un grafo que casi nunca se consulta.

**Durante la tarea**: buscar por nombre (símbolo, archivo, texto literal) con `grep` / `Glob`, directo. `graphify
query` solo para una pregunta de flujo sin ningún nombre conocido: antes `graphify update .`, después el query
con `--budget 800`; si devuelve nodos sin relación, `grep`. Medido en §14.5: `grep -l` costó de 10 a 120 veces
menos que una consulta al grafo, también en un repo de 12.600 nodos. Si `graphify update .` falla (`command not
found`, `Rebuild failed`, `worker failed`, `Nothing to update or rebuild failed` aunque el exit code sea 0):
**avisar** con el comando, el error exacto y la causa probable (§14.5 "Si algo falla"); nunca seguir en silencio.

---

### Las reglas que más se violan (leer siempre)

1. **Nunca `effect()`** (salvo las excepciones acotadas de [02](./references/02-typescript-signals.md) §2.7). Derivar con `computed()` / `linkedSignal()`, datos con la Resource API, concerns transversales con interceptores. Por qué: crea cascadas de escrituras difíciles de razonar y testear. Ver [02](./references/02-typescript-signals.md).
2. **Nunca `Observable` / `Subject` / `BehaviorSubject` como estado.** Estado siempre en signals. RxJS solo dentro de servicios, para flujos (`rxResource`, eventos). Ver [02](./references/02-typescript-signals.md).
3. **Nunca Reactive Forms ni `ngModel`.** Solo **Signal Forms** (`@angular/forms/signals`); en v20 o menor, la alternativa de §6 (intro); donde ya hay Reactive Forms en v19 o menor, se sigue ese patrón (§20.8). Ver [06](./references/06-signal-forms.md).
4. **`changeDetection` según `@angular/core` en `package.json`.** v22+: **no declararlo** (OnPush es default). Menor a v22: **siempre** `ChangeDetectionStrategy.OnPush` en componentes nuevos; a uno existente sin OnPush no se le agrega sin pedido (con estado mutable o `ngModel` puede dejar de refrescarse): se propone en el reporte. `standalone: true` solo en v18 o menor. Ver [02](./references/02-typescript-signals.md) §2.2.
5. **Nunca `*ngIf` / `*ngFor` / `*ngSwitch` / `[ngClass]` / `[ngStyle]`.** Control flow nativo y `[class.x]` / `[style.x]`. Ver [03](./references/03-html-templates.md).
6. **Nunca archivos monolíticos.** Máximo: componente `.ts` 200 líneas, `.html` 200, servicio 250, `.scss` 150. Si se pasa, dividir por responsabilidad (subcomponentes presentacionales con `input()` / `output()`, sub-servicios de lógica / HTTP). **Dentro del límite no se divide**, salvo bloque reutilizado, con estado / lógica propia (modal con su form, panel `@defer`) o una lista pesada que hay que aislar del change detection (§9.9.1): no componentizar bloques chicos de solo markup usados una vez (§1.4). Ver [01](./references/01-project-structure.md).
7. **Nunca carpeta `components/` para subcomponentes.** Cada hijo anidado en la carpeta del padre: `detalle/subdetalle/subdetalle-cabecera/` (el árbol de carpetas = árbol de componentes). Única excepción: `shared/components/` para lo reutilizado por varias features. UI repetida = **un solo componente reutilizable**, nunca copias adaptadas. Ver §1.5.
8. **Nunca sufijos `.component` / `.service` / `.directive` / `Component` / `Service` / `Directive`.** `user-list.ts` exporta `UserList`. Pipes, guards, resolvers e interceptors sí: `currency-format-pipe.ts` → `CurrencyFormatPipe`, `auth-guard.ts` → `authGuard`. Ver [01](./references/01-project-structure.md).
9. **Nunca reescribir la clase BEM completa en SCSS.** Elementos y modificadores anidados con `&__` / `&--`: `.card { &__title { &--big {} } }`; nunca `.card__title` ni `.card__title--big` como selector propio, ni `&__title--big`. Ver [07](./references/07-styles-scss.md) §7.3.

Ejemplo antes / después: [checklists.md](./references/checklists.md) "Verificación rápida (Do & Don't)".

---

### Modo de operación del agente

Rige toda la sesión desde que la skill se carga. Para sesiones que no tocan Angular, instalar los archivos puente (`--bridge`: `CLAUDE.md`, `AGENTS.md`, `.cursorrules`). Las `§14.x` están en [14-agent-efficiency.md](./references/14-agent-efficiency.md): leer solo la sección necesaria.

0. **Adaptarse al agente y modelos en uso.** Detectar el agente (Claude Code, Codex, Antigravity, Cursor, Copilot, Gemini CLI, otro) y sus modelos. Todo nombre concreto (Opus, Sonnet, Haiku, `/compact`, `AskUserQuestion`, `SendMessage`, `Agent`) es **ejemplo**: traducirlo; sin equivalente, el fallback documentado. Las reglas no cambian, solo la sintaxis. §14.7.
1. **Caveman siempre, conciso y corto**, en todo lo que emite la skill (respuestas, reportes, avisos, preguntas, subagentes). Una línea de estado por fase o paso largo. Reporte final: qué cambió, qué falló, qué decide el usuario; sin resúmenes por sección; linkear archivos. Términos, código y errores exactos. Nunca omitir negaciones. Prosa normal: seguridad, acciones irreversibles, pasos cuyo orden la compresión haría ambiguo, cuando el usuario pide aclaración, y en código, commits, PRs y docs. §14.1.
2. **Librerías: preguntar antes de investigar.** Primero otra sesión/agente abierto que la conozca (Claude Code: `ListAgents` + `SendMessage`), luego MCP de docs, `node_modules`, último la web. §14.2.
3. **El modelo seleccionado orquesta; delega solo si ahorra tokens.** Delegar búsquedas/lecturas grandes (3+ archivos, logs, docs) y ediciones mecánicas en 8+ archivos (en 3 archivos delegar costó 38% más). Tareas chicas, decisiones y revisión final: el orquestador. Si lo que habría que leer es 3x o más lo que hace falta saber, delegar. Solo por uno de 4 motivos nombrados (exploración grande, escritores en paralelo, respaldo de contexto, verificador de riesgo alto o de un diff grande (3+ archivos) contra el checklist); ante la duda, no delegar. 5+ unidades independientes en todo el codebase: proponer `/batch <instrucción>`. Brief en `tasks/brief-<tarea>.md` con solo las reglas compactas que aplican; el ejecutor no adivina (`NECESITA_ADVISOR: <duda>`); el orquestador interviene tras la orientación, cuando se traba y antes de terminar. Advisor nativo: el instalador configura `fable` (nivel superior a Sonnet y Opus; no si la sesión ya es Fable); consultarlo solo en esos 3 momentos, nunca en pasos mecánicos; `/advisor off` lo quita. §14.3.4, §14.3.5.
4. **Preguntar todo antes de empezar.** En tareas no triviales, todas las dudas que cambian el resultado de una vez, con opciones y una recomendada (Claude Code: `AskUserQuestion`); no preguntar lo que se resuelve leyendo el repo (§11.6). Sin usuario que responda (ejecución desatendida): tomar la opción recomendada y listarla como supuesto en el reporte. **Chica** si se retoma con el pedido + `git diff` (directo); **grande** si no (`tasks/todo.md` con L1 literal, Specs, Tasks con riesgo y Log; tarea por tarea; commits de ~400 líneas). Revisión según riesgo trivial / medio / alto (§11.2, §11.3).
5. **Autocompactar.** Al cerrar fase o antes de tarea nueva: estado en `tasks/todo.md` y proponer compactar con foco (Claude Code: `/compact Conservar: decisiones, archivos tocados, pendientes`; el agente no puede correrlo solo). Tarea nueva sin relación: proponer `/clear`. Nunca con un cambio a medio aplicar ni una pregunta pendiente. §14.4.
6. **Graphify sin ceremonia.** Sin paso de arranque ni de cierre: el hook git actualiza el grafo en cada commit. Buscar por nombre con `grep` / `Glob`; `graphify query` solo para preguntas de flujo sin nombre conocido, con `graphify update .` justo antes. §14.5.
7. **Herramientas del agente, siempre.** ponytail (código mínimo, `ponytail-review` sobre el diff en todo cambio no trivial, §11.3); agent-skills por fase, nunca las de tests; en cada área, además de estas reglas, la skill externa que le toca según la tabla de [§14.9](./references/14-agent-efficiency.md#149-skills-externas-por-área) (gana la regla del repo); claude-code-setup en repos sin setup. Si falta una, instalarla y avisar en una línea. §14.8.
8. **Seguridad siempre (Red + Blue Team).** Todo cambio pasa la tabla rápida de §15.2; riesgo alto suma la revisión ofensiva profunda (§11.3). Nunca desactivar protecciones (sanitizador, CSP, XSRF, validación del backend). Nunca secretos en el front. Toda vulnerabilidad se reporta, aunque esté fuera del alcance. "Auditá" a secas o pedido de seguridad ("auditá la seguridad", "¿es segura la app?", "pentest"): auditoría completa red + blue + network de §15.14, corrigiendo lo que esté en alcance. Pregunta sobre algo concreto ("¿es seguro X?") o pedido de solo lectura: solo reporte con fix propuesto y cobertura de la parte preguntada (sus áreas de la tabla), `security-audit` en modo guía, `claude-security` (escaneo multiagente, caro) solo con pedido explícito o si el usuario acepta su costo, también en la auditoría completa (§15.14 paso 5). **`npm audit` siempre**: una vez por sesión, en la primera tarea no trivial y tras cada cambio en `package.json`/lockfile; reportar todo hallazgo y avisar `high`/`critical` de runtime; si es del framework, proponer el patch de la misma major sin aplicarlo sin pedido (§15.10). Ver [15-security.md](./references/15-security.md).
9. **Archivos de IA en `.gitignore`.** Al empezar, verificar que excluya todo lo de IA y agentes (`.claude/`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `graphify-out/`, `tasks/todo.md`, etc.); si no existe, se crea con eso más `node_modules/`, `dist/` y `.angular/`; agregar lo que falte en la primera tarea no trivial (tarea trivial: avisar en una línea); preguntar antes de `git rm --cached`. §10.9.
10. **Auditar = control de calidad completo.** Todo pedido de auditoría (app completa, feature, carpeta o diff; sin alcance, la app completa) revisa calidad, legibilidad y mantenimiento, escalabilidad, eficiencia, código duplicado y sin uso, e instrucciones de agentes con `/claude-api prompt-audit` (§11.9). Cada candidato verificado contra uso dinámico; reporte con cobertura por área y `archivo:línea`. Corrige en tandas chicas sin cambiar comportamiento: borra lo sin uso, unifica duplicados, optimiza; pregunta antes solo cambios visibles, API pública o refactors grandes. "Auditá" a secas suma la auditoría de seguridad completa de §15.14 (regla 8); solo seguridad corre solo §15.14; solo calidad ("optimizá", "limpiá") suma la seguridad base (§15.2, `npm audit`).
11. **Ciclo de trabajo.** Supuestos tomados sin preguntar: en una línea. Cada task con criterio de hecho ejecutable antes de programarla; dos fuentes que se contradicen se muestran y se pregunta, nunca se promedian; lo que responde un comando no lo responde el modelo; el reporte dice qué chequeo se salteó; build/lint se juzgan por errores nuevos (build ya roto antes: `ngc --noEmit` y se avisa); 3 intentos fallidos sobre el mismo error = parar y reportar el bloqueo; al retomar, `Estado` de `tasks/todo.md` contra `git log` y build (§11.2, §11.3, §11.6, §11.7). El reporte final lista las decisiones que el pedido no fijaba y qué cubrió y qué no cada chequeo en verde. Una corrección del usuario que sirva a sesiones futuras se registra en `tasks/lessons.md`, que se lee al arrancar; un tropiezo puntual no (§11.8). Antes del reporte final de un cambio no trivial: la revisión de su riesgo (`ponytail-review` como mínimo; riesgo alto, como auth, interceptores o `package.json`: la fila completa de §11.3) y la skill de §14.9 del área; lo que se salteó se dice.

---

## 0. Stack y supuestos del proyecto

- **Angular 22+**; lo marcado "v21" sigue valiendo salvo indicación. Proyecto en v21 o menor: tabla de §20.8. **Standalone first**: sin `NgModule` salvo legacy de terceros.
- **Zoneless** (`provideZonelessChangeDetection()`, default v21+). **Nunca** `zone.js` ni `provideZoneChangeDetection()`.
- **`OnPush` default desde v22**; `Default` se renombró a **`Eager`** (deprecada). Regla 4.
- **TypeScript 6** estricto (`strict`, `noImplicitAny`, `strictTemplates`; v22.2+: `strictUnclaimedEventNames` en `angularCompilerOptions`, detecta outputs mal escritos); TS 5.9 no soportado. Node 26 sí, Node 20 no.
- **`HttpClient` usa `FetchBackend`** por defecto: `withFetch()` innecesario y deprecado. Progreso de subida: `withXhr()` (§5.9).
- **Sin archivos de test, pero todo probado**: nunca `*.spec.ts` ni ningún archivo de test por cuenta propia (si el usuario los pide explícitamente, se hacen); `skipTests: true` en schematics; verificar con build, lint y prueba manual. Ver [08](./references/08-sin-tests.md).
- Incremental Hydration activa por defecto con `provideClientHydration()`. Imágenes estáticas con `NgOptimizedImage`.
- Accesibilidad: AXE limpio + WCAG **AA** mínimo; primitivas headless con **`@angular/aria`** (v22+).
- **Librería de componentes** (mirar `package.json`): **NG-ZORRO** si está; si no, **Angular Material**; si no, **controles propios**. Nunca mezclar dos ni instalar una para un solo control. §6.10. NG-ZORRO ≥ 22.1.2 con adaptador de fechas e i18n en `app.config.ts` (§10.10).

---

## Índice de referencias (progressive disclosure)

Leer solo la referencia de la tarea. Cada archivo de más de 100 líneas empieza con su índice: saltar a la sección.

| Archivo | Temas | Cuándo leerlo |
| :--- | :--- | :--- |
| [01-project-structure.md](./references/01-project-structure.md) | Carpetas, alias `@/`, naming, anidación, límites de tamaño, UI reutilizable. | Al crear archivos o carpetas, o si algo supera el límite de líneas. |
| [02-typescript-signals.md](./references/02-typescript-signals.md) | TS 6, naming, tipos derivados (§2.11), `input()` / `output()` / `model()`, `host: {}`, `inject()`, signals, `linkedSignal`, `untracked()`, `debounced()`, `injectAsync()`, `@Service()`, por qué no `effect()`, RxJS acotado, Request / Response y mapeo, permisos y rutas (§2.17). | Lógica de componentes, servicios o estado. |
| [03-html-templates.md](./references/03-html-templates.md) | Control flow, `@let`, `@defer`, `@boundary`, projection, bindings, `@angular/aria`, tablas NG-ZORRO y filtros (§3.6), directivas del equipo. | Templates. |
| [04-resource-api.md](./references/04-resource-api.md) | `httpResource`, `rxResource`, `resource`, estados, fetch condicional, mutaciones + `reload()`. | Datos asíncronos, POST / PUT / DELETE. |
| [05-http-interceptors.md](./references/05-http-interceptors.md) | Interceptores funcionales, `HttpContextToken`, `ErrorHandler`, orden, fetch vs `withXhr`, fechas. | Infraestructura HTTP. |
| [06-signal-forms.md](./references/06-signal-forms.md) | `form()`, schema, validadores, `validateTree`, `applyEach`, errores accesibles, controles propios y NG-ZORRO. | Formularios. |
| [07-styles-scss.md](./references/07-styles-scss.md) | `@use` / `@forward`, tokens, BEM anidado, `:host`, theming NG-ZORRO sin `::ng-deep`, Material M3 (`mat.theme`), ITCSS, layout propio (nunca `nz-row` / `nz-col`). | Estilos. |
| [08-sin-tests.md](./references/08-sin-tests.md) | Sin archivos de test, `skipTests`, hook `guard-spec`, verificar sin tests. | Al generar con el CLI o verificar. |
| [09-performance-zoneless.md](./references/09-performance-zoneless.md) | Zoneless, `@defer`, `track`, lazy routes, guards y router, `shouldReuseRoute`, virtual scroll, hidratación, budgets, leaks, profiling. | UI lenta, input que se traba, vista que no se actualiza. |
| [10-environment-tooling.md](./references/10-environment-tooling.md) | Schematics, IIS `web.config`, contrato .NET, config en runtime, MCP y hooks, `baseHref`, HTTPS local, Docker, Service Worker (§10.14), `.gitignore` de IA, setup NG-ZORRO 22 / Material, i18n. | Crear proyectos, desplegar, integrar backend, librería de UI. |
| [11-workflow-orchestration.md](./references/11-workflow-orchestration.md) | Explorar antes de editar, `tasks/todo.md`, verificación, commits chicos, alcance, preguntas, lecciones, auditoría (§11.9). | Toda tarea no trivial y toda auditoría. |
| [12-html5-semantics-seo.md](./references/12-html5-semantics-seo.md) | HTML5 semántico, landmarks, ARIA, formularios nativos, SEO, `TitleStrategy`, foco. | Maquetar HTML, auditar accesibilidad / SEO. |
| [13-css3-layouts-animations.md](./references/13-css3-layouts-animations.md) | `@layer`, `:has()`, movimiento (§13.31), Flexbox, Grid, `@container`, anchor positioning, `animate.enter` / `leave`, `@starting-style`, scroll-driven, view transitions, Baseline. | Layouts o animaciones. |
| [14-agent-efficiency.md](./references/14-agent-efficiency.md) | Caveman, librerías, subagentes, advisor, autocompactación, graphify, adaptación al agente, herramientas, skills externas (§14.9). | Solo la §14.x que cite una regla del modo de operación. |
| [15-security.md](./references/15-security.md) | Red Team por cambio, XSS, CSP, Trusted Types, tokens, OIDC, XSRF, open redirect, SRI, secretos, cabeceras IIS, supply chain, OWASP, auditoría completa (§15.14). | §15.2 en todo cambio; §15.14 si piden seguridad a secas; el resto según el área. |
| [16-websocket-signalr.md](./references/16-websocket-signalr.md) | SignalR, singleton por hub, reconexión, estado en signals, contrato tipado, token, WebSocket nativo. | Tiempo real (chat, presencia, notificaciones). |
| [17-microfrontends.md](./references/17-microfrontends.md) | Cuándo sí / no, Native Federation v4, shell + remotes, comunicación, auth, versiones, IIS, diagnóstico (`NG0201`, `NG0912`). | Microfrontends. |
| [18-librerias-angular.md](./references/18-librerias-angular.md) | `ng-packagr`: entry points, `peerDependencies`, estilos, `provideUiLib()`, registry privado, semver, `npm pack` / `link`. | **Solo** con librería en el workspace (`projects/<lib>/ng-package.json`), consumo de la librería del equipo o pedido de crearla. Si no, `shared/`. |
| [19-archivos-pdf-excel-editor.md](./references/19-archivos-pdf-excel-editor.md) | Descargas / subidas, CSV / Excel (`exceljs`), CSV injection, PDF (`pdfjs-dist`), TipTap v3. | **Solo** si la pantalla maneja archivos, exporta, muestra PDF o usa editor enriquecido. Plataforma antes que librería. |
| [20-migracion-angular.md](./references/20-migracion-angular.md) | Migrar legacy en 12 pasos: `ng update`, builder `application`, schematics, zoneless, Signal Forms gradual, "si falla". | **Solo** si el usuario pide migrar o actualizar. Nunca por iniciativa propia. |
| [checklists.md](./references/checklists.md) | Checklists Angular, HTML / CSS, seguridad, producción, proceso; Do & Don't. | Antes de entregar o al revisar un PR. |

## Antes de entregar

Releer el diff como un revisor que no vio la tarea: los errores que quedan suelen estar en lo que nadie pidió mirar.

1. **Alcance.** Nada que el pedido no nombre; lo legacy, solo en las líneas que cambian. El contrato con el backend no cambia sin pedido: cada agregado es código que alguien mantiene.
2. **Corrección.** Estados de carga, error (con reintentar) y vacío; datos del backend o del socket entran como `unknown` y pasan por un parser que valida cada campo que se usa (una fecha que no parsea se descarta, no llega al pipe `date`); nada queda suscrito después de destruir el componente. Ningún `catch` / `catchError` traga en silencio: el usuario ve el error o queda en el log.
3. **Seguridad.** §15.2 sobre lo tocado: datos de usuario nunca a `innerHTML` ni `bypassSecurityTrust*`; links, solo `http` / `https`. Riesgo alto (auth, tokens, interceptores, `package.json`): la revisión es parte de terminar (lo decide qué toca, no el tamaño del diff), no un extra ni algo que se ahorra: cargar `security-audit` en modo guía (una skill, barata) y pasar `revisor-checklist` (si toca auth, tokens, guards o interceptores de auth, también `revisor-auth`); si el agente no puede lanzar subagentes, recorrer [checklists.md](./references/checklists.md) completo. Lo que marquen (MEDIO o más) se corrige antes del reporte; sin esa revisión, el reporte lo dice como pendiente bloqueante.
4. **Escalabilidad.** Listas que crecen con `track` estable y tope o virtualización (§9.9.1); nada pesado en el template (va a un `computed`).
5. **Accesibilidad y legibilidad.** WCAG AA real (label, foco, contraste también en estados como la burbuja propia de un chat); nombres del dominio, componentes chicos, el estilo de los archivos vecinos.
6. **Verificación.** Build sin errores nuevos (regla 11; build ya roto: `ngc --noEmit`); sin archivos de test (§8).

Después, [checklists.md](./references/checklists.md): los bloques que toca el cambio.
