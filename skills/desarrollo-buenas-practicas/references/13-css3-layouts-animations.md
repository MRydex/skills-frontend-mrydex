## 13. CSS3 — Fundamentos, layouts y animaciones

### Índice

- 13.1 Sintaxis, selectores y combinadores
- 13.2 Modelos de color modernos
- 13.3 Motor de CSS: herencia, especificidad y cascada
- 13.4 Modelo de la caja (box model)
- 13.5 Overflow y flujo
- 13.6 Posicionamiento (`position`)
- 13.7 Profundidad y apilamiento (`z-index`)
- 13.8 Cascada en capas (`@layer`)
- 13.9 Selectores relacionales (`:has()`)
- 13.10 Encapsulado de estilos (`@scope`)
- 13.11 Patrón de contenedor responsive del equipo
- 13.12 Flexbox (unidimensional)
- 13.13 Grid (bidimensional)
- 13.14 Container queries (`@container`)
- 13.15 Anchor positioning
- 13.16 Transiciones (cambio de estado)
- 13.17 Animaciones por keyframes
- 13.18 Animaciones ligadas al scroll (sin JavaScript)
- 13.19 Animar aparición/desaparición de elementos discretos (`@starting-style`)
- 13.20 `<select>`/`<option>` personalizables (`appearance: base-select`)
- 13.21 Auto-resize de `<textarea>` con `field-sizing`
- 13.22 Carruseles sin JavaScript (`::scroll-marker`/`::scroll-button`)
- 13.23 Accesibilidad y rendimiento
- 13.24 Imágenes de fondo por densidad de pantalla (`image-set()`)
- 13.25 Entrada/salida en Angular (`animate.enter` / `animate.leave`) con un solo `@keyframes`
- 13.26 Medios sin layout shift (`aspect-ratio` + `object-fit`)
- 13.27 Unidades de viewport dinámicas (`dvh`, `svh`, `lvh`)
- 13.28 Gráficos simples con `conic-gradient()`
- 13.29 Contadores animados sin JavaScript (`@property` + `counter()`)
- 13.30 Transiciones entre rutas (`withViewTransitions`)

> Este archivo cubre CSS genérico (aplica a cualquier stack). Para convenciones SCSS del equipo en
> Angular (`@use`/`@forward`, BEM, `:host`, encapsulación, theming de NG-ZORRO) ver
> [07-styles-scss.md](./07-styles-scss.md).

### 13.1 Sintaxis, selectores y combinadores

- **Anatomía**: `Selector { propiedad: valor; }`. Cada par propiedad-valor es una **declaración**.
- **Comentarios**: solo `/* bloque */`. La sintaxis `//` **no** es válida en CSS puro (sí en SCSS).
- **Selectores básicos**: etiqueta (`h1`), clase (`.clase`), id (`#id`). Restringir IDs en CSS para
  favorecer la reutilización de clases.
- **Combinadores**:
  - `A > B` → hijo directo (primer nivel inferior).
  - `A + B` → hermano adyacente inmediato posterior.
  - `A ~ B` → todos los hermanos posteriores que comparten padre.

### 13.2 Modelos de color modernos

- **Hex corto**: `#09f` ≡ `#0099ff`; admite transparencia con canales extra (8 dígitos).
- **RGB moderno**: `rgb(r g b / opacidad)` (sin comas) reemplaza a `rgba()`.
- **HSL / OKLCH**: basados en percepción visual (Hue, Chroma, Lightness). `oklch()` accede a gama
  ampliada **Wide Gamut P3**.
- **`currentcolor`**: palabra clave que hereda dinámicamente el valor de `color` del contexto
  actual.

### 13.3 Motor de CSS: herencia, especificidad y cascada

- **Herencia**: propiedades que se propagan de padre a hijo (`font-family`, `color`, `font-size`…).
  Las físicas/estructurales (`border`, `background`) **no** heredan.
- **Reinicios**: `inherit` (fuerza herencia), `initial` (valor por defecto de la spec), `revert`
  (estilos por defecto del navegador).
- **Cascada**: a igualdad de selectores, **gana la regla declarada más abajo** en el archivo (base
  para fallbacks y mejora progresiva).
- **Especificidad**: peso calculado en tres niveles → **(IDs, Clases/Pseudoclases/Atributos,
  Elementos)**.
  - Los **inline styles** ganan a cualquier selector del archivo.
  - **`!important`** rompe el cálculo de especificidad; es un **code smell** a evitar salvo
    excepción justificada.
  - `@layer` (§13.8) se resuelve **antes** que la especificidad: una capa declarada más abajo gana
    a una declarada más arriba sin importar cuán específico sea el selector, pero cualquier regla
    **sin capa** le gana siempre a cualquier regla en capa.

### 13.4 Modelo de la caja (box model)

- **Comportamiento**:
  - `display: inline` → sigue el flujo de lectura; **ignora** `width`/`height`.
  - `display: block` → apila de arriba a abajo; **respeta** tamaño físico.
- **Componentes**: `content box` (contenido) → `padding` (relleno interno) → `border` (borde) →
  `margin` (separación externa, no se renderiza, empuja cajas colindantes).
- **`box-sizing`**:
  - `content-box` (por defecto) → tamaño final = **ancho declarado + padding + borde** (causa
    desajustes frecuentes vs. el diseño).
  - **`border-box`** (estándar de la industria) → padding y borde **dentro** del ancho/alto
    declarado. Los navegadores mantienen `content-box` por retrocompatibilidad histórica.

```css
/* reset recomendado */
*, *::before, *::after { box-sizing: border-box; }
```

### 13.5 Overflow y flujo

- `overflow`:
  - `visible` (default) → el contenido sobresale de la caja.
  - `hidden` → recorta el sobrante (queda inaccesible).
  - `scroll` → barras **permanentes**, haya o no desbordamiento.
  - `auto` → barras **solo** si hace falta.
