#!/usr/bin/env node

/**
 * Chequeo del paquete, compartido por skills-frontend-mrydex y skills-backend-mrydex (mismo archivo
 * en los dos). Sin argumentos revisa lo local: links y anclas de los .md, referencias `§N.M`, índice de
 * SKILL.md, versión y subagentes citados. Con `--online` suma GitHub: cada skill externa que instala
 * `bin/cli.js` existe en su repo y no es un envoltorio que delega en otra skill que no se instala
 * (así se rompió `grill-me`). Sale con 1 si algo falla. Uso: `npm test` o `node bin/check.js --online`.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skillDir = fs.readdirSync(path.join(root, 'skills')).map((name) => path.join(root, 'skills', name))
  .find((dir) => fs.existsSync(path.join(dir, 'SKILL.md')));
const read = (file) => fs.readFileSync(file, 'utf8');
const rel = (file) => path.relative(root, file).replace(/\\/g, '/');
const failures = [];
let checks = 0;
const check = (ok, message) => { checks++; if (!ok) failures.push(message); };

function walk(dir, ext) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, ext);
    return full.endsWith(ext) ? [full] : [];
  });
}

const stripCode = (text) => text.replace(/```[\s\S]*?```/g, '');
// Mismo slug que GitHub para los encabezados
const slug = (heading) => heading.trim().toLowerCase().replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}\- ]/gu, '').replace(/ /g, '-');
const headings = (file) => stripCode(read(file)).split(/\r?\n/).filter((line) => /^#{1,6} /.test(line)).map((line) => line.replace(/^#+/, '').trim());

const docs = [...walk(skillDir, '.md'), path.join(root, 'README.md'), path.join(root, 'FUENTES.md')];
const code = walk(path.join(root, 'bin'), '.js').filter((file) => file !== __filename);

// 1. Links relativos y anclas
for (const file of docs) {
  for (const [, target] of stripCode(read(file)).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:)/.test(target)) continue;
    const [filePart, anchor] = target.split('#');
    const dest = filePart ? path.join(path.dirname(file), filePart) : file;
    check(fs.existsSync(dest), `${rel(file)}: link roto ${target}`);
    if (anchor && !/^L\d+/.test(anchor) && fs.existsSync(dest) && dest.endsWith('.md')) {
      check(headings(dest).map(slug).includes(anchor), `${rel(file)}: ancla rota ${target}`);
    }
  }
}

// 2. `§N.M` apunta a un encabezado numerado (`§08` nombra un archivo, no una sección)
const sections = new Set(docs.flatMap(headings).map((heading) => /^(?:§\s*)?(\d+(?:\.\d+)*)\.?\s/.exec(heading)?.[1]).filter(Boolean));
// Secciones de la skill hermana que se citan a propósito ("skill front §10.14")
const SIBLING_SECTIONS = new Set(['2.11', '10.14', '16.11']);
for (const file of [...docs, ...code, ...walk(path.join(root, 'templates'), '')]) {
  for (const [, number] of read(file).matchAll(/§\s?(\d+(?:\.\d+)+)\b/g)) {
    const known = sections.has(number) || [...sections].some((section) => section.startsWith(`${number}.`)) || SIBLING_SECTIONS.has(number);
    check(known, `${rel(file)}: §${number} no existe`);
  }
}

// 3. SKILL.md lista cada referencia y su versión es la del paquete
const skill = read(path.join(skillDir, 'SKILL.md'));
for (const file of fs.readdirSync(path.join(skillDir, 'references'))) check(skill.includes(file), `SKILL.md no lista references/${file}`);
const { version } = JSON.parse(read(path.join(root, 'package.json')));
check(new RegExp(`version:\\s*"?${version.replace(/\./g, '\\.')}`).test(skill), `SKILL.md no tiene la versión ${version}`);

// 4. Archivos de referencia nombrados en código y templates
for (const file of [...code, ...walk(path.join(root, 'templates'), '')]) {
  for (const [, name] of read(file).matchAll(/references\/([0-9a-z-]+\.md)/g)) {
    check(fs.existsSync(path.join(skillDir, 'references', name)), `${rel(file)}: references/${name} no existe`);
  }
}

// 5. Subagentes citados están definidos (los del paquete hermano se nombran a propósito)
const defined = new Set([...read(path.join(root, 'bin', 'subagents.js')).matchAll(/^\s{4}name: '([a-z0-9-]+)'/gm)].map((match) => match[1]));
const SIBLING_AGENTS = ['ejecutor', 'revisor-checklist', 'migrador-angular', 'ejecutor-backend', 'revisor-checklist-backend'];
for (const file of [...docs, ...code]) {
  for (const [, name] of read(file).matchAll(/`((?:investigador|ejecutor|revisor|auditor|migrador|generador|operador)[a-z0-9_-]*)`/g)) {
    const agent = name.replace(/_/g, '-');
    check(defined.has(agent) || SIBLING_AGENTS.includes(agent), `${rel(file)}: subagente \`${name}\` no está definido`);
  }
}

// 6. --online: las skills externas existen y no delegan en una que no se instala
function skillLists() {
  const source = read(path.join(root, 'bin', 'cli.js'));
  return ['SECURITY_SKILLS', 'EXTERNAL_SKILLS'].flatMap((name) => {
    const start = source.indexOf(`const ${name} = [`);
    if (start < 0) return [];
    const from = source.indexOf('[', start);
    // eslint-disable-next-line no-new-func
    return new Function(`return ${source.slice(from, source.indexOf('\n];', from) + 2)}`)();
  });
}

async function online() {
  for (const { repo, skills } of skillLists()) {
    const response = await fetch(`https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`, { headers: { 'User-Agent': 'skills-check' } });
    if (!response.ok) {
      check(false, `${repo}: GitHub respondió ${response.status}`);
      continue;
    }
    const files = (await response.json()).tree.filter((item) => /(^|\/)SKILL\.md$/.test(item.path));
    const byName = new Map(files.map((item) => [path.posix.basename(path.posix.dirname(item.path)), item]));
    for (const name of skills) {
      if (name === '*') continue;
      const item = byName.get(name);
      check(Boolean(item), `${repo}: la skill ${name} ya no existe`);
      if (!item || item.size >= 400) continue;
      // SKILL.md mínimo: suele ser un envoltorio que llama a otra skill
      const text = await (await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/${item.path}`)).text();
      const target = /Skill tool with ["'`]([a-z0-9-]+)["'`]/.exec(text)?.[1];
      check(!target || skills.includes(target), `${repo}: ${name} delega en ${target}, que no se instala`);
    }
  }
}

(process.argv.includes('--online') ? online() : Promise.resolve()).then(() => {
  for (const failure of failures) console.log(`✗ ${failure}`);
  console.log(`check: ${checks - failures.length}/${checks} OK`);
  process.exit(failures.length ? 1 : 0);
});
