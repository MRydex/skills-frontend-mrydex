# Fuentes a repasar en "revisar y actualizar" (skills-frontend-mrydex)

Cuando el pedido es revisar, actualizar o poner al día la skill o el instalador, se repasan **todas** las filas,
no solo las que el pedido nombra.

Por cada fila:

1. Mirar qué cambió en la fuente desde la fecha de "Último repaso".
2. Volcar a la referencia solo lo que falta y sirve en una app Angular con librería de UI. Como texto, sin instalar nada nuevo.
3. Anotar el cambio en `CHANGELOG.md`.
4. Poner la fecha de hoy en "Último repaso".

Al terminar, decir qué filas se repasaron y cuáles no, con el motivo. Si aparece una fuente nueva, sumar su fila acá.

| Fuente | Qué mirar | Dónde impacta | Último repaso |
|---|---|---|---|
| Angular: releases, angular.dev, blog | Versión objetivo (hoy Angular 22, TypeScript 6, Node), APIs nuevas, estables o deprecadas, schematics de migración | `SKILL.md`, `01` a `06`, `09`, `17`, `20`, `checklists.md` | 2026-11-21 |
| Avisos de seguridad de `@angular/*` y de los paquetes npm nombrados (GHSA, CVE) | Versiones mínimas con parche | `15` (§15.6), `18`, `19` | sin fecha |
| [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) | Guías nuevas o cambiadas desde el último repaso (75 revisadas). Fuera de alcance: built-in AI, WebMCP, wasm, PWA | `07`, `09`, `12`, `13`, `15` | 2026-11-11 |
| MDN y Baseline | Fechas de Baseline citadas (`grep -rn Baseline skills/`), APIs que pasaron a Baseline y ya no piden `@supports` | `02`, `07`, `09`, `12`, `13`, `15`, `checklists.md` | sin fecha |
| developer.chrome.com y CSSWG (scroll-driven, anchor positioning, `base-select`, view transitions) | Cambios de sintaxis y de soporte | `13` | sin fecha |
| Librerías Angular y de archivos nombradas en `18` y `19`, SignalR en `16` | Versiones, APIs deprecadas, reemplazos | `16`, `18`, `19` | sin fecha |
| Skills externas: cada repo de `EXTERNAL_SKILLS` en `bin/cli.js` (caveman, cloudflare/security-audit-skill, mukul975/Anthropic-Cybersecurity-Skills, SnailSploit/claude-red, emilkowalski/skills, vercel-labs/agent-skills, vercel-labs/agent-browser, mattpocock/skills, vercel-labs/skills, DietrichGebert/ponytail, addyosmani/agent-skills) | Skills nuevas, renombradas o quitadas; cambios en cómo se instalan | `bin/cli.js`, `14` (§14.9), `README.md`, `templates/` | sin fecha |
| Plugins de Claude Code: `caveman@caveman`, `claude-code-setup` y `claude-security` de anthropics/claude-plugins-official | Nombres, comandos, skills que traen (`UNUSED_SKILLS`) | `bin/cli.js`, `14`, `templates/` | sin fecha |
| Herramientas: graphify (PyPI `graphifyy`), context7 (MCP), uv, CLI `agent-browser` | Comandos de instalación, flags, cambios que rompen | `bin/cli.js`, `10`, `14`, `templates/` | sin fecha |
| Docs de agentes: Claude Code (sub-agents, advisor), platform.claude.com (advisor tool, multiagent), guía de modelos de claude.dev, Codex, Cursor, OpenCode, Gemini CLI, Antigravity, Copilot | Formato de subagentes y de instrucciones por agente, modelos vigentes | `14`, `templates/`, `bin/cli.js` | sin fecha |
| Seguridad: feed `radar.cloudflare.com/zero-wire/rss`, cloudflare/security-audit-skill | Que el feed siga vivo, reglas nuevas | `15` | sin fecha |
| [drona23/claude-token-efficient](https://github.com/drona23/claude-token-efficient) | Reglas nuevas en `CLAUDE.md` y `profiles/`, resultados de `benchmark/`. Solo sirve lo que el benchmark mide con efecto; descartados: hook `PreCompact`, presupuesto de tool calls, reglas de formato | `14`, `15` (§15.10) | 2026-11-21 |
| [NiazMorshed2007/reanimate](https://github.com/NiazMorshed2007/reanimate) (no va en el instalador: se propone a pedido) | Comando de instalación, requisitos (Bun, soporte de Windows), si cambia de nombre | `13` (§13.31), `14` (§14.9) | 2026-11-22 |
| Repo hermano `skills-backend-mrydex` | Lo común (instalador, `14`, `templates/`, bloque global) igual en los dos | `bin/cli.js`, `14`, `templates/` | sin fecha |
