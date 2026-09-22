## 1. Estructura de Carpetas

Estructura **híbrida**: un **core** (infraestructura/auth), un **shared** (UI y utilidades
reutilizables) y **features** (vertical slices de negocio). Las features no dependen entre sí; usan
core/shared. **Las dependencias siempre van de features → shared/core, nunca al revés.**

```
src/
├── main.ts                    # bootstrap (siempre en src/, nombre fijo)
├── app/
│   ├── app.config.ts          # Configuración global (providers de root)
│   ├── app.routes.ts          # Rutas raíz con lazy loading
│   ├── app.ts                 # Componente raíz standalone (sin sufijo .component)
│   ├── app.html
│   ├── app.scss
│   │
│   ├── core/                  # Infraestructura, auth, cross-cutting concerns
│   │   ├── auth/
│   │   │   ├── auth-guard.ts          # guards mantienen el sufijo: auth-guard.ts
│   │   │   ├── auth.ts                # AuthService — sin sufijo .service
│   │   │   ├── session-interceptor.ts # interceptors mantienen el sufijo
│   │   │   └── models/
│   │   │       └── user.ts            # interface/model — sin sufijo
│   │   ├── http/                      # interceptores transversales (ver §5)
│   │   │   ├── spinner-interceptor.ts
│   │   │   ├── error-interceptor.ts
│   │   │   └── http-context.ts        # HttpContextTokens: SKIP_SPINNER, SKIP_ERROR_HANDLER
│   │   ├── storage/
│   │   │   └── storage.ts
│   │   └── user-context/
│   │       └── user-context.ts
│   │
│   ├── shared/                # Reutilizable, sin lógica de negocio
│   │   ├── components/
│   │   │   ├── spinner/                # overlay global del spinner (ver §5.2)
│   │   │   └── dashboard/
│   │   │       ├── dashboard.ts       # antes dashboard.component.ts
│   │   │       ├── dashboard.html
│   │   │       ├── dashboard.scss
│   │   │       ├── header/
│   │   │       ├── sidebar/
│   │   │       └── footer/
│   │   ├── directives/
│   │   │   ├── formularios-formatter/
│   │   │   ├── time-formatter/
│   │   │   ├── date-formatter/
│   │   │   └── currency-formatter/
│   │   ├── pipes/
│   │   ├── validators/
│   │   ├── models/                     # modelos compartidos por varias features
│   │   └── services/
│   │       ├── spinner.ts             # estado del spinner (signal contador, ver §5.2)
│   │       └── error-notifier.ts      # fachada lib-agnóstica del modal de error (ver §5.3)
│   │
│   └── features/              # Antes "private". Vertical slices de negocio.
│       ├── features.routes.ts
│       └── [feature]/                 # Ejemplo: users/
│           ├── [feature].routes.ts
│           ├── pages/                 # Componentes de ruta (smart)
│           │   └── [feature]-list/
│           │       ├── [feature]-list.ts
│           │       ├── [feature]-list.html
│           │       ├── [feature]-list.scss
│           ├── pages/                 # Componentes de ruta principales
│           │   └── [feature]-detalle/
│           │       ├── [feature]-detalle.ts
│           │       ├── [feature]-detalle.html
│           │       ├── [feature]-detalle.scss
│           │       ├── services/      # SOLO si los usa este componente (ver §1.1)
│           │       └── models/        # SOLO si los usa este componente (ver §1.1)
│           ├── components/            # Componentes presentacionales (dumb)
│           │       ├── models/        # SOLO si los usa este componente (ver §1.1)
│           │       │
│           │       └── subdetalle/    # Subcomponente anidado directamente (NUNCA en carpeta components/)
│           │           ├── subdetalle.ts
│           │           ├── subdetalle.html
│           │           ├── subdetalle.scss
│           │           │
│           │           └── subdetalle-cabecera/ # Nieto anidado dentro de subdetalle
│           │               ├── subdetalle-cabecera.ts
│           │               ├── subdetalle-cabecera.html
│           │               └── subdetalle-cabecera.scss
│           │
│           ├── services/              # compartidos por toda la feature
│           │   ├── [feature].ts            # Lógica/orquestación, signals derivados
│           │   └── [feature]-http.ts       # Acceso HTTP puro
│           ├── models/                # compartidos por toda la feature
│           │   └── dtos/              # DTOs por operación (ver §2.11)
│           ├── guards/
│           ├── pipes/
│           └── validators/
│
├── environments/
│   ├── environment.ts
│   ├── environment.local.ts
│   ├── environment.dev.ts
│   ├── environment.test.ts
│   └── environment.prod.ts
│
└── assets/
    ├── logos/
    ├── imagenes/
    └── styles/
        └── variables/         # Variables SCSS globales (colores, breakpoints, tokens tipográficos)
```

### 1.1 Regla de ubicación por alcance (servicios y modelos)

**El archivo vive en el nivel más bajo que lo contiene a todos sus consumidores.** Esta regla aplica
igual a `services/`, `models/`, `pipes/`, `validators/` y `guards/`:

