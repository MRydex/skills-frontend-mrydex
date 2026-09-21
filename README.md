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
| **Google Antigravity** | `~/.gemini/config/skills/angular-buenas-practicas` o `.agents/skills/` | `npx github:MRydex/skills-frontend-mrydex -a antigravity -g` |
| **Claude Code** | `~/.claude/skills/angular-buenas-practicas` o `.claude/skills/` | `npx github:MRydex/skills-frontend-mrydex -a claude -g` |
| **Cursor / Windsurf** | `skills/` + `.cursorrules` en la raíz del proyecto | `npx github:MRydex/skills-frontend-mrydex -a cursor -b` |
| **GitHub Copilot / Codex** | `skills/` + `AGENTS.md` en la raíz del proyecto | `npx github:MRydex/skills-frontend-mrydex -a universal -b` |
| **Todos los agentes** | Configura entornos globales y puentes locales a la vez | `npx github:MRydex/skills-frontend-mrydex -a all -w -b` |

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

- **Diseño Modular con Progressive Disclosure**: El skill se compone de un archivo maestro [`SKILL.md`](./skills/angular-buenas-practicas/SKILL.md) y 13 manuales especializados en `references/`. La IA solo lee en su contexto lo que necesita para la tarea activa, ahorrando miles de tokens:

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

## ‍💻 Para el Desarrollador: Cómo Publicar Cambios

Como este paquete se distribuye directamente desde GitHub, **no necesitas cuenta en npmjs.com ni hacer `npm publish`**.

Tu flujo para publicar cambios o mejoras es simplemente:

1. Modifica o agrega lo que necesites en los archivos de `skills/angular-buenas-practicas/`.
2. *(Opcional)* Incrementa la versión en `package.json` para llevar control:
   ```bash
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
