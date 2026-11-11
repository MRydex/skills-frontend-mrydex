## 12. HTML5 — Estructura, Semántica, Accesibilidad y SEO

> Este archivo es **framework-agnóstico**: son los fundamentos de HTML5 sobre los que se apoyan las
> convenciones de templates Angular de [03-html-templates.md](./03-html-templates.md). Ahí está lo
> específico de Angular (control flow, `@angular/aria`, BEM aplicado a componentes, bindings); acá va
> HTML **puro**, aplica haya o no Angular de por medio. Para CSS3 ver
> [13-css3-layouts-animations.md](./13-css3-layouts-animations.md).

### Índice

- 12.1 Conceptos base
- 12.2 Estructura global y `<head>`
- 12.3 Marcado semántico vs. "divitis": landmarks y orden de headings
- 12.4 Equipos de etiquetas que van juntas (recetas semánticas)
- 12.5 Elementos reemplazables y multimedia
- 12.6 ARIA: "sin ARIA es mejor que con ARIA mal puesta"
- 12.7 Formularios nativos y componentes interactivos modernos
- 12.8 SEO y metadatos en Angular (`Title` / `Meta`, SSR)
- 12.9 Gestión de foco (focus management)

### 12.1 Conceptos base

- **HTML** (HyperText Markup Language): lenguaje **declarativo** que describe y estructura el
  contenido. Delega la **presentación** a CSS y la **interactividad** a JavaScript.
- **Etiqueta vs elemento**: la *etiqueta* es la marca de apertura `<tag>` y cierre `</tag>`; el
  *elemento* es el conjunto completo (etiquetas + contenido interno).
- **Anidación correcta**: cierre en cascada inversa — el último elemento abierto es el primero en
  cerrarse.
- **Omitir etiquetas**: la spec permite omitir ciertos cierres (ej. `</li>`), pero la buena
  práctica es **cerrarlas siempre** por consistencia y legibilidad.

### 12.2 Estructura global y `<head>`

```html
<!DOCTYPE html>            <!-- estándar HTML5; evita el "quirks mode" -->
<html lang="es">          <!-- elemento raíz; lang correcto por accesibilidad/SEO -->
<head>
  <meta charset="UTF-8">  <!-- acentos y emojis sin fallos de codificación -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0"> <!-- responsive -->
  <title>Título de la pestaña</title>           <!-- H1 de Google en resultados (SEO) -->
  <meta name="description" content="Resumen…">  <!-- snippet de buscadores -->
  <meta name="theme-color" content="#0099ff">   <!-- color nativo de la barra del navegador -->
  <link rel="icon" type="image/png" href="/favicon.png"> <!-- si se omite, busca /favicon.ico -->
  <link rel="canonical" href="https://www.example.com/pagina"> <!-- URL principal; evita duplicados -->
</head>
```

- `<head>` contiene **metadatos** y carga de recursos no renderizables visualmente.
- `<title>`: apuntar a **50–60 caracteres** (Google trunca lo que excede). `description`: **150–160
  caracteres**; no es un factor de ranking directo, pero es el texto del snippet — un mal
  `description` baja el CTR aunque el ranking sea bueno.
- En una **SPA** (Angular incluido) estos dos tags no son estáticos por página: hay que actualizarlos
  por ruta. Ver §12.8.

### 12.3 Marcado semántico vs. "divitis": landmarks y orden de headings

- `<div>` y `<span>` son **neutrales** (bloque / línea). Usarlos **solo** para maquetación cuando
  **no exista** una etiqueta semántica adecuada.
- **Encabezados `<h1>`–`<h6>`**: estructuran la importancia, no el tamaño de fuente (eso es CSS).
  - Un documento tiene **un único `<h1>`**.
  - **No saltear niveles** (`<h1>` → `<h3>` sin `<h2>` en el medio): un lector de pantalla navega el
    documento saltando de heading en heading; un salto de nivel se interpreta como "me perdí una
    sección" y rompe el mapa mental de la página. Bajar de nivel siempre de a uno.
  - El orden de los headings en el DOM es el orden en que los anuncia el lector de pantalla —
    **no depende del orden visual que dé el CSS** (`order` de flex/grid no reordena la navegación por
    heading).
