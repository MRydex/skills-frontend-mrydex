# Changelog

Cambios de la skill `desarrollo-buenas-practicas` y del instalador `skills-frontend-mrydex`.
Para actualizar en un proyecto: `npx skills-frontend-mrydex@latest`.

## [Unreleased]

### Instalador

- `-t <ruta>` ya no borra una carpeta con contenido que no es una instalación de la skill (ej. `-t .`).
- `--bridge` no pisa un `CLAUDE.md`, `AGENTS.md` o `.cursorrules` propio del proyecto.
- El bloque de `~/.claude/CLAUDE.md` con un marcador sin su par no se toca (antes podía borrar texto).
- README: árbol de referencias completo.

## [1.32.2] - 2026-10-29

### Skill `desarrollo-buenas-practicas`

- Auditoría de calidad (§11.9, regla 10): suma las áreas Legibilidad y mantenimiento (`madge
  --circular`, reglas `complexity` y `max-depth` de ESLint), Escalabilidad e Instrucciones de
  agentes (`/doctor prompt-audit`: reglas para modelos viejos, referencias rotas, contradicciones,
  `CLAUDE.md` de más de 200 líneas). Eficiencia prioriza por impacto medido: sin
  micro-optimizaciones que empeoren la legibilidad.
- Chequeo antes de entregar (§11.7.1): forma más simple, aprobaría un staff engineer, qué se
  rompe primero y `tasks/lessons.md` actualizado.
- Bug con evidencia: directo a reproducir y a la causa raíz, sin pedir guía (§11.6).
- Lecciones con línea `Chequeo` para detectar el error antes (§11.8).

### Instalador

- `readClaudeSettings` único para leer `~/.claude/settings.json` (antes, 5 copias). `--doctor`
  ya no falla y los permisos de graphify ya no rompen la instalación si el archivo contiene `null`
  o un array.

## [1.32.1] - 2026-10-29

### Skill `desarrollo-buenas-practicas`

- Auditar = control de calidad completo (§11.9, regla 10): calidad, eficiencia, dependencias,
  código duplicado y sin uso, con tabla de cobertura por área, candidatos verificados contra uso
  dinámico y correcciones en tandas (borrar sin uso, unificar duplicados, optimizar).
- "Auditá" a secas corre además la auditoría de seguridad completa (§15.14); solo seguridad corre
  solo §15.14; solo calidad suma la seguridad base.
- Auditoría de seguridad red + blue + network (§15.14): modelo de amenazas, TLS, superficie expuesta,
  cabeceras, clickjacking, WebSocket y logs; pruebas en vivo solo contra hosts autorizados.
- `npm audit` en la auditoría: corrige vulnerabilidades, reverifica con `npm ci`, build y
  `npm audit` de nuevo (§11.9, §15.10).
- CSS: medios sin layout shift con `aspect-ratio` + `object-fit` (§13.26), `dvh`/`svh`/`lvh`
  (§13.27), gráficos con `conic-gradient()` (§13.28), contadores con `@property` + `counter()`
  (§13.29).
- Rendimiento: cruce de listas con `Set`/`Map` en vez de `find`/`some` en loop (§9.10).
- `localStorage` con vencimiento y lectura defensiva (§15.8).

### Instalador

- Skills de network y Blue Team (TLS, cabeceras, host header, cache poisoning, clickjacking,
  WebSocket, nmap, logs, threat modeling) y `offensive-tls-attacks`, `offensive-network-attacks`.

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
