## 1. Estructura de Carpetas

**Índice**: [1.1](#11-regla-de-ubicación-por-alcance-servicios-y-modelos) Regla de ubicación por
alcance · [1.2](#12-reglas-clave-de-estructura) Reglas clave de estructura ·
[1.3](#13-naming-oficial-angular-2022) Naming oficial · [1.4](#14-componentización-modularidad-y-regla-anti-monolitos-dividir-con-sentido)
Componentización, modularidad y regla anti-monolitos ([1.4.1](#141-cómo-descomponer-un-componente-y-template-monolítico-smart-vs-dumb)
Componente/template, [1.4.2](#142-cómo-descomponer-un-servicio-monolítico) Servicio).

Estructura **por zona de acceso** (la del proyecto base `angular-template` del equipo):

- **`protected/`**: lo que se ve **antes** de entrar a la app: auth OpenID, login y páginas de error.
- **`private/`**: las pantallas de la app, detrás del `authGuard`. Una carpeta por **módulo** de
  negocio (vertical slice). En esta guía, "feature" y "módulo" son lo mismo: una carpeta dentro de
  `private/`.
- **`interceptors/`**: concerns HTTP transversales y providers globales (locale).
- **`shared/`**: lo que usan **varios** módulos, sin lógica de negocio de ninguno.

Los módulos no dependen entre sí; usan `shared/`. **Las dependencias van de `private/` → `shared/`,
nunca al revés.**

```
src/
├── main.ts                    # bootstrap (siempre en src/, nombre fijo)
├── index.html                 # incluye el splash de carga previo al bootstrap
├── styles.scss                # estilos globales (ver §7)
├── appsettings.json           # versión publicada; se lee en runtime (ver §10.4)
├── app/
│   ├── app.config.ts          # providers de root
│   ├── app.routes.ts          # rutas raíz con lazy loading
│   ├── app.ts                 # componente raíz standalone (sin sufijo .component)
│   ├── app.html
│   ├── app.scss
│   │
│   ├── interceptors/          # Interceptores funcionales transversales (ver §5)
│   │   ├── spinner-interceptor.ts
│   │   ├── error-interceptor.ts
│   │   ├── date-interceptor.ts
│   │   ├── http-context.ts            # HttpContextTokens: SKIP_SPINNER, SKIP_ERROR_HANDLER
│   │   └── locale-providers.ts        # provideLocale(): es-AR para pipes de fecha y número
│   │
│   ├── protected/             # Antes de entrar: auth, login, errores
│   │   ├── auth/
│   │   │   ├── auth-config.ts         # AuthConfig de angular-oauth2-oidc
│   │   │   ├── service/auth.ts        # Auth — sin sufijo .service
│   │   │   ├── guard/auth-guard.ts    # guards mantienen el sufijo: authGuard
│   │   │   ├── interceptor/auth-error-interceptor.ts
│   │   │   └── models/auth.ts
│   │   ├── login/
│   │   │   ├── login.ts
│   │   │   ├── login.html
│   │   │   └── login.scss
│   │   └── error/                     # 401, 403, 404, IdP caído
│   │       ├── error.ts
│   │       └── models/error.ts
│   │
│   ├── private/               # Las pantallas de la app (detrás de authGuard)
│   │   ├── private.routes.ts
│   │   └── [modulo]/                  # Ejemplo: juicios/
│   │       ├── [modulo].routes.ts
│   │       ├── [modulo]-lista/        # Componente de ruta (smart), directo en el módulo
│   │       │   ├── [modulo]-lista.ts
│   │       │   ├── [modulo]-lista.html
│   │       │   └── [modulo]-lista.scss
│   │       │
│   │       ├── detalle/               # Otro componente de ruta
│   │       │   ├── detalle.ts
│   │       │   ├── detalle.html
│   │       │   ├── detalle.scss
│   │       │   ├── detalle.routes.ts  # solo si tiene rutas hijas (pestañas)
│   │       │   ├── pages/             # componentes de esas rutas hijas
│   │       │   ├── services/          # SOLO si los usa este componente (ver §1.1)
│   │       │   ├── models/            # SOLO si los usa este componente (ver §1.1)
│   │       │   │
│   │       │   └── subdetalle/        # Subcomponente anidado directamente (NUNCA carpeta components/)
│   │       │       ├── subdetalle.ts
│   │       │       ├── subdetalle.html
│   │       │       ├── subdetalle.scss
│   │       │       │
│   │       │       └── subdetalle-cabecera/ # Nieto anidado dentro de subdetalle
│   │       │           ├── subdetalle-cabecera.ts
│   │       │           ├── subdetalle-cabecera.html
│   │       │           └── subdetalle-cabecera.scss
│   │       │
│   │       ├── services/              # compartidos por todo el módulo
│   │       │   ├── [modulo].ts             # Lógica/orquestación, signals derivados
│   │       │   └── [modulo]-http.ts        # Acceso HTTP puro
│   │       ├── models/                # compartidos por todo el módulo
│   │       │   └── dtos/              # DTOs por operación (ver §2.11)
│   │       ├── guards/
│   │       ├── pipes/
│   │       └── utils/
│   │
│   └── shared/                # Reutilizable por varios módulos, sin lógica de negocio
│       ├── components/
│       │   ├── dashboard/             # dashboard de la librería (header, sidebar, footer)
│       │   │   ├── dashboard.ts
│       │   │   ├── dashboard.html
│       │   │   └── dashboard.scss
│       │   └── spinner/               # overlay global del spinner (ver §5.2)
│       ├── directives/
│       ├── pipes/
│       ├── validators/
│       ├── utils/
│       ├── models/                    # modelos de varios módulos (ej: response-api.ts)
│       └── services/
│           ├── appsettings/           # AppSettings (lee appsettings.json) y VersionCheck (aviso de deploy)
│           ├── user/                  # usuario logueado: user-context.ts + user-context-http.ts
│           ├── libreria/              # implementaciones de los servicios abstractos de la librería
│           │   ├── user/concrete-user.ts
│           │   └── sidebar/concrete-main-sidebar.ts
│           ├── spinner.ts             # estado del spinner (signal contador, ver §5.2)
│           └── error-notifier.ts      # fachada lib-agnóstica del modal de error (ver §5.3)
│
├── environments/
│   ├── environment.ts
│   ├── environment.dev.ts
│   ├── environment.uat.ts
│   └── environment.prod.ts
│
├── assets/
│   ├── images/
│   └── styles/                # Partials SCSS: variables.scss, tools/, components/, zorro/, utilities/ (ver §7)
│
├── proxy/                     # proxy del dev server por ambiente
└── certificates/              # certificado HTTPS local para ng serve
```

**Imports con alias `@/`**: `tsconfig.json` declara `"paths": { "@/*": ["./src/*"] }` y se importa
`@/app/shared/services/user/user-context` o `@/environments/environment`, nunca
`../../../..`. Entre archivos de la misma carpeta (o de una subcarpeta propia) se usa `./`.

### 1.1 Regla de ubicación por alcance (servicios y modelos)

**El archivo vive en el nivel más bajo que lo contiene a todos sus consumidores.** Esta regla aplica
igual a `services/`, `models/`, `pipes/`, `validators/` y `guards/`:

| ¿Quién lo usa?                             | Dónde va                                                        |
|--------------------------------------------|-----------------------------------------------------------------|
| **Un solo componente**                     | `services/` o `models/` **dentro de la carpeta de ese componente** |
| **Varios componentes del mismo módulo**    | `services/` o `models/` **del módulo** (un nivel más arriba)     |
| **Varios módulos**                         | `shared/services/` o `shared/models/`                           |
| **Auth, login, páginas de error**          | `protected/…`                                                   |
| **Interceptor HTTP o provider global**     | `interceptors/`                                                 |

- Cuando un segundo componente empieza a necesitar un servicio o modelo local, **se sube un nivel**
  en el mismo commit; no se duplica ni se importa "cruzado" desde la carpeta de otro componente.
- **Nunca** importar desde `private/a/**` hacia `private/b/**`. Si dos módulos lo necesitan, sube
  a `shared/`.

### 1.2 Reglas clave de estructura

- **Modelos** siempre en una carpeta `models/`. **Nunca** declarados dentro de un componente.
- **DTOs** en `models/dtos/`, **uno por operación** (Create / Update / Query / Delete). Ver §2.11.
- **Servicios divididos por responsabilidad**:
  - `[modulo].ts` → lógica de negocio, orquestación, signals derivados, validaciones.
  - `concrete-[tema].ts` → implementación de un servicio abstracto de la librería,
    siempre y cuando tenga llamadas HTTP; si no, el servicio de lógica de negocio oficia de
    implementación del contrato abstracto. Si la usa toda la app (usuario, sidebar, routing) va en
    `shared/services/libreria/[tema]/`; si la usa un solo módulo, en `services/` de ese módulo. Ejemplo mínimo:
    ```ts
    // en la librería: clase abstracta que define el contrato
    export abstract class ExportadorPdf { abstract exportar(datos: unknown): Promise<void>; }

    // concrete-exportador-pdf.ts: implementación concreta con la llamada HTTP real
    @Service()
    export class ExportadorPdfConcrete implements ExportadorPdf { /* ... */ }

    // se registra en providers: { provide: ExportadorPdf, useClass: ExportadorPdfConcrete }
    ```
  - `[modulo]-http.ts` → solo llamadas HTTP / `httpResource`. Sin lógica de presentación.
- **Concerns transversales** (spinner, manejo global de errores, headers de auth, retries, logging)
  van en **interceptores funcionales** dentro de `interceptors/`, **no** dispersos en cada servicio o
  componente (ver §5).
- **Componentes de ruta vs shared components**:
  - Componentes de ruta (smart, inyectan servicios) → directo en la carpeta del módulo
    (`private/juicios/detalle/`). Si un componente de ruta tiene rutas hijas (pestañas), los
    componentes de esas rutas van en su `pages/` (`private/juicios/detalle/pages/fojas/`).
  - `shared/components/` → la **única** carpeta `components/` de todo el proyecto: componentes
    presentacionales reutilizados por **varios** módulos (reciben `input()`, emiten `output()`).
  - Un componente presentacional usado por **un solo** módulo **no** va a `shared/components/`: se
    anida directamente donde lo consume (ver regla de anidación más abajo y §1.1).
- A partir de **5 o más archivos** del mismo tipo (directives, pipes, validators, interceptors),
  agrupar por subcarpeta temática.
- **No usar barrel files (`index.ts`)** salvo en librerías publicadas: generan ciclos de imports y
  degradan el tree-shaking.
- **Nunca archivos de test** (`*.spec.ts`, carpeta `tests/`). Ver [08-sin-tests.md](./08-sin-tests.md).
- **Anidación jerárquica de subcomponentes (NUNCA carpeta `components/`)**:
  - Los componentes asociados a rutas viven en la carpeta del módulo (ej: `detalle/`).
  - Todo subcomponente hijo vive **directamente anidado** dentro de la carpeta del componente que lo
    consume (`detalle/subdetalle/`).
  - Si un subcomponente a su vez tiene partes más chicas, se anidan en su interior
    (`detalle/subdetalle/subdetalle-cabecera/`).
  - **Prohibido crear carpetas genéricas llamadas `components/`** dentro de un módulo o página para
    meter subcomponentes: la relación de pertenencia debe ser clara en el árbol de carpetas.

> **Divergencia consciente con el style guide oficial**: angular.dev recomienda no agrupar por tipo
> de archivo. El equipo **sí** agrupa así `services/`, `models/`, `pipes/`, `validators/` y `guards/`
> dentro de cada módulo o componente, porque facilita la navegación en proyectos grandes; la regla
> de alcance de §1.1 evita que degenere en un "type-first" global. La excepción es `components/`: ahí
> el equipo va **más allá** de lo que pide el style guide oficial y la elimina directamente de
> cualquier feature o componente — solo sobrevive en `shared/components/` (ver más arriba y §1.4).

### 1.3 Naming oficial (Angular 20+/22)

> El equipo **no** usa los sufijos legacy `.component`, `.service`, `.directive`, `.pipe` en
> archivos ni clases. Es la convención oficial vigente desde el style guide de Angular 20.

| Tipo            | Archivo                  | Clase / función         |
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

> **Regla de oro de modularidad:** ningún componente de TS, template HTML o servicio supera los
> límites de la tabla siguiente. **Dividir solo cuando hace falta** (ver "Cuándo dividir"). Un archivo
> dentro del límite y fácil de leer **no se divide**: componentizar de más complica lo simple.

#### Cuándo dividir y cuándo NO

Crear un subcomponente **solo** si se cumple al menos una:

1. El archivo **supera el límite** de la tabla de abajo.
2. El bloque se **usa en 2 o más lugares** (§1.5).
3. El bloque tiene **estado o lógica propia** que ensucia al padre: modal con su Signal Form, panel
   cargado con `@defer`, wizard.

**No dividir** si no se cumple ninguna:

- Bloques chicos de solo markup (título, cabecera, filtro de 2 campos, fila de botones): quedan en el
  template del padre.
- Un subcomponente que solo reenvía `input()` al hijo siguiente (*prop drilling*) sobra.
- Nunca un componente de pocas líneas de template usado una sola vez.
- Ante la duda, dejarlo junto. Separar después, cuando crezca, es fácil.

#### Límites máximos por archivo
- **Componente (`.ts`)**: 200 líneas.
- **Template (`.html`)**: 200 líneas.
- **Servicio (`.ts`)**: 250 líneas.
- **Estilos (`.scss`)**: 150 líneas.

Superar el límite es síntoma inequívoco de **múltiples responsabilidades mezcladas** y debe
refactorizarse de inmediato dividiendo el archivo, no relajando el número.

#### 1.4.1 Cómo descomponer un Componente y Template Monolítico (Smart vs Dumb)

- **El componente de ruta (el contenedor) debe ser delgado**: solo orquesta estado de alto nivel, rutas y llamadas a servicios.
- **Cuando corresponda dividir** (ver arriba), extraer bloques visuales a subcomponentes anidados directamente (nunca a una carpeta `components/`, ver más abajo). Candidatos típicos en pantallas grandes:
  - Filtros y barras de búsqueda $\rightarrow$ subcomponente presentacional.
  - Tablas o listados $\rightarrow$ subcomponente con `input()` para los datos y `output()` para acciones (click, ordenar, paginar).
  - Modales de creación/edición $\rightarrow$ subcomponente independiente con su propio Signal Form.
  - Drawers o paneles laterales de detalle $\rightarrow$ subcomponente cargado bajo demanda con `@defer`.
- **NUNCA crear una carpeta `components/`**: Los subcomponentes se anidan **directamente** dentro de la carpeta del componente que los usa, reflejando la jerarquía real de la vista:
  - `detalle/` (componente principal)
    - $\rightarrow$ `subdetalle/` (subcomponente hijo, anidado directamente dentro de `detalle/`)
      - $\rightarrow$ `subdetalle-cabecera/` (subcomponente nieto, anidado directamente dentro de `subdetalle/`)
  - No crear jamás contenedores artificiales como `private/usuarios/components/`: la jerarquía de carpetas debe ser idéntica a la jerarquía de composición de los componentes.

##### ❌ Ejemplo monolítico o mal agrupado (archivos gigantes, muy por encima de los límites de §1.4)
```text
private/usuarios/
└── users/
    ├── users.ts      # 650 líneas: lógica de tabla, filtros, 3 modales, cálculos, validaciones
    ├── users.html    # 580 líneas: tabla + toolbar + modal alta + modal baja + drawer permisos
    └── users.scss    # 400 líneas

private/usuarios/
└── users-detalle/
    ├── users-detalle.ts      # 650 líneas: todo mezclado en un archivo gigante
    ├── users-detalle.html    # 580 líneas kilométricas
    └── users-detalle.scss    # 400 líneas
```

##### ✅ Ejemplo componentizado (anidación directa, sin carpeta `components/`)
```text
private/usuarios/
└── users/
    ├── users.ts                       # ~80 líneas: orquesta signals principales y eventos
    ├── users.html                     # ~35 líneas: composición limpia de subcomponentes
    ├── users.scss                     # ~30 líneas: layout base
    ├── services/
    │   ├── users.ts                   # Fachada / Estado local con signals
    │   └── users-http.ts              # Llamadas HTTP / resources aislados
    ├── models/
    │   └── user.ts
    ├── user-filters/                  # ~60 líneas: barra de búsqueda y dropdowns
    │   ├── user-filters.ts
    │   ├── user-filters.html
    │   └── user-filters.scss
    ├── user-table/                    # ~120 líneas: tabla pura con inputs/outputs
    │   ├── user-table.ts
    │   ├── user-table.html
    │   └── user-table.scss
    ├── user-form-modal/               # ~140 líneas: modal con Signal Form aislado
    │   ├── user-form-modal.ts
    │   ├── user-form-modal.html
    │   └── user-form-modal.scss
    └── user-permissions-drawer/       # ~90 líneas: panel cargado con @defer
        ├── user-permissions-drawer.ts
        ├── user-permissions-drawer.html
        └── user-permissions-drawer.scss

private/usuarios/
└── users-detalle/                     # Componente principal (~80 líneas)
    ├── users-detalle.ts
    ├── users-detalle.html
    ├── users-detalle.scss
    ├── services/                      # Servicios locales, solo de este detalle
    │   └── users-detalle-http.ts
    └── subdetalle/                    # Hijo directo (NUNCA carpeta "components/")
        ├── subdetalle.ts              # ~70 líneas
        ├── subdetalle.html            # ~50 líneas
        ├── subdetalle.scss
        │
        └── subdetalle-cabecera/       # Nieto anidado dentro de subdetalle
            ├── subdetalle-cabecera.ts     # ~40 líneas (presentacional puro)
            ├── subdetalle-cabecera.html   # ~30 líneas
            └── subdetalle-cabecera.scss
```

> Los subcomponentes de `users/` (`user-filters/`, `user-table/`, …) están al mismo nivel que
> `users.ts` porque son exclusivos de esa página; si mañana los necesitara otro módulo, suben a
> `shared/components/` (regla de alcance de §1.1).

#### 1.4.2 Cómo descomponer un Servicio Monolítico

Si un servicio acumula cientos de líneas porque gestiona endpoints HTTP, mapeos de datos complejos, validaciones y estado en memoria, **dividirlo en 3 capas**:
1. **HTTP / Resource puro (`[feature]-http.ts`)**: únicamente definición de endpoints, queries y mutations. Sin lógica de UI.
2. **Mappers y funciones puras (`[feature]-mappers.ts`)**: funciones utilitarias puras que transforman DTOs del backend al modelo del front.
3. **Estado y Lógica de Negocio (`[feature].ts`)**: fachada inyectable con `signal()`, `computed()` y `linkedSignal()` que consumen los componentes.

### 1.5 Reutilización: un solo componente para lo repetido

**Regla**: si la misma UI o el mismo comportamiento aparece **por segunda vez** (selector de usuario,
tabla de un tipo de dato, buscador, paginador, modal de confirmación, badge de estado), se crea
**un solo componente** y se reutiliza en todos los lugares. Nunca copiar y adaptar.

**Antes de crear un componente**, buscar si ya existe uno que resuelve lo mismo:

1. `graphify query "componente que selecciona usuario"` (§14.5).
2. `shared/components/` y las carpetas de la feature.
3. Búsqueda por nombre o selector (`selector-usuario`, `usuario-select`, `user-picker`).

Si existe, reutilizarlo. Si le falta una variante, agregarla con un `input()` en vez de crear otro.

**Ubicación** (misma regla que §1.1): el componente vive en el nivel más bajo que contiene a todos
sus consumidores.

| ¿Quién lo usa? | Dónde va |
| :--- | :--- |
| Varios hijos del mismo padre | Carpeta del padre común |
| Varias pantallas del mismo módulo | Carpeta raíz del módulo |
| Varios módulos | `shared/components/<nombre>/` |

```text
❌ MAL — 4 componentes que hacen lo mismo
private/juicios/alta/alta-selector-usuario/
private/juicios/editar/editar-selector-usuario/
private/agenda/evento/evento-usuario-select/
private/admin/permisos/permisos-usuario-picker/

✅ BIEN — uno solo, reutilizado en los 4 lugares
shared/components/selector-usuario/
├── selector-usuario.ts
├── selector-usuario.html
└── selector-usuario.scss
```

**Diseño del componente reutilizable:**

- **Presentacional**: recibe datos por `input()`, emite por `output()` / `model()`. No inyecta
  servicios de una feature concreta.
- Las variantes se resuelven con `input()` con default, **content projection** (`<ng-content>`) o
  `TemplateRef` para partes personalizables (ej. celdas de una tabla). No con un flag booleano por
  cada pantalla que lo usa.
- **Genérico con tipos** cuando el dato cambia (`TablaDatos<T>`).
- Si para cubrir todos los casos hacen falta más de 4–5 flags condicionales, son dos componentes
  distintos o falta composición. No crear un "componente Dios".

```ts
// shared/components/selector-usuario/selector-usuario.ts
@Component({
  selector: 'app-selector-usuario',
  templateUrl: './selector-usuario.html',
  styleUrl: './selector-usuario.scss',
})
export class SelectorUsuario {
  readonly usuarios = input.required<readonly Usuario[]>();
  readonly placeholder = input('Seleccionar usuario');
  readonly deshabilitado = input(false);
  readonly seleccionado = model<Usuario['id'] | null>(null);
}
```

```ts
// shared/components/tabla-datos/tabla-datos.ts — tabla genérica con celdas personalizables
export interface Columna<T> {
  readonly clave: keyof T & string;
  readonly titulo: string;
}

@Component({
  selector: 'app-tabla-datos',
  templateUrl: './tabla-datos.html',
  imports: [NgTemplateOutlet],
})
export class TablaDatos<T extends { id: string | number }> {
  readonly filas = input.required<readonly T[]>();
  readonly columnas = input.required<readonly Columna<T>[]>();
  readonly celda = contentChild<TemplateRef<{ $implicit: T; columna: Columna<T> }>>('celda');
}
```

**Lógica repetida que no es UI:**

| Qué se repite | Forma |
| :--- | :--- |
| Comportamiento sobre un elemento (foco, tooltip, overflow) | Directiva |
| Transformación de un valor para mostrar | Pipe puro |
| Lógica o estado | Servicio o función pura (§1.1) |
| Estilos | Capa ITCSS ([07-styles-scss.md](./07-styles-scss.md) §7.10) |

**Alcance** (§11.5):

- Duplicados dentro de lo que toca la tarea: unificar en el mismo cambio, reemplazar todas las
  copias y borrar los componentes viejos.
- Duplicados fuera del alcance: reportarlos con la lista de archivos y proponer la unificación.
  Aplicarla si el usuario acepta.
- Probar a mano en la app cada lugar donde se reemplazó (§11.3).

---
