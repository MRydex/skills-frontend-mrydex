#!/usr/bin/env node

/**
 * Hook SessionStart de Claude Code (skills-frontend-mrydex).
 * Levanta el proxy de Headroom y OmniRoute si no están corriendo y obliga a usar task-observer.
 * Claude Code apunta al proxy por `env.ANTHROPIC_BASE_URL` en ~/.claude/settings.json.
 */

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const HEADROOM_PORT = 8787;
const OMNIROUTE_PORT = 20128;
const HEADROOM_WAIT_MS = 20000;

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
// Con shell en Windows porque omniroute es un .cmd; los argumentos son fijos.
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

async function main() {
  const usesHeadroom = baseUrl().includes(`:${HEADROOM_PORT}`);
  let headroomUp = await isUp(HEADROOM_PORT, '/health');
  if (!headroomUp && usesHeadroom) {
    startDetached('headroom', ['proxy', '--port', String(HEADROOM_PORT)]);
    headroomUp = await waitUp(HEADROOM_PORT, '/health', HEADROOM_WAIT_MS);
  }

  // OmniRoute escucha en 0.0.0.0 por defecto: HOST/HOSTNAME lo limitan a la máquina local
  if (!(await isUp(OMNIROUTE_PORT, '/'))) {
    startDetached('omniroute', ['serve', '--daemon', '--no-open', '--no-tray'], {
      HOST: '127.0.0.1',
      HOSTNAME: '127.0.0.1',
    });
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: 'Invoke the task-observer skill before the first tool call of this session.',
    },
  };
  // Sin proxy cada llamada al modelo falla: el aviso va al usuario, no al modelo
  if (usesHeadroom && !headroomUp) {
    output.systemMessage = `Headroom no responde en 127.0.0.1:${HEADROOM_PORT}: las llamadas al modelo van a fallar. `
      + `Correr "headroom proxy --port ${HEADROOM_PORT}" o quitar ANTHROPIC_BASE_URL del env de ~/.claude/settings.json.`;
  }
  process.stdout.write(JSON.stringify(output));
}

main();
