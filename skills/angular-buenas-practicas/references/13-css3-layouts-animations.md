## 15. CSS3 — Estilos, arquitectura y diseños complejos

### 15.1 Sintaxis, selectores y combinadores

- **Anatomía**: `Selector { propiedad: valor; }`. Cada par propiedad-valor es una **declaración**.
- **Comentarios**: solo `/* bloque */`. La sintaxis `//` **no** es válida en CSS puro (sí en SCSS).
- **Selectores básicos**: etiqueta (`h1`), clase (`.clase`), id (`#id`). Restringir IDs en CSS para
  favorecer la reutilización de clases.
- **Combinadores**:
  - `A > B` → hijo directo (primer nivel inferior).
  - `A + B` → hermano adyacente inmediato posterior.
  - `A ~ B` → todos los hermanos posteriores que comparten padre.

### 15.2 Modelos de color modernos

- **Hex corto**: `#09f` ≡ `#0099ff`; admite transparencia con canales extra (8 dígitos).
- **RGB moderno**: `rgb(r g b / opacidad)` (sin comas) reemplaza a `rgba()`.
- **HSL / OKLCH**: basados en percepción visual (Hue, Chroma, Lightness). `oklch()` accede a gama
  ampliada **Wide Gamut P3**.
- **`currentcolor`**: palabra clave que hereda dinámicamente el valor de `color` del contexto
  actual.

### 15.3 Motor de CSS: herencia, especificidad y cascada

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

### 15.4 Modelo de la caja (box model)

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

### 15.5 Overflow y flujo

- `overflow`:
  - `visible` (default) → el contenido sobresale de la caja.
  - `hidden` → recorta el sobrante (queda inaccesible).
  - `scroll` → barras **permanentes**, haya o no desbordamiento.
  - `auto` → barras **solo** si hace falta.
- `text-overflow: ellipsis;` → corta texto de una línea (con `overflow: hidden`) y agrega `…`.
- `content-visibility: auto;` → optimización tipo *lazy load del DOM*: el navegador omite render y
  pintado de nodos complejos fuera del viewport.

### 15.6 Posicionamiento (`position`)

- `static` (default) → flujo natural según el orden del HTML.
- `relative` → mantiene su lugar en el flujo, pero habilita coordenadas (`top/left/right/bottom`) y
  crea **punto de anclaje** para hijos `absolute`.
- `absolute` → **sale** del flujo (no ocupa espacio); se posiciona respecto al primer ancestro con
  `position` distinta de `static` (o al documento si no hay ninguno).
- `fixed` → anclado al **viewport**; inmóvil ante el scroll.
- `sticky` → híbrido: estático hasta alcanzar una coordenada (`top: 0`), entonces se adhiere,
  moviéndose **dentro de los límites de su caja padre**.

### 15.7 Profundidad y apilamiento (`z-index`)

- **Eje Z**: las interfaces operan en capas ficticias de profundidad donde los elementos se
  solapan.
- **Stacking context**: capas de aislamiento creadas automáticamente bajo ciertas condiciones
  (`position: fixed`, `opacity < 1`, `transform`, filtros de desenfoque, contenedores flex/grid
  modernos…).
- `z-index` (entero, admite negativos) ordena la superposición. **Solo** funciona en elementos con
  un stacking context activo (ej. inyectando antes un `position: relative`).

---

## 16. Sistemas de maquetación (Layouts)

### 16.0 Patrón de contenedor responsive del equipo

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

> Combinar con tokens fluidos `clamp()` (§7.1) y Grid `auto-fit`/`minmax` (§16.2) cubre la mayoría de
> los layouts **sin** media queries.

### 16.1 Flexbox (unidimensional)

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

### 16.2 Grid (bidimensional)

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

---

## 17. Animaciones, transiciones y UI moderna

