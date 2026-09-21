## 10. Entorno, tooling y despliegue del equipo

### 10.1 Crear o actualizar un proyecto con los schematics del equipo

Abrir un `cmd` en la carpeta donde se quiere instalar:

```bash
# 1) CLI de schematics
npm install -g @angular-devkit/schematics-cli

# 2) Template del equipo desde el registry interno
npm install @tu-organizacion/angular-template-schematic --registry http://registro-npm-interno:4873

# 3) Generar el proyecto
npx schematics @tu-organizacion/angular-template-schematic:angular-template-schematic --no-dry-run

# 4) Continuar normal
npm install
npm start
```

Para **actualizar** un proyecto existente al último template:

```bash
ng generate @tu-organizacion/angular-template-schematic:angular-template-schematic
```

### 10.2 `web.config` para hosting en IIS

Rutas de Angular reescritas a `index.html`, excluyendo API y Swagger:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Excluir rutas de la API de la reescritura -->
        <rule name="Exclude API and Swagger" stopProcessing="true">
          <match url="^(wac|swagger|api)" />
          <action type="None" />
        </rule>
        <!-- Reescribir todas las demás rutas a index.html -->
        <rule name="Angular Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/Server" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <httpErrors>
      <remove statusCode="403" subStatusCode="-1" />
      <error statusCode="403" prefixLanguageFilePath="" path="/index.html" responseMode="ExecuteURL" />
    </httpErrors>
  </system.webServer>
</configuration>
```

### 10.3 Backend (.NET) — contrato con el front

- **Parámetros de un GET**:
  ```csharp
  public async Task<IActionResult> Get([BindRequired, FromQuery] string param1, [FromQuery] int param2)
  ```
  - `BindRequired` → el parámetro es **obligatorio**.
  - `?` o `= valor` → lo hace **opcional** o con valor por defecto.
- **Nunca devolver `null`** en campos que el front va a mostrar o calcular: siempre el valor por
  defecto del tipo (§2.11).
- **Un DTO por operación** (agregar / modificar / consultar / eliminar), nunca uno compartido.
- Las respuestas vienen envueltas en el contrato del equipo (`ResponseApi<T>` / `ApiResponse<T>`), con
  los datos en el campo `data`; el front las mapea en el servicio HTTP o en un `computed` (§4.6).

### 10.4 VS Code — settings del equipo

```jsonc
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.rulers": [85],
  "editor.linkedEditing": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.fixAll.stylelint": "explicit",
    "source.organizeImports": "explicit"
  },
  "prettier.printWidth": 85,
  "prettier.singleQuote": true,
  "prettier.bracketSameLine": true,
  "prettier.arrowParens": "avoid",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "explorer.compactFolders": false,
  "files.autoSave": "onFocusChange",
  "git.autofetch": true,
  "git.enableSmartCommit": true
}
```

### 10.5 Visual Studio 2026 (backend C#)

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

### 10.6 Graphify (mapa del repo para asistentes AI)

```bash
pip install graphifyy         # requiere Python instalado
graphify install              # dentro de la carpeta del proyecto
# crear un .graphifyignore en la raíz para omitir node_modules, .git, etc.

/graphify claude install      # preparar el asistente
/graphify .                   # procesar el directorio actual
/graphify . --update          # actualizar el grafo
```

### 10.7 AI / MCP Server

Angular expone un **MCP Server** (CLI) que da contexto del proyecto a asistentes AI, y desde v22 hay
además herramientas de debugging AI en dev mode (por ejemplo `angular:di-graph`, que expone el grafo
de inyección de dependencias). Reglas del equipo:

- Está OK usarlo localmente para scaffolding y migraciones.
- Cualquier código generado por AI **debe pasar este checklist** igual que el código humano antes de
  mergear.
- No commitear código generado sin revisar imports, tipos y tests.

---