- **Landmarks de sección** (cada uno expone un **rol ARIA implícito**; un lector de pantalla puede
  saltar directo entre landmarks con una tecla, sin leer todo el documento):

  | Etiqueta | Rol implícito | Uso |
  |---|---|---|
  | `<main>` | `main` | Contenido **principal y único** de la página. No incluye elementos repetidos entre páginas (navbars globales, footers globales). Debe haber **uno solo** por documento. |
  | `<header>` | `banner` (en la raíz) / sin rol de landmark dentro de `<section>`/`<article>` | Grupo introductorio/de navegación. |
  | `<nav>` | `navigation` | Bloque de enlaces de navegación. Si hay varios, diferenciarlos con `aria-label` (`<nav aria-label="Principal">`, `<nav aria-label="Migas de pan">`). |
  | `<section>` | `region` (solo si tiene nombre accesible: `aria-labelledby`/`aria-label`) | Agrupación temática de contenido. Un `<section>` sin nombre accesible no es un landmark real para el lector de pantalla, es solo agrupación visual. |
  | `<article>` | `article` | Contenido autónomo, con sentido completo si se extrae y distribuye aislado. |
  | `<aside>` | `complementary` | Contenido tangencial/secundario (tags, herramientas laterales). |
  | `<footer>` | `contentinfo` (en la raíz) | Pie de sección o documento (autoría, legal, copyright). |

- **Énfasis de texto**:
  - `<strong>` → importancia semántica (negrita por defecto).
  - `<em>` → énfasis de entonación (cursiva por defecto).
  - `<small>` → comentarios secundarios, notas al pie, avisos legales. **No** por mera estética.
- **`<search>`** envuelve buscadores y filtros: es el landmark de búsqueda, sin `role="search"`.

### 12.4 Equipos de etiquetas que van juntas (recetas semánticas)

- **`<label>` + `<input>`** — el `label` nombra el campo y se conecta con `for` (label) = `id`
  (input); al hacer clic en el texto, el foco salta al campo.
  ```html
  <label for="correo-usuario">Correo electrónico:</label>
  <input type="email" id="correo-usuario" name="email" placeholder="nombre@example.com">
  ```
- **`<picture>` + `<source>` + `<img>`** — imágenes adaptables. `<source>` da opciones según la
  pantalla; **siempre** cerrar con un `<img>` de respaldo.
  ```html
  <picture>
    <source media="(min-width: 800px)" srcset="banner-grande.jpg">
    <source media="(min-width: 400px)" srcset="banner-movil.jpg">
    <img src="banner-defecto.jpg" alt="Banner de bienvenida">
  </picture>
  ```
- **`<dl>` + `<dt>` + `<dd>`** — listas de descripción (glosarios, pares clave-valor). `<dt>` término,
  `<dd>` descripción.
- **`<ul>`/`<ol>` + `<li>`** — las listas **solo** admiten `<li>` como hijos directos (nada de texto
  suelto). `ul` sin orden, `ol` numerada.
- **`<figure>` + `<figcaption>`** — figura/ilustración con pie de foto.
- **`<table>` + `<tr>` + `<th>`/`<td>`** — datos tabulares: fila por fila, con celdas de
  encabezado (`<th scope="col">`/`<th scope="row">`) o de datos (`<td>`). El atributo `scope` es lo
  que le permite a un lector de pantalla anunciar "columna: Total" al entrar a cada celda — sin él,
  una tabla de datos es ilegible por voz aunque se vea perfecta.
- **`<select>` + `<option>`** — menú desplegable de opciones (ver estilizado moderno en
  [13-css3-layouts-animations.md](./13-css3-layouts-animations.md) §13.20).

### 12.5 Elementos reemplazables y multimedia

Sus dimensiones/contenido vienen de un recurso externo; no llevan contenido de texto plano ni
requieren cierre nativo.

