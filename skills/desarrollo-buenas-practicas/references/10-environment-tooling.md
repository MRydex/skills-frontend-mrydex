## 10. Entorno, tooling y despliegue del equipo

Índice: [10.1](#101-crear-o-actualizar-un-proyecto-con-los-schematics-del-equipo) Schematics ·
[10.2](#102-webconfig-para-hosting-en-iis) `web.config` IIS · [10.3](#103-backend-net--contrato-con-el-front) Contrato .NET ·
[10.4](#104-configuración-en-runtime-vs-environmentts) Config en runtime · [10.5](#105-vs-code--settings-del-equipo) VS Code ·
[10.6](#106-visual-studio-2026-backend-c) Visual Studio · [10.7](#107-graphify-mapa-del-repo-para-asistentes-ai) Graphify ·
[10.8](#108-ai--mcp-server-de-angular-cli) MCP Server de Angular CLI ·
[10.9](#109-archivos-de-ia-en-gitignore) Archivos de IA en `.gitignore`.

### 10.1 Crear o actualizar un proyecto con los schematics del equipo

Abrir una terminal en la carpeta donde se quiere instalar:

```bash
# 1) CLI de schematics
npm install -g @angular-devkit/schematics-cli

# 2) Template del equipo desde el registry interno (placeholder: usar el registry real del equipo)
npm install @TU-ORGANIZACION/angular-template-schematic --registry http://TU-REGISTRY-NPM-INTERNO:4873

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
  fechas del proyecto sobre el string ISO tal cual llega.
- **Nunca devolver `null`** en campos que el front va a mostrar o calcular: siempre el valor por
  defecto del tipo (§2.11).
- **Un DTO por operación** (agregar / modificar / consultar / eliminar), nunca uno compartido.
- Las respuestas vienen envueltas en el contrato del equipo (`ResponseApi<T>` / `ApiResponse<T>`), con
  los datos en el campo `data`; el front las mapea en el servicio HTTP o en un `computed` (§4.6).

### 10.4 Configuración en runtime vs. `environment.ts`

Los `environment.ts` de Angular se compilan **dentro** del bundle: cualquier valor ahí queda fijo hasta
el próximo build. Lo que tiene que cambiar sin rebuildear se lee en runtime de **`src/appsettings.json`**,
publicado como asset junto al build. El proyecto base ya trae las tres piezas en
`shared/services/appsettings/`:

| Archivo | Clase | Qué hace |
| :--- | :--- | :--- |
| `app-settings-http.ts` | `AppSettingsHttp` | Lee `appsettings.json` con `fetch` (`cache: 'no-cache'`, timeout de 10 s). |
| `app-settings.ts` | `AppSettings` | Guarda el archivo en un `signal` y expone valores derivados (`appVersion`). |
| `version-check.ts` | `VersionCheck` | Compara el archivo publicado contra el cargado al arrancar y avisa de un deploy. |

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
      return inject(AppSettings).cargar().pipe(catchError(() => EMPTY));
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
`graphify-out/GRAPH_REPORT.md`) que el agente consulta en vez de leer archivos enteros. El agente lo
instala, lo integra, lo consulta y lo actualiza **por su cuenta**: el procedimiento completo está en
[14-agent-efficiency.md](./14-agent-efficiency.md) §14.5.

Resumen de comandos (fuente: [github.com/safishamsi/graphify](https://github.com/safishamsi/graphify) y `graphify --help`):

```bash
pip install graphifyy && graphify install   # una vez por máquina (el paquete PyPI lleva doble "y")
graphify hook install                       # una vez por repo: reconstruye el grafo en cada commit, sin LLM
graphify claude install                     # una vez por repo, según el agente (cursor / codex / gemini / vscode / ...)
/graphify .                                 # primer build completo (slash command dentro del asistente)
graphify query "¿quién usa AuthService?"    # consultar
graphify update .                           # actualizar código tras una tarea grande, sin LLM
```

`graphify <agente> install` es un comando de **terminal**. `/graphify` (con barra) es el slash command
que corre el pipeline dentro del asistente.

### 10.8 AI / MCP Server de Angular CLI

Angular CLI expone un **MCP Server** propio desde v21 (ampliado en v22) que da contexto real del
workspace a asistentes AI: arranca con `ng mcp` (o `npx @angular/cli mcp` si el CLI no está instalado
en el proyecto) y expone herramientas como `get_best_practices`, `search_documentation`,
`find_examples`, `list_projects`, `onpush_zoneless_migration` y ejecución de targets (`run_target`) para
build/lint desde el propio asistente.

Aparte del MCP Server, desde v22 Angular registra en **modo dev** una herramienta de debugging in-page
para asistentes AI del navegador: `angular:di-graph`, que expone el grafo completo de inyección de
dependencias (element e environment injectors) de la app corriendo.

Reglas del equipo:

- Está OK usarlo localmente para scaffolding, consulta de buenas prácticas y migraciones.
- Cualquier código generado por AI **debe pasar este checklist** ([checklists.md](./checklists.md))
  igual que el código humano antes de mergear.
- No commitear código generado sin revisar imports y tipos. Nunca generar archivos de test (§8).

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
- El instalador (`npx skills-frontend-mrydex`) agrega este bloque solo cuando instala en el proyecto.
  Si graphify crea un `.gitattributes` nuevo (merge driver del grafo), también lo ignora. Un
  `.gitattributes` que ya existía no se toca.
  Solo suma las entradas que faltan; correrlo de nuevo no duplica nada.
- `.gitignore` no saca del repo lo que ya estaba commiteado. Para eso hace falta
  `git rm --cached <archivo>`, que lo borra del repo para todo el equipo en el próximo push. **El
  agente pregunta antes de correrlo.**

---