- `text-overflow: ellipsis;` → corta texto de una línea (con `overflow: hidden`) y agrega `…`.
- **Texto que no entra no rompe la UI.** Un email, URL, CUIT, código o nombre largo sin espacios
  estira la columna, desborda la card o genera scroll horizontal. Todo texto que viene del back o
  del usuario (celdas de tabla, cards, títulos, chips, mensajes) se corta dentro de su caja:

  ```scss
  .item-card {
    min-width: 0;                // hijo de flex/grid: sin esto no se achica por debajo del texto

    &__title {
      overflow-wrap: anywhere;   // corta palabras largas solo si no entran
    }
  }
  ```

  - `overflow-wrap: anywhere` reemplaza a `word-break: break-word`: hace lo mismo y además deja
    achicar la caja en flex, grid y tablas. Se cambia la **propiedad**, no solo el valor:

    ```scss
    // ❌
    word-break: break-word;   // deprecado (Sonar css:S1874)
    word-break: break-all;    // corta todas las palabras aunque entren
    word-break: word-break;   // inválido: no es un valor de word-break

    // ✅
    overflow-wrap: anywhere;
    ```

    Fallback para navegadores viejos: `overflow-wrap: break-word` (corta igual, pero no deja
    achicar la caja en flex ni en tablas).
  - En hijos de flex o grid, sumar `min-width: 0` (o `minmax(0, 1fr)` en la columna). Por defecto
    no se achican por debajo de su contenido y el corte no llega a aplicarse.
  - Si el diseño pide una sola línea, usar `text-overflow: ellipsis` y el tooltip de §3.8 en vez de
    cortar.
- `content-visibility: auto;` → optimización tipo *lazy load del DOM*: el navegador omite render y
  pintado de nodos complejos fuera del viewport.

### 13.6 Posicionamiento (`position`)

- `static` (default) → flujo natural según el orden del HTML.
- `relative` → mantiene su lugar en el flujo, pero habilita coordenadas (`top/left/right/bottom`) y
  crea **punto de anclaje** para hijos `absolute`.
- `absolute` → **sale** del flujo (no ocupa espacio); se posiciona respecto al primer ancestro con
  `position` distinta de `static` (o al documento si no hay ninguno).
- `fixed` → anclado al **viewport**; inmóvil ante el scroll.
- `sticky` → híbrido: estático hasta alcanzar una coordenada (`top: 0`), entonces se adhiere,
  moviéndose **dentro de los límites de su caja padre**.
- Para posicionar un elemento relativo a **otro elemento arbitrario del DOM** (no un ancestro), ver
  *anchor positioning* (§13.15) en vez de recurrir a JS.

### 13.7 Profundidad y apilamiento (`z-index`)

- **Eje Z**: las interfaces operan en capas ficticias de profundidad donde los elementos se
  solapan.
- **Stacking context**: capas de aislamiento creadas automáticamente bajo ciertas condiciones
  (`position: fixed`, `opacity < 1`, `transform`, filtros de desenfoque, contenedores flex/grid
  modernos…).
- `z-index` (entero, admite negativos) ordena la superposición. **Solo** funciona en elementos con
  un stacking context activo (ej. inyectando antes un `position: relative`).

### 13.8 Cascada en capas (`@layer`)

**Baseline, soporte amplio** (todos los motores desde marzo de 2022). `@layer` da control
explícito sobre el orden de la cascada, **independiente de la especificidad y del orden en el
archivo**: se declara el orden de las capas una sola vez, y después cada regla se asigna a su capa.

```css
@layer reset, base, components, overrides; /* orden declarado una sola vez, arriba de todo */

@layer reset {
  * { margin: 0; padding: 0; }
}

@layer components {
  .boton { padding: 8px 16px; }
}

@layer overrides {
  .boton { padding: 12px 20px; } /* gana por estar en una capa posterior, no por especificidad */
}
```

- Una capa posterior en el orden declarado **siempre** gana a una anterior, sin importar cuántas
  clases o IDs tenga el selector de la capa anterior.
- **Cualquier regla sin `@layer` (no capada) le gana a todas las reglas en capas**, sin importar el
  orden. Por eso conviene meter *todo* el CSS de la app en capas explícitas si se va a usar
  `@layer`: mezclar reglas capadas y no capadas reintroduce el problema de especificidad que
  `@layer` busca evitar.
- Caso de uso del equipo: ordenar de forma determinística los estilos globales de NG-ZORRO frente a
  los overrides propios (ver [07-styles-scss.md](./07-styles-scss.md) §7.5), sin pelear con la
  especificidad de las clases internas de la librería.

### 13.9 Selectores relacionales (`:has()`)

**Baseline, soporte amplio** (todos los motores desde diciembre de 2023). `:has()` es un
pseudo-selector relacional: selecciona un elemento **según lo que contiene**, algo que antes solo
se podía resolver con JavaScript.

```css
/* la tarjeta que contiene una imagen recibe padding extra */
.tarjeta:has(img) { padding-block-end: 0; }

/* estilar un label según el estado del input asociado, sin JS */
label:has(+ input:invalid) { color: var(--color-error); }

/* "cuantificador": contenedor con más de un hijo */
.lista:has(> li:nth-child(2)) { gap: 24px; }
```

- Acepta selector relativo (`:has(> img)`, `:has(+ input)`, `:has(~ .badge)`) además del
  descendiente implícito (`:has(img)`).
- **Rendimiento**: los motores lo optimizan, pero un `:has()` muy amplio aplicado a todo el
  documento (`body:has(...)`) en listas grandes puede ser costoso; acotar el selector base todo lo
  posible.

### 13.10 Encapsulado de estilos (`@scope`)

