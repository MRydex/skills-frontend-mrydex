/**
 * Subagentes del equipo para cada agente de IA, generados desde una sola definición.
 * Formatos verificados en la documentación oficial de cada agente (ver §14.3.2 de la skill).
 *
 * El orquestador delega en ellos solo cuando baja el total de tokens (§14.3.4):
 * búsquedas/lecturas grandes y ediciones mecánicas en 8+ archivos. Lo chico lo hace él.
 */

const fs = require('fs');
const path = require('path');

const ROLES = [
  {
    name: 'investigador',
    readonly: true,
    // Modelo intermedio: en la prueba real Haiku no encontró el mecanismo principal de una búsqueda amplia
    cheap: false,
    description:
      'Use when searching or reading would pull a lot into the main context (3+ files, big files, logs, build output, web docs). Read-only. Returns a short caveman file:line list (plus a short flow summary for "how does X work", or the decisive lines for logs, builds and docs). Skip for 1-2 known files.',
    instructions: `Localizá código y devolvé solo \`archivo:línea — qué hay ahí\`, en modo caveman (frases cortas, sin relleno).

1. Primero \`graphify query "<pregunta>"\` si existe \`graphify-out/graph.json\`. Recién después grep/lectura.
2. Nunca edites archivos. Nunca propongas cambios.
3. Respuesta: lista \`archivo:línea — qué hay ahí\`. Si la pregunta es cómo funciona algo, sumá el flujo en pocas líneas. Para logs, builds o docs web: las líneas decisivas citadas exactas y un resumen corto que responda la pregunta. Si no encontrás algo, decilo en una línea.
4. Si la pregunta es ambigua, devolvé \`NECESITA_ADVISOR: <duda>\`.`,
  },
  {
    name: 'ejecutor',
    readonly: false,
    cheap: false,
    description:
      'Use to implement a concrete brief from the main model when it saves tokens (mechanical edits with a clear pattern across 8+ files, independent units run in parallel, or the next tasks/todo.md task handed to a fresh context). Returns a short caveman report: files changed, decisions the brief left open, problems. Skip small edits the main model can do inline.',
    instructions: `Implementá exactamente el brief que te pasa el modelo principal. Nada más.

1. Seguí las reglas compactas del brief (\`tasks/brief-<tarea>.md\`). Abrí una referencia de la skill \`desarrollo-buenas-practicas\` solo si el brief la cita.
2. Antes de buscar código: \`graphify query "<pregunta>"\` si existe \`graphify-out/graph.json\`.
3. No amplíes el alcance. No crees archivos de test, pero verificá que funcione. No agregues abstracciones que el brief no pide.
4. Si el brief es ambiguo o te trabás, no adivines: devolvé \`NECESITA_ADVISOR: <duda>\`.
5. Al terminar, corré \`graphify update .\`, el build y el lint, y reportá el resultado.
6. Respuesta final en modo caveman: archivos tocados, decisiones que tomaste y el brief no fijaba, y cualquier problema.`,
  },
  {
    name: 'revisor-checklist',
    readonly: true,
    cheap: true,
    description:
      'Use after large code changes (3+ files) to check the diff against the desarrollo-buenas-practicas checklists (Angular, SCSS, security, no test files, no over-engineering). Read-only. Returns one line per finding. Pass the verbatim request (L1), the specs and the diff scope. Ends with a verdict: LISTO / CORREGIR Y LISTO / REHACER. Not a substitute for the final review by the main model.',
    instructions: `Revisá el diff que te pasa el orquestador (o \`git diff\` si podés correrlo) contra \`references/checklists.md\` de la skill \`desarrollo-buenas-practicas\`.

1. Una línea por hallazgo: \`archivo:línea: [ALTO|MEDIO|BAJO] problema. arreglo.\` Sin elogios, sin resumen.
2. Solo reglas del checklist y lo que piden el pedido y las specs que te pasen. Nada de gustos personales ni formato.
3. Nunca edites archivos.
4. Si no hay hallazgos: \`Sin hallazgos.\` No inventes problemas para tener algo que reportar.
5. No escribiste este código: juzgalo contra el pedido y las specs que te pasen, no contra lo que el autor quiso hacer.
6. Última línea, el veredicto: \`LISTO\`, \`CORREGIR Y LISTO\` (solo MEDIO/BAJO) o \`REHACER\` (algún ALTO).`,
  },
  {
    name: 'migrador-angular',
    readonly: false,
    cheap: false,
    description:
      'Use only when the user asks to upgrade or migrate an Angular project (major versions, NgModule to standalone, control flow, signal inputs, application builder, zoneless). Runs one migration step at a time with the official schematics, keeps the build green and reports per step. Not for regular feature work.',
    instructions: `Migrá siguiendo \`references/20-migracion-angular.md\` de la skill \`desarrollo-buenas-practicas\`. Nada fuera de los pasos pedidos.

1. Primero \`graphify query "<pregunta>"\` si existe \`graphify-out/graph.json\`. Leé §20 y listá los pasos que faltan según \`package.json\` y \`angular.json\`.
2. Un paso por vez, en el orden de §20: corré el \`ng update\` o el schematic oficial, revisá el diff y arreglá lo que rompa.
3. Después de cada paso: build (y lint si el proyecto lo tiene). Si queda rojo y no sabés por qué, frená y devolvé \`NECESITA_ADVISOR: <error exacto>\`.
4. No refactorices código que el paso no toca. No crees archivos de test. No cambies la librería de UI ni la de estado.
5. Commits: si el brief autoriza commitear, un commit por paso con el build verde (es el punto de vuelta atrás de §20). Si no, hacé un solo paso, frená y devolvé el control para que se commitee antes del siguiente.
6. Al terminar, \`graphify update .\`. Respuesta caveman: pasos hechos, comando de cada uno, resultado del build y pendientes.`,
  },
  // Compartidos con skills-backend-mrydex: mismo nombre y mismo texto en los dos paquetes
  // (cada instalador pisa el archivo del otro). Si cambiás uno, cambiá el otro.
  {
    name: 'auditor-contrato-api',
    readonly: true,
    cheap: false,
    description:
      'Use when the API contract between a .NET backend and an Angular front may have drifted: after changing controllers, DTOs or front Request/Response models, or before wiring a new endpoint. Read-only. Compares OpenAPI/DTOs with the front models and returns one line per mismatch. Skip if there is no API consumed by a front.',
    instructions: `Compará el contrato de la API con lo que espera el front. Nunca edites archivos.

1. Primero \`graphify query "<pregunta>"\` si existe \`graphify-out/graph.json\`.
2. Fuentes: el OpenAPI (documento generado o \`swagger.json\` del repo) o los controllers y DTOs; en el front, los modelos Request/Response, los servicios y los \`httpResource\`. Si solo tenés un lado, devolvé \`NECESITA_ADVISOR: ruta del otro repo\`.
3. Revisá: rutas y verbos; nombres y casing de campos; tipos (número o texto, enums como texto o número); nullability; fechas (ISO UTC o local sin offset: tiene que coincidir con el interceptor de fechas del front si existe; \`DateOnly\` viaja como texto \`yyyy-MM-dd\`, nunca como \`Date\` del front); paginado; códigos de estado y forma del error (ProblemDetails); campos que el front lee y la API ya no manda.
4. Reglas: skill \`desarrollo-backend-buenas-practicas\` §17 y skill \`desarrollo-buenas-practicas\` §02 (Request/Response y mapeo). Aplicá solo lo que el proyecto usa.
5. Una línea por hallazgo: \`archivo:línea: [ALTO|MEDIO|BAJO] diferencia. arreglo.\` ALTO = rompe en runtime. Sin hallazgos: \`Sin hallazgos.\``,
  },
  {
    name: 'revisor-auth',
    readonly: true,
    cheap: false,
    description:
      'Use after changes to authentication or authorization (JWT, OIDC, identity provider, guards, auth interceptors, token storage, CORS, LDAP) or when auditing auth. Read-only. Works on .NET backends and Angular fronts. Returns one line per finding and a verdict.',
    instructions: `Revisá la autenticación y la autorización del diff o de las rutas que te pasen. Nunca edites archivos.

1. Primero \`graphify query "<pregunta>"\` si existe \`graphify-out/graph.json\`.
2. Backend (skill \`desarrollo-backend-buenas-practicas\` §11): validación del token (issuer, audience, lifetime, firma, ClockSkew), política fallback, autorización por endpoint, CORS con orígenes explícitos, secretos fuera del repo; si hay IdP propio, PKCE y redirect URIs exactas; si hay LDAP, filtros escapados.
3. Front (skill \`desarrollo-buenas-practicas\` §15): code flow con PKCE, token solo hacia la API propia, dónde se guarda el token, URL de retorno validada (mismo origen), guards solo como UX, nada sensible en logs.
4. Solo lo que el proyecto usa: no pidas una librería o un flujo que no está.
5. Una línea por hallazgo: \`archivo:línea: [ALTO|MEDIO|BAJO] problema. arreglo.\` Sin hallazgos: \`Sin hallazgos.\`
6. Última línea, el veredicto: \`LISTO\`, \`CORREGIR Y LISTO\` (solo MEDIO/BAJO) o \`REHACER\` (algún ALTO).`,
  },
];

