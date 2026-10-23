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
const { installSubagents } = require('./subagents');

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
  npx github:MRydex/skills-frontend-mrydex [opciones]
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
  ${colors.green}--dry-run${colors.reset}               Muestra los archivos y destinos sin escribir cambios
  ${colors.green}-v, --version${colors.reset}           Muestra la versión del paquete
  ${colors.green}-h, --help${colors.reset}              Muestra esta ayuda

${colors.bold}EJEMPLOS:${colors.reset}
  # Instalación interactiva (pregunta destino)
  ${colors.dim}npx github:MRydex/skills-frontend-mrydex${colors.reset}

  # Instalar globalmente para Antigravity
  ${colors.dim}npx github:MRydex/skills-frontend-mrydex --agent antigravity --global${colors.reset}

  # Instalar para Claude Code
  ${colors.dim}npx github:MRydex/skills-frontend-mrydex --agent claude --global${colors.reset}

  # Configurar proyecto actual para cualquier agente (universal)
  ${colors.dim}npx github:MRydex/skills-frontend-mrydex --agent all --workspace --bridge${colors.reset}
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
  '.clinerules/',
  '.opencode/',
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
// Instaladores Python en orden de preferencia para un paquete PyPI
const pipCandidates = (pkg) => [
  ['pip', ['install', '--upgrade', pkg]],
  ['python', ['-m', 'pip', 'install', '--upgrade', pkg]],
  ['py', ['-m', 'pip', 'install', '--upgrade', pkg]],
  ['python3', ['-m', 'pip', 'install', '--upgrade', pkg]],
  ['uv', ['tool', 'install', '--upgrade', pkg]],
];
let graphifyReady = null;

function runCommand(cmd, cmdArgs, cwd, env) {
  // Sin shell: pip, python, py, uv y graphify son ejecutables (.exe en Windows), no hace falta
  // y evita DEP0190 (args concatenados sin escapar).
  const result = spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8', env: env ?? process.env });
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

  const installed = pipCandidates('graphifyy').some(([cmd, cmdArgs]) => runCommand(cmd, cmdArgs).ok);
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

const logOk = (msg) => console.log(`  ${colors.green}✔${colors.reset} ${msg}`);
// Subagentes y bloque global se escriben al final (finish): `graphify install` reescribe
// ~/.claude/CLAUDE.md y borraría el bloque si corriera después.
let pendingSubagents = null;

function installClaudeGlobal(homeDir) {
  installTarget(path.join(homeDir, '.claude', 'skills', SKILL_NAME), 'Claude Code (Global)');
  pendingSubagents ??= { homeDir, only: 'Claude Code' };
}

// Skill global + subagentes y pedido de delegación en cada agente instalado en la máquina.
function installGlobals(homeDir) {
  installTarget(path.join(homeDir, '.gemini', 'config', 'skills', SKILL_NAME), 'Antigravity (Global)');
  installTarget(path.join(homeDir, '.claude', 'skills', SKILL_NAME), 'Claude Code (Global)');
  pendingSubagents = { homeDir };
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
      installClaudeGlobal(homeDir);
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
    installClaudeGlobal(homeDir);
  } else {
    console.log(`${colors.yellow}Instalación cancelada.${colors.reset}`);
    process.exit(0);
  }

  finish();
}

// Caveman: la skill sola no alcanza (medido: +33% de palabras sin el plugin). Se usa el instalador
// oficial, que detecta los agentes; en un repo, --with-init deja reglas siempre activas.
const CAVEMAN_PKG = 'github:JuliusBrussee/caveman';

// npm y npx son .cmd en Windows y no se pueden lanzar sin shell: se corre su script con node
function runNpmCli(tool, toolArgs, cwd) {
  const script = `${tool}-cli.js`;
  const candidates = [
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', script),
    path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', script),
  ];
  const cli = candidates.find((candidate) => fs.existsSync(candidate));
  return cli ? runCommand(process.execPath, [cli, ...toolArgs], cwd) : runCommand(tool, toolArgs, cwd);
}