**Baseline desde marzo de 2026** (recién soportado en los tres motores — es una feature nueva:
probar igual en el navegador mínimo del proyecto). `@scope` limita un bloque de reglas a un
subárbol del DOM, delimitado por una **raíz** y, opcionalmente, un **límite**:

```css
@scope (.feature) {
  :scope { background: rebeccapurple; } /* :scope = la raíz, .feature */

  figure { border: 2px solid black; }
}

/* "donut scope": aplica dentro de .feature pero NO dentro de figure */
@scope (.feature) to (figure) {
  img { border: 5px solid black; }
}
```

- Sin límite (`to (...)`), el scope llega hasta el final del subárbol de la raíz.
- Con límite, crea un "donut": las reglas no alcanzan a los descendientes que están dentro del
  elemento límite, aunque sí a los que están fuera de él pero dentro de la raíz.
- Es una alternativa a subir el número de niveles de anidamiento en SCSS (§7.3) solo para acotar el
  alcance de un bloque de estilos globales de terceros o de una hoja de overrides
  ([07-styles-scss.md](./07-styles-scss.md) §7.5), sin pelear con especificidad.

---

### 13.11 Patrón de contenedor responsive del equipo

Antes de pensar en media queries, encuadrar el contenido con esta receta simple y robusta:

1. **Definir un ancho y alto** para el contenedor (idealmente con techo: `max-width`, `min-height`).
2. **Padding lateral fijo** que se respeta en **todos** los tamaños (que el contenido nunca toque el
   borde).
3. A partir de ahí, **acomodar el contenido con `%`, `vw` o `vh`** (medidas relativas), no con píxeles
   rígidos.

```css
.contenedor {
  width: 100%;
  max-width: 1200px;        /* techo */
  min-height: 60vh;
  margin-inline: auto;      /* centrado */
  padding-inline: 24px;     /* padding lateral fijo, idéntico en todo breakpoint */
  box-sizing: border-box;
}

.contenedor__panel { width: 60%; }   /* el contenido se reparte con % / vw / vh */
.contenedor__hero  { height: 50vh; }
```

> Combinar con tokens fluidos `clamp()` ([07-styles-scss.md](./07-styles-scss.md) §7.2) y Grid
> `auto-fit`/`minmax` (§13.13) cubre la mayoría de los layouts **sin** media queries.

### 13.12 Flexbox (unidimensional)

Distribuye y alinea elementos en **un solo eje** por contenedor (fila o columna).

```css
.contenedor {
  display: flex;            /* hijos directos → flexibles */
  flex-direction: row;      /* row | column | row-reverse | column-reverse */
  flex-wrap: wrap;          /* nowrap (encoge) | wrap (salta de línea) */
  gap: 16px;                /* separación interna, sin márgenes complejos */

  justify-content: space-between; /* eje PRINCIPAL: center | space-around | space-evenly… */
  align-items: center;            /* eje CRUZADO */
  align-content: center;          /* alinea LÍNEAS cuando hay wrap */
}
```

- **Tamaño de los hijos**:
  - `flex-grow` → proporción de expansión sobre el espacio sobrante.
  - `flex-shrink` → capacidad de reducción si falta espacio.
  - `flex-basis` → tamaño base inicial antes de grow/shrink.
  - **`flex: 1;`** ≡ `flex-grow: 1; flex-shrink: 1; flex-basis: 0%;` → iguala simétricamente los
    hijos.
- `order` → reordena visualmente sin alterar el orden del HTML (cuidado con accesibilidad/lectura).
- `align-self` → un hijo anula el `align-items` del padre.

### 13.13 Grid (bidimensional)

Control simultáneo de **filas y columnas**.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);  /* 3 columnas iguales */
  grid-template-rows: 100px auto;
  gap: 16px;
}
```

- **`fr`** → fracción del espacio libre tras restar tamaños fijos.
- **`repeat(n, valor)`** → abrevia patrones (`repeat(3, 25px 50px)`).
- **`minmax(min, max)`** → acota una celda entre un mínimo y un máximo elástico.
- **Responsive sin media queries**:

```css
/* tantas columnas como quepan, mínimo 200px, repartiendo el resto */
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
```

  - **`auto-fill`** → conserva celdas vacías aunque no haya contenido.
  - **`auto-fit`** → colapsa las vacías y estira las activas hasta ocupar todo el ancho.
- `grid-auto-rows` → alto por defecto de filas creadas dinámicamente.
- **Posicionamiento por líneas**:
  - `grid-column` / `grid-row` con líneas numeradas (`grid-column: 1 / -1` → ancho completo).
  - `span n` → expande el elemento `n` celdas.
- **Superposición nativa**: Grid permite solapar elementos en las mismas coordenadas **sin**
  `position: absolute`.
- **Áreas declarativas**: `grid-template-areas` (en el padre) + `grid-area` (en los hijos) dibujan
  el layout como un mapa de texto; usar `.` para una celda vacía intencional.

### 13.14 Container queries (`@container`)

**Baseline, soporte amplio** (todos los motores desde febrero de 2023). A diferencia de `@media`,
que mide el **viewport**, `@container` mide el tamaño (o el estilo) de un **contenedor ancestro**
elegido explícitamente — clave para componentes reutilizables cuyo layout depende de dónde se
insertan, no del tamaño de la pantalla.

```css
.post {
  container-type: inline-size; /* habilita consultas de tamaño sobre el eje inline (ancho) */
  container-name: summary;     /* opcional: para apuntar a este contenedor por nombre */
}

@container summary (width >= 400px) {
  .card { font-size: 1.5em; }
}