// Los subagentes de solo lectura no tienen la herramienta Skill: se les dice dónde buscarla.
// Mismo texto en skills-frontend-mrydex y skills-backend-mrydex.
const SKILL_PATH_HINT = 'Las rutas `references/...` y los § son de la skill que se nombra: leela en `.claude/skills/`, `.agents/skills/` o `skills/` del repo, o en `~/.claude/skills/` / `~/.agents/skills/` (la primera que exista).';
for (const role of ROLES) {
  if (role.instructions.includes('skill `')) role.instructions += `\n\n${SKILL_PATH_HINT}`;
}

const markdown = (frontmatter, body) => `---\n${frontmatter.join('\n')}\n---\n\n${body}\n`;

// Un escritor por agente: carpeta global, nombre de archivo y contenido en su formato.
// `requires` = carpeta que indica que el agente está instalado en la máquina.
const TARGETS = [
  {
    label: 'Claude Code',
    requires: '.claude',
    dir: ['.claude', 'agents'],
    file: (r) => `${r.name}.md`,
    render: (r) =>
      markdown(
        [
          `name: ${r.name}`,
          `description: ${r.description}`,
          `model: ${r.cheap ? 'haiku' : 'sonnet'}`,
          `effort: ${r.cheap ? 'low' : 'medium'}`,
          ...(r.readonly ? ['tools: Read, Grep, Glob, Bash'] : []),
        ],
        r.instructions,
      ),
  },
  {
    label: 'Codex',
    requires: '.codex',
    dir: ['.codex', 'agents'],
    file: (r) => `${r.name.replace(/-/g, '_')}.toml`,
    // Sin `model`: hereda el del usuario y abarata con menos razonamiento (los ids cambian seguido)
    render: (r) =>
      [
        `name = "${r.name.replace(/-/g, '_')}"`,
        `description = "${r.description.replace(/"/g, '\\"')}"`,
        `model_reasoning_effort = "${r.cheap ? 'low' : 'medium'}"`,
        `sandbox_mode = "${r.readonly ? 'read-only' : 'workspace-write'}"`,
        `developer_instructions = """\n${r.instructions}\n"""`,
        '',
      ].join('\n'),
  },
  {
    label: 'Cursor',
    requires: '.cursor',
    dir: ['.cursor', 'agents'],
    file: (r) => `${r.name}.md`,
    render: (r) =>
      markdown(
        [`name: ${r.name}`, `description: ${r.description}`, 'model: inherit', `readonly: ${r.readonly}`],
        r.instructions,
      ),
  },
  {
    label: 'Gemini CLI',
    requires: '.gemini',
    dir: ['.gemini', 'agents'],
    file: (r) => `${r.name}.md`,
    render: (r) =>
      markdown(
        [`name: ${r.name}`, `description: ${r.description}`, `model: ${r.cheap ? 'flash' : 'inherit'}`],
        r.instructions,
      ),
  },
  {
    label: 'Antigravity',
    requires: path.join('.gemini', 'config'),
    dir: ['.gemini', 'config', 'agents'],
    file: (r) => `${r.name}.md`,
    render: (r) =>
      markdown(
        [`name: ${r.name}`, `description: ${r.description}`, `model: ${r.cheap ? 'flash' : 'inherit'}`, 'subagent: true'],
        r.instructions,
      ),
  },
  {
    label: 'Copilot (VS Code)',
    requires: '.copilot',
    dir: ['.copilot', 'agents'],
    file: (r) => `${r.name}.agent.md`,
    render: (r) =>
      markdown(
        [
          `name: ${r.name}`,
          `description: ${r.description}`,
          ...(r.readonly ? ["tools: ['search/codebase', 'search/usages', 'web/fetch']"] : []),
        ],
        r.instructions,
      ),
  },
];

