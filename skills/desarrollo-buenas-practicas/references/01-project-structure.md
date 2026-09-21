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
│           │       ├── services/      # SOLO si los usa este componente (ver §1.1)
│           │       └── models/        # SOLO si los usa este componente (ver §1.1)
│           ├── components/            # Componentes presentacionales (dumb)
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
- **Un concepto por archivo**: un componente / directiva / servicio por archivo.
- Componente: `.ts`, `.html` y `.scss` comparten el mismo nombre base.
- **Test**: `xxx.spec.ts` junto al archivo.

---
