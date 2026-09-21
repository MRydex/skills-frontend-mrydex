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
  ${colors.green}-a, --agent <nombre>${colors.reset}    Agente objetivo:
                          ${colors.bold}antigravity${colors.reset} (Antigravity / Gemini CLI)
                          ${colors.bold}claude${colors.reset}      (Claude Code)
                          ${colors.bold}cursor${colors.reset}      (Cursor / Windsurf con .cursorrules)
                          ${colors.bold}universal${colors.reset}   (Codex / Copilot con AGENTS.md)
                          ${colors.bold}all${colors.reset}         (Instalar en todos los entornos)
  ${colors.green}-g, --global${colors.reset}            Instalación global en el directorio home del usuario
  ${colors.green}-w, --workspace${colors.reset}         Instalación local en el proyecto actual (CWD)
  ${colors.green}-t, --target <ruta>${colors.reset}     Ruta personalizada donde copiar la carpeta del skill
  ${colors.green}-b, --bridge${colors.reset}            Genera archivos puente (AGENTS.md, CLAUDE.md, .cursorrules)
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

async function run() {
  console.log(`\n${colors.bold}${colors.magenta}=== Instalador de Skills Frontend (Angular 22+) ===${colors.reset}`);
  console.log(`${colors.dim}Compatible con Antigravity, Claude Code, Cursor, Windsurf, Copilot & Codex${colors.reset}\n`);

  const homeDir = os.homedir();
  const cwd = process.cwd();

  if (customTarget) {
    installTarget(path.resolve(cwd, customTarget), 'Directorio personalizado');
    if (includeBridge) copyBridgeFiles(cwd);
    finish();
    return;
  }

  // Determine actions based on CLI args or interactive prompt
  let selectedOption = null;

  if (agentArg || isGlobal || isWorkspace) {
    const agent = (agentArg || 'antigravity').toLowerCase();
    const scope = isWorkspace ? 'workspace' : 'global';

    if (agent === 'all') {
      // Install all
      installTarget(path.join(homeDir, '.gemini', 'config', 'skills', 'desarrollo-buenas-practicas'), 'Antigravity (Global)');
      installTarget(path.join(homeDir, '.claude', 'skills', 'desarrollo-buenas-practicas'), 'Claude Code (Global)');
      installTarget(path.join(cwd, '.agents', 'skills', 'desarrollo-buenas-practicas'), 'Workspace (.agents/skills)');
      installTarget(path.join(cwd, 'skills', 'desarrollo-buenas-practicas'), 'Workspace (skills/)');
      copyBridgeFiles(cwd);
      finish();
      return;
    }

    if (agent === 'antigravity') {
      const dest = scope === 'global'
        ? path.join(homeDir, '.gemini', 'config', 'skills', 'desarrollo-buenas-practicas')
        : path.join(cwd, '.agents', 'skills', 'desarrollo-buenas-practicas');
      installTarget(dest, `Antigravity (${scope})`);
    } else if (agent === 'claude') {
      const dest = scope === 'global'
        ? path.join(homeDir, '.claude', 'skills', 'desarrollo-buenas-practicas')
        : path.join(cwd, '.claude', 'skills', 'desarrollo-buenas-practicas');
      installTarget(dest, `Claude Code (${scope})`);
    } else if (agent === 'cursor' || agent === 'windsurf') {
      const dest = path.join(cwd, 'skills', 'desarrollo-buenas-practicas');
      installTarget(dest, `Cursor/Windsurf (Workspace)`);
      copyBridgeFiles(cwd);
    } else if (agent === 'universal' || agent === 'codex' || agent === 'copilot') {
      const dest = path.join(cwd, 'skills', 'desarrollo-buenas-practicas');
      installTarget(dest, `Universal / AGENTS.md (Workspace)`);
      copyBridgeFiles(cwd);
    }

    if (includeBridge && scope === 'workspace') {
      copyBridgeFiles(cwd);
    }

    finish();
    return;
  }

  // Interactive mode
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log(`${colors.bold}¿Dónde deseas instalar este skill?${colors.reset}`);
  console.log(`  ${colors.green}1)${colors.reset} ${colors.bold}Antigravity Global${colors.reset} ${colors.dim}(~/.gemini/config/skills/)${colors.reset}`);
  console.log(`  ${colors.green}2)${colors.reset} ${colors.bold}Claude Code Global${colors.reset} ${colors.dim}(~/.claude/skills/)${colors.reset}`);
  console.log(`  ${colors.green}3)${colors.reset} ${colors.bold}Proyecto Actual / Workspace${colors.reset} ${colors.dim}(.agents/skills/ + skills/)${colors.reset}`);
  console.log(`  ${colors.green}4)${colors.reset} ${colors.bold}Universal / Todos los agentes${colors.reset} ${colors.dim}(Global + Workspace + puentes AGENTS/CLAUDE/Cursor)${colors.reset}`);
  console.log(`  ${colors.green}5)${colors.reset} Cancelar\n`);

  const answer = (await question(`${colors.cyan}Selecciona una opción [1-5] (default 1): ${colors.reset}`)).trim() || '1';
  rl.close();

  if (answer === '1') {
    const dest = path.join(homeDir, '.gemini', 'config', 'skills', 'desarrollo-buenas-practicas');
    installTarget(dest, 'Antigravity Global');
  } else if (answer === '2') {
    const dest = path.join(homeDir, '.claude', 'skills', 'desarrollo-buenas-practicas');
    installTarget(dest, 'Claude Code Global');
  } else if (answer === '3') {
    const destAgents = path.join(cwd, '.agents', 'skills', 'desarrollo-buenas-practicas');
    const destSkills = path.join(cwd, 'skills', 'desarrollo-buenas-practicas');
    installTarget(destAgents, 'Antigravity Workspace (.agents)');
    installTarget(destSkills, 'Standard Workspace (skills)');
    copyBridgeFiles(cwd);
  } else if (answer === '4') {
    installTarget(path.join(homeDir, '.gemini', 'config', 'skills', 'desarrollo-buenas-practicas'), 'Antigravity (Global)');
    installTarget(path.join(homeDir, '.claude', 'skills', 'desarrollo-buenas-practicas'), 'Claude Code (Global)');
    installTarget(path.join(cwd, '.agents', 'skills', 'desarrollo-buenas-practicas'), 'Workspace (.agents)');
    installTarget(path.join(cwd, 'skills', 'desarrollo-buenas-practicas'), 'Workspace (skills)');
    copyBridgeFiles(cwd);
  } else {
    console.log(`${colors.yellow}Instalación cancelada.${colors.reset}`);
    process.exit(0);
  }

  finish();
}

function finish() {
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