const BLOCK_START = '<!-- skills-frontend-mrydex:start -->';
const BLOCK_END = '<!-- skills-frontend-mrydex:end -->';

// Instrucciones globales de usuario: cargar siempre la skill de frontend y, en Claude Code y Codex
// (no delegan solos), pedir la delegación en forma explícita.
const DELEGATION_BLOCK = `${BLOCK_START}
## Frontend skill (always)

In any repo with \`angular.json\` or frontend code (TypeScript, HTML, SCSS/CSS), load the \`desarrollo-buenas-practicas\` skill **before your first tool call**, for **every** request: questions, explanations, reviews, debugging and code changes. Even if the request is vague or does not mention Angular. If it is not available as a skill, read its \`SKILL.md\`.

## Graphify first (always, any repo)

Before the first search or file read in a git repo: run \`graphify update .\` (no LLM, no cost), then \`graphify query "<question>"\`. The graph shows where to look for far fewer tokens than Grep/Glob/Read; skip it only when I name the exact file and line. If graphify is missing: \`pip install graphifyy && graphify install\` (outside Claude Code add \`--platform <agent>\`). If it creates \`.gitattributes\` or \`graphify-out/\`, add them to \`.gitignore\`. **After editing any file, run \`graphify update .\` before your final answer.** If something fails, tell me the exact error.

## Agent tools (always)

Installed by skills-frontend-mrydex. Use them in every session; if one is missing, install it and tell me in one line (exact error if it fails):

- **ponytail**: write only the code the task needs. Prefer the platform and standard library over new dependencies or abstractions. Before the final answer on a non-trivial code change (\`desarrollo-buenas-practicas\` §11.3), run \`ponytail-review\` on the diff.
- **agent-skills**: use the skill that matches the phase (spec, plan, build, review, ship). Never the ones that write tests: team rules forbid test files unless the user asks for them.
- **External skills by area**: besides this skill's rules, load the external skill that matches the area of the task (table in \`desarrollo-buenas-practicas\` §14.9). On conflict, the repo rule wins.
- **claude-code-setup** (Claude Code): in a repo without Claude Code setup, run \`claude-automation-recommender\` once and propose its result.
- **Headroom**: Headroom is wired durably (\`headroom init -g\`) in Claude Code, Copilot CLI and Codex on macOS/Linux; its hooks start the proxy on 127.0.0.1:8787. Codex on Windows, Cursor and VS Code Copilot: start them with \`headroom wrap <agent>\`.
- **Security**: for a vulnerability scan of the code, use the \`claude-security\` plugin (Claude Code); for focused web/API/npm checks, the matching Anthropic-Cybersecurity-Skills or claude-red \`offensive-*\` skill. Use \`offensive-*\` only to harden the project's own code against that attack surface (\`desarrollo-buenas-practicas\` §15.2), never against third-party systems.

## Delegation to subagents (explicit, standing user request)

You orchestrate. I explicitly authorize and ask you to delegate to subagents, without waiting for me to ask, **only when it lowers total token usage**:

- Finding where something is when the location is unknown, or reads over 3+ files, big files, logs, build output or web docs: \`investigador\`. Questions like "how does X work in this app" start here.
- Mechanical edits across 8+ files once the approach is decided: \`ejecutor\`. Orient with \`graphify query\`, write a short brief (files, pattern, one example), hand it off, then review the diff. For fewer files, edit yourself: in a measured test (3 files), delegating cost 38% more.
- Checking a large diff against the checklists: \`revisor-checklist\` (\`revisor_checklist\` in Codex, cheap).
- Upgrading or migrating an Angular project, only when I ask for it: \`migrador-angular\`, one step at a time.
- API contract drift between the front models and the backend (after changing Request/Response models or before wiring an endpoint): \`auditor-contrato-api\`.
- Changes to auth (OIDC, guards, auth interceptors, token storage): \`revisor-auth\`.
- Launch independent pieces in parallel.
- Codebase-wide change that splits into 5+ independent units (migrations, a new rule applied to every feature): propose \`/batch <instruction>\` in Claude Code (one background subagent per unit, each in its own worktree; verify with build and lint, no new tests).
- Rule of thumb: delegate if what you would read is 3x or more what you need to know.
- Name the reason in the brief: big exploration, parallel writers, context backstop, or verifier of a high-risk task or of a large diff (3+ files) against the checklist. No named reason, or in doubt: do it yourself.

Do it yourself when: 1-2 known files, small edits, the brief would cost as much as the work, the task needs conversation context, plain answers, decisions and the final review.
${BLOCK_END}`;

