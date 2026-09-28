# Skills-frontend-mrydex 🚀

> **Skill universal de Angular 22+ (2026) y Frontend Moderno para Agentes de IA.**  
> Compatible con **Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, **GitHub Copilot**, **Codex** y cualquier agente que soporte el estándar de Agent Skills o archivos de contexto.  
> **Distribuido directamente vía GitHub sin intermediarios.**

---

## 📦 Instalación y Actualización desde Cualquier PC

Puedes instalar y actualizar este skill en cualquier ordenador directamente desde este repositorio de GitHub usando `npx`:

### 1. Instalación Rápida (Recomendada)
Ejecuta en tu terminal desde cualquier directorio o proyecto:
```bash
# Modo interactivo (te preguntará qué agente usas y dónde instalarlo):
npx github:MRydex/skills-frontend-mrydex
```

### 2. Comandos Directos por Agente

```bash
# Para Google Antigravity (instalación global):
npx github:MRydex/skills-frontend-mrydex --agent antigravity --global

# Para Claude Code (instalación global):
npx github:MRydex/skills-frontend-mrydex --agent claude --global

# Para el Proyecto Actual (configura todos los agentes a la vez con puentes AGENTS/CLAUDE/Cursor):
npx github:MRydex/skills-frontend-mrydex --agent all --workspace --bridge
```

### 3. Instalación Global con NPM
Si prefieres tener el comando `skills-frontend` siempre disponible en tu terminal:
```bash
npm install -g github:MRydex/skills-frontend-mrydex

# Luego solo ejecutas:
skills-frontend
```

---

## 🔄 ¿Cómo Actualizar cuando hayan cambios en el repositorio?

El comando es **exactamente el mismo**. El instalador detecta automáticamente si el skill ya está instalado en la máquina, elimina archivos viejos/obsoletos y copia la última versión:

```bash
# Actualizar a la última versión de la rama principal:
npx github:MRydex/skills-frontend-mrydex

# Si npx llega a usar una copia en caché temporal, especifica la rama directamente:
npx github:MRydex/skills-frontend-mrydex#main
```

Si lo habías instalado globalmente con `npm install -g`:
```bash
npm install -g github:MRydex/skills-frontend-mrydex
skills-frontend
```

---

## 🤖 Compatibilidad Multi-Agente

| Agente de IA | Ubicación de Instalación | Comando Rápido |
| :--- | :--- | :--- |
| **Google Antigravity** | `~/.gemini/config/skills/desarrollo-buenas-practicas` o `.agents/skills/` | `npx github:MRydex/skills-frontend-mrydex -a antigravity -g` |
| **Claude Code** | `~/.claude/skills/desarrollo-buenas-practicas` o `.claude/skills/` | `npx github:MRydex/skills-frontend-mrydex -a claude -g` |
| **Cursor / Windsurf** | `skills/` + `.cursorrules` en la raíz del proyecto | `npx github:MRydex/skills-frontend-mrydex -a cursor -b` |
| **GitHub Copilot / Codex** | `skills/` + `AGENTS.md` en la raíz del proyecto | `npx github:MRydex/skills-frontend-mrydex -a universal -b` |
| **Todos los agentes** | Configura entornos globales y puentes locales a la vez | `npx github:MRydex/skills-frontend-mrydex -a all -w -b` |

### Graphify y `.gitignore` automáticos

Al instalar en un proyecto, el instalador deja todo listo para cualquier agente, sin depender de que el
agente siga las instrucciones:

1. Instala o actualiza graphify (`pip install --upgrade graphifyy`, con fallback a `python -m pip`,
   `py -m pip` y `uv`) y su skill global.
2. Integra graphify en todos los agentes: Claude Code, Cursor, Codex, Gemini CLI, Copilot en VS Code y
   Antigravity. Claude Code queda en **modo estricto**: bloquea la primera lectura de archivos hasta
   que se consulte el grafo.
3. Instala los hooks git `post-commit` y `post-checkout`, que actualizan el grafo en cada commit.
4. Agrega todos los archivos de IA y agentes al `.gitignore`.
5. Subagentes `investigador`, `ejecutor` y `revisor-checklist` en el formato de cada agente instalado
   (Claude Code, Codex, Cursor, Gemini CLI, Antigravity, Copilot). En Claude Code y Codex, que no
   delegan solos, agrega un bloque a `~/.claude/CLAUDE.md` / `~/.codex/AGENTS.md` que pide delegar
   **solo cuando baja el total de tokens**. El mismo bloque (también en `~/.gemini/GEMINI.md`) pide
   cargar siempre la skill ante cualquier trabajo de frontend.
