# Parte II — Fundamentos Frontend (HTML5 & CSS3)

> Esta segunda parte es **framework-agnóstica**: son los fundamentos de HTML5 y CSS3 sobre los que
> se apoyan las convenciones de Angular de la Parte I (semántica/ARIA del §3, BEM/SCSS del §7,
> layouts, etc.). Aplican a cualquier `.html`/`.css`/`.scss`, haya o no Angular de por medio.

---

## 14. HTML5 — Estructura, semántica y SEO

### 14.1 Conceptos base

- **HTML** (HyperText Markup Language): lenguaje **declarativo** que describe y estructura el
  contenido. Delega la **presentación** a CSS y la **interactividad** a JavaScript.
- **Etiqueta vs elemento**: la *etiqueta* es la marca de apertura `<tag>` y cierre `</tag>`; el
  *elemento* es el conjunto completo (etiquetas + contenido interno).
- **Anidación correcta**: cierre en cascada inversa — el último elemento abierto es el primero en
  cerrarse.
- **Omitir etiquetas**: la spec permite omitir ciertos cierres (ej. `</li>`), pero la buena
  práctica es **cerrarlas siempre** por consistencia y legibilidad.

### 14.2 Estructura global y `<head>`

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
  <link rel="canonical" href="https://sitio.com/pagina"> <!-- URL principal; evita duplicados -->
</head>
```

- `<head>` contiene **metadatos** y carga de recursos no renderizables visualmente.

### 14.3 Marcado semántico vs. "divitis"

- `<div>` y `<span>` son **neutrales** (bloque / línea). Usarlos **solo** para maquetación cuando
  **no exista** una etiqueta semántica adecuada.
- **Encabezados** `<h1>`–`<h6>`: estructuran la importancia. Un documento tiene **un único `<h1>`**.
- **Landmarks de sección**:
  - `<main>` → contenido **principal y único** de la página. No incluye elementos repetidos entre
    páginas (navbars globales, footers globales).
  - `<header>` → grupo introductorio/de navegación; válido en la raíz **o** dentro de
    `<section>`/`<article>`.
  - `<nav>` → bloque de enlaces de navegación.
  - `<section>` → agrupación temática de contenido.
  - `<article>` → contenido autónomo, con sentido completo si se extrae y distribuye aislado.
  - `<aside>` → contenido tangencial/secundario (tags, herramientas laterales).
  - `<footer>` → pie de sección o documento (autoría, legal, copyright).
- **Énfasis de texto**:
  - `<strong>` → importancia semántica (negrita por defecto).
  - `<em>` → énfasis de entonación (cursiva por defecto).
  - `<small>` → comentarios secundarios, notas al pie, avisos legales. **No** por mera estética.

### 14.4 Equipos de etiquetas que van juntas (recetas semánticas)

- **`<label>` + `<input>`** — el `label` nombra el campo y se conecta con `for` (label) = `id`
  (input); al hacer clic en el texto, el foco salta al campo.
  ```html
  <label for="correo-usuario">Correo electrónico:</label>
  <input type="email" id="correo-usuario" name="email" placeholder="ejemplo@mail.com">
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
  encabezado (`<th>`) o de datos (`<td>`).
- **`<select>` + `<option>`** — menú desplegable de opciones (ver estilizado moderno en §17.5).

### 14.5 Elementos reemplazables y multimedia

Sus dimensiones/contenido vienen de un recurso externo; no llevan contenido de texto plano ni
requieren cierre nativo.

- **`<img>`**:
  - `src` (ruta), `alt` (texto alternativo: accesibilidad + SEO + fallback de red).
  - `loading="lazy"` difiere la carga hasta acercarse al viewport. **No** usarlo en imágenes
    *above the fold* (parte superior visible inicial).
- **`<audio>` / `<video>`**:
  - `controls` muestra la UI nativa (su aspecto varía según el navegador).
  - `autoplay` está **bloqueado** salvo que se acompañe de `muted`.
  - `loop` (reinicio infinito), `poster` (imagen de portada del video).
- **`<iframe>`** (incrusta un documento externo aislado):
  - `allow` configura permisos/APIs de hardware (giroscopio, acelerómetro, portapapeles…).
  - `allowfullscreen` permite solicitar pantalla completa.
  - **Seguridad**: un sitio puede bloquear ser embebido vía cabeceras HTTP para evitar
    **clickjacking**.

### 14.6 Atributos avanzados y accesibilidad (ARIA)

- `hidden` → atributo booleano global; el navegador omite el render visual (equivalente nativo a un
  estado oculto controlable por JS).
- `target="_blank"` + **`rel="noreferrer"`** → al abrir enlaces externos en pestaña nueva, evita
  vulnerabilidades y restringe el envío del `Referer`.
- `download` → fuerza la descarga del archivo en vez de navegar (limitado al **mismo dominio**).
- `role="…"` → ARIA global para dar semántica accesible a elementos genéricos. **Regla W3C**: usar
  **siempre el elemento nativo** (`<button>`) antes de forzar un rol en uno neutral
  (`<div role="button">`).

### 14.7 Formularios y componentes interactivos modernos

- `<form method="post" action="…">` → captura y envío nativo de datos.
- `<fieldset>` + `<legend>` → agrupación visual/semántica de campos con título.
- **Asociación de `<label>`**: enlazar de forma unívoca para ampliar el área de click y dar
  accesibilidad. Dos formas: **envolver** el input con el `<label>`, **o** usar `for` = `id` del
  input.
- **Tipos semánticos de input** (`email`, `tel`, `number`, `date`, `color`…) → validación nativa y
  teclados adaptados en móvil.
- **Validación nativa**: `required` y `pattern="…"` (regex) validan antes del `submit`, sin JS.
- `<datalist>` (`<input list="id">`) → input de texto con opciones autocompletables precargadas.
- `<details>` + `<summary>` → acordeón nativo (típico en FAQ); atributo booleano `open` para
  arrancar expandido.
- `<dialog>` → modal nativo; se controla por JS con `.showModal()` y `.close()` (animación de
  entrada/salida en §17.4).
- **Efecto secundario de los `id`**: un `id` en HTML crea una referencia global en `window` (acceso
  directo desde JS). Se desaconseja abusar por riesgo de colisiones.

---