const DELEGATION_FILES = [
  { label: 'Claude Code', requires: '.claude', file: ['.claude', 'CLAUDE.md'] },
  { label: 'Codex', requires: '.codex', file: ['.codex', 'AGENTS.md'] },
  { label: 'Gemini CLI', requires: '.gemini', file: ['.gemini', 'GEMINI.md'] },
];

// Escribe config global del usuario sin riesgo de dejarla a medias: copia la versión previa a
// `<archivo>.bak` y reemplaza con rename (atómico), así un corte deja el archivo viejo o el nuevo.
// Un symlink (dotfiles) se sigue hasta el archivo real: el rename no lo reemplaza por una copia.
function writeFileSafe(linkPath, content) {
  const filePath = fs.existsSync(linkPath) ? fs.realpathSync(linkPath) : linkPath;
  if (fs.existsSync(filePath)) {
    if (fs.readFileSync(filePath, 'utf8') === content) return;
    fs.copyFileSync(filePath, `${filePath}.bak`);
  }
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, content);
  fs.renameSync(tmpPath, filePath);
}

// Inserta o reemplaza el bloque marcado. El resto del archivo no se toca.
function upsertBlock(filePath, block) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const start = current.indexOf(BLOCK_START);
  const end = current.indexOf(BLOCK_END);
  if (start !== -1 && end > start) {
    writeFileSafe(filePath, current.slice(0, start) + block + current.slice(end + BLOCK_END.length));
    return;
  }
  // Un marcador sin su par (editado a mano): reemplazar borraría texto del usuario
  if (start !== -1 || end !== -1) {
    console.log(`  ⚠ ${filePath}: bloque de la skill incompleto, no se actualizó`);
    return;
  }
  let separator = '';
  if (current) separator = current.endsWith('\n') ? '\n' : '\n\n';
  writeFileSafe(filePath, `${current}${separator}${block}\n`);
}

