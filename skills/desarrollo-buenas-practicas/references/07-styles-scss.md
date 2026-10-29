## 7. SCSS — Convenciones (Angular)

### Índice

- 7.1 Módulos Sass: `@use` y `@forward` (nunca `@import`)
- 7.2 Tokens de diseño: variables SCSS vs custom properties
- 7.3 Selectores anidados con BEM
- 7.4 Encapsulación y `:host`
- 7.5 Personalizar NG-ZORRO sin `::ng-deep`
- 7.6 Container queries en componentes
- 7.7 `prefers-reduced-motion` en componentes
- 7.8 Responsividad
- 7.9 Tamaño máximo de archivo
- 7.10 SCSS repetido: triángulo invertido (ITCSS)
- 7.11 Layout con SCSS propio, nunca con componentes de layout de la librería
- 7.12 Angular Material: tema M3 y tokens, sin tocar su DOM

### 7.1 Módulos Sass: `@use` y `@forward` (nunca `@import`)

Los tokens globales (colores, breakpoints, tipografías) se cargan siempre con `@use`, con un
namespace explícito y **sin ruta relativa**:

```scss
// ✅ BIEN — resuelto desde assets/styles/ (includePaths)
@use 'index' as var;
@use 'notificaciones/notificaciones-header' as notif;

// ❌ MAL — ruta relativa: se rompe al mover el componente y no se lee
@use '../../../../../../assets/styles/variables.scss' as var;
```

- **Nunca rutas relativas (`../`) ni extensión `.scss` en un `@use`.** La ruta se escribe desde
  `assets/styles/`. El `_` inicial del partial es opcional: `@use 'collapse-line'` carga
  `_collapse-line.scss`.
- Requiere registrar `assets/styles` como raíz de Sass en `angular.json`, una sola vez por proyecto
  (opciones del target `build`):

```json
"options": {
  "stylePreprocessorOptions": {
    "includePaths": ["src/assets/styles"]
  }
}
```

- Los partials de un módulo o pieza viven en **su propia carpeta** dentro de `assets/styles/`,
  con el nombre del módulo como prefijo del archivo:

```text
assets/styles/
├── notificaciones/
│   ├── _notificaciones-header.scss
│   └── _notificaciones-item.scss
└── detalle-header/
    └── _detalle-header.scss
```

```scss
// notificaciones-header.scss (componente)
@use 'notificaciones/notificaciones-header' as notif;
@use 'detalle-header/detalle-header' as detalle;
```

- Nunca partials sueltos en la raíz de `assets/styles/` salvo el punto de entrada (`_index.scss`,
  `styles.scss`) y las capas ITCSS (§7.10).
- Los partials de módulo contienen solo `$variables`, `@mixin` y `@function`: **no emiten CSS**, así
  no se duplica en cada componente que los usa (§7.10).

- **Nunca `@import`**. Dart Sass lo deprecó en la 1.80.0 y prevé eliminarlo en Dart Sass
  3.0.0; además, a diferencia de `@use`, `@import` vuelca todo el
  archivo en un namespace global compartido y recompila el mismo partial cada vez que se importa
  en dos hojas distintas. `@use` carga cada partial **una sola vez** por compilación y obliga a
  prefijar el acceso (`var.$color`), lo que evita colisiones de nombres entre partials.
- **`@forward`** se usa para exponer varios partials a través de un único punto de entrada, sin
  que cada componente tenga que conocer la estructura interna de `assets/styles/`. Útil cuando el
  sistema de diseño crece más allá de un solo archivo de tokens:

```scss
// assets/styles/_index.scss
@forward 'settings/colors';
@forward 'settings/spacing';
@forward 'settings/breakpoints' show $bp-tablet, $bp-desktop; // reenvía solo lo público
@forward 'settings/typography';
@forward 'tools/mixins';
```

```scss
// componente.scss
@use 'index' as var;

.tarjeta { color: var.$color-primary; }
```

```scss
// ❌ MAL — deprecado, namespace global, recompila el partial en cada archivo
@import '../../../../assets/styles/variables.scss';
```

- **Nunca** hardcodear colores hex/rgb en componentes. Si falta un token, agregarlo a
  `settings/` (o al partial correspondiente, reenviado desde `_index.scss`).

### 7.2 Tokens de diseño: variables SCSS vs custom properties

Dos mecanismos de token, con roles distintos — no son intercambiables:

- **`$variables` de Sass**: se resuelven en **tiempo de compilación**. Son las únicas que se
  pueden usar dentro de la condición de un `@media` (`@media (min-width: var.$bp-tablet)`) o en
  lógica de Sass (`@if`, `@each`, funciones). No cambian en runtime.
- **Custom properties (`--variable`)**: se resuelven en **tiempo de ejecución**, heredan por el
  DOM y pueden cambiar dinámicamente (JS, `@media`, clases de tema). Son la única opción cuando el
  valor debe reaccionar a un cambio en runtime: modo oscuro, densidad, override puntual de
  NG-ZORRO (§7.5).

```scss
// ❌ MAL — un breakpoint como custom property no funciona en la condición del @media
:root { --bp-tablet: 768px; }
@media (min-width: var(--bp-tablet)) { ... }

// ✅ BIEN — el breakpoint es una $variable de Sass
@media (min-width: var.$bp-tablet) { ... }
```

#### Tipografía fluida con `clamp()`

Los tamaños de fuente del sistema se definen como **tokens fluidos** con `clamp(MÍN, IDEAL, MÁX)`:
`MÍN` es el piso, `MÁX` el techo, e `IDEAL` (típicamente `Xrem + Yvw`) escala suave entre
breakpoints. Así un mismo token responde sin media queries.

```scss
// assets/styles/settings/_typography.scss
$font-size-medium: clamp(0.8rem, -0.875rem + 8.333vw, 1.125rem);
$font-size-large:  clamp(1.5rem, -0.875rem + 8.333vw, 2.5rem);
```

```scss
.lista__header-title    { font-size: var.$font-size-large; }
.lista__header-subtitle { font-size: var.$font-size-medium; }
```

> El término `IDEAL` con `rem` negativo es normal: sale de interpolar el tamaño entre dos anchos de
> viewport. No tocarlo a mano; generarlo con una calculadora de *fluid type scale* y guardarlo como
> token.

#### Tema claro/oscuro con `light-dark()` y `color-scheme`

`light-dark()` es Baseline (soportado en los motores modernos desde 2024). Solo funciona si el
elemento (o un ancestro) declaró `color-scheme`; si no está declarado, el navegador asume `light`
y el segundo valor nunca se usa.

```scss
:root { color-scheme: light dark; } // deja que el SO decida

h1 { color: light-dark(var.$color-text-light, var.$color-text-dark); } // primer valor = claro, segundo = oscuro

.tarjeta {
  background: light-dark(var.$color-bg-light, var.$color-bg-dark);
}
```

- `color-scheme: light dark` → sigue la preferencia del sistema operativo (también afecta
  scrollbars y controles de formulario nativos).
- `color-scheme: dark` (o `light`) fijo en `:root` o en una clase/atributo (`[data-theme='dark']`)
  → fuerza el tema desde un toggle propio de la UI, sin depender del SO.
- `light-dark()` también acepta `<image>` y custom properties como argumentos
  (`light-dark(var(--icon-light), var(--icon-dark))`), no solo colores.

### 7.3 Selectores anidados con BEM

- Todo el estilo se escribe con **anidamiento SCSS** siguiendo BEM.
- Estados (`:hover`, `:focus-visible`, `:disabled`, `:focus-within`) y modificadores van **dentro**
  de la misma declaración.
- Nada de selectores sueltos fuera del bloque raíz.
- **Nunca reescribir la clase completa.** Elementos con `&__` y modificadores con `&--`, siempre
  anidados: el modificador de un elemento va dentro del elemento (`&__titulo { &--grande {} }`), no
  como `&__titulo--grande` ni como `.bloque__titulo--grande` aparte. Así renombrar el bloque toca una
  sola línea y el elemento junta todas sus variantes.

```scss
// ❌ MAL — clase completa reescrita / elemento y modificador juntos
.tarjeta { ... }
.tarjeta__titulo { ... }
.tarjeta__titulo--grande { ... }
.tarjeta {
  &__titulo--grande { ... }
}

// ✅ BIEN — todo anidado desde el bloque
.tarjeta {
  &__titulo {
    &--grande { ... }
  }
}
```
- **Preferir `:focus-visible` sobre `:focus`** para foco accesible sin ruido al click.
- **Profundidad máxima: 3 niveles** (bloque → elemento → modificador/estado). Encadenar más
  niveles (`&__a &__b &__c`) es señal de que ese fragmento es en realidad un subcomponente propio
  que debería anidarse como carpeta hija (regla de estructura del equipo), no un selector más
  profundo.