### 17.1 Transiciones (cambio de estado)

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
- **Soporte (mediados 2026): solo Chromium** (Chrome/Edge 129+, Opera 115+, Samsung 28+). Firefox y
  Safari todavía no lo implementan → envolver en `@supports` para *enhancement* progresivo: donde no
  está, el contenido se muestra/oculta igual, solo que sin animar.

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

### 17.2 Animaciones por keyframes

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

### 17.3 Animaciones ligadas al scroll (sin JavaScript)

Sustituyen los listeners de scroll en JS por animaciones delegadas a la GPU.

```css
.reveal {
  animation: aparecer linear;
  animation-timeline: view();       /* rastrea la intersección del elemento con el viewport */
  animation-range: entry 20% cover 30%;
}

/* scroll(root block) → liga la línea de tiempo al scroll vertical del documento */
```

- `animation-timeline` → reemplaza el reloj de segundos por un rastreador de progreso.
- `scroll()` → progreso de la barra de scroll de un contenedor.
- `view()` → visibilidad/intersección de un elemento al cruzar el viewport (ideal *scroll reveal*).
- `animation-range` → acota el tramo del recorrido donde ocurre la interpolación.
- Referencia: <https://developer.chrome.com/docs/css-ui/scroll-driven-animations>

### 17.4 Animar aparición/desaparición de elementos discretos (`<dialog>`, popovers)

Para animar algo que entra y sale del DOM (un `<dialog>`, un popover), hace falta combinar tres
piezas: el **estado inicial** con `@starting-style`, y permitir animar las propiedades **discretas**
(`display`, `overlay`) con `transition-behavior: allow-discrete`.

```css
dialog {
  transition: all 0.3s ease;
  /* allow-discrete: permite animar display/overlay (de none↔block, top-layer↔normal) */
  transition: display 0.3s ease allow-discrete;
}

dialog[open] {
  scale: 1;
  transition: all 0.3s ease-in-out;

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

### 17.5 `<select>` / `<option>` personalizables (`appearance: base-select`)

Con `appearance: base-select` el navegador entrega un `<select>` totalmente estilizable, con
pseudo-elementos para el ícono (`::picker-icon`), el popup (`::picker(select)`) y el check de la
opción (`::checkmark`), más la pseudo-clase `:open`. **Mejora progresiva**: es muy reciente
(Chromium primero); proveer siempre un estilo base aceptable para navegadores sin soporte.

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
  transition: all 0.2s ease-in-out;
  border-radius: 4px;

  &::checkmark { display: none; }        /* ocultar el check nativo si se quiere */
  &:checked { font-weight: bold; background-color: #e6f0fa; }
  &:hover { opacity: 0.8; }
}
```

Referencia: <https://developer.chrome.com/blog/a-customizable-select>

### 17.6 Auto-resize de `<textarea>` con `field-sizing: content`

Para que un `textarea` (o input) crezca/encoja según su contenido **sin JS**, usar la propiedad
`field-sizing: content` (Chromium 123+; con fallback de `rows`/`min-height` donde no haya soporte).

```css
textarea {
  field-sizing: content;     /* el campo se ajusta a su contenido */
  min-height: 3lh;           /* fallback razonable */
  max-height: 12lh;
}
```

### 17.7 Carruseles sin JavaScript

Los carruseles modernos se arman con CSS puro (scroll-snap + scroll-driven) sin librerías. Para
generar y configurar la estructura base visualmente, usar el configurador oficial de Chrome:
<https://chrome.dev/carousel-configurator/>. Útil además para botones de navegación y marcadores
("dots") declarativos sin JS.

### 17.8 Accesibilidad y rendimiento

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

- **Tipografía**: `text-wrap: balance;` (títulos equilibrados) y `text-wrap: pretty;` (evita
  palabras huérfanas al final del párrafo).
- **Performance**: animar preferentemente `transform` y `opacity` (compositor/GPU); evitar animar
  layout (anchos, márgenes, sombras).

---
