#!/usr/bin/env node

/**
 * Hook SessionStart de Claude Code (skills-frontend-mrydex).
 * Levanta el proxy de Headroom si no está corriendo y carga `tasks/lessons.md` del proyecto
 * (skill §11.8) como contexto, así las lecciones se aplican sin depender de que el agente lo lea.
 * Claude Code apunta al proxy por `env.ANTHROPIC_BASE_URL` en ~/.claude/settings.json.
 */

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const HEADROOM_PORT = 8787;
const HEADROOM_WAIT_MS = 20000;
const LESSONS_MAX_CHARS = 12000;

function isUp(port, urlPath) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: urlPath, timeout: 1000 }, (res) => {
      res.resume();
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Proceso independiente: sigue vivo al cerrar la sesión y la próxima lo reutiliza.
// En Windows con shell para ejecutables CLI; los argumentos son fijos.
function startDetached(cmd, args, env = {}) {
  try {
    const options = { detached: true, stdio: 'ignore', windowsHide: true, env: { ...process.env, ...env } };
    // Con shell se pasa una sola línea (evita DEP0190)
    const child = process.platform === 'win32'
      ? spawn(`${cmd} ${args.join(' ')}`, { ...options, shell: true })
      : spawn(cmd, args, options);
    child.on('error', () => {});
    child.unref();
  } catch {
    // Si no se puede lanzar, el chequeo de salud posterior lo reporta
  }
}

async function waitUp(port, urlPath, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await isUp(port, urlPath)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

// URL del modelo: la del proceso o, si el hook no la heredó, la de ~/.claude/settings.json
function baseUrl() {
  if (process.env.ANTHROPIC_BASE_URL) return process.env.ANTHROPIC_BASE_URL;
  try {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8')).env?.ANTHROPIC_BASE_URL || '';
  } catch {
    return '';
  }
}

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

async function main() {
  const additionalContext = lessonsContext(await readCwd());
  const usesHeadroom = baseUrl().includes(`:${HEADROOM_PORT}`);
  let headroomUp = await isUp(HEADROOM_PORT, '/health');
  if (!headroomUp && usesHeadroom) {
    // Windows: detached abre una consola visible por sesión. La tarea programada corre oculta
    // y con IgnoreNew varias sesiones a la vez levantan un solo proxy.
    // Sin la tarea (falló `headroom install apply`) se lanza igual, aunque abra una consola.
    const task = process.platform === 'win32'
      && spawnSync('schtasks', ['/Run', '/TN', 'headroom-init-user-health'], { windowsHide: true }).status === 0;
    if (!task) startDetached('headroom', ['proxy', '--port', String(HEADROOM_PORT)]);
    headroomUp = await waitUp(HEADROOM_PORT, '/health', HEADROOM_WAIT_MS);
  }

  const output = {};
  // Sin proxy cada llamada al modelo falla: el aviso va al usuario, no al modelo
  if (usesHeadroom && !headroomUp) {
    output.systemMessage = `Headroom no responde en 127.0.0.1:${HEADROOM_PORT}: las llamadas al modelo van a fallar. `
      + `Correr en una terminal "${process.platform === 'win32' ? 'schtasks /Run /TN headroom-init-user-health' : `headroom proxy --port ${HEADROOM_PORT}`}" `
      + 'o, para seguir sin Headroom, "headroom unwrap claude" y reiniciar el editor.';
  }
  if (additionalContext) {
    output.hookSpecificOutput = { hookEventName: 'SessionStart', additionalContext };
  }
  if (Object.keys(output).length) process.stdout.write(JSON.stringify(output));
}

main();