```scss
// ❌ MAL — 4+ niveles, mezcla elemento y sub-elemento en la misma cadena
.editar-evento {
  &__content {
    &-place {
      &--link {
        &:hover { ... } // 4º nivel real de anidamiento de selectores
      }
    }
  }
}

// ✅ BIEN — máximo 3 niveles
.editar-evento {
  &__header { ... }

  &__subheader {
    &-circle { ... }
    &-description { ... }

    &:hover { ... }
    &:focus-visible { outline: 2px solid var.$color-focus; }
    &:disabled { ... }
  }

  &__content {
    &-date { ... }

    &-place {
      &--green { ... }
      &--link { ... }
    }
  }
}
```

### 7.4 Encapsulación y `:host`

- `ViewEncapsulation.Emulated` (default). El enum completo es `Emulated | None | ShadowDom |
  ExperimentalIsolatedShadowDom`:
  - `None` → sin encapsulación, los estilos del componente pasan a ser globales. Evitar salvo caso
    muy justificado (p. ej. un archivo explícitamente global).
  - `ShadowDom` → Shadow DOM nativo del navegador. Rara vez conviene: aísla tanto que corta el
    theming global de NG-ZORRO (§7.5) y los overlays del CDK, que dependen de estilos inyectados
    fuera del componente.
  - `ExperimentalIsolatedShadowDom` → variante de `ShadowDom` que además bloquea que estilos
    externos se filtren hacia adentro. Marcado `@experimental` por Angular: no usar en producción.
- `:host` estila el propio elemento host del componente (no un selector CSS real, lo resuelve el
  compilador de Angular):

```scss
:host {
  display: block;
}

:host(.is-active) { // :host con clase/atributo en el elemento host
  border-color: var.$color-primary;
}
```

- **`:host-context()` está deprecado**: el CSS Working Group lo sacó de la especificación (por
  rendimiento y falta de consenso entre navegadores) y es candidato a remoción. **No usarlo en
  código nuevo.** Alternativas, de más a menos preferida:
  1. Un `input()` en el hijo que decida la clase/estado a partir de una signal (ya es el patrón
     del equipo: el dato baja explícito, no se "adivina" el contexto por CSS).
  2. Custom properties expuestas al hijo desde el ancestro (el hijo las consume con `var(--token)`
     sin saber quién es su contenedor).
  3. **Container style queries** (`@container style(...)`, ver
     [13-css3-layouts-animations.md](./13-css3-layouts-animations.md) §13.14) cuando el ancestro
     expone una custom property y varios descendientes deben reaccionar a ella sin pasar un input
     por cada nivel intermedio:

```scss
// ancestro
.layout {
  container-type: normal;
  container-name: layout;
}

// descendiente, sin :host-context()
.tarjeta {
  @container layout style(--tema: oscuro) {
    background: var.$color-bg-dark;
  }
}
```

- **Nunca `::ng-deep`**: es un combinador *shadow-piercing* que la spec de CSS eliminó; Angular lo
  sigue emulando solo por compatibilidad hacia atrás y puede quitarlo en cualquier momento. Para
  penetrar a un hijo o a una librería de UI, usar §7.5.

### 7.5 Personalizar NG-ZORRO sin `::ng-deep`

NG-ZORRO renderiza parte de su marcado (overlays, dropdowns, modales) fuera del árbol encapsulado
del componente que lo usa, así que `::ng-deep` "funciona" mecánicamente — pero acopla el CSS del
componente a la estructura interna de la librería, que puede cambiar en cualquier minor. Formas
soportadas de personalizar sin llegar a `::ng-deep`:

1. **Theming por variables Less (oficial, build-time)** — para cambiar tokens globales (color
   primario, radios de borde, tipografía) de todos los componentes NG-ZORRO a la vez: override de
   variables Less en un `theme.less` propio cargado en `angular.json` → `styles` (el builder compila
   Less sin `less-loader`). Los presets oscuro y compacto se cargan igual:
   `node_modules/ng-zorro-antd/ng-zorro-antd.dark.less` / `.compact.less` (o sus `.css`) en
   `styles`, o con `@import` al principio del `theme.less`. Los paths `ng-zorro-antd/dark-theme` /
   `compact-theme` son solo para `modifyVars` de webpack: no usarlos con `angular.json`. No toca el
   SCSS de ningún componente de la app. Para alternar claro/oscuro en runtime con Less: cada tema
   como entrada de `styles` con `"bundleName"` e `"inject": false`, y cambiar el `<link>` del tema
   activo desde un servicio.