const runNpx = (npxArgs, cwd) => runNpmCli('npx', npxArgs, cwd);

// Activa plugins de Claude Code desde settings.json: Claude Code los instala al arrancar.
// `repo` es null para el marketplace oficial (ya conocido por Claude Code).
function enableClaudePlugins(homeDir, plugins) {
  const settingsPath = path.join(homeDir, '.claude', 'settings.json');
  if (!fs.existsSync(path.join(homeDir, '.claude'))) return;
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error();
    } catch {
      console.log(`  ${colors.yellow}⚠${colors.reset} ~/.claude/settings.json no es JSON válido: no se activaron plugins`);
      return;
    }
  }
  // Un plugin ya activo desde otro marketplace no se duplica (mismo nombre antes de '@')
  const enabledNames = Object.entries(settings.enabledPlugins ?? {})
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key.split('@')[0]);
  const missing = plugins.filter(({ id }) => !enabledNames.includes(id.split('@')[0]));
  if (missing.length === 0) return;
  settings.extraKnownMarketplaces ??= {};
  settings.enabledPlugins ??= {};
  for (const { id, repo } of missing) {
    const marketplace = id.split('@')[1];
    if (repo) {
      settings.extraKnownMarketplaces[marketplace] ??= {
        // Mismo formato que `claude plugin marketplace add`: si difiere, el CLI rechaza el marketplace
        source: { source: 'github', repo },
      };
    }
    settings.enabledPlugins[id] = true;
  }
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}
`);
  logOk(`Claude Code: ${missing.map(({ id }) => id).join(', ')} activado en ~/.claude/settings.json`);
}

// Si el instalador oficial no encuentra el CLI `claude`, se activa el plugin desde settings.json
function enableCavemanInClaude(homeDir) {
  enableClaudePlugins(homeDir, [{ id: 'caveman@caveman', repo: 'JuliusBrussee/caveman' }]);
}

function installCaveman(homeDir, repoRoots) {
  console.log(`
