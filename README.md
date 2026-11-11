# skills-frontend-mrydex

Skill de Angular 22+ y frontend moderno para agentes de IA: Claude Code, Codex, Cursor, Windsurf,
GitHub Copilot, Google Antigravity y cualquier agente compatible con Agent Skills.
Se instala directo desde GitHub.

Hermana de [skills-backend-mrydex](https://github.com/MRydex/skills-backend-mrydex) (.NET).

## Instalar y actualizar

Requisitos: Node.js 18+. Python 3.10+ para graphify (si falta, el instalador avisa y sigue).

```bash
# Interactivo (pregunta agente y destino)
npx github:MRydex/skills-frontend-mrydex

# Si da error:
npx --allow-git github:MRydex/skills-frontend-mrydex

# Y luego nuevamente:
npx github:MRydex/skills-frontend-mrydex

# Todos los agentes en el proyecto actual
npx github:MRydex/skills-frontend-mrydex -a all -w -b

# Solo global, un agente
npx github:MRydex/skills-frontend-mrydex -a claude -g

# Claude Code con advisor (opcional: el modelo de la sesión consulta a uno más fuerte cuando hace falta)
npx github:MRydex/skills-frontend-mrydex -a claude -g --advisor fable
```

Sin el flag se instala **con el advisor apagado** (ver "Modelos: qué corre dónde"). Si se activa queda en
`~/.claude/settings.json` y es automático: el modelo decide cuándo consultarlo (al orientarse, al trabarse y
antes de terminar). Se cobra al precio del advisor. `--advisor off` lo quita. También se cambia dentro de
Claude Code, sin reinstalar: `/advisor fable`, `/advisor opus` o `/advisor off`.

## Modelos: qué corre dónde (Claude Code)

Resumen de lo que deja el instalador, según lo que publicó Anthropic
([nov 2026](https://claude.dev/blog/which-claude-model-should-you-build-with/)) y lo que midió el equipo
(skill §14.3.4). **Nada cambia de modelo solo, ni hacia arriba ni hacia abajo.**

| Qué | Modelo | Quién lo decide |
| :--- | :--- | :--- |
| La sesión (pensar, decidir, editar, revisar) | El que elegís con `/model`; queda fijo | Vos |
| `Explore` (búsquedas, "dónde está X") | Haiku, `effort: low` (agente propio que reemplaza al de fábrica, que corría con el modelo de la sesión) | Instalador |
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

Para actualizar, correr el mismo comando. Borra los archivos viejos y copia la última versión.
Si `npx` usa una copia en caché, agregar `#main` al final.

Comando fijo en la terminal (opcional): `npm install -g github:MRydex/skills-frontend-mrydex`,
después `skills-frontend`.

## Dónde se instala

| Agente | Ubicación | Flag |
| :--- | :--- | :--- |
| Claude Code | `~/.claude/skills/desarrollo-buenas-practicas` | `-a claude` |
| Antigravity | `~/.gemini/config/skills/` o `.agents/skills/` | `-a antigravity` |
| Cursor / Windsurf | `skills/` + `.cursorrules` | `-a cursor -b` |
| Codex | `~/.agents/skills/desarrollo-buenas-practicas` + `AGENTS.md` | `-a codex` |
| Copilot | `skills/` + `AGENTS.md` | `-a universal -b` |
| Todos | Global + puentes en el repo | `-a all -w -b` |

Fuera de un repo git instala solo global. Dentro de un repo instala además en la raíz.

## Qué configura

Siempre instala todo; no hay flags para saltear partes.

- **graphify**: CLI y skill, integración en cada agente, hooks git `post-commit` / `post-checkout`
  y grafo inicial (`graphify update .`, sin costo de tokens). Claude Code queda en modo estricto:
  consulta el grafo antes de leer archivos.
- **Subagentes** `investigador`, `ejecutor`, `revisor-checklist`, `migrador-angular`,
  `Explore` (solo Claude Code, Haiku),
  `auditor-contrato-api` y `revisor-auth` en el formato de cada agente.
  Bloque global en `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md` y `~/.gemini/GEMINI.md`: cargar
  siempre la skill y delegar solo cuando baja el total de tokens.
- **Hooks de Claude Code**: `guard-spec` (pide confirmación antes de crear specs en repos Angular),
  `guard-secrets` (bloquea escribir secretos con Edit/Write) y `format-prettier` (Prettier local
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
  [agent-browser](https://github.com/vercel-labs/agent-browser) de Vercel,
  [grill-me](https://github.com/mattpocock/skills) y [find-skills](https://github.com/vercel-labs/skills).
  Plugin `claude-code-setup` en Claude Code.
- **Hook `SessionStart`** de Claude Code: carga `tasks/lessons.md` del proyecto como contexto; autocompactación al 40%.
- **Claude Code, extras** (cada uno solo si el usuario no lo configuró antes, salvo `permissions.deny`, que se suma):
  - `permissions.deny` para que el agente no lea secretos (`~/.ssh`, `.env*`, `*.pem`, `*.key`...); se suman a las reglas del usuario.
  - MCP [Context7](https://github.com/upstash/context7) (docs vigentes de librerías, gratis).
  - `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`: todo subagente sin `model` propio (`general-purpose`, skills, plugins)
    corre en Sonnet en vez de heredar el modelo de la sesión (medido con sesión Fable: $0.90 contra $0.15 por
    búsqueda, mismo resultado).
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
--advisor <modelo>     Claude Code: advisor (fable | opus | sonnet | off); sin el flag no se configura
-v, --version          Versión
-h, --help             Ayuda
```

## Contenido

El agente lee [`SKILL.md`](./skills/desarrollo-buenas-practicas/SKILL.md) y solo la referencia que
pide la tarea.

```text
skills/desarrollo-buenas-practicas/
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

## Publicar cambios

No hace falta npm publish.

1. Editar `skills/desarrollo-buenas-practicas/`.
2. Opcional: `npm version patch|minor|major`.
3. `git push origin main --follow-tags`.

Quien vuelva a correr `npx` recibe los cambios.

## Licencia

MIT © [MRydex](https://github.com/MRydex)