- **`<img>`**:
  - `src` (ruta), `alt` (texto alternativo: accesibilidad + SEO + fallback de red). `alt=""` (vacío,
    no ausente) para imágenes puramente decorativas: le dice explícitamente al lector de pantalla que
    la ignore, en vez de leer el nombre de archivo.
  - `loading="lazy"` difiere la carga hasta acercarse al viewport. **No** usarlo en imágenes
    *above the fold* (parte superior visible inicial): retrasa el LCP.
- **`<audio>` / `<video>`**:
  - `controls` muestra la UI nativa (su aspecto varía según el navegador).
  - `autoplay` está **bloqueado** salvo que se acompañe de `muted`.
  - `loop` (reinicio infinito), `poster` (imagen de portada del video).
  - **`<track kind="captions" src="..." srclang="es" label="Español">`** dentro de `<video>` agrega
    subtítulos/captions — es la forma nativa de hacer accesible un video a usuarios sordos o con el
    audio apagado; sin `<track>`, el contenido hablado del video no tiene ningún equivalente textual.
- **`<iframe>`** (incrusta un documento externo aislado):
  - `allow` configura permisos/APIs de hardware (giroscopio, acelerómetro, portapapeles…).
  - `allowfullscreen` permite solicitar pantalla completa.
  - **Seguridad**: un sitio puede bloquear ser embebido vía cabeceras HTTP para evitar
    **clickjacking**.

### 12.6 ARIA: "sin ARIA es mejor que con ARIA mal puesta"

Esta es la primera regla del W3C sobre ARIA (*"No ARIA is better than Bad ARIA"*) y la más
incumplida en la práctica: agregar `role`/`aria-*` a un elemento que ya tenía la semántica correcta,
de forma redundante o contradictoria, **empeora** la experiencia de un lector de pantalla en vez de
mejorarla — le miente sobre qué es el elemento y qué hace.

**Las 5 reglas de ARIA (W3C ARIA Authoring Practices), en orden de prioridad:**

1. **Si existe un elemento HTML nativo con la semántica y el comportamiento que necesitás, usalo** en
   vez de re-implementar el rol y el comportamiento con `role` + ARIA sobre un elemento genérico.
   Un `<button>` trae gratis: rol, estado `:focus`, activación con Enter/Espacio, inclusión en el
   orden de tabulación. Un `<div role="button">` no trae nada de eso: hay que cablear el teclado a
   mano y es fácil olvidar un caso (Espacio, por ejemplo).
2. **No cambies la semántica nativa** salvo que sea absolutamente necesario (ej. no pongas
   `role="heading"` sobre un `<div>` si podés usar `<h2>`).
3. **Todo control interactivo hecho con ARIA debe ser 100% operable por teclado** (foco visible, y
   las teclas esperadas para ese rol — flechas en un `listbox`, Enter/Espacio en un `button`, Escape
   para cerrar un `dialog`).
4. **No uses `role="presentation"` ni `aria-hidden="true"` sobre un elemento que puede recibir
   foco** (rompe la navegación por teclado: el elemento sigue siendo alcanzable con Tab pero el
   lector de pantalla lo trata como si no existiera).
5. **Todo elemento interactivo necesita un nombre accesible** (texto visible, `aria-label` o
   `aria-labelledby`) — un ícono de botón sin texto ni `aria-label` es un botón mudo para un lector de
   pantalla.

```html
<!-- ❌ MAL — reinventa un botón, se olvida el teclado y es redundante -->
<div role="button" tabindex="0" onclick="guardar()" aria-label="Guardar">Guardar</div>

<!-- ✅ BIEN — el elemento nativo ya resuelve las 5 reglas -->
<button type="button" (click)="guardar()">Guardar</button>
```

- **`hidden`** → atributo booleano global; el navegador omite el render visual (equivalente nativo a
  un estado oculto controlable por JS, sin pelear con `display: none` vía CSS).