| ¿Quién lo usa?                             | Dónde va                                                        |
|--------------------------------------------|-----------------------------------------------------------------|
| **Un solo componente**                     | `services/` o `models/` **dentro de la carpeta de ese componente** |
| **Varios componentes de la misma feature** | `services/` o `models/` **de la feature** (un nivel más arriba)  |
| **Varias features**                        | `shared/services/` o `shared/models/`                           |
| **Infraestructura / auth / transversal**   | `core/…`                                                        |

- Cuando un segundo componente empieza a necesitar un servicio o modelo local, **se sube un nivel**
  en el mismo commit; no se duplica ni se importa "cruzado" desde la carpeta de otro componente.
- **Nunca** importar desde `features/a/**` hacia `features/b/**`. Si dos features lo necesitan, sube
  a `shared/`.

### 1.2 Reglas clave de estructura

- **Modelos** siempre en una carpeta `models/`. **Nunca** declarados dentro de un componente.
- **DTOs** en `models/dtos/`, **uno por operación** (Create / Update / Query / Delete). Ver §2.11.
- **Servicios divididos por responsabilidad**:
  - `[feature].ts` → lógica de negocio, orquestación, signals derivados, validaciones.
  - `[feature]-concrete.ts` → proxy de implementación de un servicio abstracto de la librería,
    siempre y cuando tenga llamadas HTTP; si no, el servicio de lógica de negocio oficia de
    implementación del contrato abstracto.
  - `[feature]-http.ts` → solo llamadas HTTP / `httpResource`. Sin lógica de presentación.
- **Concerns transversales** (spinner, manejo global de errores, headers de auth, retries, logging)
  van en **interceptores funcionales** dentro de `core/http/`, **no** dispersos en cada servicio o
  componente (ver §5).
- **Pages vs components**:
  - `pages/` → componentes asociados a rutas (smart, inyectan servicios).
  - `components/` → presentacionales reutilizables (reciben `input()`, emiten `output()`).
- Si hay muchos archivos de un mismo tipo (directives, pipes, validators, interceptors),
  agrupar por subcarpeta temática.
- **No usar barrel files (`index.ts`)** salvo en librerías publicadas: generan ciclos de imports y
  degradan el tree-shaking.
- El test vive **junto** al archivo que prueba (`user-list.spec.ts`), nunca en una carpeta `tests/`.
- **Anidación jerárquica de subcomponentes (NUNCA carpeta `components/`)**:
  - Los componentes asociados a rutas viven en `pages/` (ej: `detalle/`).
  - Todo subcomponente hijo vive **directamente anidado** dentro de la carpeta del componente que lo
    consume (`detalle/subdetalle/`).
  - Si un subcomponente a su vez tiene partes más chicas, se anidan en su interior
    (`detalle/subdetalle/subdetalle-cabecera/`).
  - **Prohibido crear carpetas genéricas llamadas `components/`** dentro de una feature o página para
    meter subcomponentes: la relación de pertenencia debe ser clara en el árbol de carpetas.

> **Divergencia consciente con el style guide oficial**: angular.dev recomienda no crear
> subcarpetas por tipo de archivo (`components/`, `services/`). El equipo **sí** las usa dentro de
> cada feature/componente porque facilita la navegación en proyectos grandes. La regla de alcance de
> §1.1 es la que evita que degenere en un "type-first" global.

### 1.3 Naming oficial (Angular 20+/22)

> El equipo **no** usa los sufijos legacy `.component`, `.service`, `.directive`, `.pipe` en
> archivos ni clases. Es la convención oficial vigente desde el style guide de Angular 20.

| Tipo            | Archivo                  | Clase                   |
|-----------------|--------------------------|-------------------------|
| Component       | `user-list.ts`           | `UserList`              |
| Service         | `auth.ts`                | `Auth`                  |
| Directive       | `highlight.ts`           | `Highlight`             |
| Pipe            | `currency-format.ts`     | `CurrencyFormat`        |
| Guard           | `auth-guard.ts`          | `authGuard` (función)   |
| Resolver        | `user-resolver.ts`       | `userResolver` (fn)     |
| Interceptor     | `session-interceptor.ts` | `sessionInterceptor`    |
| Model/Interface | `user.ts`                | `User`                  |

- Archivos en **kebab-case**, separados por `-`.
- El nombre del archivo **coincide** con el identificador principal que contiene. Evitar nombres
  genéricos (`utils.ts`, `helpers.ts`, `common.ts`).
### 1.4 Componentización, Modularidad y Regla Anti-Monolitos (Dividir con sentido)

> **Regla de oro de modularidad:** No dejar jamás un componente de TS, un template HTML o un servicio
> con 400–600+ líneas. Si algo se puede dividir y componentizar en partes más específicas, **se debe
> dividir**.

#### Límites máximos recomendados por archivo
- **Componente (`.ts`)**: 150 – 200 líneas máximo.
- **Template (`.html`)**: 150 – 200 líneas máximo.
- **Servicio (`.ts`)**: 200 – 250 líneas máximo.
- **Estilos (`.scss`)**: 100 – 150 líneas máximo.

