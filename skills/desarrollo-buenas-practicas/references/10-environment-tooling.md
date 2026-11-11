## 10. Entorno, tooling y despliegue del equipo

Índice: [10.1](#101-crear-o-actualizar-un-proyecto-con-los-schematics-del-equipo) Schematics ·
[10.2](#102-webconfig-para-hosting-en-iis) `web.config` IIS · [10.3](#103-backend-net--contrato-con-el-front) Contrato .NET ·
[10.4](#104-configuración-en-runtime-vs-environmentts) Config en runtime · [10.5](#105-vs-code--settings-del-equipo) VS Code ·
[10.6](#106-visual-studio-2026-backend-c) Visual Studio · [10.7](#107-graphify-mapa-del-repo-para-asistentes-ai) Graphify ·
[10.8](#108-ai--mcp-server-de-angular-cli) MCP Server de Angular CLI ·
[10.9](#109-archivos-de-ia-en-gitignore) Archivos de IA en `.gitignore` ·
[10.10](#1010-librería-de-ui-setup-de-ng-zorro-22-y-angular-material) Setup de NG-ZORRO 22 y Material ·
[10.11](#1011-i18n-de-angular-solo-apps-multi-idioma) i18n de Angular ·
[10.12](#1012-hooks-de-claude-code-que-instala-el-paquete) Hooks de Claude Code ·
[10.13](#1013-despliegue-basehref-configuraciones-https-local-y-docker) `baseHref`, configuraciones, HTTPS local y Docker ·
[10.14](#1014-actualizaciones-sin-cortar-al-usuario-service-worker) Actualizaciones sin cortar al usuario (Service Worker).

### 10.1 Crear o actualizar un proyecto con los schematics del equipo

Abrir una terminal en la carpeta donde se quiere instalar:

```bash
# 1) CLI de schematics
npm install -g @angular-devkit/schematics-cli

# 2) Template del equipo desde el registry interno (placeholder: usar el registry real del equipo)
npm install @TU-ORGANIZACION/angular-template-schematic --registry https://TU-REGISTRY-NPM-INTERNO

# 3) Generar el proyecto
npx schematics @TU-ORGANIZACION/angular-template-schematic:angular-template-schematic --no-dry-run

# 4) Continuar normal
npm install
npm start
```

Para **actualizar** un proyecto existente al último template:

```bash
ng generate @TU-ORGANIZACION/angular-template-schematic:angular-template-schematic
```

> `@TU-ORGANIZACION` y `TU-REGISTRY-NPM-INTERNO` son placeholders: reemplazar por el nombre de paquete y
> el registry reales del equipo. No hardcodear una URL interna a modo de ejemplo genérico.

### 10.2 `web.config` para hosting en IIS

Config base para servir una SPA de Angular con IIS: excluir las rutas de backend/API de la reescritura,
reenviar todo lo demás a `index.html` (para que el router de Angular resuelva deep links y refrescos de
página), comprimir la respuesta y cachear agresivamente solo los archivos con hash en el nombre.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <!-- Compresión: reduce el peso de JS/CSS/JSON servidos. gzip/brotli según los módulos instalados en IIS. -->
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />

    <staticContent>
      <!-- .json ya viene mapeado de fábrica en IIS: agregarlo de nuevo tira
           "Cannot add duplicate collection entry". Solo hace falta sumar lo que falte, ej. .webmanifest. -->
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />

      <!-- Cache largo por defecto: pensado para los assets con hash en el nombre
           (main-a1b2c3.js, styles-d4e5f6.css) que emite el build de Angular. -->
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
    </staticContent>

    <rewrite>
      <rules>
        <!-- Excluir del rewrite las rutas que resuelve el backend, no Angular.
             Placeholder: "api" y "swagger" son convención común; sumar acá cualquier
             prefijo propio del backend del proyecto (nunca inventarlo a ciegas). -->
        <rule name="Exclude API and Swagger" stopProcessing="true">
          <match url="^(api|swagger|TU-PREFIJO-BACKEND)" />
          <action type="None" />
        </rule>

        <!-- Reescribir todas las demás rutas a index.html: rutas de Angular (deep links,
             F5 en /users/5) no existen como archivo físico y deben resolver en el cliente. -->
        <rule name="Angular Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <!-- Solo si el backend corre como aplicación virtual de IIS bajo el mismo sitio.
                 Placeholder: reemplazar por el path real, o borrar la condición si no aplica. -->
            <add input="{REQUEST_URI}" pattern="^/TU-BACKEND-VIRTUAL-DIR" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>

    <!-- index.html NUNCA debe cachearse: es el único archivo sin hash que referencia
         los bundles con hash. Cachearlo rompe el "cache busting" en cada deploy. -->
    <location path="index.html">
      <system.webServer>
        <staticContent>
          <clientCache cacheControlMode="DisableCache" />
        </staticContent>
        <httpProtocol>
          <customHeaders>
            <add name="Cache-Control" value="no-cache, no-store, must-revalidate" />
          </customHeaders>
        </httpProtocol>
      </system.webServer>
    </location>

    <httpErrors>
      <remove statusCode="403" subStatusCode="-1" />
      <!-- Algunas configuraciones de IIS devuelven 403 (en vez de pasar por el rewrite) para
           rutas tipo directorio sin barra final (ej. /users/5). Se redirige también a index.html. -->
      <error statusCode="403" prefixLanguageFilePath="" path="/index.html" responseMode="ExecuteURL" />
    </httpErrors>
  </system.webServer>
</configuration>
```

> **Seguridad**: sumar las cabeceras de [15-security.md](./15-security.md) §15.9 (HSTS, `nosniff`,
> CSP de servidor, `Referrer-Policy`, `Permissions-Policy`, sin `X-Powered-By`).

**Errores comunes:**
- Agregar `<mimeMap fileExtension=".json" .../>` cuando IIS ya lo trae registrado → error de arranque
  del sitio ("Cannot add duplicate collection entry"). Verificar en `applicationHost.config` antes de
  sumar un mapeo.
- Cachear `index.html` con el mismo `clientCache` que el resto de los estáticos → los usuarios quedan
  con una versión vieja del bundle después de cada deploy, sin forma de invalidarla sin borrar cache
  del navegador.
- Reescribir a `index.html` sin excluir primero las rutas de API → el backend nunca recibe la
  request, todo devuelve el HTML de la SPA con 200.

### 10.3 Backend (.NET) — contrato con el front

- **CORS**: habilitar solo los orígenes del front, nunca `AllowAnyOrigin()` en producción.
  ```csharp
  builder.Services.AddCors(options =>
  {
      options.AddPolicy("Front", policy =>
          policy.WithOrigins("https://TU-DOMINIO-FRONT") // placeholder: dominio real por entorno
                .AllowAnyHeader()
                .AllowAnyMethod());
  });
  // ...
  app.UseCors("Front"); // después de UseRouting(), antes de UseAuthorization() y del mapeo de endpoints
  ```
- **Parámetros de un GET**:
  ```csharp
  public async Task<IActionResult> Get([BindRequired, FromQuery] string param1, [FromQuery] int param2)
  ```
  - `BindRequired` → el parámetro es **obligatorio**.
  - `?` o `= valor` → lo hace **opcional** o con valor por defecto.
- **Errores como `ProblemDetails` (RFC 9457)**: las respuestas de error usan el formato estándar
  (`application/problem+json`: `type`, `title`, `status`, `detail`, `instance`), no un shape custom por
  endpoint.
  ```csharp
  builder.Services.AddProblemDetails(options =>
  {
      options.CustomizeProblemDetails = context =>
          context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
  });
  // ...
  app.UseExceptionHandler();   // excepciones no controladas -> application/problem+json
  app.UseStatusCodePages();    // 4xx/5xx sin excepción -> application/problem+json también
  ```
  En el front, el interceptor de errores (ver [05-http-interceptors.md](./05-http-interceptors.md) §5.3)
  lee `error.error` como `{ title, status, detail, type, instance }`, no como un mensaje plano.
- **Fechas en ISO 8601**: `System.Text.Json` serializa `DateTime`/`DateTimeOffset` en ISO 8601 por
  defecto (`"2026-05-01T14:30:00Z"`); `DateOnly` serializa como `"2026-05-01"`. El front nunca parsea
  fechas con formato regional (`dd/MM/yyyy`): siempre `new Date(iso)` o el parser de la librería de
  fechas del proyecto sobre el string ISO tal cual llega. Excepción: `DateOnly` (`yyyy-MM-dd`) se
  mantiene como `string` y no se parsea con `new Date('yyyy-MM-dd')` (UTC; 05 §5.10).
- **Nunca devolver `null`** en campos que el front va a mostrar o calcular: siempre el valor por
  defecto del tipo (§2.11).
- **Un tipo por operación, con el mismo nombre en C# y en TypeScript**: `<Accion><Entidad>Request`
  lo que envía el front, `<Entidad>Response` lo que devuelve el back (§2.11).
- Las respuestas llegan de dos formas: el `Response` directo, o envueltas en el contrato del equipo
  (ej. `ApiResponse<T>`, datos en `data`). El servicio HTTP del front soporta las dos y
  desenvuelve ahí, así el resto de la app siempre recibe el `Response` (§2.11).

### 10.4 Configuración en runtime vs. `environment.ts`

Los `environment.ts` de Angular se compilan **dentro** del bundle: cualquier valor ahí queda fijo hasta
el próximo build. Lo que tiene que cambiar sin rebuildear se lee en runtime de **`src/appsettings.json`**,
publicado como asset junto al build. El proyecto base ya trae las tres piezas en
`shared/services/appsettings/`:

| Archivo | Clase | Qué hace |
| :--- | :--- | :--- |
| `app-settings-http.ts` | `AppSettingsHttp` | Lee `appsettings.json` con `fetch` (`cache: 'no-cache'`, timeout de 10 s). |
| `app-settings.ts` | `AppSettings` | Guarda el archivo en un `signal` y expone valores derivados (`appVersion`). |
| `version-check.ts` | `VersionCheck` | Compara el archivo publicado contra el cargado al arrancar y avisa de un deploy. Sin RxJS: `setInterval`, `addEventListener` y el signal `router.currentNavigation()`; estado en signals. |

```ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      // Chunk lazy inexistente = hubo un deploy mientras la pestaña estaba abierta.
      withNavigationErrorHandler(({ error }) => {
        const versionCheck = inject(VersionCheck);
        if (versionCheck.esErrorDeChunk(error)) versionCheck.chunkFallido();
      }),
    ),
    // La carga inicial es la base contra la que VersionCheck detecta un deploy.
    // Si falla, el chequeo arranca igual y toma como base la primera lectura buena.
    provideAppInitializer(() => {
      inject(VersionCheck).iniciar();
      return inject(AppSettings).cargar().catch(() => undefined);
    }),
    // ...resto de providers
  ],
};
```

`provideAppInitializer(initializerFn: () => any): EnvironmentProviders` reemplaza al antiguo token
`APP_INITIALIZER` (deprecado): el `initializerFn` corre en contexto de inyección (permite `inject()`
directo, sin declarar dependencias por constructor) y, si devuelve una `Promise` o un `Observable`, el
bootstrap de la app espera a que termine antes de renderizar.

- **`fetch` y no `HttpClient`**: así la lectura no pasa por los interceptores (sin spinner ni modal de
  error en los chequeos periódicos) y no depende de configuración que todavía no se cargó.
- **Ruta relativa** (`fetch('appsettings.json')`): resuelve contra el `<base href>`, así que también
  anda con la app publicada en un subdirectorio de IIS.
- **`npm run sync-version`** copia la `version` de `package.json` a `appsettings.json` antes de cada
  build: subir la versión del paquete es lo que dispara el aviso de deploy en los usuarios conectados.
- **`VersionCheck`** chequea al volver a la pestaña, al navegar y cada 30 minutos (nunca más de una vez
  cada 5). Si el archivo cambió, muestra un modal bloqueante "Nueva versión disponible"; si no
  responde, muestra "Actualizando sistema" y reintenta cada 30 segundos.
- Guardar siempre el resultado en un `signal` del servicio (nunca en una variable mutable suelta), para
  que el resto de la app lo consuma de forma reactiva.

> **Con Service Worker (§10.14)** el aviso de versión nueva lo da `SwUpdate`, y la pestaña vieja sigue
> navegando entera. `VersionCheck` queda como fallback para ambientes sin TLS (ahí el SW no se registra)
> y el `withNavigationErrorHandler` de arriba se mantiene siempre: es lo único que rescata una pestaña
> que el SW todavía no controla.

### 10.5 VS Code — settings del equipo

```jsonc
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.rulers": [160], // igual al printWidth de .prettierrc: marca visual del límite de línea
  "editor.linkedEditing": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.fixAll.stylelint": "explicit",
    "source.organizeImports": "explicit"
  },
  "typescript.updateImportsOnFileMove.enabled": "always",
  "explorer.compactFolders": false,
  "files.autoSave": "onFocusChange",
  "git.autofetch": true,
  "git.enableSmartCommit": true
}
```

El formato lo define el **`.prettierrc`** del proyecto (no los settings de VS Code, para que todos los
editores y la CLI formateen igual):

```json
{
  "bracketSpacing": true,
  "semi": true,
  "singleQuote": true,
  "bracketSameLine": true,
  "singleAttributePerLine": true,
  "htmlWhitespaceSensitivity": "css",
  "trailingComma": "all",
  "printWidth": 160,
  "tabWidth": 2,
  "arrowParens": "avoid",
  "overrides": [{ "files": "*.html", "options": { "parser": "angular" } }]
}
```

### 10.6 Visual Studio 2026 (backend C#)

En **Opciones → Editor de texto**:

- **Limpieza de código**: activar "Ejecutar el perfil de limpieza de código al guardar" e incluir los
  reparadores: quitar variables no utilizadas, quitar importaciones/usos innecesarios, ordenar
  importaciones, ordenar modificadores, quitar conversiones innecesarias, aplicar preferencias de
  `var`, `new()`, interpolación de cadena, `using` simple, y dar formato al documento.
- **C# → Estilo de código**: `Preferencias de "this."` → *No preferir "this."*; tipos predefinidos
  para variables locales, parámetros y miembros; **Preferir llaves: No**; declaraciones de espacio de
  nombres: **Archivo con ámbito**; propiedades automáticas: Sí; instrucción `using` sencilla: Sí.
- **Nuevas preferencias de línea (experimental)**: no permitir varias líneas en blanco, no permitir
  líneas en blanco entre llaves consecutivas, no permitir una instrucción inmediatamente después del
  bloque.

### 10.7 Graphify (mapa del repo para asistentes AI)

Graphify convierte el repo en un grafo de conocimiento (`graphify-out/graph.json` +
`graphify-out/GRAPH_REPORT.md`). Actualizarlo es gratis; consultarlo cuesta más que `grep` (medido) y queda
para preguntas de flujo sin nombre conocido. Reglas y medición en
[14-agent-efficiency.md](./14-agent-efficiency.md) §14.5.

Resumen de comandos (fuente: [github.com/safishamsi/graphify](https://github.com/safishamsi/graphify) y `graphify --help`):

```bash
pip install graphifyy && graphify install   # una vez por máquina (el paquete PyPI lleva doble "y")
graphify hook install                       # una vez por repo: reconstruye el grafo en cada commit, sin LLM
graphify query "<pregunta de flujo>" --budget 800   # solo sin nombre conocido; con nombre, grep (§14.5)
graphify update .                           # solo justo antes de un query (el hook git lo hace en cada commit), sin LLM
```

`/graphify .` (con barra) es el slash command que corre el build completo con LLM dentro del asistente: solo
si hacen falta docs e imágenes en el grafo. No instalar `graphify <agente> install` por proyecto (§14.5).

### 10.8 AI / MCP Server de Angular CLI

Angular CLI expone un **MCP Server** propio desde v21 (ampliado en v22) que da contexto real del
workspace a asistentes AI: arranca con `ng mcp` (o `npx @angular/cli mcp` si el CLI no está instalado
en el proyecto) y expone herramientas como `get_best_practices`, `search_documentation`,
`list_projects`, `onpush_zoneless_migration`, `ai_tutor`, `devserver_start` / `devserver_stop` y ejecución de targets (`run_target`) para
build/lint desde el propio asistente.

Aparte del MCP Server, desde v22 Angular registra en **modo dev** una herramienta de debugging in-page
para asistentes AI del navegador: `angular:di_graph`, que expone el grafo completo de inyección de
dependencias (element e environment injectors) de la app corriendo.

Reglas del equipo:

- Está OK usarlo localmente para scaffolding, consulta de buenas prácticas y migraciones.
- Cualquier código generado por AI **debe pasar este checklist** ([checklists.md](./checklists.md))
  igual que el código humano antes de mergear.
- No commitear código generado sin revisar imports y tipos. Nunca generar archivos de test (§8).

**MCPs por proyecto (opcional).** Si el proyecto los necesita, se declaran en un `.mcp.json` local
(ignorado por §10.9; no se commitea), **nunca globales** y solo en proyectos que los usen:

```json
{
  "mcpServers": {
    "angular-cli": { "command": "npx", "args": ["ng", "mcp"] },
    "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@<versión exacta>"] }
  }
}
```

- **Angular CLI MCP**: usa el `@angular/cli` del propio proyecto (`ng mcp`), sin bajar nada con `npx -y`. Contexto del workspace (buenas prácticas, documentación, migraciones).
- **Playwright MCP**: para que el agente recorra la app y deje evidencia (§8.3). Fijá la **versión
  exacta**, nunca `@latest` (supply chain, §15.10). Manejar el navegador no es escribir tests: no se
  guarda ningún script en el repo.
- Si el proyecto no los usa, no los agregues.

### 10.9 Archivos de IA en `.gitignore`

**Regla**: todo lo relacionado con IA y agentes queda fuera del repositorio. Al empezar a trabajar
en un proyecto, el agente verifica el `.gitignore` y agrega las entradas que falten:

```gitignore
# IA / agentes (skills-frontend-mrydex)
.claude/
.agents/
.cursor/
.gemini/
.codex/
.windsurf/
.clinerules/
.opencode/
.aider*
skills/desarrollo-buenas-practicas/
CLAUDE.md
CLAUDE.local.md
AGENTS.md
GEMINI.md
.cursorrules
.windsurfrules
.github/copilot-instructions.md
.mcp.json
graphify-out/
tasks/todo.md
tasks/lessons.md
tasks/brief-*.md
```

- Si aparece otra herramienta de IA con su propia carpeta o archivo de configuración, sumarlo al
  bloque.
- El instalador (`npx github:MRydex/skills-frontend-mrydex`) agrega este bloque solo cuando instala en el proyecto.
  Si graphify crea un `.gitattributes` nuevo (merge driver del grafo), también lo ignora. Un
  `.gitattributes` que ya existía no se toca.
  Solo suma las entradas que faltan; correrlo de nuevo no duplica nada.
- `.gitignore` no saca del repo lo que ya estaba commiteado. Para eso hace falta
  `git rm --cached <archivo>`, que lo borra del repo para todo el equipo en el próximo push. **El
  agente pregunta antes de correrlo.**

### 10.10 Librería de UI: setup de NG-ZORRO 22 y Angular Material

Qué librería usar: §6.10. Esta sección cubre la configuración base, una sola vez por app.

**NG-ZORRO** (`ng-zorro-antd`):

- Versión mínima **22.1.2** (peer `@angular/*` `^22`). Las anteriores tienen bugs de `[formField]`
  con sus controles (§6.9).
- Imports por componente (`NzSelectModule`, `NzTableModule`...). Nunca un módulo global.
- Desde v22 todos sus componentes son `OnPush`: inputs inmutables ([09](./09-performance-zoneless.md) §9.2).
- Providers en `app.config.ts`:

```ts
import { registerLocaleData } from '@angular/common';
import es from '@angular/common/locales/es';
import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { CloseOutline, SearchOutline } from '@ant-design/icons-angular/icons';
import { es as esFechas } from 'date-fns/locale';
import { provideNzConfig } from 'ng-zorro-antd/core/config';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { es_ES, provideNzI18n } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';

registerLocaleData(es);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    provideNzI18n(es_ES), // sin esto los textos de los componentes salen en chino
    provideNzDateFnsAdapter({ locale: esFechas, firstDayOfWeek: 1 }), // obligatorio desde v22
    provideNzConfig({ message: { nzTop: 80 } }),
    provideNzIcons([CloseOutline, SearchOutline]), // solo los íconos que se usan
  ],
};
```

- **Adaptador de fechas**: desde v22 NG-ZORRO no trae uno por defecto. Sin él, `nz-date-picker`,
  `nz-calendar` y `nz-time-picker` fallan por falta del provider `NzDateAdapter`.
  `provideNzDateFnsAdapter` usa `date-fns` v4 (ya viene con `ng-zorro-antd`). Para usar `Date` + `Intl`:
  `provideNzNativeDateAdapter({ locale: 'es-AR', firstDayOfWeek: 1 })` (`Date` + `Intl`).
- **i18n de NG-ZORRO**: el idioma por defecto es chino. `registerLocaleData` para cada locale de
  Angular que se use. App multi-idioma (§10.11): forma factory, que sigue a `LOCALE_ID`:
  `provideNzI18n(() => (inject(LOCALE_ID) === 'es' ? es_ES : en_US))`. Lo mismo acepta
  `provideNzDateFnsAdapter(() => ({ ... }))`. Cambio en runtime: `NzI18nService.setLocale(...)` y
  `setLocale` del adaptador de fechas.
- **Config global**: defaults del equipo en `provideNzConfig({...})`, no repetidos en cada
  template. Prioridad: input de la instancia (o `service.create`) > `NZ_CONFIG` > default de la
  librería. Cambio en runtime: `inject(NzConfigService).set('button', { nzSize: 'large' })`. Un
  default que es `TemplateRef` (ej. `spin.nzIndicator`) va con un provider factory de `NZ_CONFIG`,
  no con `set` en el `AppComponent`.
- **Íconos**:
  - ✅ `provideNzIcons([...])` con los íconos usados (tree-shaking).
  - ❌ `import * as AllIcons from '@ant-design/icons-angular/icons'`: suma todos al bundle.
  - Rutas o componentes lazy: `provideNzIconsPatch([...])` en los `providers` de la ruta.
  - Carga dinámica (ícono no registrado, se pide por HTTP): requiere el glob de assets
    `{ "glob": "**/*", "input": "./node_modules/@ant-design/icons-angular/src/inline-svg/", "output": "/assets/" }`
    en `angular.json`.
  - Uso en templates (`<nz-icon>`): [03](./03-html-templates.md) §3.16.
- `@angular/animations` es opcional desde NG-ZORRO 21: no instalarlo solo por la librería.
- **APIs eliminadas** (buscarlas al auditar o migrar):

| Versión | Eliminado | Reemplazo |
| :--- | :--- | :--- |
| 20 | `NzMessageModule`, `NzNotificationModule` | `inject(NzMessageService)`, `inject(NzNotificationService)` |
| 21 | `NzToolTipModule`, `nz-tabset`, `nzBorderless` | `NzTooltipModule`, `nz-tabs`, `nzVariant="borderless"` |
| 21 | back-top | float-button |
| 22 | `NzDropDownModule` (renombrado en 21) | `NzDropdownModule` |
| 22 | `nz-input-group` (`nzAddOnBefore`...) | `nz-input-wrapper` (`nzAddonBefore`, `nzPrefix`, `nzSuffix`) |
| 22 | `NzAutosizeDirective` (`textarea[nzAutosize]`) | `cdkTextareaAutosize` (`TextFieldModule` de `@angular/cdk/text-field`), o `field-sizing: content` (§13) |
| 22 | `[nzOnOk]` / `[nzOnCancel]` como input de `nz-modal` | outputs `(nzOnOk)` / `(nzOnCancel)`, o `NzModalService.create` |
| 22 | `nz-upload[nzTransformFile]` | sin reemplazo: transformar el archivo antes de subirlo |

**Angular Material** (`@angular/material`, sin NG-ZORRO): `ng add @angular/material`. Tema M3,
tokens `--mat-sys-*` y overrides por componente: [07](./07-styles-scss.md) §7.12.

### 10.11 i18n de Angular (solo apps multi-idioma)

App en un solo idioma: `LOCALE_ID` fijo (§10.10) y nada más. Multi-idioma:

- `ng add @angular/localize`. Marcar textos con `i18n="@@id-estable"` en el template y atributos
  con `i18n-placeholder`, `i18n-title`, `i18n-aria-label`. En TS: `` $localize`:@@id:Texto` ``.
- `ng extract-i18n --output-path src/locale` genera el archivo fuente para traducir.
- El build compila un bundle por idioma (`"localize": true` en `angular.json`): en IIS, una carpeta
  por locale. Cambiar de idioma recarga la app, no hay cambio en runtime.
- NG-ZORRO sigue al `LOCALE_ID` con la forma factory de `provideNzI18n` (§10.10).

### 10.12 Hooks de Claude Code que instala el paquete

Solo en Claude Code. El instalador agrega tres hooks globales (los copia a
`~/.claude/hooks/skills-frontend-mrydex/` y los registra en `~/.claude/settings.json`; se instalan
fuera del repo; `format-prettier` sí reescribe el archivo editado). Saber qué hacen evita pelearse con ellos:

| Hook | Qué hace |
| :--- | :--- |
| `guard-spec` | Pide confirmación antes de crear `*.spec.ts` / `*.test.ts` en repos Angular (§8). Aprobar **solo** si el usuario pidió tests |
| `guard-secrets` | Bloquea escribir secretos: claves privadas, tokens de npm, connection strings, `"Password"` en JSON, valores literales entre comillas de `Password` / `ApiKey` de 8+ caracteres, claves y tokens de formatos conocidos; ignora valores con `(` o `[` (regex o código). Revisa solo Edit / Write / MultiEdit (no Bash); no revisa `.md` / `.mdx`; acepta placeholders (`${VAR}`, `#{token}#`, `<valor>`, `{0}`, `%VAR%`) |
| `format-prettier` | Corre el `prettier` **local** sobre el archivo editado, busca la config y `prettier` en `node_modules` subiendo hasta la raíz del repo (sirve para librerías en `projects/`). Si el archivo está versionado y en HEAD no pasaba `prettier --check`, no lo formatea (no ensucia el diff). Nunca descarga nada |

- Si `guard-secrets` bloquea, el contenido es un secreto de verdad o lo parece: sacarlo a una variable
  de entorno o al secreto del pipeline (§15.8). No se "desactiva" el hook.
- `format-prettier` no crea la config de prettier: sin ella, no formatea.

### 10.13 Despliegue: `baseHref`, configuraciones, HTTPS local y Docker

**`baseHref` por app (IIS como sub-aplicación).** Si la app se publica bajo `https://host/mi-app/`,
el build necesita su `baseHref` y el `web.config` reescribe a ese `index.html`:

```bash
ng build --base-href /mi-app/        # o "baseHref": "/mi-app/" en la configuración de build
```

```xml
<!-- web.config dentro de la carpeta de la sub-aplicación -->
<action type="Rewrite" url="/mi-app/index.html" />
```

Rutas siempre relativas en `fetch('appsettings.json')` y assets (§10.4); el `baseHref` las resuelve.

**Configuraciones de build extra** (`uat`, `studio`, `design` con mocks, etc.): **usá las que el repo
ya tiene** en `angular.json` (`ng build -c uat`). No inventes configuraciones nuevas ni agregues mocks
por tu cuenta; si hace falta una, pedirla al usuario. Una configuración de pre-producción hereda de
`production` los controles de seguridad (§15.4).

**HTTPS local con `ng serve`.** Solo si el backend o el IdP lo exigen:

```json
// angular.json → serve.options
"ssl": true,
"sslCert": ".certs/localhost.pem",
"sslKey": ".certs/localhost-key.pem"
```

Los certificados se generan en cada máquina (por ejemplo con `mkcert`), viven en `.certs/` y **fuera
de git** (`.gitignore`). Nunca commitear la clave privada (`.certs/` en `.gitignore`; `guard-secrets` solo frena que el agente la escriba con Edit/Write).

**Docker (multi-stage para la SPA).** **Aplica solo si el proyecto despliega con contenedores.** Si
despliega en IIS, no agregues un Dockerfile.

```dockerfile
FROM node:<versión exacta>-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build

FROM nginxinc/nginx-unprivileged:<versión exacta>-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/mi-app/browser /usr/share/nginx/html
EXPOSE 8080
```

- Versiones de imagen **fijas con tag exacto** (no `latest`; verificá el tag vigente en Docker Hub) y la de Node igual a la del proyecto. `npm ci`, no
  `npm install`.
- Nada de secretos en el `Dockerfile`, en `ARG` ni en la imagen (todo lo del bundle es público, §15.8).
- La imagen `nginx-unprivileged` escucha en **8080**: `listen 8080;` en `nginx.conf` y mapear ese puerto.
- `nginx.conf` con `try_files $uri /index.html;`, las cabeceras de §15.9 y sin cache para
  `index.html`/`appsettings.json`.
- Ajustá el path de `dist/` al nombre real del proyecto (`angular.json` → `outputPath`).

### 10.14 Actualizaciones sin cortar al usuario (Service Worker)

**Problema.** El build de producción emite bundles con hash (`outputHashing: all`) y cada deploy
borra los anteriores. Una pestaña abierta con la versión vieja sigue andando hasta que entra a una
ruta lazy que todavía no descargó: pide un chunk que ya no existe en el servidor y falla
(`ChunkLoadError`, pantalla en blanco o navegación cancelada). Si además el deploy cambió el contrato
de la API, el front viejo recibe respuestas que no entiende.

**Estándar: `@angular/service-worker`.** El Service Worker (SW) descarga y cachea **todos** los
bundles de la versión que el usuario tiene abierta (`installMode: prefetch`): la pestaña vieja se
sirve de su propia cache y navega entera aunque IIS ya no tenga esos archivos. Cuando hay una versión
nueva, el SW la baja en segundo plano, avisa (`VERSION_READY`) y el usuario elige cuándo recargar. Es
la única opción que evita el `ChunkLoadError`: un aviso por polling (§10.4) o por SignalR solo avisa,
no rescata a la pestaña abierta.

#### Instalación

```bash
npm install @angular/service-worker@<misma versión que @angular/core>
```

```jsonc
// angular.json → configurations.production (y toda configuración que se sirva por HTTPS)
"serviceWorker": "ngsw-config.json"
```

```jsonc
// ngsw-config.json (raíz del proyecto)
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "updateMode": "prefetch",
      "resources": { "files": ["/index.html", "/favicon.ico", "/manifest.webmanifest", "/*.css", "/*.js"] }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": { "files": ["/assets/**", "/**/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"] }
    }
  ]
}
```

- **Sin `dataGroups`.** La API nunca pasa por la cache del SW: una respuesta cacheada es un dato viejo
  que el usuario no sabe que es viejo. `appsettings.json` (§10.4) tampoco va en `assetGroups`: se lee
  con `fetch` y `cache: 'no-cache'`.
- `index` y `files` se resuelven contra el `baseHref`: funcionan igual bajo `/mi-app/` (§10.13).
- `manifest.webmanifest` e íconos solo si el proyecto ya es PWA instalable; para actualizar sin cortar
  no hacen falta.

```ts
// app.config.ts
provideServiceWorker('ngsw-worker.js', {
  enabled: !isDevMode(), // nunca con `ng serve`: la cache esconde los cambios que se están haciendo
  registrationStrategy: 'registerWhenStable:30000',
}),
```

- El SW solo se registra sobre **HTTPS** (o `localhost`). En un ambiente sin TLS `SwUpdate.isEnabled`
  queda en `false` en silencio: el fallback de §10.4 sigue activo y hay que pedir TLS para ese
  ambiente. Si una configuración de producción se sirve por HTTP a propósito, `enabled` sale de un
  flag explícito del `environment` de esa configuración, no de `isDevMode()`.
- `web.config` (§10.2): `ngsw.json`, `ngsw-worker.js` e `index.html` **sin cache** (un `<location>`
  por archivo, igual al de `index.html`); el resto tiene hash y cache larga. La regla de rewrite no
  toca archivos físicos: no hace falta una regla extra para `ngsw.json`.
- Publicar **junto** `index.html`, `ngsw.json`, `ngsw-worker.js` y todos los bundles. Un `ngsw.json`
  que referencia archivos que no están deja la versión en `VERSION_INSTALLATION_FAILED`: el SW sigue
  sirviendo la anterior (no rompe) pero nadie se actualiza.

#### Servicio `AppUpdate`

Singleton en `shared/services/app-update/app-update.ts`. Estado en signals; RxJS solo para los
flujos que `SwUpdate` y `Router` exponen como `Observable` ([02](./02-typescript-signals.md) §2.9):

```ts
@Service()
export class AppUpdate {
  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _nuevaVersion = signal(false);
  private readonly _recargaObligatoria = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _verificando = signal(false);
  private ultimoChequeo = 0;

  readonly nuevaVersion = this._nuevaVersion.asReadonly();
  readonly recargaObligatoria = this._recargaObligatoria.asReadonly();
  readonly error = this._error.asReadonly();
  readonly verificando = this._verificando.asReadonly();
  readonly puedeRecargar = computed(() => this._nuevaVersion() || this._recargaObligatoria());

  iniciar(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((evento) => {
      if (evento.type === 'VERSION_READY') {
        this._nuevaVersion.set(true);
        this._error.set(null);
      }
      if (evento.type === 'VERSION_INSTALLATION_FAILED') this._error.set('No se pudo descargar la actualización.');
    });
    // Cache rota o versión que ya no existe en el servidor: la pestaña no puede seguir sin recargar.
    this.swUpdate.unrecoverable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this._recargaObligatoria.set(true));

    // Primer chequeo con la app estable; después al volver a la pestaña, al navegar y cada 30 min.
    void this.appRef.whenStable().then(() => this.verificar());
    const intervalo = setInterval(() => void this.verificar(), 30 * 60_000);
    const alVolver = () => {
      if (document.visibilityState === 'visible') void this.verificar();
    };
    document.addEventListener('visibilitychange', alVolver);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.verificar());
    this.destroyRef.onDestroy(() => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    });
  }

  /** Nunca más de una vez cada 5 minutos: cada chequeo baja `ngsw.json` del servidor. */
  async verificar(forzar = false): Promise<void> {
    const reciente = Date.now() - this.ultimoChequeo < 5 * 60_000;
    if (!this.swUpdate.isEnabled || this._verificando() || (reciente && !forzar)) return;
    this._verificando.set(true);
    this.ultimoChequeo = Date.now();
    try {
      await this.swUpdate.checkForUpdate();
    } catch {
      this._error.set('No se pudo verificar si hay una versión nueva.');
    } finally {
      this._verificando.set(false);
    }
  }

  /** Para el interceptor (`426` del back, más abajo) o un evento del hub: la versión abierta ya no sirve. */
  exigirRecarga(): void {
    this._recargaObligatoria.set(true);
  }

  /** La versión nueva ya está descargada: recargar alcanza, no hace falta `activateUpdate()`. */
  recargar(): void {
    window.location.reload();
  }
}
```

Arranca en el mismo `provideAppInitializer` que `VersionCheck` (§10.4):
`inject(AppUpdate).iniciar();`. Con el SW habilitado, `VersionCheck` sigue corriendo pero su
chequeo ya no es el que avisa: queda para los ambientes sin TLS y para el `withNavigationErrorHandler`.

#### Aviso al usuario

Un componente en `shared/components/aviso-actualizacion/`, montado **una sola vez** en `app.ts`,
fuera del `<router-outlet>`. No bloquea: el usuario elige cuándo recargar. Única excepción:
`recargaObligatoria()` (SW irrecuperable o `426` del back), donde el aviso no se puede cerrar.

```html
@if (visible()) {
  <aside class="aviso-actualizacion" role="status" aria-live="polite">
    @if (update.recargaObligatoria()) {
      <p>La aplicación necesita recargarse para seguir funcionando.</p>
    } @else if (update.nuevaVersion()) {
      <p>Hay una versión nueva. Podés actualizar ahora o seguir trabajando.</p>
    } @else {
      <p>{{ update.error() }}</p>
    }
    <div class="aviso-actualizacion__acciones">
      @if (!update.recargaObligatoria()) {
        <button type="button" (click)="ocultar()">Más tarde</button>
      }
      @if (update.puedeRecargar()) {
        <button type="button" (click)="actualizar()">Actualizar ahora</button>
      } @else {
        <button type="button" [disabled]="update.verificando()" (click)="update.verificar(true)">Reintentar</button>
      }
    </div>
  </aside>
} @else if (update.puedeRecargar()) {
  <button type="button" class="aviso-actualizacion__pendiente" (click)="mostrar()">Actualización pendiente</button>
}
```

```ts
export class AvisoActualizacion {
  protected readonly update = inject(AppUpdate);
  private readonly cambios = inject(CambiosSinGuardar);
  private readonly confirmacion = inject(Confirmacion); // el modal del proyecto, Promise<boolean>
  private readonly oculto = signal(false);
  protected readonly visible = computed(
    () => this.update.recargaObligatoria() || (!this.oculto() && (this.update.puedeRecargar() || this.update.error() !== null)),
  );

  ocultar(): void {
    this.oculto.set(true);
  }

  mostrar(): void {
    this.oculto.set(false);
  }

  async actualizar(): Promise<void> {
    if (this.cambios.hay() && !(await this.confirmacion.preguntar('Hay cambios sin guardar. ¿Actualizar igual?'))) return;
    this.cambios.descartar(); // apaga el `beforeunload`: el navegador no vuelve a preguntar
    this.update.recargar();
  }
}
```

- Estilos del componente con BEM anidado y `position: fixed` ([07](./07-styles-scss.md)); un aviso
  no justifica un `.scss` cerca del límite de 150 líneas.
- Nunca `location.reload()` automático al recibir `VERSION_READY`: pierde el formulario que el
  usuario esté editando y corta una operación en curso.

#### Cambios sin guardar antes de recargar

El guard `cambiosSinGuardarGuard` ([09](./09-performance-zoneless.md) §9.6.4) cubre la navegación
interna. La recarga y el cierre de pestaña necesitan un registro global de los formularios sucios,
**sin `effect()`**: `dirty()` ya es un signal, el servicio lo lee cuando lo necesita.

```ts
// shared/services/cambios-sin-guardar.ts
@Service()
export class CambiosSinGuardar {
  private readonly formularios = signal<readonly Signal<boolean>[]>([]);
  private readonly descartado = signal(false);
  readonly hay = computed(() => !this.descartado() && this.formularios().some((dirty) => dirty()));

  /** Registra el `dirty()` de un formulario. Llamar en el constructor: se da de baja sola al destruirse el componente. */
  registrar(dirty: Signal<boolean>): void {
    this.formularios.update((lista) => [...lista, dirty]);
    inject(DestroyRef).onDestroy(() => this.formularios.update((lista) => lista.filter((d) => d !== dirty)));
  }

  descartar(): void {
    this.descartado.set(true);
  }
}
```

```ts
// Un componente con Signal Forms
export class EditarUsuario implements ConFormulario {
  readonly form = form(this.modelo, usuarioSchema);

  constructor() {
    inject(CambiosSinGuardar).registrar(computed(() => this.form().dirty()));
  }
}
```

```ts
// app.ts: el aviso nativo del navegador solo mientras haya cambios ([09](./09-performance-zoneless.md) §9.6.4)
host: { '(window:beforeunload)': 'alCerrar($event)' },
// ...
alCerrar(evento: BeforeUnloadEvent): void {
  if (this.cambios.hay()) evento.preventDefault();
}
```

- Después de guardar con éxito, `reset()` del form ([06](./06-signal-forms.md) §6.8): el `dirty()`
  vuelve a `false` y el registro se limpia solo. Un submit que falló **no** limpia el estado.
- Reactive Forms legacy (interoperabilidad, [06](./06-signal-forms.md) intro): el `dirty` como signal
  con `toSignal(group.events.pipe(map(() => group.dirty)), { initialValue: group.dirty })`, y se
  registra igual.

#### Fallback cuando el SW no controla la pestaña

Primera visita (el SW se registra después del arranque), navegador sin soporte, ambiente sin TLS o
`unrecoverable`: en todos esos casos un chunk lazy puede fallar. El `withNavigationErrorHandler` de
§10.4 detecta el error de chunk y recarga. Es el **único** caso en que se recarga sin preguntar: la
pestaña ya no puede navegar y, sin SW, no hay versión vieja completa a la que volver.

#### SignalR: solo como complemento

- No es el mecanismo: exige una conexión viva por pestaña para un evento que llega una vez por deploy
  ([16](./16-websocket-signalr.md) §16.1) y no evita el `ChunkLoadError`.
- Si ya hay un hub, el deploy del back recicla el app pool y corta el socket: en `onreconnected`
  ([16](./16-websocket-signalr.md) §16.6), además de reunirse a los grupos, `inject(AppUpdate).verificar(true)`.
  Así el aviso llega en segundos en vez de esperar al próximo chequeo.
- Un evento `RecargaObligatoria` del back (cambio de contrato incompatible) llama `exigirRecarga()`.
  Nunca se recarga desde el handler del evento: el aviso con `recargaObligatoria()` se encarga.

#### Contrato con la API durante el deploy

Mientras haya pestañas sin recargar conviven dos versiones del front contra una API. Reglas:

- **Cambios aditivos** en la API (skill backend §17.8 y §17.12): un campo que el front viejo manda
  no deja de aceptarse hasta el deploy siguiente; un campo nuevo del response se ignora en el front
  viejo. Si de verdad hay un corte, la API responde `426 Upgrade Required` (`ProblemDetails`).
- El front manda su versión en cada request (`appVersion()` de `AppSettings`, §10.4) y trata el
  `426` como recarga obligatoria. Interceptor funcional ([05](./05-http-interceptors.md)), antes del
  de errores en la lista para que el modal genérico no se muestre:

```ts
export const versionInterceptor: HttpInterceptorFn = (req, next) => {
  const update = inject(AppUpdate);
  const version = inject(AppSettings).appVersion();
  return next(version ? req.clone({ setHeaders: { 'X-App-Version': version } }) : req).pipe(
    tap({
      error: (e: unknown) => {
        if (e instanceof HttpErrorResponse && e.status === 426) update.exigirRecarga();
      },
    }),
  );
};
```

- API en otro origen: `X-App-Version` es una cabecera custom y el preflight de CORS tiene que
  permitirla (skill backend §11, `WithHeaders`). Mismo origen (IIS con la API como sub-aplicación):
  nada que hacer.
- El reciclado del app pool deja unos segundos de `502` / `503`: lo absorbe el `retryInterceptor` de
  [05](./05-http-interceptors.md), sin lógica nueva.

#### Verificación manual

1. `ng build` de producción y servirlo por HTTPS o `localhost` (por ejemplo `npx http-server dist/<app>/browser -p 8080`).
2. Abrir la app; en DevTools → Application → Service Workers debe figurar `ngsw-worker.js` activado y
   `ngsw.json` en Network con `Cache-Control: no-cache`.
3. Cambiar un texto, volver a buildear y publicar **sobre la misma carpeta** (los bundles viejos desaparecen).
4. En la pestaña vieja: navegar a una ruta lazy que no se visitó. Tiene que cargar igual (la sirve el SW).
5. Cambiar de pestaña y volver, o esperar el chequeo: aparece "Hay una versión nueva". "Más tarde" deja
   el botón "Actualización pendiente"; "Actualizar ahora" con un form sucio pide confirmación.
6. Recargar: la app muestra el texto nuevo. Repetir el paso 3 con un `ngsw.json` incompleto para ver
   el "Reintentar" (`VERSION_INSTALLATION_FAILED`).
7. Sin SW (DevTools → Bypass for network, o un ambiente HTTP): el paso 4 tiene que terminar en
   recarga automática por el `withNavigationErrorHandler`, no en pantalla en blanco.

#### Antipatrones

| Antipatrón | Qué hacer |
| :--- | :--- |
| `activateUpdate()` + `reload()` automáticos al recibir `VERSION_READY` | Avisar y que el usuario recargue; automático solo con `unrecoverable` o `426`. |
| `dataGroups` para la API "así anda offline" | Nunca: datos viejos sin que el usuario lo sepa. La API no se cachea. |
| SW habilitado en `ng serve` o en una configuración de build sin TLS | `enabled: !isDevMode()`; sin TLS no hay SW, queda §10.4. |
| `index.html` o `ngsw.json` con cache larga | Sin cache en `web.config` (§10.2). |
| `effect()` para saber si un form está sucio | `registrar(computed(() => form().dirty()))`; `dirty()` ya es signal. |
| Polling cada minuto "para avisar rápido" | 30 min + visibilidad + navegación, nunca más de una vez cada 5 min; SignalR `onreconnected` si hay hub. |
| Script de test propio para el servicio (`scripts/test-*.mjs`) | Sin archivos de test ([08](./08-sin-tests.md)); verificación manual de arriba. |
| Re-export del servicio desde otra carpeta "por compatibilidad" | Un solo archivo; los imports apuntan ahí. |

---