- **`role="…"` genérico**: reservarlo para los casos sin equivalente nativo (`role="alert"`,
  `role="status"`, patrones compuestos tipo `tablist`/`tab`/`tabpanel`). Para esos patrones complejos
  en Angular, usar `@angular/aria` (ver [03-html-templates.md](./03-html-templates.md) §3.1) en vez de
  armar el `role`/teclado a mano.
- `target="_blank"` + **`rel="noreferrer"`** → al abrir enlaces externos en pestaña nueva, evita
  vulnerabilidades y restringe el envío del `Referer`.
- `download` → fuerza la descarga del archivo en vez de navegar (limitado al **mismo dominio**).
- **Efecto secundario de los `id`**: un `id` en HTML crea una referencia global en `window` (acceso
  directo desde JS). Se desaconseja abusar por riesgo de colisiones.

**Casos que se hacen mal seguido:**

- **`disabled` saca el control del foco**: quien usa lector de pantalla no se entera de que existe. En una
  acción que conviene descubrir (botón de una barra, acción de fila), `aria-disabled="true"` y bloquear la acción
  en el handler:
  `<button type="button" [attr.aria-disabled]="!puedeGuardar()" (click)="puedeGuardar() && guardar()">`.
- **Nombres repetidos**: diez botones "Editar" en una tabla se leen iguales. Sumar el dato de la fila con texto
  oculto (`Editar <span class="u-sr-only">{{ fila.nombre }}</span>`) o con `aria-label`. El nombre accesible
  contiene el texto visible tal cual (WCAG 2.5.3) y no repite el rol: `<nav aria-label="Principal">`, no
  "Navegación principal".
- **`<ul>` sin viñetas en Safari**: con `list-style: none` o `display: flex` Safari deja de anunciarla como
  lista. Si la lista importa (menú, etiquetas, cards), `role="list"` en ese `<ul>`; en el resto es redundante.

### 12.7 Formularios nativos y componentes interactivos modernos

- `<form method="post" action="…">` → captura y envío nativo de datos.
- `<fieldset>` + `<legend>` → agrupación visual/semántica de campos con título (ej. un grupo de
  radios "Método de pago" necesita un `<legend>`, no alcanza con un `<label>` suelto arriba).
- **Asociación de `<label>`**: enlazar de forma unívoca para ampliar el área de click y dar
  accesibilidad. Dos formas: **envolver** el input con el `<label>`, **o** usar `for` = `id` del
  input.
- **Tipos semánticos de `<input>`** (`email`, `tel`, `number`, `date`, `color`, `search`…) →
  validación nativa y teclado adaptado en móvil (`type="tel"` muestra teclado numérico, no
  `type="number"`, que además admite flechas de incremento indeseadas en un teléfono).
- **`inputmode`** (`numeric`, `decimal`, `tel`, `email`, `url`, `search`, `none`) → controla el
  teclado virtual **sin** cambiar el tipo de dato ni la validación; útil cuando el valor es texto pero
  se ingresa con dígitos (ej. un código postal: `type="text" inputmode="numeric"`).
- **`autocomplete`** con un token específico (`"email"`, `"given-name"`, `"family-name"`,
  `"tel"`, `"street-address"`, `"cc-number"`…) además de acelerar el llenado, es una señal de
  accesibilidad: ayuda a autocompletadores y gestores de contraseñas a identificar el campo
  correctamente. `autocomplete="off"` solo cuando el dato es genuinamente sensible/único (ej. un
  código de verificación de un solo uso).
- **Validación nativa**: `required`, `pattern="…"` (regex), `min`/`max`/`step` (numéricos y fechas),
  `minlength`/`maxlength` — todos validan antes del `submit`, sin JS. El formulario expone
  `:valid`/`:invalid`/`:user-invalid` para estilizar sin lógica (ver
  [13-css3-layouts-animations.md](./13-css3-layouts-animations.md)). `novalidate` en el `<form>`
  desactiva la validación nativa del navegador cuando la maneja enteramente JS (ej. Signal Forms) para
  evitar que el navegador muestre su propio globo de error duplicado.
