# Changelog

Cambios de la skill `desarrollo-buenas-practicas` y del instalador `skills-frontend-mrydex`.
Para actualizar en un proyecto: `npx skills-frontend-mrydex@latest`.

## [1.19.0] - 2026-10-01

### Agregado
- **Auditoría de dependencias obligatoria** (`references/15-security.md` §15.10). El agente corre
  `npm audit` y `npm audit --omit=dev` por su cuenta, sin esperar al CI:
  - al empezar en un proyecto, junto con graphify;
  - después de cualquier cambio en `package.json` o `package-lock.json`;
  - antes de cerrar una tarea que tocó dependencias.
- Reglas para el resultado del audit:
  - Reporta todos los hallazgos: severidad, paquete, origen y si hay fix.
  - Un `high` o `critical` de runtime bloquea la entrega.
  - `npm audit fix` solo si la tarea toca dependencias o se pide.
  - Nunca `npm audit fix --force` sin preguntar, porque instala versiones mayores.
  - Sin fix disponible, propone una salida (`overrides`, reemplazar o quitar la dependencia) y espera aprobación.

### Cambiado
- La regla de seguridad de `SKILL.md` y de los archivos puente (`CLAUDE.md`, `AGENTS.md`,
  `.cursorrules`) incluye la auditoría de dependencias.
- El ítem de dependencias de `checklists.md` pide el audit después del último cambio de dependencias.

## [1.18.0] - 2026-09-30

### Cambiado
- `VersionCheck` (aviso de deploy, `references/10-environment-tooling.md`) ya no usa RxJS: usa
  `setInterval`, `addEventListener` y el signal `router.currentNavigation()`, con el estado en signals.
- La carga inicial de `AppSettings` en `provideAppInitializer` usa `.catch(() => undefined)` en vez de
  `.pipe(catchError(() => EMPTY))`.

## [1.17.0] - 2026-09-30

### Cambiado
- **Estructura de proyecto por zona de acceso** (`references/01-project-structure.md`), igual a la del
  proyecto base `angular-template`:
  - `protected/`: auth OpenID, login y páginas de error.
  - `private/`: los módulos de negocio, detrás del `authGuard`.
  - `interceptors/`: interceptores HTTP y providers globales (locale `es-AR`).
  - `shared/`: lo que usan varios módulos.
- Las dependencias van de `private/` a `shared/`, nunca al revés. Un módulo nunca importa de otro módulo.
- Las rutas hijas (pestañas) de un componente de ruta van en su carpeta `pages/`.
- Las implementaciones de servicios abstractos de la librería se llaman `concrete-[tema].ts`.
  Si las usa toda la app, van en `shared/services/libreria/`.

### Agregado
- **Alias `@/`** para imports (`"@/*": ["./src/*"]` en `tsconfig.json`). Nunca `../../../..`.
  Dentro de la misma carpeta se sigue usando `./`.
- **Configuración en runtime con `src/appsettings.json`** (`references/10-environment-tooling.md`):
  - `AppSettingsHttp`: lee el archivo con `fetch`, sin pasar por los interceptores.
  - `AppSettings`: guarda la configuración en un signal.
  - `VersionCheck`: detecta un deploy y muestra un modal "Nueva versión disponible".
    También reacciona a errores de carga de chunks lazy.
  - `npm run sync-version` copia la versión de `package.json` a `appsettings.json` antes de cada build.
- `.prettierrc` del equipo documentado (`printWidth: 160`, `singleQuote`, parser `angular` para HTML).

### Cambiado (menor)
- Ejemplos de `02-typescript-signals.md`, `05-http-interceptors.md`, `09-performance-zoneless.md` y
  `15-security.md` actualizados a las rutas nuevas.

## [1.16.0] - 2026-09-29

### Cambiado
- Tabla de agentes (`references/14-agent-efficiency.md`): datos de Gemini CLI. Cambio de modelo con
  `/model` o `--model`. El modelo `auto` (default) elige Flash o Pro según la complejidad.
  Pro requiere plan pago.

## [1.15.0] - 2026-09-28

### Agregado
- **Regla de alcance** en `SKILL.md`:
  - Los ejemplos de la skill son convenciones, no el código del proyecto. El agente describe la app
    solo con lo que existe en el repo.
  - Las reglas aplican al código que se escribe o modifica. Las librerías externas no se juzgan ni se
    renombran.
  - La skill no es motivo para negarse a un pedido. El agente hace lo pedido y propone la alternativa
    en una línea. Única excepción: seguridad.
- `references/11-workflow-orchestration.md`: resolver exactamente lo pedido, sin reescribir la
  arquitectura por cuenta propia.