/* forma corta: container: <nombre> / <tipo> */
.post { container: summary / inline-size; }
```

- **`container-type`**: `inline-size` (solo ancho — el más usado, evita ciclos de layout),
  `size` (ancho y alto, requiere que el contenedor tenga tamaño definido), `normal` (no genera
  contexto de tamaño, pero sí permite *container style queries*).
- **Unidades de contenedor**: `cqw`, `cqh`, `cqi`, `cqb`, `cqmin`, `cqmax` — igual que `vw`/`vh` pero
  relativas al contenedor consultado en vez del viewport.
- **Container *style* queries** — consultan una custom property del contenedor en vez de su
  tamaño; reemplazan el uso de `:host-context()` (deprecado, ver
  [07-styles-scss.md](./07-styles-scss.md) §7.4) para propagar un "tema" a varios niveles de
  descendientes:

```css
@container style(--tema: oscuro) {
  .card { background: black; color: white; }
}
```

### 13.15 Anchor positioning

Módulo que permite atar el tamaño/posición de un elemento a **otro elemento arbitrario del DOM**
(el "ancla"), sin librerías de posicionamiento en JS (Popper/Floating UI) ni cálculos manuales de
`getBoundingClientRect`. Propiedades principales: `anchor-name`, `anchor-scope`, `position-anchor`,
`position-area`, `position-try-fallbacks` / `position-try-order` (shorthand: `position-try`),
`position-visibility`.

```css
.boton-trigger {
  anchor-name: --btn; /* el ancla se nombra con un <dashed-ident> */
}

.tooltip {
  position: fixed;                  /* o absolute */
  position-anchor: --btn;           /* se ata al ancla por nombre */
  position-area: top;               /* ubicación relativa al ancla */
  position-try-fallbacks: flip-block, flip-inline; /* alternativas si no entra en el viewport */
}
```

- Pensado para tooltips, popovers, menús y comboboxes anclados a su disparador.
- **Soporte todavía no es Baseline** al momento de escribir esto: confirmar en caniuse.com/MDN el
  estado exacto por navegador antes de usarlo como único mecanismo de posicionamiento, y envolver
  en `@supports (anchor-name: --a)` para degradar a un posicionamiento fijo/absoluto tradicional
  donde falte soporte.

---

### 13.16 Transiciones (cambio de estado)

Interpolan suavemente entre dos estados (ej. base → `:hover` / `:focus`).

```css
.card {
  transition-property: transform, opacity; /* evitar `all`: fuerza a evaluar props caras */
  transition-duration: 0.3s;               /* s o ms */
  transition-delay: 0s;
  transition-timing-function: ease-in-out;
}
```

- **Timing functions**: `linear` (constante), `ease-in` (lento→rápido), `ease-out`
  (rápido→lento), `ease-in-out` (suave en extremos), `steps(n)` (fotogramas discretos, look retro),
  `cubic-bezier(x1,y1,x2,y2)` (curva custom con rebotes).
- **Asimetría de retorno** (truco ergonómico): duración larga en `:hover` y corta en la base →
  entrada pausada, salida veloz.

```css
.card { transition: transform 0.3s; }
.card:hover { transition: transform 1s; transform: scale(1.05); }
```

#### Animar a `auto` / tamaños intrínsecos (`interpolate-size`)

Por defecto el navegador **no sabe interpolar** entre una longitud concreta y un keyword intrínseco
(`auto`, `min-content`, `max-content`, `fit-content`): `height: 0 → height: auto` pega un salto seco.
`interpolate-size: allow-keywords` habilita esa interpolación. Como la propiedad se **hereda**, se
activa para todo el documento desde `:root`.

```scss
:root {
  interpolate-size: allow-keywords;
}

.panel {
  height: 0;
  overflow: clip;
  transition: height 0.3s ease;

  &.is-open {
    height: auto;   // ahora SÍ transiciona, en vez de saltar
  }
}
```

- **Un extremo debe ser una longitud concreta** (`0`, `px`, `%`). No se puede interpolar entre **dos**
  keywords intrínsecos. Si además necesitás aritmética sobre el tamaño intrínseco (`auto + 2rem`),
  usá `calc-size()`.
- Vale igual para `width` y para `min-content` / `max-content` / `fit-content`.
- **Soporte: todavía no es Baseline** ("limited availability" en MDN): funciona en navegadores
  basados en Chromium; Firefox y Safari aún no lo implementan. Envolver en `@supports` para
  *enhancement* progresivo: donde no está, el contenido se muestra/oculta igual, solo que sin
  animar.

```scss
@supports (interpolate-size: allow-keywords) {
  :root { interpolate-size: allow-keywords; }
}
```

- **Alternativa cross-browser** (sin esperar a Firefox/Safari): el truco del grid
  `grid-template-rows: 0fr → 1fr` sobre un wrapper con `overflow: hidden`, que sí anima hoy en todos
  los navegadores.
- **Ojo con el contenedor**: si la animación de despliegue "no se ve", la causa más común es que
  falta `overflow: hidden` / `clip` en el elemento que se anima.

### 13.17 Animaciones por keyframes

```css
@keyframes pulso {
  from { transform: scale(1); opacity: 1; } /* o 0% */
  to   { transform: scale(1.4); opacity: 0; } /* o 100% */
}

