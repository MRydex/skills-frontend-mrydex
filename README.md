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
```

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
- **Subagentes** `investigador`, `ejecutor` y `revisor-checklist` en el formato de cada agente.
  Bloque global en `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md` y `~/.gemini/GEMINI.md`: cargar
  siempre la skill y delegar solo cuando baja el total de tokens.
- **caveman**: respuestas cortas (sin él salen 33% más largas).
- **Seguridad**: [security-audit](https://github.com/cloudflare/security-audit-skill),
  25 skills de [Anthropic-Cybersecurity-Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)
  y 22 `offensive-*` de [claude-red](https://github.com/SnailSploit/claude-red), solo de web, API,
  auth, supply chain y network (TLS, cabeceras, WebSocket, superficie expuesta). Plugin `claude-security` en Claude Code.
- **Otras skills**: [emilkowalski/skills](https://github.com/emilkowalski/skills) (solo web),
  [ponytail](https://github.com/DietrichGebert/ponytail) y
  [agent-skills](https://github.com/addyosmani/agent-skills). Plugin `claude-code-setup` en Claude Code.
- **[Headroom](https://github.com/chopratejas/headroom)**: proxy que comprime el contexto
  (`headroom init -g`). En Claude Code, hook `SessionStart` y autocompactación al 40%.
  No funciona con Remote Control de Claude Code.
- **Claude Code, extras** (cada uno solo si el usuario no lo configuró antes):
  - `permissions.deny` para que el agente no lea secretos (`~/.ssh`, `.env*`, `*.pem`, `*.key`...).
  - MCP [Context7](https://github.com/upstash/context7) (docs vigentes de librerías, gratis).
  - Subagentes con `effort` (`low` el revisor, `medium` el resto).
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