${colors.bold}${colors.cyan}Caveman:${colors.reset} instalando el plugin para los agentes detectados...`);
  // --no-hooks: en Claude Code los hooks los trae el plugin; sumarlos en settings.json los duplica
  const base = ['-y', CAVEMAN_PKG, '--', '--non-interactive', '--no-color', '--no-hooks'];
  if (isDryRun) {
    console.log(`${colors.dim}[dry-run] npx ${base.join(' ')}${colors.reset}`);
    for (const root of repoRoots) console.log(`${colors.dim}[dry-run] (en ${root}) npx ${base.join(' ')} --with-init${colors.reset}`);
    return;
  }

  const global = runNpx(base, homeDir);
  const agents = [...global.output.matchAll(/→ (.+?) detected/g)].map((match) => match[1]);
  let globalOk = global.ok;
  if (!globalOk) {
    // En Windows el instalador de caveman no logra lanzar sus propios `npx skills add`:
    // se reintentan directo los mismos comandos que listó.
    const commands = [...global.output.matchAll(/^\s*\$ npx (.+)$/gm)].map((match) => match[1].trim().split(/\s+/));
    globalOk = commands.length > 0 && commands.every((cmdArgs) => runNpx(cmdArgs, homeDir).ok);
  }
  if (globalOk) logOk(`caveman global: ${agents.length > 0 ? agents.join(', ') : 'sin agentes detectados'}`);
  else console.log(`  ${colors.yellow}⚠${colors.reset} caveman global falló. Correr a mano: npx -y ${CAVEMAN_PKG}`);
  enableCavemanInClaude(homeDir);

  for (const root of repoRoots) {
    const repo = runNpx([...base, '--with-init'], root);
    if (repo.ok) logOk(`caveman: reglas siempre activas en ${root}`);
    else console.log(`  ${colors.yellow}⚠${colors.reset} caveman --with-init falló en ${root}`);
  }
}

// Skills de terceros: `skills add` clona el repo en cada instalación, así que siempre queda la última versión
const EXTERNAL_SKILLS = [
  { repo: 'cloudflare/security-audit-skill', skills: ['security-audit'] },
  {
    repo: 'mukul975/Anthropic-Cybersecurity-Skills',
    // El repo trae 818 skills: todas juntas suman ~40k tokens de descripciones en cada sesión.
    // Solo las de AppSec web, APIs y supply chain de npm, que aplican a Angular + .NET.
    skills: [
      'testing-for-xss-vulnerabilities', 'testing-cors-misconfiguration', 'performing-csrf-attack-simulation',
      'exploiting-prototype-pollution-in-javascript', 'testing-for-json-web-token-vulnerabilities',
      'implementing-jwt-signing-and-verification', 'configuring-oauth2-authorization-flow',
      'performing-oauth-scope-minimization-review', 'testing-api-security-with-owasp-top-10',
      'performing-web-application-vulnerability-triage', 'detecting-malicious-npm-packages',
      'detecting-typosquatting-packages-in-npm-pypi', 'generating-and-analyzing-sboms',
      'implementing-secret-scanning-with-gitleaks',
    ],
  },
  {
    repo: 'SnailSploit/claude-red',
    // Librería ofensiva entera (exploit-dev, shellcode, EDR-evasion, C2, AD, k8s, wireless...).
    // Solo la superficie de ataque de una web app Angular + .NET: web, API, auth y supply chain.
    // Se usan como Red Team para endurecer el código propio contra esos ataques (§15.2), nunca
    // contra sistemas de terceros. Fuera: exploit binario, evasión, persistencia, post-explotación.
    skills: [
      'offensive-sqli', 'offensive-xss', 'offensive-ssrf', 'offensive-ssti', 'offensive-idor',
      'offensive-xxe', 'offensive-deserialization', 'offensive-file-upload', 'offensive-business-logic',
      'offensive-open-redirect', 'offensive-parameter-pollution', 'offensive-race-condition',
      'offensive-request-smuggling', 'offensive-graphql', 'offensive-api-security', 'offensive-jwt',
      'offensive-oauth', 'offensive-dependency-confusion', 'offensive-supply-chain', 'offensive-reporting',
    ],
  },
  {
    repo: 'emilkowalski/skills',
    // Solo las de web sin React: se excluyen write-swift, animate-expo, mobile-native, apple-design y ask-sonner
    skills: [
      'animate', 'animation-vocabulary', 'break-ui', 'emil-design-eng',
      'find-animation-opportunities', 'improve-animations', 'pick-ui-library', 'prototype', 'review-animations',
    ],
  },
  // Código mínimo: reglas de ponytail en todos los agentes (las 6 skills)
  { repo: 'DietrichGebert/ponytail', skills: ['*'] },
  // Skills de ingeniería por fase; sin test-driven-development ni browser-testing-with-devtools (§8 de la skill)
  {
    repo: 'addyosmani/agent-skills',
    skills: [
      'api-and-interface-design', 'ci-cd-and-automation', 'code-review-and-quality', 'code-simplification',
      'constraint-driven-development', 'context-engineering', 'debugging-and-error-recovery',
      'deprecation-and-migration', 'documentation-and-adrs', 'doubt-driven-development', 'frontend-ui-engineering',
      'git-workflow-and-versioning', 'idea-refine', 'incremental-implementation', 'interview-me',
      'observability-and-instrumentation', 'performance-optimization', 'planning-and-task-breakdown',
      'security-and-hardening', 'shipping-and-launch', 'source-driven-development', 'spec-driven-development',
      'using-agent-skills',
    ],
  },
];

// Se quitan en cada instalación (caveman las reinstala): suman descripciones en cada turno y no se usan.
// task-observer: ~11k tokens por sesión. caveman-*: skills de Caveman Cloud, servicio que no se usa.
const UNUSED_SKILLS = [
  'task-observer', 'caveman-setup', 'caveman-discover', 'caveman-evidence-review',
  'caveman-manage', 'caveman-optimize', 'caveman-learn',
];

function installExternalSkills(homeDir) {
  console.log(`
