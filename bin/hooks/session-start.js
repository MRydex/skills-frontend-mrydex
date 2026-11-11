#!/usr/bin/env node

/**
 * Hook SessionStart de Claude Code (skills-frontend-mrydex).
 * Carga `tasks/lessons.md` del proyecto (skill §11.8) como contexto, así las lecciones se aplican
 * sin depender de que el agente lo lea.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const LESSONS_MAX_CHARS = 12000;

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
  if (!additionalContext) return;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } }));
}

main();
