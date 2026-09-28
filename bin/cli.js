#!/usr/bin/env node

/**
 * skills-frontend-mrydex CLI
 * Universal installer for Angular 22+ & Frontend Best Practices Skill
 * Compatible with Antigravity, Claude Code, Cursor, Windsurf, GitHub Copilot, Codex, and Agent Skills standard.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { spawnSync } = require('child_process');

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

const pkgPath = path.join(__dirname, '..', 'package.json');
let pkgVersion = '1.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkgVersion = pkg.version || '1.0.0';
} catch (e) {}

// Parse CLI arguments
const args = process.argv.slice(2);

function printHelp() {
  console.log(`
${colors.bold}${colors.cyan}skills-frontend-mrydex v${pkgVersion}${colors.reset}
${colors.dim}Universal Angular 22+ & Frontend Best Practices Skill for AI Coding Assistants${colors.reset}

${colors.bold}USO:${colors.reset}
  npx skills-frontend-mrydex [opciones]
  skills-frontend [opciones]

${colors.bold}OPCIONES:${colors.reset}
  ${colors.green}-a, --agent <nombre>${colors.reset}    Agente objetivo (default: all):
                          ${colors.bold}all${colors.reset}         (Todos: global + repo actual si hay)
                          ${colors.bold}antigravity${colors.reset} (Antigravity / Gemini CLI, global)
                          ${colors.bold}claude${colors.reset}      (Claude Code, global)
                          ${colors.bold}cursor${colors.reset}      (Cursor / Windsurf)
                          ${colors.bold}universal${colors.reset}   (Codex / Copilot con AGENTS.md)
  ${colors.green}-g, --global${colors.reset}            Solo global (home), aunque estés en un repo
  ${colors.green}-w, --workspace${colors.reset}         También en el repo actual (raíz del repo git)
  ${colors.green}-t, --target <ruta>${colors.reset}     Ruta personalizada (tiene prioridad sobre --agent)
  ${colors.green}-b, --bridge${colors.reset}            Genera archivos puente (AGENTS.md, CLAUDE.md, .cursorrules).
                          cursor, universal y all los generan siempre.
  ${colors.green}--no-graphify${colors.reset}           No instala ni configura graphify (por defecto: instala/actualiza
                          el CLI y, en el proyecto, integra todos los agentes y arma el grafo)
  ${colors.green}--dry-run${colors.reset}               Muestra los archivos y destinos sin escribir cambios
  ${colors.green}-v, --version${colors.reset}           Muestra la versión del paquete
  ${colors.green}-h, --help${colors.reset}              Muestra esta ayuda

${colors.bold}EJEMPLOS:${colors.reset}
  # Instalación interactiva (pregunta destino)
  ${colors.dim}npx skills-frontend-mrydex${colors.reset}

  # Instalar globalmente para Antigravity
  ${colors.dim}npx skills-frontend-mrydex --agent antigravity --global${colors.reset}

  # Instalar para Claude Code
  ${colors.dim}npx skills-frontend-mrydex --agent claude --global${colors.reset}

  # Configurar proyecto actual para cualquier agente (universal)
  ${colors.dim}npx skills-frontend-mrydex --agent all --workspace --bridge${colors.reset}
`);
}

if (args.includes('-h') || args.includes('--help')) {
  printHelp();
  process.exit(0);
}

if (args.includes('-v') || args.includes('--version')) {
  console.log(`v${pkgVersion}`);
  process.exit(0);
}

const isDryRun = args.includes('--dry-run');
const isGlobal = args.includes('-g') || args.includes('--global');
const isWorkspace = args.includes('-w') || args.includes('--workspace');
const includeBridge = args.includes('-b') || args.includes('--bridge');
const skipGraphify = args.includes('--no-graphify');

function getArgValue(flags) {
  for (const flag of flags) {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
      return args[idx + 1];
    }
  }
  return null;
}

const agentArg = getArgValue(['-a', '--agent']);
const customTarget = getArgValue(['-t', '--target']);

const sourceSkillDir = path.join(__dirname, '..', 'skills', 'desarrollo-buenas-practicas');
const templatesDir = path.join(__dirname, '..', 'templates');

if (!fs.existsSync(sourceSkillDir)) {
  console.error(`${colors.red}Error: No se encontró el directorio origen del skill en: ${sourceSkillDir}${colors.reset}`);
  process.exit(1);
}

function copyFolderRecursive(source, target) {
  if (isDryRun) {
    console.log(`${colors.dim}[dry-run] Copiando carpeta ${source} -> ${target}${colors.reset}`);
    return;
  }
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursive(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

function copyBridgeFiles(projectRoot) {
  const bridges = [
    { src: 'AGENTS.md', dest: 'AGENTS.md', desc: 'Codex / Copilot / Universal' },
    { src: 'CLAUDE.md', dest: 'CLAUDE.md', desc: 'Claude Code' },
    { src: '.cursorrules', dest: '.cursorrules', desc: 'Cursor / Windsurf' }
  ];

  projectRoots.add(projectRoot);
  console.log(`\n${colors.bold}${colors.cyan}Generando archivos puente en el proyecto:${colors.reset}`);
  for (const b of bridges) {
    const srcFile = path.join(templatesDir, b.src);
    const destFile = path.join(projectRoot, b.dest);
    if (fs.existsSync(srcFile)) {
      if (isDryRun) {
        console.log(`${colors.dim}[dry-run] Crear ${b.dest} (${b.desc})${colors.reset}`);
      } else {
        fs.copyFileSync(srcFile, destFile);
        console.log(`  ${colors.green}✔${colors.reset} Creado ${colors.bold}${b.dest}${colors.reset} (${colors.dim}${b.desc}${colors.reset})`);
      }
    }
  }
}

// Archivos y carpetas de IA/agentes que nunca se commitean en los proyectos (§10.9 de la skill)
const AI_GITIGNORE_ENTRIES = [
  '.claude/',
  '.agents/',
  '.cursor/',
  '.gemini/',
  '.codex/',
  '.windsurf/',
  '.aider*',
  'skills/desarrollo-buenas-practicas/',
  'CLAUDE.md',
  'CLAUDE.local.md',
  'AGENTS.md',
  'GEMINI.md',
  '.cursorrules',
  '.windsurfrules',
  '.github/copilot-instructions.md',
  '.mcp.json',
  'graphify-out/',
  'tasks/todo.md',
  'tasks/lessons.md',
  'tasks/brief-*.md',
];
const AI_GITIGNORE_HEADER = '# IA / agentes (skills-frontend-mrydex)';
const projectRoots = new Set();

// Raíz del repo git que contiene `dir`, o null. El home nunca cuenta como proyecto.
function getRepoRoot(dir) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: dir, encoding: 'utf8' });
  if (result.status !== 0) return null;
  const root = path.resolve(result.stdout.trim());
  return root === path.resolve(os.homedir()) ? null : root;
}

function ensureAiGitignore(projectRoot, extraEntries = []) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const hasGitignore = fs.existsSync(gitignorePath);
  if (!hasGitignore && !fs.existsSync(path.join(projectRoot, '.git'))) return;

  const current = hasGitignore ? fs.readFileSync(gitignorePath, 'utf8') : '';
  const existing = new Set(current.split(/\r?\n/).map((line) => line.trim()));
  const missing = [...AI_GITIGNORE_ENTRIES, ...extraEntries].filter((entry) => !existing.has(entry));
  if (missing.length === 0) return;

  if (isDryRun) {
    console.log(`${colors.dim}[dry-run] Agregar a .gitignore: ${missing.join(', ')}${colors.reset}`);
    return;
  }

  const lines = existing.has(AI_GITIGNORE_HEADER) ? missing : [AI_GITIGNORE_HEADER, ...missing];
  // Bloque nuevo: separado por una línea en blanco. Bloque existente: se continúa debajo.
  const gap = existing.has(AI_GITIGNORE_HEADER) ? '' : '\n';
  let prefix = '';
  if (current !== '') prefix = current.endsWith('\n') ? gap : `\n${gap}`;
  fs.appendFileSync(gitignorePath, `${prefix}${lines.join('\n')}\n`);
  console.log(`\n  ${colors.green}✔${colors.reset} .gitignore: ${missing.length} entradas de IA agregadas`);
  console.log(`  ${colors.dim}Si alguno ya estaba commiteado, sacarlo del índice con: git rm --cached <archivo>${colors.reset}`);
}

// Integraciones de graphify por agente (proyecto). Claude Code además en modo estricto:
// bloquea la primera lectura de archivos hasta que se haga un `graphify query`.
const GRAPHIFY_AGENTS = ['claude', 'cursor', 'codex', 'gemini', 'vscode', 'antigravity'];
const PIP_CANDIDATES = [
  ['pip', ['install', '--upgrade', 'graphifyy']],
  ['python', ['-m', 'pip', 'install', '--upgrade', 'graphifyy']],
  ['py', ['-m', 'pip', 'install', '--upgrade', 'graphifyy']],
  ['python3', ['-m', 'pip', 'install', '--upgrade', 'graphifyy']],
  ['uv', ['tool', 'install', '--upgrade', 'graphifyy']],
];
let graphifyReady = null;

function runCommand(cmd, cmdArgs, cwd) {
  // Sin shell: pip, python, py, uv y graphify son ejecutables (.exe en Windows), no hace falta
  // y evita DEP0190 (args concatenados sin escapar).
  const result = spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8' });
  return { ok: result.status === 0, output: `${result.stdout || ''}${result.stderr || ''}` };
}

// Instala o actualiza el CLI de graphify (paquete PyPI "graphifyy") y su skill global.
function ensureGraphifyCli() {
  if (graphifyReady !== null) return graphifyReady;

  console.log(`\n${colors.bold}${colors.cyan}Graphify:${colors.reset} instalando/actualizando el CLI...`);
  if (isDryRun) {
    console.log(`${colors.dim}[dry-run] pip install --upgrade graphifyy && graphify install${colors.reset}`);
    graphifyReady = true;
    return graphifyReady;
  }

  const installed = PIP_CANDIDATES.some(([cmd, cmdArgs]) => runCommand(cmd, cmdArgs).ok);
  const check = runCommand('graphify', ['--help']);
  if (!check.ok) {
    console.log(`  ${colors.yellow}⚠ No se pudo instalar graphify${installed ? '' : ' (sin pip/python/uv)'}.${colors.reset}`);
    console.log(`  ${colors.dim}Instalar a mano: pip install graphifyy && graphify install${colors.reset}`);
    graphifyReady = false;
    return graphifyReady;
  }

  runCommand('graphify', ['install']);
  console.log(`  ${colors.green}✔${colors.reset} graphify listo`);
  graphifyReady = true;
  return graphifyReady;
}

// Paso 0 de la skill hecho por el instalador: integra todos los agentes, hooks git y arma el grafo.
function setupGraphifyProject(projectRoot) {
  if (!ensureGraphifyCli()) return;

  const hadGitattributes = fs.existsSync(path.join(projectRoot, '.gitattributes'));
  const steps = [
    ...GRAPHIFY_AGENTS.map((agent) => ({ label: `integración ${agent}`, args: [agent, 'install'] })),
    { label: 'modo estricto Claude Code', args: ['install', '--project', '--strict', '--platform', 'claude'] },
    { label: 'hooks git', args: ['hook', 'install'] },
  ];

  console.log(`\n${colors.bold}${colors.cyan}Graphify en el proyecto:${colors.reset} ${colors.dim}${projectRoot}${colors.reset}`);
  if (isDryRun) {
    for (const step of steps) console.log(`${colors.dim}[dry-run] graphify ${step.args.join(' ')}${colors.reset}`);
    console.log(`${colors.dim}[dry-run] graphify update .${colors.reset}`);
    return;
  }

  for (const step of steps) {
    const { ok } = runCommand('graphify', step.args, projectRoot);
    const mark = ok ? colors.green + '✔' : colors.yellow + '⚠';
    console.log(`  ${mark}${colors.reset} ${step.label}`);
  }

  // Ignorar lo generado antes de armar el grafo, así no indexa los archivos de los agentes
  const createdGitattributes = !hadGitattributes && fs.existsSync(path.join(projectRoot, '.gitattributes'));
  ensureAiGitignore(projectRoot, createdGitattributes ? ['.gitattributes'] : []);

  const build = runCommand('graphify', ['update', '.'], projectRoot);
  const nodes = /Rebuilt: (\d+) nodes/.exec(build.output);
  if (build.ok && nodes) {
    console.log(`  ${colors.green}✔${colors.reset} grafo armado: ${nodes[1]} nodos (sin LLM)`);
  } else {
    console.log(`  ${colors.yellow}⚠${colors.reset} No se pudo armar el grafo. Correr a mano: graphify update .`);
  }
}

function installTarget(destDir, label) {
  const isUpdate = fs.existsSync(destDir);
  const actionText = isUpdate ? 'Actualizando' : 'Instalando';
  console.log(`\n${colors.cyan}${actionText} para ${colors.bold}${label}${colors.reset}...`);
  console.log(`  Destino: ${colors.dim}${destDir}${colors.reset}`);
  
  if (isUpdate && !isDryRun) {
    // Limpia la carpeta previa para evitar archivos huérfanos si se renombra alguna referencia
    fs.rmSync(destDir, { recursive: true, force: true });
  }

  copyFolderRecursive(sourceSkillDir, destDir);
  console.log(`  ${colors.green}✔ ${isUpdate ? 'Actualización' : 'Instalación'} completada con éxito (v${pkgVersion}).${colors.reset}`);
}

const SKILL_NAME = 'desarrollo-buenas-practicas';

function installGlobals(homeDir) {
  installTarget(path.join(homeDir, '.gemini', 'config', 'skills', SKILL_NAME), 'Antigravity (Global)');
  installTarget(path.join(homeDir, '.claude', 'skills', SKILL_NAME), 'Claude Code (Global)');
}

// Skill + puentes en la raíz del repo. Solo se llama con un repo git (el proyecto recibe graphify).
function installWorkspace(repoRoot) {
  installTarget(path.join(repoRoot, '.agents', 'skills', SKILL_NAME), 'Workspace (.agents/skills)');
  installTarget(path.join(repoRoot, 'skills', SKILL_NAME), 'Workspace (skills/)');
  copyBridgeFiles(repoRoot);
}

async function run() {
  console.log(`
${colors.bold}${colors.magenta}=== Instalador de Skills Frontend (Angular 22+) ===${colors.reset}`);
  console.log(`${colors.dim}Compatible con Antigravity, Claude Code, Cursor, Windsurf, Copilot & Codex${colors.reset}
`);

  const homeDir = os.homedir();
  const cwd = process.cwd();
  // Fuera de un repo git todo se instala global; dentro, además en la raíz del repo.
  const repoRoot = getRepoRoot(cwd);

  if (customTarget) {
    if (agentArg) {
      console.log(`${colors.dim}Aviso: --target tiene prioridad; se ignora --agent ${agentArg}.${colors.reset}`);
    }
    const targetDir = path.resolve(cwd, customTarget);
    installTarget(targetDir, 'Directorio personalizado');
    const targetRepo = getRepoRoot(fs.existsSync(targetDir) ? targetDir : cwd);
    if (includeBridge && targetRepo) copyBridgeFiles(targetRepo);
    finish();
    return;
  }

  if (agentArg || isGlobal || isWorkspace) {
    const agent = (agentArg || 'all').toLowerCase();
    const wantsWorkspace = isWorkspace || !isGlobal && ['all', 'cursor', 'windsurf', 'universal', 'codex', 'copilot'].includes(agent);

    if (agent === 'claude') {
      installTarget(path.join(homeDir, '.claude', 'skills', SKILL_NAME), 'Claude Code (Global)');
    } else if (agent === 'antigravity') {
      installTarget(path.join(homeDir, '.gemini', 'config', 'skills', SKILL_NAME), 'Antigravity (Global)');
    } else {
      installGlobals(homeDir);
    }

    if (repoRoot && (wantsWorkspace || includeBridge)) installWorkspace(repoRoot);
    finish();
    return;
  }

  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  const projectHint = repoRoot ? `Global + repo ${repoRoot}` : 'Global (no estás en un repo)';

  console.log(`${colors.bold}¿Dónde deseas instalar este skill?${colors.reset}`);
  console.log(`  ${colors.green}1)${colors.reset} ${colors.bold}Todos los agentes${colors.reset} ${colors.dim}(${projectHint})${colors.reset}`);
  console.log(`  ${colors.green}2)${colors.reset} ${colors.bold}Antigravity Global${colors.reset} ${colors.dim}(~/.gemini/config/skills/)${colors.reset}`);
  console.log(`  ${colors.green}3)${colors.reset} ${colors.bold}Claude Code Global${colors.reset} ${colors.dim}(~/.claude/skills/)${colors.reset}`);
  console.log(`  ${colors.green}4)${colors.reset} Cancelar
`);

  const answer = (await question(`${colors.cyan}Selecciona una opción [1-4] (default 1): ${colors.reset}`)).trim() || '1';
  rl.close();

  if (answer === '1') {
    installGlobals(homeDir);
    if (repoRoot) installWorkspace(repoRoot);
  } else if (answer === '2') {
    installTarget(path.join(homeDir, '.gemini', 'config', 'skills', SKILL_NAME), 'Antigravity (Global)');
  } else if (answer === '3') {
    installTarget(path.join(homeDir, '.claude', 'skills', SKILL_NAME), 'Claude Code (Global)');
  } else {
    console.log(`${colors.yellow}Instalación cancelada.${colors.reset}`);
    process.exit(0);
  }

  finish();
}

function finish() {
  for (const root of projectRoots) ensureAiGitignore(root);
  if (!skipGraphify) {
    if (projectRoots.size === 0) ensureGraphifyCli();
    for (const root of projectRoots) setupGraphifyProject(root);
  }

  console.log(`
${colors.bold}${colors.green}✔ ¡Configuración completada!${colors.reset}

${colors.bold}¿Cómo lo usan los agentes de IA?${colors.reset}
- ${colors.bold}Antigravity:${colors.reset} Detecta automáticamente el skill ${colors.cyan}desarrollo-buenas-practicas${colors.reset}.
- ${colors.bold}Claude Code:${colors.reset} Lee las directivas desde ${colors.cyan}~/.claude/skills/${colors.reset} o ${colors.cyan}CLAUDE.md${colors.reset}.
- ${colors.bold}Cursor / Windsurf:${colors.reset} Guiado por ${colors.cyan}.cursorrules${colors.reset} referenciando las reglas modulares.
- ${colors.bold}Codex / Copilot Workspace:${colors.reset} Sigue el estándar ${colors.cyan}AGENTS.md${colors.reset} en la raíz del proyecto.
`);
}

run().catch((err) => {
  console.error(`${colors.red}Error durante la ejecución:${colors.reset}`, err);
  process.exit(1);
});

