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
      'Use when searching or reading would pull a lot into the main context (3+ files, big files, logs, build output, web docs). Read-only. Returns a short file:line list in caveman style. Skip for 1-2 known files.',
    instructions: `Localizá código y devolvé solo \`archivo:línea — qué hay ahí\`, en modo caveman (frases cortas, sin relleno).

1. Primero \`graphify query "<pregunta>"\` si existe \`graphify-out/graph.json\`. Recién después grep/lectura.
2. Nunca edites archivos. Nunca propongas cambios.
3. Respuesta: solo la lista \`archivo:línea\`, sin prosa. Si no encontrás algo, decilo en una línea.
4. Si la pregunta es ambigua, devolvé \`NECESITA_ADVISOR: <duda>\`.`,
  },
  {
    name: 'ejecutor',
    readonly: false,
    cheap: false,
    description:
      'Use to implement a concrete brief from the main model when it saves tokens (mechanical edits with a clear pattern across 8+ files, boilerplate). Returns a short caveman report of files changed. Skip for edits in fewer than 8 files.',
    instructions: `Implementá exactamente el brief que te pasa el modelo principal. Nada más.

1. Seguí la skill \`desarrollo-buenas-practicas\` (Angular 22+, signals, sin tests, sin sobreingeniería, sin componentizar lo simple).
2. Antes de buscar código: \`graphify query "<pregunta>"\` si existe \`graphify-out/graph.json\`.
3. No amplíes el alcance. No crees archivos de test. No agregues abstracciones que el brief no pide.
4. Si el brief es ambiguo o te trabás, no adivines: devolvé \`NECESITA_ADVISOR: <duda>\`.
5. Al terminar, corré \`graphify update .\` y el build/lint si el brief lo pide.
6. Respuesta final en modo caveman: solo archivos tocados y cualquier problema.`,
  },
  {
    name: 'revisor-checklist',
    readonly: true,
    cheap: true,
    description:
      'Use after large code changes (3+ files) to check the diff against the desarrollo-buenas-practicas checklists (Angular, SCSS, security, no tests, no over-engineering). Read-only. Returns one line per finding.',
    instructions: `Revisá el diff (\`git diff\`) contra \`references/checklists.md\` de la skill \`desarrollo-buenas-practicas\`.

1. Una línea por hallazgo: \`archivo:línea: problema. arreglo.\` Sin elogios, sin resumen.
2. Solo reglas del checklist. Nada de gustos personales ni formato.
3. Nunca edites archivos.
4. Si no hay hallazgos: \`Sin hallazgos.\``,
  },
];

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

Before the first search or file read in a git repo: run \`graphify update .\` (no LLM, no cost), then \`graphify query "<question>"\`. Grep/Glob/Read to explore without a prior query is not allowed. If graphify is missing: \`pip install --upgrade graphifyy\`. If it creates \`.gitattributes\` or \`graphify-out/\`, add them to \`.gitignore\`. **After editing any file, run \`graphify update .\` before your final answer.** If something fails, tell me the exact error.

## Delegation to subagents (explicit, standing user request)

You orchestrate. I explicitly authorize and ask you to delegate to subagents, without waiting for me to ask, **only when it lowers total token usage**:

- Finding where something is when the location is unknown, or reads over 3+ files, big files, logs, build output or web docs: \`investigador\`. Questions like "how does X work in this app" start here.
- Mechanical edits across 8+ files once the approach is decided: \`ejecutor\`. Orient with \`graphify query\`, write a short brief (files, pattern, one example), hand it off, then review the diff. For fewer files, edit yourself: in a measured test (3 files), delegating cost 38% more.
- Checking a large diff against the checklists: \`revisor-checklist\` (\`revisor_checklist\` in Codex, cheap).
- Launch independent pieces in parallel.
- Codebase-wide change that splits into 5+ independent units (migrations, a new rule applied to every feature): propose \`/batch <instruction>\` in Claude Code (one background subagent per unit, each in its own worktree; verify with build and lint, no new tests).
- Rule of thumb: delegate if what you would read is 3x or more what you need to know.

Do it yourself when: 1-2 known files, small edits, the brief would cost as much as the work, the task needs conversation context, plain answers, decisions and the final review.
${BLOCK_END}`;

const DELEGATION_FILES = [
  { label: 'Claude Code', requires: '.claude', file: ['.claude', 'CLAUDE.md'] },
  { label: 'Codex', requires: '.codex', file: ['.codex', 'AGENTS.md'] },
  { label: 'Gemini CLI', requires: '.gemini', file: ['.gemini', 'GEMINI.md'] },
];

// Inserta o reemplaza el bloque marcado. El resto del archivo no se toca.
function upsertBlock(filePath, block) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const start = current.indexOf(BLOCK_START);
  const end = current.indexOf(BLOCK_END);
  if (start !== -1 && end > start) {
    fs.writeFileSync(filePath, current.slice(0, start) + block + current.slice(end + BLOCK_END.length));
    return;
  }
  let separator = '';
  if (current) separator = current.endsWith('\n') ? '\n' : '\n\n';
  fs.writeFileSync(filePath, `${current}${separator}${block}\n`);
}

// Claude Code pide aprobación en cada `graphify`; se permite solo ese comando.
const GRAPHIFY_PERMISSIONS = ['Bash(graphify:*)', 'PowerShell(graphify:*)'];

function allowGraphifyInClaude(homeDir, log) {
  const settingsPath = path.join(homeDir, '.claude', 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
      log('~/.claude/settings.json no es JSON válido: no se agregaron permisos de graphify');
      return;
    }
  }
  settings.permissions ??= {};
  settings.permissions.allow ??= [];
  const missing = GRAPHIFY_PERMISSIONS.filter((rule) => !settings.permissions.allow.includes(rule));
  if (missing.length === 0) return;
  settings.permissions.allow.push(...missing);
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}
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
    log(`Subagentes investigador / ejecutor / revisor-checklist: ${installed.join(', ')}`);
  }
}

module.exports = { installSubagents };