2. **Tema dinámico con CSS variables (experimental)** — cargar `ng-zorro-antd.variable.min.css`
   (en vez del CSS compilado) y fijar el color con
   `provideNzConfig({ theme: { primaryColor: '#1677ff' } })`; en runtime,
   `inject(NzConfigService).set('theme', { primaryColor })`. Acepta `primaryColor`, `infoColor`,
   `successColor`, `processingColor`, `errorColor` y `warningColor`; la API está marcada experimental: para más tokens, usar la opción 1.
3. **Clases globales con prefijo del equipo** — para un ajuste puntual a una instancia particular
   (no un token global): agregar una hoja de estilos **global** (fuera de la encapsulación de
   cualquier componente, cargada desde `styles.scss`, §7.10) con una clase prefijada por el
   equipo, y aplicarla como clase del propio elemento NG-ZORRO:

```scss
// assets/styles/components/_nz-overrides.scss (global, cargada desde styles.scss, §7.10)
.ui-select--compact .ant-select-selector {
  min-height: 28px;
}
```

```html
<!-- feature.html -->
<nz-select class="ui-select--compact" ...></nz-select>
```

   La hoja global no está encapsulada, así que puede alcanzar el DOM interno de `nz-select` sin
   `::ng-deep`; la clase con prefijo evita que la regla se filtre a otras instancias de `nz-select`
   en la app. Si el override necesita convivir con estilos globales de terceros, envolverlo en
   `@layer` (ver [13-css3-layouts-animations.md](./13-css3-layouts-animations.md) §13.8) para
   controlar explícitamente quién gana.
   **Solo NG-ZORRO.** En Angular Material el DOM y las clases internas (`.mat-mdc-*`, `.mdc-*`)
   son privados: no se apuntan ni desde una hoja global. Se personaliza con tokens (§7.12).
4. **Nunca `::ng-deep` dentro del `.scss` encapsulado de un componente.**

### 7.6 Container queries en componentes

Cuando un componente debe adaptar su layout al tamaño de **su propio contenedor** (no al viewport)
— por ejemplo, la misma tarjeta reusada en un sidebar angosto y en un panel ancho — declarar el
contexto de contenedor en `:host` y consultar con `@container` dentro del propio SCSS del
componente, en vez de `@media`:

```scss
:host {
  display: block;
  container-type: inline-size;
}

.tarjeta {
  padding: 8px;

  @container (width >= 400px) {
    padding: 16px;
  }
}
```

Ver [13-css3-layouts-animations.md](./13-css3-layouts-animations.md) §13.14 para la sintaxis
completa de `@container` (nombrado, unidades `cq*`, container style queries).

### 7.7 `prefers-reduced-motion` en componentes

Toda transición o animación definida en el SCSS de un componente debe respetar la preferencia de
movimiento reducido del sistema operativo. Para no repetir la media query en cada componente,
centralizarla en un mixin del partial global:

```scss
// assets/styles/tools/_mixins.scss
@mixin motion-safe($transition) {
  transition: $transition;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
```

```scss
@use 'index' as var;

.tarjeta {
  @include var.motion-safe(transform 0.2s ease);
}
```

Ver [13-css3-layouts-animations.md](./13-css3-layouts-animations.md) §13.23 para el reset global de
`prefers-reduced-motion` y el porqué de esta regla (accesibilidad: cinetosis, epilepsia, fatiga
visual).

### 7.8 Responsividad

- Mobile-first. Los media queries usan los breakpoints del archivo de variables:
  ```scss
  @media (min-width: var.$bp-tablet) { ... }
  ```
- Antes de un media query, evaluar si el layout se resuelve solo con **contenedor de tamaño fijo +
  padding lateral fijo + contenido en `%`/`vw`/`vh`**
  ([13-css3-layouts-animations.md](./13-css3-layouts-animations.md) §13.11), con tokens `clamp()`
  (§7.2) o con Grid `auto-fit`/`minmax`
  ([13-css3-layouts-animations.md](./13-css3-layouts-animations.md) §13.13). Las media queries son
  el último recurso, no el primero.

### 7.9 Tamaño máximo de archivo

- Un `.scss` de componente **no supera 150 líneas**. Si lo excede, es señal de que el componente
  tiene demasiada responsabilidad visual: extraer un subcomponente anidado en su propia carpeta
  (nunca en una carpeta `components/` dentro de la feature — el árbol de carpetas refleja el árbol
  de composición) suele resolverlo junto con el límite de profundidad de anidamiento (§7.3).

### 7.10 SCSS repetido: triángulo invertido (ITCSS)

