#!/usr/bin/env node

/**
 * Hook PostToolUse de Claude Code (Edit | Write | MultiEdit) de skills-frontend-mrydex.
 * Formatea con Prettier solo el archivo editado y solo si el proyecto ya lo usa: config de Prettier
 * entre el archivo y la raíz del repo, y `prettier` instalado en un node_modules de ese camino
 * (sirve también para librerías en `projects/<lib>/`). Nunca descarga nada (sin npx).
 * No ensucia el diff: si el archivo está versionado y en HEAD no pasaba `prettier --check`, no lo
 * toca (formatearlo cambiaría líneas que nadie editó). Si algo falla, no hace nada.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EXTENSIONS = /\.(ts|mts|cts|js|mjs|cjs|html|scss|css|json)$/i;
const CONFIGS = ['.prettierrc', '.prettierrc.json', '.prettierrc.yaml', '.prettierrc.yml', '.prettierrc.json5',
  '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.mjs', '.prettierrc.toml',
  'prettier.config.js', 'prettier.config.cjs', 'prettier.config.mjs', 'prettier.config.ts'];
const OPTIONS = { stdio: 'ignore', windowsHide: true, timeout: 12000 };

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

function hasPrettierConfig(dir) {
  if (CONFIGS.some((name) => fs.existsSync(path.join(dir, name)))) return true;
  try {
    return 'prettier' in JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  } catch {
    return false;
  }
}

// Prettier 3 (bin/prettier.cjs) o 2 (bin-prettier.js)
function prettierBin(dir) {
  return ['bin/prettier.cjs', 'bin-prettier.js']
    .map((rel) => path.join(dir, 'node_modules', 'prettier', rel))
    .find((candidate) => fs.existsSync(candidate));
}

// Sube desde la carpeta del archivo hasta la raíz del repo (.git) o del disco
function findPrettier(file) {
  let dir = path.dirname(file);
  let config = false;
  for (;;) {
    config ||= hasPrettierConfig(dir);
    const bin = prettierBin(dir);
    if (bin) return config ? { bin, root: dir } : null;
    if (fs.existsSync(path.join(dir, '.git'))) return null;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// false solo si el archivo está en HEAD y esa versión no estaba formateada
function wasFormatted(bin, root, file) {
  const git = spawnSync('git', ['show', `HEAD:./${path.basename(file)}`], {
    cwd: path.dirname(file), encoding: 'utf8', windowsHide: true, timeout: 5000, maxBuffer: 20 * 1024 * 1024,
  });
  if (git.status !== 0) return true;
  const check = spawnSync(process.execPath, [bin, '--check', '--stdin-filepath', file], {
    ...OPTIONS, cwd: root, input: git.stdout, stdio: ['pipe', 'ignore', 'ignore'],
  });
  return check.status === 0;
}

async function main() {
  const event = JSON.parse(await readStdin());
  const file = String(event.tool_input?.file_path ?? '');
  if (!EXTENSIONS.test(file)) return;
  const absolute = path.resolve(event.cwd ?? process.cwd(), file);
  const found = findPrettier(absolute);
  if (!found || !wasFormatted(found.bin, found.root, absolute)) return;
  spawnSync(process.execPath, [found.bin, '--write', absolute], { ...OPTIONS, cwd: found.root });
}

main().catch(() => {});