${colors.bold}${colors.cyan}Skills externas:${colors.reset} instalando la última versión (global)...`);
  for (const { repo, skills } of EXTERNAL_SKILLS) {
    const npxArgs = ['-y', 'skills', 'add', repo, '--global', '--yes', '--skill', ...skills];
    if (isDryRun) {
      console.log(`${colors.dim}[dry-run] npx ${npxArgs.join(' ')}${colors.reset}`);
      continue;
    }
    if (runNpx(npxArgs, homeDir).ok) logOk(`${repo}: ${skills.join(', ')}`);
    else console.log(`  ${colors.yellow}⚠${colors.reset} ${repo} falló. Correr a mano: npx ${npxArgs.join(' ')}`);
  }
  const removeArgs = ['-y', 'skills', 'remove', ...UNUSED_SKILLS, '--global', '--yes'];
  if (isDryRun) console.log(`${colors.dim}[dry-run] npx ${removeArgs.join(' ')}${colors.reset}`);
  else if (runNpx(removeArgs, homeDir).ok) logOk(`sin skills que no se usan: ${UNUSED_SKILLS.join(', ')}`);
}

// Plugins solo de Claude Code (sin equivalente como skill suelta). `repo` null: marketplace oficial.
// claude-mem quedó afuera: su memoria hosteada es paga y, sin suscripción, gasta tokens del plan.
const CLAUDE_PLUGINS = [
  { id: 'claude-code-setup@claude-plugins-official', repo: null },
  // Escaneo profundo de vulnerabilidades del código propio, con verificación de cada hallazgo
  { id: 'claude-security@claude-plugins-official', repo: null },
];

// Herramientas de eficiencia: Headroom (PyPI) comprime el contexto (§14.8 de la skill).
// Integración durable con `headroom init -g` donde el agente lo soporta; si no, `headroom wrap <agente>` (§14.8 de la skill).
function installAgentTools(homeDir) {
  console.log(`