6. Arma el grafo con `graphify update .` (solo código, sin LLM, sin costo de tokens).

Fuera de un repo git se instala **solo global** (skill + CLI de graphify), sin tocar la carpeta actual.
Dentro de un repo (o una subcarpeta) instala además en la raíz del repo. En el menú interactivo, la
opción 1 (default) es "Todos los agentes". Para saltear todo esto:
`--no-graphify`. Si no hay Python, avisa y sigue con el resto de la instalación.

---

## 🛠️ Opciones y Flags del CLI

```bash
skills-frontend [opciones]

Opciones:
  -a, --agent <nombre>    antigravity | claude | cursor | universal | all
  -g, --global            Instalación global en el directorio home del usuario
  -w, --workspace         Instalación en la raíz del proyecto actual
  -t, --target <ruta>     Ruta personalizada donde copiar los archivos del skill
  -b, --bridge            Copia archivos puente (AGENTS.md, CLAUDE.md, .cursorrules)
  --no-graphify           No instala ni configura graphify
  --dry-run               Muestra qué se instalaría sin escribir cambios en disco
  -v, --version           Muestra la versión instalada
  -h, --help              Muestra la ayuda
```

---

## 📂 Estructura Modular del Skill

- **Diseño Modular con Progressive Disclosure**: El skill se compone de un archivo maestro [`SKILL.md`](./skills/desarrollo-buenas-practicas/SKILL.md) y 14 manuales especializados en `references/`. La IA solo lee en su contexto lo que necesita para la tarea activa, ahorrando miles de tokens:

```text
skills/desarrollo-buenas-practicas/
├── SKILL.md                          # Entrada principal, 8 reglas de oro, modo de operación y stack v22
└── references/
    ├── 01-project-structure.md       # Arquitectura vertical slices, core/shared, naming sin sufijos
    ├── 02-typescript-signals.md      # TS 6, Signals reactivos, inject(), componentes, inputs/outputs
    ├── 03-html-templates.md          # Control flow nativo, @defer, NgOptimizedImage, accesibilidad
    ├── 04-resource-api.md            # httpResource, rxResource, recargas y mutaciones
    ├── 05-http-interceptors.md       # Interceptores funcionales, spinner global, manejo de errores
    ├── 06-signal-forms.md            # Signal Forms (@angular/forms/signals), validación reactiva
    ├── 07-styles-scss.md             # @use/@forward, tokens, BEM, NG-ZORRO sin ::ng-deep, container queries, ITCSS
    ├── 08-sin-tests.md               # Sin archivos de test: skipTests y verificación manual
    ├── 09-performance-zoneless.md    # Zoneless, @defer, rutas, hidratación, budgets, virtual scroll, profiling
    ├── 10-environment-tooling.md     # IIS web.config, backend .NET, schematics
    ├── 11-workflow-orchestration.md  # Explorar, planificar, verificar, commits y lecciones
    ├── 12-html5-semantics-seo.md     # Semántica HTML5, ARIA/WCAG, SEO y meta tags
    ├── 13-css3-layouts-animations.md # @layer, :has(), @scope, Grid, anchor positioning, animaciones
    ├── 14-agent-efficiency.md        # Caveman, advisor multi-agente, autocompact, graphify, adaptación
    ├── 15-security.md                # Red Team / Blue Team, XSS, CSP, tokens, XSRF, cabeceras, supply chain, OWASP
    └── checklists.md                 # Checklists de Angular, HTML5/CSS3 y proceso del agente
```

---

## ‍💻 Para el Desarrollador: Cómo Publicar Cambios

Como este paquete se distribuye directamente desde GitHub, **no necesitas cuenta en npmjs.com ni hacer `npm publish`**.

Tu flujo para publicar cambios o mejoras es simplemente:

1. Modifica o agrega lo que necesites en los archivos de `skills/desarrollo-buenas-practicas/`.
2. *(Opcional)* Incrementa la versión en `package.json` para llevar control:
   ```bash
   npm version major # 1.0.0 -> 2.0.0
   npm version minor # 1.0.0 -> 1.1.0
   npm version patch   # 1.0.0 -> 1.0.1
   ```
3. Guarda y sube a GitHub:
   ```bash
   git add .
   git commit -m "feat: actualización de directivas"
   git push origin main
   ```

¡Eso es todo! Cualquier persona que vuelva a correr `npx github:MRydex/skills-frontend-mrydex` obtendrá tus cambios al instante.

---

## 📄 Licencia

MIT © [MRydex](https://github.com/MRydex)
