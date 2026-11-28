# skills-frontend-mrydex

Skill de Angular 22+ y frontend moderno para agentes de IA: Claude Code, Codex, Cursor, Windsurf,
GitHub Copilot, Google Antigravity y cualquier agente compatible con Agent Skills.
Se instala directo desde GitHub.

Hermana de [skills-backend-mrydex](https://github.com/MRydex/skills-backend-mrydex) (.NET).

## Instalar

Requisitos: Node.js 18+. Python 3.11.5 a 3.14 para graphify (si falta, el instalador avisa y sigue).

Interactivo (pregunta agente y destino):

```bash
npx github:MRydex/skills-frontend-mrydex
```

Con npm 12 o más, `npx` no baja de un origen git por defecto (`EALLOWGIT`). Se permite solo para ese comando:

```bash
npx --allow-git=root github:MRydex/skills-frontend-mrydex
```

Todos los agentes en el proyecto actual:

```bash
npx github:MRydex/skills-frontend-mrydex -a all -w -b
```

Solo global, un agente:

```bash
npx github:MRydex/skills-frontend-mrydex -a claude -g
```

Claude Code con advisor (opcional: el modelo de la sesión consulta a uno más fuerte cuando hace falta):

```bash
npx github:MRydex/skills-frontend-mrydex -a claude -g --advisor fable
```

Sin el flag se instala **con el advisor apagado** (ver "Modelos: qué corre dónde"). Si se activa queda en
`~/.claude/settings.json` y es automático: el modelo decide cuándo consultarlo (al orientarse, al trabarse y
antes de terminar). Se cobra al precio del advisor. `--advisor off` lo quita. También se cambia dentro de
Claude Code, sin reinstalar: `/advisor fable`, `/advisor opus` o `/advisor off`.

## Usar

No hay que pedirla: en un repo con `angular.json` o con código `.ts`, `.html`, `.scss` o `.css`, el agente
la carga antes de la primera herramienta, para cualquier pedido (preguntas, revisión, depuración, cambios).

Para invocarla a mano en Claude Code: `/develop-front`. En otros agentes, nombrarla en el pedido
("usá la skill `develop-front`"). La de backend es `/develop-back`.

Antes se llamaba `desarrollo-buenas-practicas`. Al actualizar, el instalador borra la carpeta con
el nombre anterior y reescribe el bloque global, así que no queda duplicada.

## Actualizar

Correr el mismo comando de instalación. Borra los archivos viejos y copia la última versión.
Si `npx` usa una copia en caché, agregar `#main` al final. `--doctor` muestra qué está instalado sin
escribir nada.

Comando fijo en la terminal (opcional): `npm install -g github:MRydex/skills-frontend-mrydex`,
después `skills-frontend`.

## Dónde se instala

| Agente | Ubicación | Flag |
| :--- | :--- | :--- |
| Claude Code | `~/.claude/skills/develop-front` | `-a claude` |
| Antigravity | `~/.gemini/config/skills/` o `.agents/skills/` | `-a antigravity` |
| Cursor / Windsurf | `skills/` + `.cursorrules` | `-a cursor -b` |
| Codex | `~/.agents/skills/develop-front` + `AGENTS.md` | `-a codex` |
| Copilot | `skills/` + `AGENTS.md` | `-a universal -b` |
| Todos | Global + puentes en el repo | `-a all -w -b` |

Fuera de un repo git instala solo global. Dentro de un repo instala además en la raíz.

## Qué configura

Instala todo por defecto. `--no-external` saltea lo que baja código de terceros (caveman, skills externas,
plugins y la instalación o actualización del CLI de Claude Code); quedan la skill, subagentes, hooks y graphify.

- **graphify**: CLI y skill, hooks git `post-commit` / `post-checkout` y grafo inicial (`graphify update .`,
  sin costo de tokens). Sin integración por agente ni modo estricto: medido, `grep` cuesta de 10 a 120 veces
  menos que `graphify query` (§14.5 de la skill), así que el grafo queda para preguntas de flujo sin nombre
  conocido. En Claude Code, `graphify` corre sin pedir aprobación.
- **Subagentes** `investigador`, `ejecutor`, `revisor-checklist`, `migrador-angular`,
  `Explore` (solo Claude Code, Haiku),
  `auditor-contrato-api` y `revisor-auth` en el formato de cada agente.
  Bloque global en `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md` y `~/.gemini/GEMINI.md`: cargar
  siempre la skill y delegar solo cuando baja el total de tokens.
- **Hooks de Claude Code**: `guard-spec` (pide confirmación antes de crear specs en repos Angular),
  `guard-secrets` (bloquea escribir secretos con Edit/Write), `guard-rules` (al cerrar el turno revisa lo que cambió contra las reglas
  de la skill y lo devuelve una vez si rompe alguna) y `format-prettier` (Prettier local
  sobre el archivo editado, solo si el proyecto ya lo usa).
- **caveman**: respuestas cortas (sin él salen 33% más largas).
- **Seguridad**: [security-audit](https://github.com/cloudflare/security-audit-skill),
  25 skills de [Anthropic-Cybersecurity-Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)
  y 22 `offensive-*` de [claude-red](https://github.com/SnailSploit/claude-red), solo de web, API,
  auth, supply chain y network (TLS, cabeceras, WebSocket, superficie expuesta). Plugin `claude-security` en Claude Code.
- **Otras skills**: [emilkowalski/skills](https://github.com/emilkowalski/skills) (solo web),
  [ponytail](https://github.com/DietrichGebert/ponytail),
  [agent-skills](https://github.com/addyosmani/agent-skills),
  [web-design-guidelines](https://github.com/vercel-labs/agent-skills) y
  [agent-browser](https://github.com/vercel-labs/agent-browser) de Vercel (skill y su CLI de npm, `npm i -g agent-browser`),
  [grill-me](https://github.com/mattpocock/skills) (con `grilling`, que trae el método) y [find-skills](https://github.com/vercel-labs/skills).
  Plugin `claude-code-setup` en Claude Code.
- **Hook `SessionStart`** de Claude Code: carga `tasks/lessons.md` del proyecto como contexto y avisa una vez por día si hay una versión nueva de la skill; autocompactación al 40%.
- **Claude Code, extras** (cada uno solo si el usuario no lo configuró antes, salvo `permissions.deny`, que se suma):
  - `permissions.deny` para que el agente no lea secretos (`~/.ssh`, `.env*`, `*.pem`, `*.key`...); se suman a las reglas del usuario.
  - MCP [Context7](https://github.com/upstash/context7) (docs vigentes de librerías, gratis).
  - `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`: todo subagente sin `model` propio (`general-purpose`, skills, plugins)
    corre en Sonnet en vez de heredar el modelo de la sesión (medido con sesión Fable: $0.90 contra $0.15 por
    búsqueda, mismo resultado).
  - `skillListingBudgetFraction: 0.025`: el listado de skills pasa de 1% a 2,5% del contexto. Con el 1% de
    fábrica, más de la mitad de las skills instaladas quedaba listada sin descripción y el agente no las
    activaba solo (medido: 77 de 135). Cuesta unos 11.500 tokens más por sesión.
  - `skillOverrides`: las skills que instala este paquete se listan solo con el nombre; se cargan igual
    cuando hacen falta. Medido con 41 pedidos que no nombran la skill: mismo acierto que con la descripción
    completa (41 de 41) y 14.000 tokens menos por sesión. Para volver a la descripción completa de una, poner
    `"on"` en su entrada de `skillOverrides`.
  - Las skills externas que su autor marcó solo para uso manual (`disable-model-invocation: true`) quedan
    habilitadas para que el agente las cargue solo.
  - Subagente `Explore` propio en Haiku con `effort: low`: reemplaza al `Explore` de fábrica, que corre con el
    modelo de la sesión (medido: $0.14 en Opus contra $0.002 en Haiku, mismo resultado).
  - Advisor: no se configura por defecto (medido: no mejora al ejecutor solo). `--advisor fable|opus` lo
    activa; se cobra al precio del advisor, solo con la API de Anthropic. `--advisor off` quita el que haya.
  - Subagentes con `effort` (`low` el revisor y `Explore`, `medium` el resto).
- **`.gitignore`**: agrega los archivos de IA y agentes.

## Opciones

```text
-a, --agent <nombre>   antigravity | claude | codex | cursor | universal | all
-g, --global           Instala en el home del usuario
-w, --workspace        Instala también en la raíz del repo
-t, --target <ruta>    Ruta personalizada
-b, --bridge           Copia AGENTS.md, CLAUDE.md y .cursorrules
--dry-run              Muestra qué haría, sin escribir
--doctor               Chequea qué está instalado, sin escribir nada
--no-external          No baja código de terceros (caveman, skills externas, plugins, CLI de Claude Code)
--advisor <modelo>     Claude Code: advisor (fable | opus | sonnet | off); sin el flag no se configura
-v, --version          Versión
-h, --help             Ayuda
```

## Contenido

El agente lee [`SKILL.md`](./skills/develop-front/SKILL.md) y solo la referencia que
pide la tarea.

```text
skills/develop-front/
├── SKILL.md                          # Reglas clave, modo de operación, stack
└── references/
    ├── 01-project-structure.md       # Carpetas, alias @/, naming, límites de tamaño
    ├── 02-typescript-signals.md      # TS 6, signals, inject(), inputs/outputs
    ├── 03-html-templates.md          # Control flow, @defer, accesibilidad
    ├── 04-resource-api.md            # httpResource, rxResource, mutaciones
    ├── 05-http-interceptors.md       # Spinner, errores, retries
    ├── 06-signal-forms.md            # Signal Forms y validación
    ├── 07-styles-scss.md             # @use, BEM, NG-ZORRO, ITCSS
    ├── 08-sin-tests.md               # Sin archivos de test
    ├── 09-performance-zoneless.md    # Zoneless, rutas, hidratación, profiling
    ├── 10-environment-tooling.md     # IIS, backend .NET, schematics
    ├── 11-workflow-orchestration.md  # Explorar, planificar, verificar
    ├── 12-html5-semantics-seo.md     # Semántica, ARIA, SEO
    ├── 13-css3-layouts-animations.md # Grid, @layer, :has(), animaciones
    ├── 14-agent-efficiency.md        # Caveman, subagentes, graphify
    ├── 15-security.md                # Red / Blue Team, OWASP
    ├── 16-websocket-signalr.md       # Tiempo real: WebSocket y SignalR
    ├── 17-microfrontends.md          # Native Federation, shell y remotes
    ├── 18-librerias-angular.md       # Librerías Angular propias (ng-packagr)
    ├── 19-archivos-pdf-excel-editor.md # PDF, Excel y editores (si ya se usan)
    ├── 20-migracion-angular.md       # Migración de versiones paso a paso
    └── checklists.md                 # Checklists de entrega
```

## Modelos: qué corre dónde (Claude Code)

Resumen de lo que deja el instalador, según lo que publicó Anthropic
([nov 2026](https://claude.dev/blog/which-claude-model-should-you-build-with/)) y lo que midió el equipo
(skill §14.3.4). **Nada cambia de modelo solo, ni hacia arriba ni hacia abajo.**

| Qué | Modelo | Quién lo decide |
| :--- | :--- | :--- |
| La sesión (pensar, decidir, editar, revisar) | El que elegís con `/model`; queda fijo | Vos |
| `Explore` (exploración por defecto: "dónde está X", "cómo funciona X") | Haiku, `effort: low` (agente propio que reemplaza al de fábrica, que corría con el modelo de la sesión) | Instalador |
| `general-purpose`, subagentes de skills y plugins sin `model` propio | Sonnet (`CLAUDE_CODE_SUBAGENT_MODEL=sonnet`; antes heredaban la sesión) | Instalador |
| Subagentes del equipo (`investigador`, ejecutores, revisores) | Sonnet; revisor y `Explore` en Haiku | Instalador |
| Advisor (consulta hacia arriba) | Apagado | Vos, con `--advisor` o `/advisor` |

**Según el modelo de sesión que elijas:**

- **Fable**: queda Fable todo el tiempo. Búsquedas en Haiku, subagentes genéricos en Sonnet. Sin advisor
  posible (no hay nivel superior disponible).
- **Opus**: queda Opus. Mismo esquema de subagentes. No sube a Fable solo.
- **Sonnet**: queda Sonnet. Mismo esquema. Anthropic lo recomienda para bug fixes, features con spec clara y
  agentes repetitivos; una migración u optimización con spec puede igual pedir Opus o Fable.

**Cuándo cambiar de modelo o de effort** (regla de Anthropic, skill §14.3.1): arrancar en el modelo de la
sesión con effort `medium` (el default). Si no rinde, en este orden: 1) darle forma de autoverificarse
(build, lint, script); 2) subir un nivel de effort; 3) pasado `high`, el modelo siguiente en effort más
bajo, no más effort. Cambiar de modelo solo en un corte natural con `/compact` antes: la caché de prompt y
el razonamiento no se heredan hacia abajo (bajar de Fable pierde todo su razonamiento; subir lo conserva).

**La configuración que recomienda Anthropic, en una línea:** sesión en **Opus 5.5 con effort `medium`**
(el default de Claude Code: "start most work on Opus 5.5 at its default effort level, `medium`"), subagentes
en modelos chicos (lo que deja el instalador), y advisor **apagado salvo que lo midas**. No existe ningún
cambio automático de modelo hacia arriba ni hacia abajo dentro de la sesión: solo los subagentes bajan, y
subir o bajar la sesión lo hacés vos con `/model`. (`opusplan`, el alias que planifica con Opus y edita con
Sonnet, hace lo contrario de ese consejo: pone los edits en Sonnet; Anthropic pide medirlo antes de usarlo.)

**Cuándo prender el advisor (`/advisor fable`).** Anthropic: "none clearly beat its executor alone"; el único
pareo medido, Opus `high` + Fable advisor, dio +1.7 puntos por ~2.1× el costo, "at the edge of run-to-run
noise, and about what raising effort would have bought". El equipo midió 10× de costo y alcance ampliado con
un advisor del mismo nivel (Sonnet + Opus). La doc del advisor dice dónde encaja: tareas largas de muchos
pasos donde la mayoría de los turnos son rutina pero la calidad del plan define el resultado (refactor
grande, un error que se repite, una tarea que querés que alguien revise antes de darla por hecha); y dónde
no: tareas cortas, o trabajo donde cada turno necesita el modelo más fuerte (ahí, cambiar la sesión). Regla
del equipo:

1. Sesión Sonnet u Opus (el advisor tiene que ser de nivel superior; con sesión Fable no suma).
2. Tarea larga y de riesgo alto (refactor o migración grande, auth, un bug que vuelve) y effort `high` ya no
   alcanzó.
3. Lo prendés para esa tarea y lo apagás al terminar. Si el modelo no lo consulta (`/usage` sin gasto de
   Fable), no sirvió tenerlo.

## Opcional: modo aprendizaje con VibeWise

No lo instala el instalador: es para quien quiera aprender mientras programa, no un estándar del equipo.

[VibeWise](https://github.com/nykooi1/vibe-wise) es un plugin de Claude Code y Codex (MIT). Con el modo
prendido, antes de escribir código el agente te pregunta cómo lo resolverías, repasa con vos las alternativas
y sus costos, y después de escribirlo explica qué hizo. Sirve al entrar a un proyecto o a un stack que no
conocés.

Instalarlo en tu máquina (necesita Python 3), dentro de Claude Code, un comando por vez:

```text
/plugin marketplace add nykooi1/vibe-wise
/plugin install vibe-wise@vibe-wise
```

Su README ofrece además `/plugin install vibe-wise@anthropic-plugin-directory`, sin agregar el marketplace,
si tu versión de Claude Code trae ese directorio.

Reiniciar Claude Code en el proyecto y prender el modo solo en las sesiones donde lo quieras:

```text
/vibe-wise:learn
```

Para borrar las notas de aprendizaje: `/vibe-wise:reset`.

A tener en cuenta:

- Gasta más tokens y tiempo que el modo normal: pregunta de a una y explica cada paso, lo contrario de las
  respuestas cortas que pide la skill. Usarlo para aprender, no para entregar rápido.
- Guarda sus notas en `.vibe-wise/` dentro del repo: agregar esa carpeta al `.gitignore`.
- Trae un hook que carga esas notas al arrancar cada sesión.

## Chequeo del paquete

Antes de publicar una versión:

```bash
npm test        # ayuda del instalador + links, anclas, referencias §N.M, versión y subagentes citados
npm run check   # lo anterior + GitHub: cada skill externa existe y no delega en otra que no se instala
```

Sale con 1 y lista cada falla. `npm run check` usa la API pública de GitHub (60 pedidos por hora sin token).

## Licencia

MIT © [MRydex](https://github.com/MRydex)