${colors.bold}${colors.cyan}Herramientas del agente:${colors.reset} Headroom y claude-code-setup...`);
  if (isDryRun) {
    console.log(`${colors.dim}[dry-run] pip install --upgrade "headroom-ai[all]"${colors.reset}`);
    console.log(`${colors.dim}[dry-run] Claude Code: activar ${CLAUDE_PLUGINS.map(({ id }) => id).join(', ')}${colors.reset}`);
    console.log(`${colors.dim}[dry-run] Claude Code: hook SessionStart + ANTHROPIC_BASE_URL=${HEADROOM_URL} + CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=${AUTOCOMPACT_PCT}${colors.reset}`);
    return;
  }

  pipCandidates('headroom-ai[all]').some(([cmd, cmdArgs]) => runCommand(cmd, cmdArgs).ok);
  if (runCommand('headroom', ['--help']).ok) {
    logOk('headroom listo');
    initHeadroom(homeDir);
  } else {
    console.log(`  ${colors.yellow}⚠${colors.reset} headroom falló. Instalar a mano: uv tool install --python 3.13 "headroom-ai[all]"`);
  }

  installClaudePlugins(homeDir);
  installSessionStartHook(homeDir);
}

// Comandos instalados por npm (.cmd en Windows): necesitan shell. Solo se pasan líneas fijas.
function runShell(commandLine, cwd) {
  const result = spawnSync(commandLine, { cwd, shell: true, encoding: 'utf8' });
  return { ok: result.status === 0, output: `${result.stdout || ''}${result.stderr || ''}` };
}

// Plugins con el CLI de Claude Code, que los descarga en el momento: activarlos solo en settings.json
// puede dejarlos registrados sin descargar. El CLI en el PATH también lo usa `headroom init`.
function installClaudePlugins(homeDir) {
  if (!fs.existsSync(path.join(homeDir, '.claude'))) return;
  if (!runShell('claude --version').ok) runNpmCli('npm', ['install', '-g', '@anthropic-ai/claude-code'], homeDir);

  if (!runShell('claude --version').ok) {
    console.log(`  ${colors.yellow}⚠${colors.reset} sin CLI de Claude Code: plugins activados en settings.json (se descargan al reiniciar)`);
    enableClaudePlugins(homeDir, CLAUDE_PLUGINS);
    return;
  }
  // Un plugin ya activo desde otro marketplace no se duplica (mismo nombre antes de '@', otro id).
  // El mismo id se reinstala igual: puede estar activo sin descargar.
  let enabled = {};
  try {
    enabled = JSON.parse(fs.readFileSync(path.join(homeDir, '.claude', 'settings.json'), 'utf8')).enabledPlugins ?? {};
  } catch {
    // Sin settings.json válido no hay plugins previos que respetar
  }
  const fromOtherMarketplace = (id) => Object.keys(enabled)
    .some((key) => enabled[key] === true && key !== id && key.split('@')[0] === id.split('@')[0]);
  for (const { id, repo } of CLAUDE_PLUGINS.filter((plugin) => !fromOtherMarketplace(plugin.id))) {
    if (repo) runShell(`claude plugin marketplace add ${repo}`, homeDir);
    let { ok, output } = runShell(`claude plugin install ${id} --scope user`, homeDir);
    // Versiones nuevas de Claude Code renombraron el marketplace oficial
    if (!ok && !repo) ({ ok, output } = runShell(`claude plugin install ${id.split('@')[0]}@anthropic-plugin-directory --scope user`, homeDir));
    if (ok) logOk(`Claude Code: plugin ${id}`);
    else console.log(`  ${colors.yellow}⚠${colors.reset} ${id} falló: ${output.trim().split(/\r?\n/).pop()}`);
  }

}

// `claude` suele no estar en el PATH cuando solo se usa la extensión de VS Code: se usa su binario
function claudeBinDir(homeDir) {
  // Con shell: instalado por npm en Windows es `claude.cmd`, que spawn sin shell no encuentra
  if (runShell('claude --version').ok) return null;
  const extensionsDir = path.join(homeDir, '.vscode', 'extensions');
  if (!fs.existsSync(extensionsDir)) return null;
  const latest = fs.readdirSync(extensionsDir)
    .filter((name) => name.startsWith('anthropic.claude-code-'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .pop();
  const binDir = latest && path.join(extensionsDir, latest, 'resources', 'native-binary');
  return binDir && fs.existsSync(binDir) ? binDir : null;
}

// Integración durable oficial de Headroom: env del agente apuntando al proxy + hooks que lo levantan
// solos al iniciar sesión y antes de cada comando. En Windows Codex no corre hooks: sin hook el proxy
// no arranca solo y Codex fallaría, así que ahí se usa `headroom wrap codex`.
function initHeadroom(homeDir) {
  const binDir = claudeBinDir(homeDir);
  const env = { ...process.env, HEADROOM_UPDATE_CHECK: 'off' };
  // En Windows la clave es `Path`: se reutiliza la existente para no duplicarla
  const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
  if (binDir) env[pathKey] = `${binDir}${path.delimiter}${env[pathKey] ?? ''}`;

  const targets = [
    { agent: 'claude', label: 'Claude Code', present: fs.existsSync(path.join(homeDir, '.claude')) },
    { agent: 'copilot', label: 'Copilot CLI', present: runShell('copilot --version').ok },
    { agent: 'codex', label: 'Codex', present: process.platform !== 'win32' && runCommand('codex', ['--version']).ok },
  ];
  for (const { agent, label } of targets.filter((target) => target.present)) {
    const { ok, output } = runCommand('headroom', ['init', '-g', '--port', '8787', agent], homeDir, env);
    if (ok) logOk(`headroom: ${label} pasa siempre por Headroom (el proxy arranca solo)`);
    else console.log(`  ${colors.yellow}⚠${colors.reset} headroom init ${agent} falló: ${output.trim().split(/\r?\n/).slice(-3).join(' | ')}`);
  }
  // Windows: si el hook tiene que levantar el proxy, abre una consola. Con la tarea programada
  // (oculta, al iniciar sesión) el proxy ya está arriba cuando corre el hook.
  if (process.platform === 'win32' && targets[0].present) {
    // Reinstalar con la tarea ya creada falla: Headroom no logra frenar el proxy que está corriendo
    // ("is still answering ... after stop"). La tarea existente ya sirve, no se vuelve a aplicar.
    const taskExists = runCommand('schtasks', ['/Query', '/TN', 'headroom-init-user-health']).ok;
    const { ok, output } = taskExists ? { ok: true, output: '' }
      : runCommand('headroom', ['install', 'apply', '--preset', 'persistent-task', '--profile', 'init-user',
        '--providers', 'manual', '--target', 'claude', '--port', '8787', '--no-rate-limit'], homeDir, env);
    if (taskExists) logOk('headroom: tarea programada ya instalada');
    else if (ok) logOk('headroom: proxy como tarea programada (al iniciar sesión)');
    else console.log(`  ${colors.yellow}⚠${colors.reset} headroom install apply falló: ${output.trim().split(/\r?\n/).slice(-3).join(' | ')}`);
    // Si Windows rechaza S4U (cuenta de dominio), Headroom deja solo la tarea -health con token
    // interactivo: muestra consola cada 5 min y no corre al iniciar sesión. Se corre sin consola
    // (conhost --headless) y se le suma un disparador de inicio de sesión.
    const fix = runCommand('powershell', ['-NoProfile', '-Command', `
      $n = 'headroom-init-user-health'
      $t = Get-ScheduledTask -TaskName $n -ErrorAction Stop
      $cmd = $t.Actions[0].Execute
      $a = if ($cmd -like '*conhost.exe') { $t.Actions } else { New-ScheduledTaskAction -Execute 'conhost.exe' -Argument "--headless \`"$cmd\`"" }
      $trig = @($t.Triggers | Where-Object { $_.CimClass.CimClassName -ne 'MSFT_TaskLogonTrigger' }) + (New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\\$env:USERNAME")
      Set-ScheduledTask -TaskName $n -Action $a -Trigger $trig | Out-Null`]);
    if (ok && fix.ok) logOk('headroom: tarea sin consola');
    else if (ok) console.log(`  ${colors.yellow}⚠${colors.reset} headroom: no se pudo ocultar la tarea: ${fix.output.trim().split(/\r?\n/).pop()}`);
  }
  console.log(`  ${colors.dim}Codex en Windows: headroom wrap codex · Cursor: headroom wrap cursor · VS Code Copilot: headroom wrap vscode`);
  console.log(`  Gemini CLI y Antigravity: Headroom todavía no los soporta${colors.reset}`);
}

