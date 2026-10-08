# Changelog

Cambios de la skill `desarrollo-buenas-practicas` y del instalador `skills-frontend-mrydex`.
Para actualizar en un proyecto: `npx skills-frontend-mrydex@latest`.

## [Unreleased]

### Corregido
- §6.10: el archivo del modelo se llama `contacto-form.ts`, sin sufijo `.model` (§1.3).

## [1.21.0] - 2026-10-08

### Agregado
- **Formulario reutilizable con campos envoltorio** (`references/06-signal-forms.md` §6.10):
  - Un solo `app-campo` genérico con `<ng-content>`. Pone etiqueta, asterisco y error, y los lee
    del `FieldTree`. Tiene slots `[campoAyuda]` y `[campoNota]`. No hay un envoltorio por control
    ni inputs que repitan atributos del control.
  - El formulario hijo tiene el modelo, el schema y el payload (`Omit` para los campos solo de UI).
    Su API pública es mínima: inputs, un `output` y `enviar()` / `limpiar()`.
  - Precarga con `linkedSignal`, `hidden()` con `valueOf()` y `@if (!campo().hidden())`, y
    `submission` en `form()` siempre que se use `[formRoot]`.
  - Layout con BEM + CSS Grid en px, sin `row` / `col-md-*`, `style` inline ni `::ng-deep`.
- **Librería de componentes, en orden**: NG-ZORRO si está instalado; si no, Angular Material; si no,
  controles propios. Una sola librería por formulario. Está en `SKILL.md`, §6.9, §6.10 y
  `checklists.md`.
- `checklists.md` tiene ítems nuevos de formularios: envoltorio genérico, librería, cero `effect()`
  y `hidden`.

### Cambiado
- **Cero `effect()` en formularios.** La tabla de `02-typescript-signals.md` suma dos casos:
  - limpiar un campo cuando cambia otro: opciones con `computed()` y, si igual puede quedar
    inválido, `validate()` / `validateTree()`;
  - mostrar u ocultar un campo: `hidden()` / `disabled()` / `readonly()`.
- §6.3: el submit **no** se deshabilita si el form puede arrancar inválido sin que el usuario haya
  tocado nada (precarga, filtros guardados). En ese caso el error no se ve: `submit()` marca todo
  como `touched` y `onInvalid` lleva el foco al primer error.

## [1.20.0] - 2026-10-05

### Agregado
- **Skills externas, siempre en su última versión.** El instalador agrega globalmente, con
  `npx skills add`, estas skills:
  - `security-audit` de [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill);
  - las skills web de [emilkowalski/skills](https://github.com/emilkowalski/skills): `animate`,
    `animation-vocabulary`, `break-ui`, `emil-design-eng`, `find-animation-opportunities`,
    `improve-animations`, `pick-ui-library`, `prototype` y `review-animations`. No incluye las de
    Swift, Expo, mobile nativo, Apple ni Sonner (React).
  - `--no-external-skills` saltea este paso.
- **`/batch` para cambios grandes** (`references/14-agent-efficiency.md` §14.3.4 y §14.7). Para un
  cambio en todo el codebase que se divide en 5 o más unidades independientes, el agente propone
  `/batch <instrucción>`. Corre un subagente por unidad, cada uno en su propio worktree. Cada unidad
  se verifica con build y lint, sin tests nuevos.

### Cambiado
- **Umbral de delegación unificado.** El `ejecutor` se usa para ediciones mecánicas en 8 o más
  archivos en todos los archivos: `AGENTS.md`, `.cursorrules`, `CLAUDE.md` y la descripción del
  subagente. Antes, algunos todavía decían 3 o más.
- `templates/CLAUDE.md` ya no pide delegar siempre: delega solo cuando baja el total de tokens.
- **Avisos de estado.** El agente escribe una línea de estado al empezar cada fase o antes de un paso
  largo. Sigue sin narrar cada tool call.
- **Sin topes numéricos de largo.** Se quitaron "máximo ~8 viñetas" del reporte final y los límites
  de líneas de los subagentes. El reporte final dice solo qué cambió, qué falló y qué decide el
  usuario.
- **`effect()` prohibido sin excepciones.** Antes `SKILL.md`, `checklists.md` y `CLAUDE.md` decían
  "nunca para sincronizar estado". Ahora dicen "nunca", igual que `02-typescript-signals.md`.
- Los subagentes de Gemini CLI usan el alias `flash` en lugar de `gemini-3-flash-preview`.
- Se quitó el "MUST" de `.cursorrules`.

### Corregido
- Los ejemplos de `13-css3-layouts-animations.md` §13.19 y §13.20 usaban `transition: all`, que el
  mismo archivo desaconseja. Ahora nombran las propiedades que animan.

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