- `<datalist>` (`<input list="id">`) → input de texto con opciones autocompletables precargadas.
- `<details>` + `<summary>` → acordeón nativo (típico en FAQ); atributo booleano `open` para
  arrancar expandido. Es accesible por teclado y por lector de pantalla sin una sola línea de JS.
- `<dialog>` → modal nativo; se controla por JS con `.showModal()` y `.close()` (animación de
  entrada/salida en [13-css3-layouts-animations.md](./13-css3-layouts-animations.md) §13.19). Maneja
  foco y `Escape` nativamente: al abrir con `showModal()`, el navegador atrapa el foco adentro solo;
  no hace falta un `cdkTrapFocus` para un `<dialog>` nativo.
- **`<dialog>` propio, lo que se hace mal** (con librería de UI, el modal es el de la librería):
  - No agregar `role="dialog"`, `aria-modal`, trampa de foco, `inert` ni handler de Escape: `showModal()` ya lo
    hace y devuelve el foco al botón que abrió. Nombre con `aria-labelledby`.
  - Abrir desde el template con `(click)="dialogo.showModal()"` sobre una template ref. `command` /
    `commandfor` son Baseline recién desde dic 2025: en un navegador anterior el botón no hace nada.
  - Cerrar con `<form method="dialog">`. En una confirmación destructiva, `autofocus` en la acción segura
    (Cancelar). No poner `display` en `dialog` sin `[open]`: pisa el estado cerrado.
  - **Cerrar con click afuera**: `closedby="any"` no funciona en Safari. Si el pedido lo exige, va un handler,
    que anda en todos los navegadores. Compara la posición del puntero con la caja: `event.target` solo no
    alcanza, porque un click en el padding del diálogo también lo tiene como target.

    ```html
    <dialog #ayuda aria-labelledby="ayuda-titulo" (click)="onClickFuera($event, ayuda)">
    ```

    ```ts
    protected onClickFuera(event: MouseEvent, dialogo: HTMLDialogElement): void {
      if (event.target !== dialogo) return; // click en el contenido, o Enter sobre un botón interno
      const caja = dialogo.getBoundingClientRect();
      const adentro =
        event.clientX >= caja.left && event.clientX <= caja.right &&
        event.clientY >= caja.top && event.clientY <= caja.bottom;
      if (!adentro) dialogo.close();
    }
    ```
  - **Cambios sin guardar**: la guarda va en el evento `cancel` (`event.preventDefault()` y pedir confirmación);
    así cubre Escape además del botón.
  - **Scroll del fondo**: `showModal()` no lo bloquea. No tocar `overflow` de `body` (mueve el layout y rompe
    `sticky`). Mejora progresiva, sin soporte en Safari:
    `dialog::backdrop { overflow: hidden; overscroll-behavior: contain; }`.
- **Qué overlay propio**: interrumpe y bloquea (confirmar, formulario) → `<dialog>` modal. El usuario sigue
  trabajando (menú, ayuda contextual) → `popover` (Baseline ene 2025) sobre un elemento semántico, no `<dialog>`.
- **`<details>`**: sin headings, enlaces ni botones dentro de `<summary>` (varios lectores lo exponen como botón
  y el heading se pierde). `name` compartido entre varios los hace excluyentes sin JS (Baseline sep 2024).
- **Botón de copiar**: `navigator.clipboard.writeText()` dentro de `try` / `catch` (solo funciona en HTTPS). El
  resultado, también el fallo, se anuncia en un `<span role="status">` que ya está en el DOM vacío, no creado
  con `@if`. No deshabilitar el botón al copiar: pierde el foco.
- **Campos de identificadores** (DNI, CUIT, expediente, usuario): `spellcheck="false"`, `autocapitalize="none"`
  y `autocorrect="off"`, para que el navegador no subraye ni corrija el valor.
- **`autocomplete` describe datos de quien escribe.** Un campo con datos de un tercero (un imputado, un
  testigo) no lleva token de datos personales como `name` o `email`.