const HEADROOM_URL = 'http://127.0.0.1:8787';
const HOOK_MARKER = 'skills-frontend-mrydex';
const SIBLING_HOOK_MARKERS = ['skills-frontend-mrydex', 'skills-backend-mrydex'];
const AUTOCOMPACT_PCT = 40;

// Hook SessionStart: levanta Headroom si hace falta. Claude Code pasa por Headroom solo si `headroom`
// funciona y no hay otra ANTHROPIC_BASE_URL; compacta al 40% del contexto.
function installSessionStartHook(homeDir) {
  const claudeDir = path.join(homeDir, '.claude');
  if (!fs.existsSync(claudeDir)) return;
  const settingsPath = path.join(claudeDir, 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error();
    } catch {
      console.log(`  ${colors.yellow}⚠${colors.reset} ~/.claude/settings.json no es JSON válido: no se instaló el hook SessionStart`);
      return;
    }
  }

  const hookDir = path.join(claudeDir, 'hooks', HOOK_MARKER);
  const hookPath = path.join(hookDir, 'session-start.js');
  fs.mkdirSync(hookDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'hooks', 'session-start.js'), hookPath);

  // Reinstalar reemplaza solo la entrada propia; el resto de los hooks no se toca
  settings.hooks ??= {};
  const others = (settings.hooks.SessionStart ?? []).filter(
    // También el de la skill hermana: hacen lo mismo y dos hooks lanzarían dos proxies
    (entry) => !entry.hooks?.some((hook) => SIBLING_HOOK_MARKERS.some((marker) => hook.command?.includes(marker))),
  );
  const command = `node "${hookPath.replaceAll('\\', '/')}"`;
  settings.hooks.SessionStart = [...others, { hooks: [{ type: 'command', command, timeout: 30 }] }];

  // Hooks de caveman sueltos que versiones anteriores dejaban junto al plugin (cada evento se
  // inyectaba dos veces). El de subagentes se queda: el plugin no lo trae.
  const cavemanPlugin = settings.enabledPlugins?.['caveman@caveman'] === true;
  const stale = (hook) => (cavemanPlugin && /\.claude[\\/]+hooks[\\/]+caveman-(activate|mode-tracker)\.js"?$/.test(hook.command ?? ''));
  for (const event of Object.keys(settings.hooks)) {
    if (!Array.isArray(settings.hooks[event])) continue;
    settings.hooks[event] = settings.hooks[event].filter((entry) => !entry.hooks?.some(stale));
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
  }

  const headroomOk = runCommand('headroom', ['--help']).ok;
  settings.env ??= {};
  // No pisar un gateway o proveedor propio (variable del sistema, Bedrock o Vertex)
  const ownRoute = ['ANTHROPIC_BASE_URL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX']
    .some((key) => settings.env[key] || process.env[key]);
  if (headroomOk && !ownRoute) settings.env.ANTHROPIC_BASE_URL = HEADROOM_URL;
  settings.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE ??= String(AUTOCOMPACT_PCT);

  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}
