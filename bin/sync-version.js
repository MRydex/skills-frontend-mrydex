const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');
const skillPath = path.join(__dirname, '..', 'skills', 'desarrollo-buenas-practicas', 'SKILL.md');

if (fs.existsSync(skillPath)) {
  let content = fs.readFileSync(skillPath, 'utf8');
  content = content.replace(/^version: .*/m, `version: ${pkg.version}`);
  fs.writeFileSync(skillPath, content, 'utf8');
  console.log(`Sincronizada la versión de SKILL.md a v${pkg.version}`);
}

