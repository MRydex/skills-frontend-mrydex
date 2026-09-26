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

### 7.1 Módulos Sass: `@use` y `@forward` (nunca `@import`)

Los tokens globales (colores, breakpoints, tipografías) se cargan siempre con `@use`, con un
namespace explícito:

```scss
@use '../../../../../../assets/styles/variables.scss' as var;
```

- **Nunca `@import`**. Dart Sass lo marcó deprecado (warnings desde la serie 1.80) y va a
  eliminarlo en una versión mayor futura; además, a diferencia de `@use`, `@import` vuelca todo el
  archivo en un namespace global compartido y recompila el mismo partial cada vez que se importa
  en dos hojas distintas. `@use` carga cada partial **una sola vez** por compilación y obliga a
  prefijar el acceso (`var.$color`), lo que evita colisiones de nombres entre partials.
- **`@forward`** se usa para exponer varios partials a través de un único punto de entrada, sin
  que cada componente tenga que conocer la estructura interna de `assets/styles/`. Útil cuando el
  sistema de diseño crece más allá de un solo `variables.scss`:

```scss
// assets/styles/_index.scss
@forward 'colors';
@forward 'spacing';
@forward 'breakpoints' show $bp-tablet, $bp-desktop; // reenvía solo lo público
```

```scss
// componente.scss
@use '../../../../assets/styles/index' as tokens;

.tarjeta { color: tokens.$color-primary; }
```

```scss
// ❌ MAL — deprecado, namespace global, recompila el partial en cada archivo
@import '../../../../assets/styles/variables.scss';
```

- **Nunca** hardcodear colores hex/rgb en componentes. Si falta un token, agregarlo a
  `variables.scss` (o al partial correspondiente si ya está modularizado con `@forward`).

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
// assets/styles/variables.scss
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

h1 { color: light-dark(green, #09f); } // primer valor = claro, segundo = oscuro

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
   variables Less vía `modifyVars` en la config de `less-loader`, o partiendo de un preset
   (`ng-zorro-antd/dark-theme`, `ng-zorro-antd/compact-theme`). No toca el SCSS de ningún
   componente de la app.
2. **Tema dinámico con CSS variables (experimental)** — NG-ZORRO expone también un modo de tema
   basado en custom properties para cambiar de tema en runtime sin recompilar Less (útil para un
   toggle claro/oscuro). Está marcado experimental por el equipo de NG-ZORRO: evaluarlo antes de
   adoptarlo como única vía.
3. **Clases globales con prefijo del equipo** — para un ajuste puntual a una instancia particular
   (no un token global): agregar una hoja de estilos **global** (fuera de la encapsulación de
   cualquier componente, registrada en `angular.json` → `styles`) con una clase prefijada por el
   equipo, y aplicarla como clase del propio elemento NG-ZORRO:

```scss
// assets/styles/nz-overrides.scss (global, listada en angular.json → styles[])
.mrx-select--compact .ant-select-selector {
  min-height: 28px;
}
```

```html
<!-- feature.html -->
<nz-select class="mrx-select--compact" ...></nz-select>
```

   La hoja global no está encapsulada, así que puede alcanzar el DOM interno de `nz-select` sin
   `::ng-deep`; la clase con prefijo evita que la regla se filtre a otras instancias de `nz-select`
   en la app. Si el override necesita convivir con estilos globales de terceros, envolverlo en
   `@layer` (ver [13-css3-layouts-animations.md](./13-css3-layouts-animations.md) §13.8) para
   controlar explícitamente quién gana.
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
// assets/styles/_mixins.scss
@mixin motion-safe($transition) {
  transition: $transition;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
```

```scss
@use '../../../../assets/styles/mixins' as mixins;

.tarjeta {
  @include mixins.motion-safe(transform 0.2s ease);
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

---
