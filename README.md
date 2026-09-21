# skills-frontend-mrydex 🚀

> **Skill universal de Angular 22+ (2026) y Frontend Moderno para Agentes de IA.**  
> Compatible con **Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, **GitHub Copilot**, **Codex** y cualquier agente que soporte el estándar de Agent Skills o archivos de contexto.

---

## 🌟 Características

- **Diseño Modular con Progressive Disclosure**: Dividido en un `SKILL.md` principal y 13 módulos especializados en `references/`. La IA solo carga en contexto lo que necesita para la tarea activa, ahorrando miles de tokens.
- **Instalador Universal Zero-Dependencies**: Un CLI ultra-ligero en Node.js que instala y configura las rutas para cualquier agente con un solo comando.
- **Angular 22 (2026) Ready**:
  - Signals como único modelo de estado (`signal`, `computed`, `linkedSignal`).
  - Detección de cambios Zoneless y OnPush por defecto.
  - Resource API (`httpResource`, `rxResource`, `resource`).
  - Signal Forms (`@angular/forms/signals`).
  - Control Flow nativo (`@if`, `@for`, `@switch`, `@let`) y `@defer`.
  - Interceptores funcionales para spinner y errores transversales.
- **Fundamentos Frontend**: Semántica HTML5 estricta, accesibilidad WCAG AA (`@angular/aria`), BEM, SCSS anidado, Flexbox, Grid y animaciones CSS modernas.

---

## 📦 Instalación Rápida desde Cualquier PC

Puedes instalar el skill en cualquier ordenador utilizando `npm` o `npx`:

### 1. Desde NPM (una vez publicado)
```bash
# Modo interactivo (te preguntará qué agente usas y dónde instalarlo)
npx skills-frontend-mrydex

# O directamente por comando:
npx skills-frontend-mrydex --agent antigravity --global
npx skills-frontend-mrydex --agent claude --global
npx skills-frontend-mrydex --agent all --workspace --bridge
```

### 2. Directamente desde GitHub (¡Sin necesidad de publicar en NPM!)
Puedes usar este comando desde cualquier máquina apuntando a tu repositorio de GitHub:
```bash
npx github:mrydex/skills-frontend-mrydex
```
O instalarlo globalmente:
```bash
npm install -g github:mrydex/skills-frontend-mrydex
skills-frontend
```

---

## 🤖 Compatibilidad Multi-Agente

| Agente de IA | Ubicación de Instalación | Flag del CLI |
| :--- | :--- | :--- |
| **Google Antigravity** | `~/.gemini/config/skills/angular-buenas-practicas` o `.agents/skills/` | `--agent antigravity` |
| **Claude Code** | `~/.claude/skills/angular-buenas-practicas` o `.claude/skills/` | `--agent claude` |
| **Cursor / Windsurf** | `skills/` + `.cursorrules` en la raíz del proyecto | `--agent cursor --bridge` |
| **GitHub Copilot / Codex** | `skills/` + `AGENTS.md` en la raíz del proyecto | `--agent universal --bridge` |
| **Todos los agentes** | Configura entornos globales y puentes locales de una sola vez | `--agent all` |

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
  --dry-run               Muestra qué se instalaría sin escribir cambios en disco
  -v, --version           Muestra la versión instalada
  -h, --help              Muestra la ayuda
```

---

## 📂 Estructura Modular del Skill

```text
skills/angular-buenas-practicas/
├── SKILL.md                          # Entrada principal, 5 reglas de oro y stack v22
└── references/
    ├── 01-project-structure.md       # Arquitectura vertical slices, core/shared, naming sin sufijos
    ├── 02-typescript-signals.md      # TS 6, Signals reactivos, inject(), componentes, inputs/outputs
    ├── 03-html-templates.md          # Control flow nativo, @defer, NgOptimizedImage, accesibilidad
    ├── 04-resource-api.md            # httpResource, rxResource, recargas y mutaciones
    ├── 05-http-interceptors.md       # Interceptores funcionales, spinner global, manejo de errores
    ├── 06-signal-forms.md            # Signal Forms (@angular/forms/signals), validación reactiva
    ├── 07-styles-scss.md             # SCSS moderno, BEM, variables y encapsulación
    ├── 08-testing-vitest.md          # Vitest y pruebas unitarias con signals
    ├── 09-performance-zoneless.md    # Zoneless change detection y OnPush
    ├── 10-environment-tooling.md     # IIS web.config, backend .NET, schematics
    ├── 11-workflow-orchestration.md  # Plan mode, subagentes, principios senior
    ├── 12-html5-semantics-seo.md     # Semántica HTML5, ARIA/WCAG, SEO y meta tags
    ├── 13-css3-layouts-animations.md # Flexbox, CSS Grid, animaciones scroll-driven
    └── checklists.md                 # Checklists de revisión para Angular y HTML5/CSS3
```

---

## 🚀 Guía: Cómo Publicar en GitHub y NPM

### Paso A: Publicar en tu Repositorio de GitHub

1. En esta carpeta, inicializa Git y haz tu primer commit:
   ```bash
   git init
   git add .
   git commit -m "feat: initial release of modular frontend skill"
   ```
2. Crea el repositorio en GitHub (por ejemplo `skills-frontend-mrydex` en tu cuenta).
3. Conecta el repositorio remoto y sube los cambios:
   ```bash
   git branch -M main
   git remote add origin https://github.com/mrydex/skills-frontend-mrydex.git
   git push -u origin main
   ```
*(¡En este punto ya cualquiera puede instalar tu skill con `npx github:mrydex/skills-frontend-mrydex`!)*

---

### Paso B: Publicar en el Registro Público de NPM

1. Crea una cuenta gratuita en [npmjs.com](https://www.npmjs.com/) si aún no tienes una.
2. Inicia sesión desde tu terminal:
   ```bash
   npm login
   ```
   *(Te pedirá tu usuario, contraseña y código 2FA o confirmación en el navegador).*
3. Publica el paquete:
   ```bash
   npm publish --access public
   ```
4. ¡Listo! A partir de ese momento, tú y cualquier persona en cualquier PC del mundo puede ejecutar:
   ```bash
   npx skills-frontend-mrydex
   ```

#### 🔄 ¿Cómo publicar actualizaciones futuras?
Cuando realices mejoras en los archivos del skill:
1. Incrementa la versión:
   ```bash
   npm version patch   # Para correcciones (1.0.0 -> 1.0.1)
   # o
   npm version minor   # Para nuevas funcionalidades (1.0.0 -> 1.1.0)
   ```
2. Sube los cambios a Git y publica en NPM:
   ```bash
   git push --follow-tags
   npm publish
   ```

---

## 📄 Licencia

MIT © [mrydex](https://github.com/mrydex)