### 12.8 SEO y metadatos en Angular (`Title` / `Meta`, SSR)

En una SPA no hay un `<title>`/`<meta>` estático por página como en HTML plano: cada navegación
cambia de componente sin recargar el documento, así que **hay que actualizarlos por código** en cada
ruta.

- **`Title`** (`@angular/platform-browser`) — cambia el `<title>` de la pestaña:
  ```ts
  import { inject } from '@angular/core';
  import { Title } from '@angular/platform-browser';

  const title = inject(Title);
  title.setTitle('Item #1234 — Gestión');
  ```
- **Preferir `title` en la ruta antes que `Title.setTitle()` a mano en cada componente** — es
  declarativo y no depende de que el componente se acuerde de llamarlo en el momento correcto:
  ```ts
  // app.routes.ts
  export const routes: Routes = [
    {
      path: 'items/:id',
      title: 'Detalle de item',
      loadComponent: () => import('./item-detalle/item-detalle').then((m) => m.ItemDetalle),
    },
  ];
  ```
  Para un título **dinámico** (que dependa de la URL, ej. el número de item), `title` acepta un
  `ResolveFn<string>`:
  `` export const itemTitleResolver: ResolveFn<string> = (route) => `Item ${route.paramMap.get('id')}`; ``
  Si depende de datos del back, el mismo `ResolveFn` devuelve un `Observable` o `Promise<string>`
  (`inject(ItemsHttp).obtener(id).pipe(map((i) => i.nombre))`), sin `setTitle()` ni `effect()`. Para un prefijo/sufijo
  consistente en toda la app (ej. agregar siempre `" | Gestión"`), extender `TitleStrategy` una
  sola vez en `app.config.ts` en vez de repetir el sufijo ruta por ruta.
- **Migas de pan desde el mismo `title`**: el `title` resuelto de cada ruta activa queda en
  `ActivatedRouteSnapshot.title`, así que las migas se derivan del árbol de rutas sin `data: { breadcrumb }`
  ni servicio aparte: una sola fuente para la pestaña y las migas (el sufijo de `TitleStrategy` no llega al
  snapshot, solo al `<title>`). `computed()` que lee `lastSuccessfulNavigation()` y recorre el snapshot;
  nunca `router.events` ni `effect()`. Las rutas sin `title` (layouts, `path: ''`) no generan miga.
  ```ts
  // layout/migas-de-pan/migas-de-pan.ts
  @Component({
    selector: 'app-migas-de-pan',
    imports: [RouterLink],
    template: `
      <nav aria-label="Migas de pan">
        <ol class="migas">
          @for (miga of migas(); track miga.url; let ultima = $last) {
            <li class="migas__item">
              @if (ultima) {
                <span aria-current="page">{{ miga.titulo }}</span>
              } @else {
                <a [routerLink]="miga.url">{{ miga.titulo }}</a>
              }
            </li>
          }
        </ol>
      </nav>
    `,
  })
  export class MigasDePan {
    private readonly _router = inject(Router);

    readonly migas = computed(() => {
      this._router.lastSuccessfulNavigation(); // recalcula al terminar cada navegación, con el snapshot ya nuevo
      const migas: { titulo: string; url: string }[] = [];
      let url = '';
      let ruta = this._router.routerState.snapshot.root.firstChild;
      while (ruta) {
        const segmento = ruta.url.map((s) => s.path).join('/');
        if (segmento) url += `/${segmento}`;
        if (ruta.title) migas.push({ titulo: ruta.title, url });
        ruta = ruta.firstChild;
      }
      return migas;
    });
  }
  ```
  `lastSuccessfulNavigation()` y no `currentNavigation()`: el segundo cambia al empezar y al terminar la
  navegación (dos recálculos, el primero con el snapshot viejo). La última miga va con `aria-current="page"`
  y sin enlace; el separador es CSS (`.migas__item + .migas__item::before`), no texto en el template (§12.4).