**Regla**: cuando el mismo código SCSS aparece **por segunda vez** (en otro componente o en el mismo
archivo), no copiarlo ni reescribirlo. Extraerlo a la capa correcta del triángulo invertido
(ITCSS) en `assets/styles/` y consumirlo desde ahí.

ITCSS ordena el CSS global en capas: de alcance amplio y especificidad baja (arriba) a alcance
acotado y especificidad alta (abajo). Cada capa solo agrega; nunca pisa a una capa superior.

```text
assets/styles/
├── settings/     # 1. Tokens: $variables, custom properties. Sin selectores propios.
├── tools/        # 2. Mixins y funciones. NO emite CSS.
├── generic/      # 3. Reset, box-sizing, reset de reduced motion.
├── elements/     # 4. Tags HTML sin clase: body, h1…h6, a, button.
├── objects/      # 5. Patrones de layout sin estética: .o-stack, .o-cluster, .o-grid.
├── components/   # 6. Piezas visuales globales y overrides de NG-ZORRO (.ui-*).
├── utilities/    # 7. Helpers de una sola propiedad: .u-sr-only, .u-text-center.
├── <modulo>/     # Partials propios de un módulo (§7.1): mixins y variables, sin CSS emitido.
├── _index.scss   # @forward de settings + tools (lo único que usan los componentes)
└── styles.scss   # Entrada global (angular.json → styles): carga las capas 1→7 en orden
```

```scss
// assets/styles/_index.scss — API para los .scss de componentes
@forward 'settings/colors';
@forward 'settings/spacing';
@forward 'settings/breakpoints';
@forward 'settings/typography';
@forward 'tools/mixins';
```

```scss
// assets/styles/styles.scss — orden del triángulo, reforzado con @layer
@use 'sass:meta';

@layer generic, elements, objects, components, utilities;

@layer generic    { @include meta.load-css('generic/reset'); }
@layer elements   { @include meta.load-css('elements/typography'); }
@layer objects    { @include meta.load-css('objects/stack'); }
@layer components { @include meta.load-css('components/nz-overrides'); }
@layer utilities  { @include meta.load-css('utilities/helpers'); }
```

**Dónde va cada repetición:**

| Qué se repite | Capa | Forma |
| :--- | :--- | :--- |
| Un valor (color, espaciado, radio, breakpoint) | `settings` | Token `$variable` o custom property (§7.2) |
| Un bloque de declaraciones en varias features | `tools` | `@mixin` con parámetros |
| Un bloque de declaraciones dentro de un solo módulo | `<modulo>/` | `@mixin` en `<modulo>/_<modulo>-<parte>.scss` |
| Un cálculo | `tools` | `@function` |
| Un patrón de layout en varios templates | `objects` | Clase global `.o-*` |
| Una pieza visual completa (tarjeta, badge) | — | Componente Angular en `shared/components/`, no CSS global |
| Un ajuste a NG-ZORRO | `components` | Clase global `.ui-*` (§7.5) |
| Un helper de una propiedad | `utilities` | Clase global `.u-*` |

```scss
// ❌ MAL — mismo bloque copiado en tarjeta.scss y en resumen.scss
.tarjeta {
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
}

// ✅ BIEN — assets/styles/tools/_mixins.scss
@use 'settings/spacing' as spacing;

@mixin superficie($padding: spacing.$space-md) {
  padding: $padding;
  border-radius: spacing.$radius-md;
  box-shadow: var(--shadow-sm);
}

// tarjeta.scss y resumen.scss
@use 'index' as var;

.tarjeta { @include var.superficie; }
.resumen { @include var.superficie(var.$space-lg); }
```

- Los `.scss` de componente hacen `@use` **solo** de `settings`, `tools` (vía `_index.scss`) y de la
  carpeta de su módulo (`@use 'notificaciones/notificaciones-header'`). Esas
  capas no emiten CSS. Hacer `@use` de un partial que emite CSS **duplica ese CSS en cada
  componente** que lo usa, porque Angular compila cada hoja encapsulada por separado.
- **Nunca `@extend`** para compartir estilos: no cruza los límites entre componentes (cada `.scss`
  se compila aislado) y genera selectores inflados. Usar `@mixin`.
- Las capas 3–7 viven solo en `styles.scss` (global). Nunca en la hoja de un componente.
- Si una repetición no encaja en ninguna capa, probablemente es un subcomponente: extraerlo (§7.9).

### 7.11 Layout con SCSS propio, nunca con componentes de layout de la librería