`);
  logOk('Claude Code: hook SessionStart (Headroom)');
  if (settings.env.ANTHROPIC_BASE_URL === HEADROOM_URL) logOk(`Claude Code: modelo vía Headroom (${HEADROOM_URL})`);
  else if (ownRoute) console.log(`  ${colors.dim}Ya hay otra ruta al modelo (ANTHROPIC_BASE_URL, Bedrock o Vertex): no se cambió${colors.reset}`);
  logOk(`Claude Code: autocompactación al ${settings.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE}% del contexto`);
}

function finish() {
  for (const root of projectRoots) ensureAiGitignore(root);
  if (projectRoots.size === 0) ensureGraphifyCli();
  for (const root of projectRoots) setupGraphifyProject(root);
  installCaveman(os.homedir(), [...projectRoots]);
  installExternalSkills(os.homedir());
  installAgentTools(os.homedir());
  if (pendingSubagents) installSubagents({ ...pendingSubagents, isDryRun, log: logOk });

  console.log(`
${colors.bold}${colors.green}✔ ¡Configuración completada!${colors.reset}

${colors.bold}¿Cómo lo usan los agentes de IA?${colors.reset}
- ${colors.bold}Antigravity:${colors.reset} Detecta automáticamente el skill ${colors.cyan}desarrollo-buenas-practicas${colors.reset}.
- ${colors.bold}Claude Code:${colors.reset} Lee las directivas desde ${colors.cyan}~/.claude/skills/${colors.reset} o ${colors.cyan}CLAUDE.md${colors.reset}.
- ${colors.bold}Cursor / Windsurf:${colors.reset} Guiado por ${colors.cyan}.cursorrules${colors.reset} referenciando las reglas modulares.
- ${colors.bold}Codex / Copilot Workspace:${colors.reset} Sigue el estándar ${colors.cyan}AGENTS.md${colors.reset} en la raíz del proyecto.
`);
  process.exit(0);
}

run().catch((err) => {
  console.error(`${colors.red}Error durante la ejecución:${colors.reset}`, err);
  process.exit(1);
});