.notificacion::after {
  animation-name: pulso;
  animation-duration: 1.5s;
  animation-iteration-count: infinite;   /* nº de ciclos o `infinite` */
  animation-direction: alternate;        /* normal | reverse | alternate | alternate-reverse */
  animation-play-state: running;         /* running | paused (ej. pausar en :hover) */
  animation-fill-mode: both;             /* ver abajo */
}
```

- **`animation-fill-mode`**:
  - `none` (default) → al terminar vuelve a los estilos del CSS ordinario.
  - `forwards` → retiene el último keyframe (`to`/`100%`).
  - `backwards` → adopta el primer keyframe (`from`/`0%`) durante el `animation-delay`.
  - `both` → combina ambos; evita parpadeos al inicio/fin.
- **Pseudo-elementos** (`::before`/`::after`) con escala + opacidad → efectos radar, pulsos de
  notificación o anillos concéntricos con costo mínimo.

### 13.18 Animaciones ligadas al scroll (sin JavaScript)

**Baseline Newly Available desde noviembre de 2025** (Chrome/Edge 115+, Safari 26+, Firefox 145+).
Reemplazan los listeners de scroll y el `IntersectionObserver` para animar por scroll: corren en el
compositor, fuera del hilo principal, y en zoneless Angular no participa (sin change detection).

#### Modelo mental

Las keyframes son las de siempre. Lo único que cambia es el **reloj**: en vez de segundos, el progreso
lo da una *timeline* de scroll.

- `scroll()` → *Scroll Progress Timeline*: 0 % arriba del scroller, 100 % abajo.
- `view()` → *View Progress Timeline*: 0 % cuando el elemento empieza a entrar al scrollport, 100 %
  cuando terminó de salir.
- `animation-range` → recorta qué tramo de esa timeline cubre la animación.

```css
/* Barra de progreso de lectura */
.progreso {
  transform-origin: 0 50%;
  animation: crecer linear both;
  animation-timeline: scroll(root block);
}
@keyframes crecer { from { scale: 0 1; } }

/* Scroll reveal: el estado estático es el final; el inicial va en `from` */
.reveal {
  animation: aparecer linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}
@keyframes aparecer { from { opacity: 0; translate: 0 2rem; } }
```

Reglas:
- Sin `animation-duration` (o `auto`): con `animation-timeline` la duración no significa nada.
- El shorthand `animation:` **resetea** `animation-timeline` y `animation-range` a su valor inicial:
  escribirlos siempre **después** del shorthand.
- `animation-fill-mode: both` y `animation-timing-function: linear`: el estado inicial y final quedan
  aplicados fuera del rango, y el easing lo pone el usuario con la mano.
- El **estado estático** del elemento es el **final** y el inicial va solo en `from`. Así, sin soporte
  (`animation-timeline` se ignora y la animación de 0 s termina en `to`) y con el reset de
  `prefers-reduced-motion` (§13.23, `animation: none`) el contenido se ve completo, nunca oculto.
- Animar solo `transform` / `translate` / `scale` / `rotate`, `opacity`, `clip-path`, `filter` y custom
  properties con `@property`. Nada de layout (§13.23).

#### Sintaxis

```css
animation-timeline: scroll(<scroller> <axis>) | view(<axis> <inset>) | --nombre | auto | none;
/* scroller: nearest (default) | root | self        axis: block (default) | inline | x | y */
/* inset: auto | <length-percentage>{1,2} → achica el área que cuenta como "visible" */

animation-range: <start> <end>;            /* shorthand de animation-range-start / -end */

scroll-timeline: --nombre block;           /* en el scroller */
view-timeline: --nombre block;             /* en el elemento observado */
timeline-scope: --nombre;                  /* en un ancestro común, si el animado no es descendiente */
```

Rangos de `animation-range` (solo con `view()`):

| Rango | De | A |
| :--- | :--- | :--- |
| `cover` (default) | empieza a entrar | terminó de salir |
| `contain` | está completo adentro | empieza a salir |
| `entry` | empieza a entrar | está completo adentro |
| `exit` | empieza a salir | terminó de salir |
| `entry-crossing` / `exit-crossing` | el borde inicial cruza el borde del scrollport | el borde final lo cruza |

Se combinan con porcentajes (`entry 0% contain 50%`, `exit 0% exit 70%`) y también van **dentro de los
keyframes**, para una sola animación con fase de entrada y de salida:

```css
@keyframes fade-in-out {
  entry 0%   { opacity: 0; }
  entry 100% { opacity: 1; }
  exit  0%   { opacity: 1; }
  exit  100% { opacity: 0; }
}
```

#### Timelines con nombre (patrón del equipo)

El scroller o la sección define la timeline; los hijos la consumen. Es la forma de animar varios
elementos contra el **mismo** progreso.

```css
/* Hero cuyo título se parte al salir */
.hero { view-timeline: --hero; }

.hero-title span {
  animation: split-left linear both;
  animation-timeline: --hero;
  animation-range: exit 0% exit 70%;
}
.hero-title span:last-child { animation-name: split-right; }

@keyframes split-left  { to { translate: -60% 0; opacity: 0; filter: blur(16px); } }
@keyframes split-right { to { translate:  60% 0; opacity: 0; filter: blur(16px); } }
```

Si el elemento animado no es descendiente del que declara la timeline, subir `timeline-scope: --hero`
al ancestro común.

#### Sección alta + `sticky`: progreso repartido entre N hijos

Base del *scrollytelling*: una sección con `height` grande (`320vh`, `520vh`) declara la
`view-timeline`; adentro un hijo `position: sticky` queda fijo mientras la sección atraviesa el
viewport, y cada ítem toma **su tramo** del rango con `calc()` sobre custom properties.

```css
/* Texto que se ilumina palabra por palabra */
.words { height: 320vh; view-timeline: --words; }
.words-sticky { position: sticky; top: 0; height: 100vh; display: grid; place-items: center; }

/* --i = índice de la palabra, --n = total (en el padre) */
.words-text span {
  animation: light linear both;
  animation-timeline: --words;
  animation-range:
    contain calc(var(--i) / var(--n) * 85%)
    contain calc(var(--i) / var(--n) * 85% + 15%);
}
@keyframes light { from { opacity: .12; filter: blur(4px); } }
```

En Angular, `--i` y `--n` salen del `@for`, nunca de `:nth-child` ni de clases generadas:

```html
<section class="words" [style.--n]="palabras().length">
  <div class="words-sticky">
    <p class="words-text">
      @for (p of palabras(); track $index) {
        <span [style.--i]="$index">{{ p }} </span>
      }
    </p>
  </div>
