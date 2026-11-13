#!/usr/bin/env node

/**
 * Hook SessionStart de Claude Code (skills-frontend-mrydex).
 * Carga `tasks/lessons.md` del proyecto (skill §11.8) como contexto, así las lecciones se aplican
 * sin depender de que el agente lo lea, poda los snapshots diarios de graphify (§14.5) y avisa una vez
 * por día si hay una versión nueva de la skill.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const LESSONS_MAX_CHARS = 12000;
// graphify copia graph.json entero a graphify-out/AAAA-MM-DD cada día y nunca lo borra (medido: 442 MB en
// 27 carpetas en un repo de 12.600 nodos). Solo se borran carpetas con esos archivos y nada más.
const SNAPSHOTS_KEEP = 2;
const SNAPSHOT_FILES = new Set(['graph.json', 'GRAPH_REPORT.md', 'manifest.json', 'cost.json', '.graphify_labels.json',
  '.graphify_analysis.json', '.graphify_semantic_marker']);
const SKILL_PACKAGES = ['skills-frontend-mrydex', 'skills-backend-mrydex'];
const UPDATE_CHECK_HOURS = 24;
const UPDATE_CHECK_TIMEOUT_MS = 3000;

// Claude Code manda el evento por stdin (incluye `cwd`); sin stdin, el directorio actual
function readCwd() {
  if (process.stdin.isTTY) return Promise.resolve(process.cwd());
  return new Promise((resolve) => {
    let data = '';
    const done = () => {
      try {
        resolve(JSON.parse(data).cwd || process.cwd());
      } catch {
        resolve(process.cwd());
      }
    };
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', done);
    process.stdin.on('error', done);
  });
}

// Un tasks/lessons.md versionado vino con el repo (el instalador lo pone en .gitignore): puede traer
// instrucciones de un tercero, así que no se carga solo.
function isTrackedByGit(cwd, file) {
  return spawnSync('git', ['ls-files', '--error-unmatch', file], { cwd, stdio: 'ignore' }).status === 0;
}

function lessonsContext(cwd) {
  if (isTrackedByGit(cwd, 'tasks/lessons.md')) return '';
  let text;
  try {
    text = fs.readFileSync(path.join(cwd, 'tasks', 'lessons.md'), 'utf8').trim();
  } catch {
    return '';
  }
  if (!text) return '';
  const cut = text.length > LESSONS_MAX_CHARS;
  return 'Lecciones de este proyecto (tasks/lessons.md). Aplicarlas en esta sesión; '
    + 'si una no sirvió, reformularla ahí mismo:\n\n'
    + (cut ? `${text.slice(0, LESSONS_MAX_CHARS)}\n\n[recortado: leer el resto en tasks/lessons.md]` : text);
}

// Devuelve cuántos snapshots borró. Quedan los SNAPSHOTS_KEEP más nuevos (el nombre es la fecha).
function pruneGraphifySnapshots(cwd) {
  const out = path.join(cwd, 'graphify-out');
  let dated;
  try {
    dated = fs.readdirSync(out).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort();
  } catch {
    return 0;
  }
  let removed = 0;
  for (const name of dated.slice(0, -SNAPSHOTS_KEEP)) {
    const dir = path.join(out, name);
    try {
      if (!fs.readdirSync(dir).every((file) => SNAPSHOT_FILES.has(file))) continue;
      fs.rmSync(dir, { recursive: true });
      removed++;
    } catch {
      // Otro proceso lo tiene abierto: se reintenta en la próxima sesión
    }
  }
  return removed;
}

function isNewer(remote, local) {
  const [a, b] = [remote, local].map((version) => version.split('.').map(Number));
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

// Aviso de versión nueva. Este hook es uno solo para las dos skills (el instalador deja una entrada),
// así que revisa las dos carpetas hermanas. Una consulta por día y por skill: el sello se escribe antes
// de consultar, así sin red no se reintenta en cada sesión. Va por `systemMessage`: lo ve el usuario y
// no entra al contexto del modelo. Nunca actualiza solo.
async function updateNotice(name) {
  const dir = path.join(__dirname, '..', name);
  try {
    const installed = fs.readFileSync(path.join(dir, 'version'), 'utf8').trim();
    const stamp = path.join(dir, 'update-check');
    const last = fs.existsSync(stamp) ? fs.statSync(stamp).mtimeMs : 0;
    if (Date.now() - last < UPDATE_CHECK_HOURS * 3600e3) return '';
    fs.writeFileSync(stamp, '');
    const response = await fetch(`https://raw.githubusercontent.com/MRydex/${name}/main/package.json`,
      { signal: AbortSignal.timeout(UPDATE_CHECK_TIMEOUT_MS) });
    if (!response.ok) return '';
    const latest = String((await response.json()).version);
    return isNewer(latest, installed) ? `${name} ${installed} → ${latest}. Actualizar: npx -y github:MRydex/${name}` : '';
  } catch {
    return ''; // skill no instalada, sin red o respuesta rara: sin aviso
  }
}

async function main() {
  const cwd = await readCwd();
  const output = {};
  const additionalContext = lessonsContext(cwd);
  if (additionalContext) output.hookSpecificOutput = { hookEventName: 'SessionStart', additionalContext };
  const messages = (await Promise.all(SKILL_PACKAGES.map(updateNotice))).filter(Boolean);
  const pruned = pruneGraphifySnapshots(cwd);
  if (pruned) messages.push(`graphify: ${pruned} snapshots diarios viejos borrados de graphify-out/ (quedan ${SNAPSHOTS_KEEP})`);
  if (messages.length) output.systemMessage = messages.join('\n');
  if (Object.keys(output).length) process.stdout.write(JSON.stringify(output));
}

main();