> **Regla del equipo:** el layout (grillas, columnas, espaciado, alineación) se hace con **SCSS
> propio** (CSS Grid / Flexbox + BEM), nunca con los componentes o directivas de layout de la
> librería de UI.

- **Prohibido**:
  - NG-ZORRO: `nz-row`, `nz-col`, `nzGutter`, `nzSpan`, `nzFlex`, `nz-space`, `nz-flex`, `nz-grid`,
    y el layout de formulario `nz-form` / `nz-form-item` / `nz-form-label` / `nz-form-control` /
    `nzLayout`. Etiqueta, obligatorio y error los pone el envoltorio `app-campo`
    ([06](./06-signal-forms.md) §6.10).
  - Angular Material: `mat-grid-list`. (`mat-form-field` sí: es el envoltorio de **un** campo, el equivalente de `app-campo`, y `matInput` / `mat-select` lo
    necesitan para verse bien; la grilla alrededor sigue siendo SCSS propio.)
  - Clases utilitarias de grilla (`row`, `col-md-*`, utilidades de Bootstrap o Tailwind).
- **Sí** se usan los **controles** de la librería (`nz-input`, `nz-select`, `nz-date-picker`...):
  lo que se descarta es su sistema de layout, no sus componentes.
- **Reutilizar antes de escribir**: antes de armar una grilla nueva, buscar si el proyecto ya tiene
  algo parecido (un `@mixin` en `tools/` como `grilla-campos`, un partial del módulo, una clase de
  layout global) y usarlo. Si el mismo layout aparece en un segundo componente, se sube a un
  `@mixin` en la capa que corresponda (§7.10), no se copia.
- Grilla de formulario típica, sin media queries
  ([13-css3-layouts-animations.md](./13-css3-layouts-animations.md) §13.13):
  ```scss
  .form-contacto {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 224px), 1fr));
    gap: 16px 24px;

    &__campo {
      &--completo {
        grid-column: 1 / -1;
      }
    }
  }
  ```

### 7.12 Angular Material: tema M3 y tokens, sin tocar su DOM

Si el proyecto usa Angular Material (librería de respaldo del equipo), el tema es Material 3
con `mat.theme()`. `mat.theme()` arma los colores con `light-dark()`, así que necesita
`color-scheme` declarado (§7.2); sin él solo se ve el tema claro.
Instalación y providers: `ng add @angular/material` ([10](./10-environment-tooling.md) §10.10).

```scss
// assets/styles/styles.scss (global)
@use '@angular/material' as mat;

:root {
  color-scheme: light dark; // o light / dark fijo desde un toggle (§7.2)
  @include mat.theme((
    color: mat.$azure-palette,
    typography: Roboto,
    density: 0,
  ));
  @include mat.strong-focus-indicators(); // foco con borde: el de fondo solo puede no cumplir WCAG
}
```

- **Colores y tipografía propios desde los tokens del sistema**: `var(--mat-sys-surface)`,
  `--mat-sys-on-surface`, `--mat-sys-primary`, `--mat-sys-outline-variant`,
  `--mat-sys-body-large`... en el SCSS de los componentes, en vez de mapas `$theme` de Sass o
  colores fijos. Si el proyecto tiene tokens propios (§7.2), se definen a partir de estos.
- **Personalizar un componente**: solo con la API de overrides, nunca con selectores sobre su DOM
  (ni `::ng-deep` ni hoja global, §7.5):
  ```scss
  html {
    @include mat.theme-overrides((primary-container: #84ffff)); // token del sistema
    @include mat.card-overrides((elevated-container-color: var(--mat-sys-surface-container)));
  }
  ```
  Una instancia puntual: el mismo `mat.<componente>-overrides()` dentro de una clase global
  (`.ui-card--destacada { @include mat.card-overrides(...); }`).
- **Densidad**: enteros de `0` a `-5`. Por debajo de `0` baja el área táctil (WCAG 2.5.8); no
  bajarla en diálogos, menús ni datepicker.
- **Alto contraste** (Windows `forced-colors`): bordes o íconos que solo se distinguen por color
  se cubren con `@include cdk.high-contrast { outline: 1px solid; }` (`@use '@angular/cdk' as cdk;`).
- **Texto solo para lectores de pantalla**: `.u-sr-only` (§7.10) también con Material:
  `.cdk-visually-hidden` solo existe cuando la CDK la carga, no está garantizada global.
- **Material 2** (`mat.m2-*`, `mat.m2-theme()`): solo en apps que ya lo usan. Código nuevo, M3.

---