</section>
```

El mismo patrón resuelve: stepper o cronología vertical cuyo conector se llena (`scaleY` con
`scroll(root)` y umbrales por `--i`), tarjetas apiladas (`sticky` + `scale`), scroll horizontal dentro
de vertical (`translateX` del hijo sticky con `view()` de la sección), carrusel con indicador
(`scroll(self inline)`, §13.22).

#### Propiedades no animables: `@property`

Con `@property` cualquier custom property tipada se vuelve interpolable (§13.29), y con eso se animan
por scroll cosas que CSS no anima solo: ejes de una fuente variable, contadores, ángulos de gradientes.

```css
/* Fuente variable que cambia con el scroll */
@property --elsh { syntax: "<integer>"; inherits: true; initial-value: 0; }

.morph { height: 520vh; view-timeline: --morph; }
.morph-sticky {
  position: sticky; top: 0;
  animation: morph linear both;
  animation-timeline: --morph;
  animation-range: contain;
}
.morph-word { font-variation-settings: "ELSH" var(--elsh); }
@keyframes morph { to { --elsh: 100; } }
```

Mismo mecanismo para el contador de §13.29 ligado a `scroll()`, un `conic-gradient` de §13.28 que se
completa al scrollear, o `hue-rotate` / `color` del texto por tramos.

#### Catálogo, límites y fallback

Patrones CSS-only ya resueltos (demos, visualizadores de rangos y extensión de DevTools en
<https://scroll-driven-animations.style>): reading progress, carrusel con indicador y con markers,
columnas en sentido inverso, cover card → header fijo, image reveal (`clip-path`), fly-in / fly-out de
listas (`entry` + `exit`), cover flow (`view(inline)` + `rotateY`), stacking cards, sección horizontal,
3D que rota con `scroll()`, header que se achica tras N px (`animation-range: 0 100px`), scroll
shadows (`scroll(self)`), timeline / stepper, texto palabra por palabra, typewriter
(`clip-path: inset()`), sprites `steps(N)` por `background-position`, line drawing SVG
(`stroke-dashoffset`), blur progresivo de fondo, parallax por capas.

Lo que **todavía necesita JS**: una animación que se *dispare* por scroll y corra con tiempo (no hay
`animation-trigger` estable). Alternativas, en orden: `animation-range: entry 0% entry 100%` + `both`
(parece disparada), `@starting-style` + `transition` (§13.19) y, como última opción,
`IntersectionObserver`.

Fallback: con el estado estático como final (regla de arriba) el contenido ya se ve completo sin
soporte. `@supports` queda para lo que sí cambia el layout, como las secciones altas:

```css
@supports not (animation-timeline: scroll()) {
  .words, .morph { height: auto; }         /* sin la timeline, la altura extra solo alarga la página */
  .words-sticky, .morph-sticky { position: static; height: auto; }
}
```

El polyfill `flackr/scroll-timeline` solo si el proyecto exige versiones anteriores a las de
Baseline (§11.5: no se suma sin pedido).

Referencias: <https://developer.chrome.com/docs/css-ui/scroll-driven-animations> ·
<https://drafts.csswg.org/scroll-animations-1/>.

### 13.19 Animar aparición/desaparición de elementos discretos (`@starting-style`)

**Baseline desde agosto de 2024.** Para animar algo que entra y sale del DOM (un `<dialog>`, un
popover), hace falta combinar tres piezas: el **estado inicial** con `@starting-style`, y permitir
animar las propiedades **discretas** (`display`, `overlay`) con
`transition-behavior: allow-discrete`.

```css
dialog {
  /* allow-discrete: permite animar display/overlay (de none↔block, top-layer↔normal) */
  transition: scale 0.3s ease, display 0.3s ease allow-discrete, overlay 0.3s ease allow-discrete;
}

dialog[open] {
  scale: 1;
  transition: scale 0.3s ease-in-out, display 0.3s ease-in-out allow-discrete, overlay 0.3s ease-in-out allow-discrete;

  /* estado DESDE el que arranca la animación de entrada */
  @starting-style {
    scale: 0;
  }
}
```

- `@starting-style` → define el valor de partida la **primera** vez que el elemento se renderiza
  (sin él, no hay desde dónde interpolar y el navegador "salta" al estado final).
- `transition-behavior: allow-discrete` → habilita transicionar propiedades que normalmente no se
  animan (`display`, `overlay`), evitando que el elemento desaparezca de golpe al cerrarse.

### 13.20 `<select>`/`<option>` personalizables (`appearance: base-select`)

Con `appearance: base-select` el navegador entrega un `<select>` totalmente estilizable, con
pseudo-elementos para el ícono (`::picker-icon`), el popup (`::picker(select)`) y el check de la
opción (`::checkmark`), más la pseudo-clase `:open`.

```css
select {
  appearance: base-select;          /* opt-in al select personalizable */
  cursor: pointer;
  border: 1px solid #fff;
  color: #fff;
  border-radius: 0;
  outline: none;
  padding: 5px 10px;

  &:hover { background: none; }

  &::picker-icon { transition: 0.2s; }
  &:open::picker-icon { transform: rotate(180deg); }   /* flecha gira al abrir */

  &::picker(select) {
    appearance: base-select;
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity 0.2s, transform 0.2s,
                display 0.2s allow-discrete, overlay 0.2s allow-discrete;
    border: none;
    outline: none;
    border-radius: 4px;
    padding: 5px;
  }

  &:open::picker(select) {
    opacity: 1;
    transform: translateY(0);

    @starting-style {       /* punto de partida de la animación de apertura */
      opacity: 0;
      transform: translateY(-10px);
    }
  }
}

