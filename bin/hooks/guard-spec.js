#!/usr/bin/env node

/**
 * Hook PreToolUse de Claude Code (Write) de skills-frontend-mrydex: la skill no crea archivos de
 * test salvo pedido del usuario (§08). Antes de crear `*.spec.ts` / `*.test.ts` en un repo Angular
 * (hay `angular.json` arriba del archivo) pide confirmación al usuario en vez de bloquear,
 * así un pedido explícito de tests sigue siendo posible. En otros repos no hace nada.
 */

const fs = require('fs');
const path = require('path');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

// Sube desde la carpeta del archivo hasta la raíz del repo (.git) o del disco
function inAngularRepo(file) {
  let dir = path.dirname(file);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'angular.json'))) return true;
    if (fs.existsSync(path.join(dir, '.git'))) return false;
    const parent = path.dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}

async function main() {
  const event = JSON.parse(await readStdin());
  const file = String(event.tool_input?.file_path ?? '');
  if (!/\.(spec|test)\.ts$/i.test(file)) return;
  const absolute = path.resolve(event.cwd ?? process.cwd(), file);
  // Editar un spec que ya existe no es crear uno nuevo (§08: los existentes se mantienen)
  if (fs.existsSync(absolute) || !inAngularRepo(absolute)) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: 'guard-spec: la skill desarrollo-buenas-practicas no crea archivos de test (§08). '
        + 'Aprobá solo si pediste tests explícitamente.',
    },
  }));
}

main().catch(() => {});