Si un archivo supera estos umbrales, es síntoma inequívoco de **múltiples responsabilidades mezcladas** y debe refactorizarse inmediatamente.

#### 1.4.1 Cómo descomponer un Componente y Template Monolítico (Smart vs Dumb)

- **El contenedor / página (`pages/`) debe ser delgado**: solo orquesta estado de alto nivel, rutas y llamadas a servicios.
- **Extraer bloques visuales a subcomponentes (`components/`)**:
  - Filtros y barras de búsqueda $\rightarrow$ subcomponente presentacional.
  - Tablas o listados $\rightarrow$ subcomponente con `input()` para los datos y `output()` para acciones (click, ordenar, paginar).
  - Modales de creación/edición $\rightarrow$ subcomponente independiente con su propio Signal Form.
  - Drawers o paneles laterales de detalle $\rightarrow$ subcomponente cargado bajo demanda con `@defer`.
- **NUNCA crear una carpeta `components/`**: Los subcomponentes se anidan **directamente** dentro de la carpeta del componente que los usa, reflejando la jerarquía real de la vista:
  - `detalle/` (componente principal)
    - $\rightarrow$ `subdetalle/` (subcomponente hijo, anidado directamente dentro de `detalle/`)
      - $\rightarrow$ `subdetalle-cabecera/` (subcomponente nieto, anidado directamente dentro de `subdetalle/`)
  - No crear jamás contenedores artificiales como `pages/users/components/`: la jerarquía de carpetas debe ser idéntica a la jerarquía de composición de los componentes.

##### ❌ Ejemplo Monolítico (Evitar: 600+ líneas en un solo archivo)
##### ❌ Ejemplo Monolítico o mal agrupado (Evitar: archivos gigantes o meter subcomponentes en carpetas "components/")
```text
pages/
└── users/
    ├── users.ts      # 650 líneas: lógica de tabla, filtros, 3 modales, cálculos, validaciones
    ├── users.html    # 580 líneas: tabla + toolbar + modal alta + modal baja + drawer permisos
    └── users.scss    # 400 líneas
└── users-detalle/
    ├── users-detalle.ts      # 650 líneas: todo mezclado en un archivo gigante
    ├── users-detalle.html    # 580 líneas kilométricas
    └── users-detalle.scss    # 400 líneas
```

##### ✅ Ejemplo Componentizado (Buenas Prácticas: modular y mantenible)
##### ✅ Ejemplo Componentizado (Anidación directa: detalle / subdetalle / subdetalle-cabecera)
```text
pages/
└── users/
    ├── users.ts                      # ~80 líneas: orquesta signals principales y eventos
    ├── users.html                    # ~35 líneas: composición limpia de subcomponentes
    ├── users.scss                    # ~30 líneas: layout base
└── users-detalle/                             # Componente principal (~80 líneas)
    ├── users-detalle.ts
    ├── users-detalle.html
    ├── users-detalle.scss
    ├── services/                              # Servicios locales solo de este detalle
    │   └── users-detalle.ts
    │
    ├── components/                   # Subcomponentes exclusivos de esta feature
    │   ├── user-filters/             # ~60 líneas: barra de búsqueda y dropdowns
    │   ├── user-table/               # ~120 líneas: tabla pura con inputs/outputs
    │   ├── user-form-modal/          # ~140 líneas: modal con Signal Form aislado
    │   └── user-permissions-drawer/  # ~90 líneas: panel cargado con @defer
    │
    ├── services/                     # Servicios locales de la feature
    │   ├── users.ts                  # Fachada / Estado local con signals
    │   └── users-http.ts             # Llamadas HTTP / resources aislados
    └── models/
        └── user.ts
    └── subdetalle/                            # Hijo directo (NUNCA en carpeta "components/")
        ├── subdetalle.ts                      # ~70 líneas
        ├── subdetalle.html                    # ~50 líneas
        ├── subdetalle.scss
        │
        └── subdetalle-cabecera/                # Nieto anidado dentro de subdetalle
            ├── subdetalle-cabecera.ts         # ~40 líneas (presentacional puro)
            ├── subdetalle-cabecera.html       # ~30 líneas
            └── subdetalle-cabecera.scss
```

#### 1.4.2 Cómo descomponer un Servicio Monolítico

Si un servicio acumula cientos de líneas porque gestiona endpoints HTTP, mapeos de datos complejos, validaciones y estado en memoria, **dividirlo en 3 capas**:
1. **HTTP / Resource puro (`[feature]-http.ts`)**: únicamente definición de endpoints, queries y mutations. Sin lógica de UI.
2. **Mappers y funciones puras (`[feature]-mappers.ts`)**: funciones utilitarias puras que transforman DTOs del backend al modelo del front. Fáciles de testear con Vitest sin instanciar Angular.
3. **Estado y Lógica de Negocio (`[feature].ts`)**: fachada inyectable con `signal()`, `computed()` y `linkedSignal()` que consumen los componentes.

---
