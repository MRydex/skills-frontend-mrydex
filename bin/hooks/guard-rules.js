#!/usr/bin/env node

/**
 * Hook Stop de Claude Code de skills-frontend-mrydex: revisa lo que cambió en el turno contra las
 * reglas de la skill que más se violan. Solo en repos Angular (`@angular/core` en el `package.json`
 * de la raíz) y solo sobre líneas agregadas (`git diff HEAD`) y archivos nuevos: el código legacy
 * que no se editó no se toca. Si encuentra algo devuelve `{"decision":"block"}` con la lista, una
 * sola vez por turno (`stop_hook_active`). Sin hallazgos no imprime nada ni gasta tokens.
 *
 * Manual, otros agentes o CI: `node guard-rules.js --reporte` imprime los hallazgos y sale con 1.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EXTENSIONS = new Set(['.ts', '.html', '.scss']);
const IGNORED = /(^|\/)(node_modules|dist|\.angular|\.claude|\.agents|graphify-out)\//;
const LIMITS = { component: 200, html: 200, service: 250, scss: 150 };
const FORMS_MSG = 'usar Signal Forms (06)';

// Reglas por línea agregada: [extensiones, regex, mensaje, versión mínima de Angular]
const LINE_RULES = [
  [['.ts'], /(^|[^\w.])effect\s*\(/, 'effect(): computed / linkedSignal / resource, salvo las excepciones de 02 §2.7'],
  [['.ts'], /new\s+BehaviorSubject\b/, 'BehaviorSubject como estado: usar signal (02)'],
  [['.ts'], /\b(FormGroup|FormControl|FormBuilder|UntypedForm\w*|ReactiveFormsModule|FormsModule)\b/, `Reactive Forms / FormsModule: ${FORMS_MSG}`, 22],
  [['.ts'], /\b(ControlValueAccessor|NG_VALUE_ACCESSOR)\b/, 'ControlValueAccessor propio: usar FormValueControl / FormCheckboxControl (06 §6.9)', 22],
  [['.html'], /\[\(?ngModel\)?\]|\(ngModelChange\)|formControlName|\[formGroup\]/, `ngModel / Reactive Forms en el template: ${FORMS_MSG}`, 22],
  [['.html'], /\*ng(If|For|Switch)\b|\[ng(Class|Style)\]/, 'Directiva legacy: @if / @for / @switch y [class.x] / [style.x] (03)', 17],
  [['.ts'], /@(Input|Output)\s*\(/, '@Input / @Output: usar input() / output() (02)', 17],
  [['.html'], /\sstyle="/, 'style inline: va en el SCSS del componente con BEM (07)'],
  [['.html'], /class="[^"]*\b(row|col(-(xs|sm|md|lg|xl))?-\d{1,2})\b/, 'Grilla utilitaria (row / col-*): BEM + CSS Grid en el SCSS (07)'],
  [['.scss'], /::ng-deep/, '::ng-deep: theming o clases globales con prefijo (07)'],
  [['.ts'], /standalone:\s*true/, 'standalone: true sobra desde v19', 19],
  [['.ts'], /ChangeDetectionStrategy\.OnPush/, 'OnPush es el default desde v22: no declararlo', 22],
];

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return result.status === 0 ? result.stdout : '';
}

function angularMajor(root) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const major = /(\d+)/.exec(pkg.dependencies?.['@angular/core'] ?? pkg.devDependencies?.['@angular/core'] ?? '');
    return major ? Number(major[1]) : null;
  } catch {
    return null;
  }
}

// { archivo: [{ line, text }] } con las líneas agregadas respecto de HEAD, más los archivos nuevos enteros
function addedLines(root) {
  const changes = {};
  let file = null;
  let line = 0;
  for (const row of git(['diff', 'HEAD', '-U0', '--no-color', '--no-ext-diff'], root).split('\n')) {
    if (row.startsWith('+++ ')) {
      file = row.startsWith('+++ b/') ? row.slice(6) : null;
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(row);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (file && row.startsWith('+')) {
      (changes[file] ??= []).push({ line, text: row.slice(1) });
      line++;
    }
  }
  const untracked = git(['ls-files', '--others', '--exclude-standard'], root).split('\n').filter(Boolean);
  for (const name of untracked) {
    if (!EXTENSIONS.has(path.extname(name)) || IGNORED.test(name)) continue;
    try {
      changes[name] = fs.readFileSync(path.join(root, name), 'utf8').split(/\r?\n/).map((text, i) => ({ line: i + 1, text }));
    } catch {}
  }
  return { changes, untracked: new Set(untracked) };
}

function review(root, angular) {
  const { changes, untracked } = addedLines(root);
  const findings = [];
  const add = (file, line, message) => findings.push(`${file}:${line}: ${message}`);
  // Repo que ya usa sufijos: se respeta su convención (SKILL.md, "Versión y forma del repo")
  const repoUsesSuffixes = /\.(component|service)\.ts$/m.test(git(['ls-files', '*.component.ts', '*.service.ts'], root));

  for (const [file, lines] of Object.entries(changes)) {
    const ext = path.extname(file);
    if (!EXTENSIONS.has(ext) || IGNORED.test(file)) continue;

    if (untracked.has(file)) {
      if (!repoUsesSuffixes && /\.(component|service|directive)\.ts$/.test(file)) add(file, 1, 'Sufijo en el nombre: user-list.ts exporta UserList (01)');
      if (/\/components\//.test(file) && !/(^|\/)shared\/components\//.test(file)) add(file, 1, 'Carpeta components/ fuera de shared/: anidar en la carpeta del padre (01)');
    }

    for (const { line, text } of lines) {
      for (const [exts, regex, message, minMajor = 0] of LINE_RULES) {
        if (exts.includes(ext) && angular >= minMajor && regex.test(text)) add(file, line, message);
      }
    }

    // Tamaño del archivo completo, solo si se tocó
    let content;
    try {
      content = fs.readFileSync(path.join(root, file), 'utf8');
    } catch {
      continue;
    }
    const total = content.split(/\r?\n/).length;
    const limit =
      ext === '.html' ? LIMITS.html :
      ext === '.scss' ? LIMITS.scss :
      /@Component\(/.test(content) ? LIMITS.component :
      /@(Injectable|Service)\(/.test(content) ? LIMITS.service : null;
    if (limit && total > limit) add(file, total, `${total} líneas, máximo ${limit}: dividir por responsabilidad (01 §1.4)`);
  }
  return findings;
}

function readEvent() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

const reportMode = process.argv.includes('--reporte');
const event = reportMode ? {} : readEvent();
const root = git(['rev-parse', '--show-toplevel'], event.cwd || process.cwd()).trim();
const angular = root ? angularMajor(root) : null;
if (angular === null) process.exit(0);

const findings = review(root, angular);

if (reportMode) {
  console.log(findings.length ? findings.join('\n') : 'Sin hallazgos.');
  process.exit(findings.length ? 1 : 0);
}

if (findings.length && !event.stop_hook_active) {
  const reason = [
    'guard-rules (desarrollo-buenas-practicas): el cambio rompe reglas de la skill.',
    ...findings,
    'Corregí cada uno. Si alguno es una excepción que pidió el usuario o una convención que el repo ya tenía, decilo en la respuesta final.',
  ].join('\n');
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}