- **`Meta`** (`@angular/platform-browser`) — lee/escribe `<meta>` tags, incluyendo Open Graph para
  compartir en redes:
  ```ts
  import { inject } from '@angular/core';
  import { Meta } from '@angular/platform-browser';

  const meta = inject(Meta);
  meta.updateTag({ name: 'description', content: 'Detalle del item #1234.' });
  meta.updateTag({ property: 'og:title', content: 'Item #1234' });
  ```
  `updateTag` actualiza el tag si ya existe (por su `name`/`property`) o lo crea si no — es el método
  a usar casi siempre en vez de `addTag` (que duplica el tag si ya estaba).
- **Por qué esto no alcanza sin SSR**: los bots de redes sociales (Facebook/LinkedIn/Slack/X) y la
  mayoría de los *link unfurlers* **no ejecutan JavaScript** — leen el HTML tal como llega del
  servidor. Si la app es CSR pura, esos bots ven el `<title>`/`<meta>` **por defecto** de
  `index.html`, no el que Angular setea en runtime después de hidratar. Con **SSR** (`@angular/ssr`),
  el HTML que llega al bot ya tiene el `<title>`/`<meta>` correctos porque `Title`/`Meta` corrieron en
  el servidor durante el render de esa request. Googlebot sí ejecuta JS y puede tolerar CSR, pero el
  resto de los crawlers, no — no asumir que "funciona en Google" significa "funciona para SEO/compartir
  en general".
- **`<link rel="canonical">` en SPA**: `Meta`/`Title` no manejan `rel="canonical"`. Si hace falta
  fijarlo por ruta (para evitar contenido duplicado por query params de filtros/paginación), inyectar
  `DOCUMENT` y manipular el `<link>` a mano, una sola vez en un servicio compartido, no por
  componente.

### 12.9 Gestión de foco (focus management)

- El **orden de tabulación** por defecto es el **orden del DOM** — no pelearlo con `tabindex`
  positivo (mismo criterio que en Angular, ver
  [03-html-templates.md](./03-html-templates.md) §3.1): si el foco "salta raro", el problema real casi
  siempre es que el DOM no sigue el orden visual, no que falte un `tabindex`. Arreglar el DOM, no
  parchear con `tabindex`.
- **`autofocus`** enfoca un campo apenas carga la página. Usarlo con cautela: para un usuario de
  lector de pantalla que recién entra a la página, saltar directo a un input sin escuchar el título ni
  el contexto de la página es desorientador. Evitarlo en la carga inicial de una página completa;
  aceptable en un `<dialog>` que el usuario **acaba de abrir** con una acción explícita (ya tiene
  contexto).
- **`inert`** en lo que no debe recibir foco ni leerse: el fondo de un overlay propio (el overlay no puede ser
  descendiente del nodo `inert`) y los pasos inactivos de un wizard que siguen en el DOM:
  `[attr.inert]="activo() ? null : ''"`. Un `<dialog>` abierto con `showModal()` ya deja inerte el fondo.
- **Skip link**: un enlace oculto visualmente pero enfocable, primero en el `<body>`, que salta la
  navegación repetitiva e va directo al contenido principal — indispensable para quien navega por
  teclado en una página con un header/nav largo:
  ```html
  <body>
    <a href="#main-content" class="skip-link">Saltar al contenido principal</a>
    <header>...</header>
    <nav>...</nav>
    <main id="main-content">...</main>
  </body>
  ```
  El CSS típico lo posiciona fuera de pantalla y lo trae a la vista solo en `:focus`.
- **Foco en navegación de SPA**: al cambiar de "página" (ruta) en una SPA, el navegador **no** mueve
  el foco como en una carga de documento completa — sigue donde estaba (a veces sobre un elemento que
  ya no existe). Mover el foco explícitamente a un punto estable de la vista nueva (típicamente su
  `<h1>`, con `tabindex="-1"` para que sea enfocable programáticamente sin entrar al orden de
  tabulación) en cada cambio de ruta; si no se anuncia la navegación de algún modo, un usuario de
  lector de pantalla no se entera de que "pasó de página".
