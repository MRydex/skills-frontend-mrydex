# Changelog

Cambios de la skill `desarrollo-buenas-practicas` y del instalador `skills-frontend-mrydex`.
Para actualizar en un proyecto: `npx skills-frontend-mrydex@latest`.

## [Unreleased]

## [1.32.0] - 2026-10-28

Actualizacion de version

### Skill `desarrollo-buenas-practicas`

- Microfrontends (§17):
  - Librería compartida opcional: cada regla que la usa trae su alternativa sin ella (auth por input
    `obtenerToken`, exclusión de errores por prefijo, íconos del remote con prefijo propio).
  - `shared`: shell y remotes con la misma estrategia y la cadena completa de librerías con DI; la poda
    de `ignoreUnusedDeps` también saca lo declarado explícito (verificar en `remoteEntry.json`).
  - Versiones: cuenta la instalada, no el rango; script para comparar; diferencia v3 / v4.
  - Auth: Bearer al API del remote, sus errores fuera del manejo global del shell, "Cerrar sesión"
    oculto embebido, audiencia del shell aceptada en el back del remote.
  - Cliente OIDC: `customUrlValidation` primero; `allowedUrls` con `/` final; nunca
    `sendAccessToken: true` sin lista ni validación.
  - Widget oculto con `display: none` (con `opacity` / `visibility` sigue en el layout y `@defer (on viewport)` carga igual).
  - Remote autosuficiente: contrato mínimo del shell; estilos globales en el componente expuesto,
    acotados con `meta.load-css`; clase de overlay en todo overlay; íconos nuevos a la librería.
  - Nueva §17.13 "Diagnóstico por síntoma" (`NG0201`, `NG0912`, builder no encontrado, cache de
    federation, cuadrado en lugar de ícono, 404 de recursos opcionales). Verificación pasa a §17.14 y
    Antipatrones a §17.15.
  - Verificación, antipatrones y checklist al día.
- Tiempo real (§16.9): token del hub de un remote embebido desde el auth compartido del shell o, sin él, de un input `obtenerToken`.
- Entorno (§10): contrato de respuesta envuelta con nombre de ejemplo genérico.

## [1.31.0] - 2026-10-27

Primera versión publicada con historial unificado.

### Skill `desarrollo-buenas-practicas`

- `SKILL.md` liviano: Paso 0 (graphify), reglas que más se violan, modo de operación del agente,
  stack, índice de referencias y alcance (los ejemplos son convenciones, no el código del proyecto).
- Angular 22+ zoneless y signals, sin `effect()`; Resource API (`resource`, `rxResource`,
  `httpResource`, `snapshot`); Signal Forms con `[formField]`; `inject()`; naming sin sufijos en
  componentes, servicios y directivas (pipes, guards, resolvers e interceptors sí, como el CLI).
- Referencias `01`–`17` y `checklists.md`: estructura por zona de acceso, TypeScript y signals,
  templates, Resource API, HTTP e interceptores, Signal Forms, SCSS con BEM y tokens, sin archivos de
  test, performance, entorno y tooling, flujo de trabajo, HTML5 semántico y SEO, CSS3 y animaciones,
  eficiencia del agente, seguridad Red/Blue Team, tiempo real con SignalR y microfrontends con Native
  Federation v4.
- Revisión según riesgo (trivial / medio / alto), auditoría de seguridad por áreas (§15.14) y
  `npm audit` al empezar y tras cada cambio de dependencias.
- Delegación a subagentes solo cuando baja el total de tokens; compactar propuesto al ~30%.
- APIs verificadas contra los paquetes de Angular 22.2.

### Instalador

- `npx skills-frontend-mrydex`: skill global (Claude Code, Codex, Antigravity) y en el repo; archivos
  puente `CLAUDE.md`, `AGENTS.md` y `.cursorrules`; entradas de IA en `.gitignore`.
- Graphify (CLI, integración por agente, modo estricto en Claude Code, hooks git y primer grafo), uv
  sin admin cuando falta Python, caveman, subagentes y bloque global en `CLAUDE.md` / `AGENTS.md` /
  `GEMINI.md`.
- Herramientas del agente: Headroom, plugins `claude-code-setup` y `claude-security`, MCP `context7`,
  `permissions.deny` de secretos, skills externas (`security-audit`, ponytail, agent-skills, skills
  web de animación y UI).
- Volver a correrlo actualiza todo lo que instala.
- `--doctor` (chequeo de solo lectura) y `--dry-run`.

### Seguridad

- El instalador no escribe a través de symlinks ni junctions dentro del repo.