option {
  padding: 5px 10px;
  cursor: pointer;
  transition: opacity 0.2s ease-in-out, background-color 0.2s ease-in-out;
  border-radius: 4px;

  &::checkmark { display: none; }        /* ocultar el check nativo si se quiere */
  &:checked { font-weight: bold; background-color: #e6f0fa; }
  &:hover { opacity: 0.8; }
}
```

- **Soporte: todavía no es Baseline**, es muy reciente (Chromium primero). **Mejora progresiva**
  obligatoria: proveer siempre un `<select>` con estilo base aceptable para navegadores sin
  soporte (el `appearance: base-select` simplemente no se aplica ahí, y el select nativo sigue
  funcionando).
- Referencia: <https://developer.chrome.com/blog/a-customizable-select>

### 13.21 Auto-resize de `<textarea>` con `field-sizing: content`

**Baseline desde junio de 2026** (recién soportado en los tres motores). Para que un `textarea`
(o `input`) crezca/encoja según su contenido **sin JS**:

```css
textarea {
  field-sizing: content;     /* el campo se ajusta a su contenido */
  min-height: 3lh;           /* fallback razonable para navegadores viejos */
  max-height: 12lh;
}
```

- Al ser una feature Baseline muy reciente, seguir probando el navegador mínimo soportado por el
  proyecto (versiones anteriores a mediados de 2026 no lo implementan); el `min-height`/`max-height`
  como fallback no rompe nada donde sí hay soporte.

### 13.22 Carruseles sin JavaScript (`::scroll-marker`/`::scroll-button`)

Los carruseles modernos se arman con CSS puro: `scroll-snap` para el desplazamiento por slides, más
los pseudo-elementos de **CSS Overflow Level 5** para los controles — sin ninguna librería de JS.

```css
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-marker-group: after;        /* agrupa los "dots" generados después del contenedor */
}

.carousel > .slide {
  scroll-snap-align: center;

  &::scroll-marker {
    content: "";                     /* obligatorio: sin content no se genera el pseudo-elemento */
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: gray;
  }

  &::scroll-marker:target-current {  /* resalta el "dot" del slide visible */
    background: black;
  }
}

.carousel::scroll-button(left)  { content: "◀"; } /* botón de navegación, generado si content != none */
.carousel::scroll-button(right) { content: "▶"; }
```

- `::scroll-marker` → genera un marcador de scroll ("dot") por cada elemento; se agrupa en
  `::scroll-marker-group` del contenedor con scroll más cercano.
- `::scroll-button(direction)` → botón de navegación del contenedor con scroll (`left`, `right`,
  `up`, `down`, `block-start`, etc. según el eje); se genera solo si `content` no es `none`.
- `:target-current` → pseudo-clase que identifica el marcador correspondiente al slide actualmente
  visible, para resaltarlo.
- **Soporte: todavía no es Baseline** ("limited availability" en MDN, experimental, Chromium
  primero). Usar `@supports selector(::scroll-marker)` para degradar a botones de navegación
  propios donde falte soporte.
- Para prototipar visualmente la estructura antes de escribir el CSS a mano, el configurador oficial
  de Chrome ayuda: <https://chrome.dev/carousel-configurator/>.

### 13.23 Accesibilidad y rendimiento

- **`@media (prefers-reduced-motion: reduce)`**: anular o simplificar animaciones/transiciones para
  usuarios con sensibilidad visual, cinetosis o epilepsia.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

- En Angular, centralizar este reset una sola vez a nivel global y, en componentes, envolver
  transiciones puntuales con el mixin del proyecto si existe (ver
  [07-styles-scss.md](./07-styles-scss.md) §7.7: si no existe, se crea al segundo uso).
- **Tipografía**: `text-wrap: balance;` (títulos equilibrados) y `text-wrap: pretty;` (evita
  palabras huérfanas al final del párrafo).
- **Performance**: animar preferentemente `transform` y `opacity` (compositor/GPU); evitar animar
  layout (anchos, márgenes, sombras).

### 13.24 Imágenes de fondo por densidad de pantalla (`image-set()`)

`background-image` no tiene `srcset`. `image-set()` (Baseline) deja que el navegador elija la imagen
según la densidad de la pantalla y el formato que soporta, y descarga **solo una**.

```css
.hero {
  background-image: url("hero.jpg"); /* fallback para navegadores viejos */
  background-image: image-set(
    url("hero.avif") type("image/avif") 1x,
    url("hero.webp") type("image/webp") 1x,
    url("hero@2x.webp") type("image/webp") 2x
  );
}
```

- Para imágenes de **contenido** (`<img>`), usar `NgOptimizedImage` con `ngSrcset`
  ([09-performance-zoneless.md](./09-performance-zoneless.md) §9.5). `image-set()` es solo para
  imágenes decorativas en CSS.
- Una imagen de fondo no tiene `alt`: si transmite información, no va en CSS.
- Si el fondo es la imagen LCP, el navegador la descubre tarde (recién al parsear el CSS): preferir
  `<img priority>` para el hero.

### 13.25 Entrada/salida en Angular (`animate.enter` / `animate.leave`) con un solo `@keyframes`

Para animar elementos que entran o salen del DOM por `@if` / `@for`, usar `animate.enter` /
`animate.leave` nativos (v20.2+), nunca `@angular/animations` (deprecado). Angular agrega la clase,
espera a que termine la animación CSS y recién ahí saca el elemento.

```html
@if (visible()) {
  <div class="aviso" animate.enter="aviso--entra" animate.leave="aviso--sale">…</div>
}
```

```scss
.aviso {
  &--entra { animation: aparecer 200ms ease-out; }
  // Mismo keyframe al revés: la salida es el espejo de la entrada, sin duplicar keyframes
  &--sale { animation: aparecer 150ms ease-in reverse; }
}