// Lee ~/.claude/settings.json: {} si no existe, null si no es un objeto JSON válido.
function readClaudeSettings(settingsPath) {
  if (!fs.existsSync(settingsPath)) return {};
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : null;
  } catch {
    return null;
  }
}

// Claude Code pide aprobación en cada `graphify`; se permite solo ese comando.
const GRAPHIFY_PERMISSIONS = ['Bash(graphify:*)', 'PowerShell(graphify:*)'];

function allowGraphifyInClaude(homeDir, log) {
  const settingsPath = path.join(homeDir, '.claude', 'settings.json');
  const settings = readClaudeSettings(settingsPath);
  if (!settings) {
    log('~/.claude/settings.json no es JSON válido: no se agregaron permisos de graphify');
    return;
  }
  settings.permissions ??= {};
  settings.permissions.allow ??= [];
  const missing = GRAPHIFY_PERMISSIONS.filter((rule) => !settings.permissions.allow.includes(rule));
  if (missing.length === 0) return;
  settings.permissions.allow.push(...missing);
  writeFileSafe(settingsPath, `${JSON.stringify(settings, null, 2)}
`);
  log(`Claude Code: graphify permitido sin aprobación (${missing.join(', ')})`);
}

/**
 * Instala los subagentes y el pedido de delegación en cada agente presente en el home.
 * @param {{ homeDir: string, isDryRun: boolean, only?: string, log: (msg: string) => void }} options
 */
function installSubagents({ homeDir, isDryRun, only, log }) {
  const installed = [];
  for (const target of TARGETS) {
    if (only && target.label !== only) continue;
    if (!fs.existsSync(path.join(homeDir, target.requires))) continue;

    const dir = path.join(homeDir, ...target.dir);
    if (!isDryRun) {
      fs.mkdirSync(dir, { recursive: true });
      for (const role of ROLES) fs.writeFileSync(path.join(dir, target.file(role)), target.render(role));
    }
    installed.push(target.label);
  }

  for (const entry of DELEGATION_FILES) {
    if (only && entry.label !== only) continue;
    if (!fs.existsSync(path.join(homeDir, entry.requires))) continue;
    if (!isDryRun) upsertBlock(path.join(homeDir, ...entry.file), DELEGATION_BLOCK);
  }

  const claudeSelected = !only || only === 'Claude Code';
  if (claudeSelected && fs.existsSync(path.join(homeDir, '.claude')) && !isDryRun) allowGraphifyInClaude(homeDir, log);

  if (installed.length > 0) {
    log(`Subagentes ${ROLES.map((role) => role.name).join(' / ')}: ${installed.join(', ')}`);
  }
}

module.exports = { installSubagents, readClaudeSettings, writeFileSafe };
