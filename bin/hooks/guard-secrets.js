#!/usr/bin/env node

/**
 * Hook PreToolUse de Claude Code (Edit | Write | MultiEdit), compartido por skills-frontend-mrydex
 * y skills-backend-mrydex: frena la escritura de secretos en archivos del repo (§15 front, §11 back).
 * Revisa solo el texto nuevo. Ignora Markdown (las referencias traen ejemplos) y valores que son
 * placeholders (`${VAR}`, `<valor>`, `#{token}#`, `__VAR__`, `{{var}}`, `{0}`, `%VAR%`).
 * Ante un error propio no bloquea: un hook roto no debe frenar el trabajo.
 */

// `{0}` / `{host}` cubren string.Format e interpolación de C#; `%VAR%`, variables de Windows
const PLACEHOLDER = /^(\$\{|\$\(|<|#\{|__|\{\{|\{[\w.:]+\}|%[A-Za-z_]\w*%|\*{3})/;

// [descripción, regex, índice del grupo con el valor (0 = el match entero no se chequea como placeholder), opciones]
// code: la regla también matchea código, así que `(` o `[` en el valor indica código o regex, no un secreto.
// text: un valor solo de letras y espacios es un texto de UI (`"Contraseña"`), no un secreto.
const RULES = [
  ['clave privada', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/, 0],
  ['token de npm en .npmrc', /(?:^|:)_(?:authToken|auth|password)\s*=\s*(\S+)/m, 1],
  // Connection strings en cualquier orden: `...;Password=x` o `"Password=x;...` (sin espacios, pegado
  // a `;`). No matchea código: `Password = request.Password,`, `password = signal('')`.
  ['contraseña en connection string', /;[ \t]*(?:Password|Pwd)[ \t]*=[ \t]*([^;"'\s]+)/i, 1],
  ['contraseña en connection string', /(?:^|["'])(?:Password|Pwd)=([^;"'\s]+);/im, 1],
  ['contraseña en JSON', /"(?:Password|Pwd)"\s*:\s*"([^"]+)"/i, 1, { text: true }],
  // Literal en código: `Password = "x..."` (C#), `password: 'x...'` (TS), `ApiKey = "..."`
  ['contraseña o API key literal', /\b(?:Password|Pwd|ApiKey|Api_Key)\s*[:=]\s*["']([^"'\s]{8,})["']/i, 1, { code: true }],
  ['clave de Azure Storage', /AccountKey\s*=\s*([A-Za-z0-9+/=]{20,})/, 1],
  ['clave de Service Bus / Event Hubs', /SharedAccessKey\s*=\s*([A-Za-z0-9+/=]{20,})/, 1],
  ['client secret', /(?:client_?secret|clientsecret)["']?\s*[:=]\s*["']([^"']{8,})["']/i, 1, { code: true }],
  ['access key de AWS', /\bAKIA[0-9A-Z]{16}\b/, 0],
  ['token de GitHub', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_\w{50,})/, 0],
  ['token de Slack', /\bxox[abprs]-[A-Za-z0-9-]{10,}/, 0],
];

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

function newText(input) {
  if (typeof input.content === 'string') return input.content;
  if (typeof input.new_string === 'string') return input.new_string;
  if (Array.isArray(input.edits)) return input.edits.map((e) => e?.new_string ?? '').join('\n');
  return '';
}

function looksLikeSecret(value, opts) {
  if (PLACEHOLDER.test(value)) return false;
  // Valor que empieza con `(` o `[`: un regex (`/;Password=([^;]+)/`), no un secreto. En reglas que
  // también matchean código, cualquier `(` o `[` indica una llamada o un índice.
  if (opts.code ? /[([]/.test(value) : /^[([]/.test(value)) return false;
  return !(opts.text && /^[\p{L}\s.]+$/u.test(value));
}

function findSecret(text) {
  // Todas las coincidencias: un placeholder antes no tapa un secreto real después
  for (const [label, regex, group, opts = {}] of RULES) {
    for (const match of text.matchAll(new RegExp(regex.source, `${regex.flags}g`))) {
      if (!group) return label;
      const value = match[group].replace(/^["']/, '');
      if (looksLikeSecret(value, opts)) return label;
    }
  }
  return null;
}

async function main() {
  const event = JSON.parse(await readStdin());
  const input = event.tool_input ?? {};
  const file = String(input.file_path ?? '');
  if (/\.(md|mdx)$/i.test(file)) return;
  const label = findSecret(newText(input));
  if (!label) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `guard-secrets: el cambio en ${file || 'el archivo'} trae un posible secreto (${label}). `
        + 'No lo escribas en el repo: usá una variable de entorno, user-secrets, Key Vault o la variable secreta del pipeline, '
        + 'y dejá un placeholder como ${VARIABLE}. Si es un falso positivo, avisale al usuario.',
    },
  }));
}

main().catch(() => {});