@keyframes aparecer {
  from { opacity: 0; transform: translateY(8px); }
}
```

- `@keyframes` con solo `from`: el `to` es el estilo normal del elemento.
- Salida más corta que la entrada (150ms vs 200ms) y `ease-in` para salir / `ease-out` para entrar:
  se percibe más ágil.
- Clases con BEM anidado (§7.3) y `prefers-reduced-motion` contemplado (§13.23).
- Para `<dialog>` / popovers sin `@if`, alcanza con `@starting-style` (§13.19).
- `animate.leave` de un componente hijo **no** corre cuando se saca el elemento padre: solo corre
  dentro del mismo template. Si la salida importa, ponerla en el elemento que controla el `@if`.
- Para controlar una animación desde código (pausar, cancelar, invertir), usar la API nativa
  `elemento.getAnimations()` (`cancel()`, `pause()`, `reverse()`), no `AnimationPlayer`.

### 13.26 Medios sin layout shift (`aspect-ratio` + `object-fit`)

Una imagen sin espacio reservado empuja el contenido cuando carga (CLS). Con `NgOptimizedImage`,
`width`/`height` ya lo reservan (§9.5). Cuando el alto depende del ancho (miniaturas de proporción
fija, `ngSrc` con `fill`, `<video>`, `<iframe>`), reservar con `aspect-ratio`:

```scss
.miniatura {
  display: block;               // sin el hueco de línea de base de un inline
  inline-size: 100%;
  aspect-ratio: 4 / 3;          // reserva el alto antes de que llegue la imagen
  object-fit: cover;            // recorta sin deformar si la proporción real difiere
  background: light-dark(var.$color-bg-light, var.$color-bg-dark); // placeholder mientras carga
}
```

- `object-fit: cover` recorta; `contain` muestra la imagen entera con bandas. `object-position`
  elige qué parte se conserva.
- Con `fill`, el `aspect-ratio` va en el contenedor `position: relative`, no en la imagen.
- Baseline desde 2021.

### 13.27 Unidades de viewport dinámicas (`dvh`, `svh`, `lvh`)

En mobile `100vh` mide el viewport con la barra del navegador oculta: el contenido queda tapado.
`100dvh` sigue el alto visible real; `svh` es el mínimo (barras visibles) y `lvh` el máximo.

```scss
.layout {
  display: grid;
  grid-template-rows: auto 1fr;  // header a su alto, main el resto
  min-block-size: 100dvh;
}
```

- Preferir Grid a `calc(100dvh - 80px)`: el número mágico se rompe cuando el header cambia de alto.
- `min-block-size`, no `height` fijo: el contenido más largo que la pantalla no se desborda.
- `dvh` se recalcula al hacer scroll en mobile: para algo que no debe saltar, `svh`.
- Baseline desde 2022.

### 13.28 Gráficos simples con `conic-gradient()`

Un indicador de porcentaje o una torta de pocas porciones no necesita librería de gráficos:

```scss
.torta {
  inline-size: 8rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: conic-gradient(
    var.$color-primary calc(var(--pct) * 1%),
    light-dark(var.$color-bg-light, var.$color-bg-dark) 0
  );
}
```

```html
<div class="torta" [style.--pct]="avance()" role="img" [attr.aria-label]="'Avance: ' + avance() + '%'"></div>
```

- `role="img"` + `aria-label` con el dato: el fondo no lo lee un lector de pantalla.
- Colores con contraste AA entre porciones (§3.1) y el dato también en texto si es importante.
- Más de 4–5 series, ejes, tooltips o interacción: librería de gráficos.
- Baseline desde 2020.

### 13.29 Contadores animados sin JavaScript (`@property` + `counter()`)

Registrar la custom property con tipo deja que el navegador la interpole en `@keyframes`;
`counter()` la muestra como texto.

```scss
@property --num {
  syntax: "<integer>";   // counter-reset necesita entero
  inherits: false;
  initial-value: 0;      // obligatorio: sin él se ignora la regla entera
}

.contador {
  counter-reset: num var(--num);
  animation: contar 1.5s ease-out;

  &::after { content: counter(num); }
}

@keyframes contar {
  from { --num: 0; }     // solo from: el final es el valor real del elemento
}
```

```html
<span class="contador" [style.--num]="total()" role="img" [attr.aria-label]="total()"></span>
```

- El valor final va en el elemento y la animación solo arranca de 0: con el reset global de
  `prefers-reduced-motion` (§13.23, `animation: none`) se ve el número final, no 0.
- Sin soporte de `@property` la propiedad no se interpola: muestra 0 hasta la mitad de la animación y
  salta al final. Aceptable para un KPI decorativo; si no lo es, no animar.
- El texto de `::after` no siempre lo leen los lectores de pantalla: el número va también en
  `aria-label` o en texto oculto visualmente.
- Solo números enteros decorativos (KPIs). Montos con formato (moneda, separadores): pipe en el
  template.
- Baseline desde julio de 2024.

### 13.30 Transiciones entre rutas (`withViewTransitions`)

El router anima el cambio de página con la View Transitions API (developer preview). Sin soporte
del navegador, navega igual, sin animación.

```ts
// app.config.ts
provideRouter(routes, withViewTransitions({
  // El router no respeta prefers-reduced-motion solo: hay que saltear la transición
  onViewTransitionCreated: ({ transition }) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      transition.skipTransition();
    }
  },
}))
```

```scss
// assets/styles/styles.scss (global): con encapsulación, el SCSS de un componente no llega
::view-transition-old(root) { animation-duration: 150ms; }
::view-transition-new(root) { animation-duration: 200ms; }
```

- Los `::view-transition-*` van siempre en estilos **globales**, nunca en el `.scss` de un
  componente.
- `skipTransition()` saltea la animación pero la navegación se completa.
- Elementos que deben "viajar" entre páginas: `view-transition-name` único por página.

---
