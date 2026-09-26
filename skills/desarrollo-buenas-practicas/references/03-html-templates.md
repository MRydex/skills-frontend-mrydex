## 3. HTML — Convenciones de Templates Angular

### Índice

- 3.1 Accesibilidad (obligatorio)
- 3.2 Metodología BEM
- 3.3 Clases y estilos dinámicos
- 3.4 Control flow nativo (`@if` / `@for` / `@switch` / `@let`) y `@defer`
- 3.5 Templates simples, lógica en `computed`/`@let`
- 3.6 Tablas (nzTable / Material / nativas)
- 3.7 Two-way binding moderno
- 3.8 Tooltip solo cuando el texto está truncado (`appOverflowDetector`)
- 3.9 `nz-select`: ancho del dropdown según el option más largo (`nzDropdownMatchSelectWidth`)
- 3.10 Componentización de Templates HTML (evitar HTMLs kilométricos)
- 3.11 Hidratación incremental con `@defer` (SSR)

### 3.1 Accesibilidad (obligatorio)

- Todo HTML **debe pasar AXE** sin errores ni warnings críticos.
- Cumplir **WCAG AA** mínimo: contraste, foco visible, ARIA, navegación por teclado.
- Atributos ARIA dinámicos con `[attr.aria-*]` — nunca `[aria-*]` a secas: no es un `@Input()` de
  Angular, es un atributo HTML plano y necesita el prefijo `attr.` para que el binding lo entienda.
- Para componentes complejos (combobox, listbox, tabs, accordion, menu, toolbar, tree, grid) usar
  **`@angular/aria`** antes que reinventar el patrón a mano o forzar `role` sobre un `<div>` sin
  soporte de teclado. Son **directivas headless**: resuelven navegación por teclado, gestión de foco
  y los `aria-*` correctos; el marcado y el estilo quedan 100% en tus manos (no traen CSS). Cada
  patrón vive en su propio subpath, no hay un import único:

  ```ts
  import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
  import { Listbox, Option } from '@angular/aria/listbox';
  import { AccordionGroup, AccordionPanel, AccordionTrigger, AccordionContent } from '@angular/aria/accordion';
  import { Toolbar, ToolbarWidget, ToolbarWidgetGroup } from '@angular/aria/toolbar';
  // + '@angular/aria/tabs', '@angular/aria/menu', '@angular/aria/tree', '@angular/aria/grid'
  ```

  - `combobox` → coordina un trigger (input, botón o `div`) con un popup: es la primitiva base para
    autocomplete, `select` y multiselect.
  - `listbox` → lista de opciones seleccionables, con navegación por teclado y selección simple o
    múltiple.
  - `accordion` → paneles que se expanden de a uno para reducir el scroll en páginas densas.
  - `toolbar`, `tabs`, `menu`, `tree`, `grid` → mismo enfoque headless para cada patrón WAI-ARIA.
  - Antes de usar un export puntual de `tabs`/`menu`/`tree`/`grid` que no esté en este documento,
    confirmar el nombre exacto en `angular.dev/guide/aria/<patrón>`: son subpaths nuevos y los
    nombres exportados pueden variar entre minors.
  - Si el patrón no está cubierto por `@angular/aria`, usar **Angular CDK** (`@angular/cdk/a11y`,
    `@angular/cdk/overlay`, `@angular/cdk/drag-drop`) antes que armar el manejo de teclado a mano.
- **Regla de oro:** *"sin ARIA es mejor que con ARIA mal puesta"* — un botón nativo mal decorado con
  `role` y `aria-*` redundantes es peor que un `<button>` sin ningún atributo ARIA (el navegador ya
  le da el rol, el estado y el soporte de teclado gratis). Ver la regla completa y ejemplos en
  [12-html5-semantics-seo.md](./12-html5-semantics-seo.md) §12.6.
- Nunca `tabindex` positivo (rompe el orden natural de tabulación y es casi imposible de mantener
  consistente). Manejar el foco programáticamente, no con `tabindex` ni leyendo el DOM del template:
  - **Angular CDK a11y** (`@angular/cdk/a11y`): `LiveAnnouncer` (anuncia mensajes a lectores de
    pantalla vía una región `aria-live`), `FocusMonitor` (detecta si un elemento se enfocó por mouse,
    teclado, touch o programáticamente — útil para mostrar el anillo de foco solo en navegación por
    teclado), `FocusKeyManager` (flechas para moverse entre ítems de una lista/menú) y la directiva
    `cdkTrapFocus` (atrapa el foco dentro de un modal/drawer mientras está abierto).
  - **Signal Forms**: `campo().focusBoundControl()` mueve el foco al control del DOM enlazado a ese
    campo — típicamente para saltar al primer campo inválido cuando falla un submit. Acepta
    `{ preventScroll: true }` si el control ya está en pantalla y no querés que la página scrollee.

```html
<!-- ❌ MAL — role/aria-* redundantes sobre un elemento que ya es accesible -->
<button role="button" tabindex="0" aria-label="Guardar">Guardar</button>

<!-- ✅ BIEN — el elemento nativo ya expone rol, foco y teclado -->
<button type="button">Guardar</button>
```

### 3.2 Metodología BEM

Toda clase CSS sigue **BEM**: `bloque__elemento--modificador`.
- Dentro del elemento, `-` separa particiones del mismo elemento.
- El componente raíz es siempre un `<section>` (o el landmark adecuado) con el nombre del bloque.

```html
<!-- ✅ BIEN -->
<section class="lista" aria-labelledby="lista-titulo">
  <header class="lista__header">
    <h1 id="lista-titulo" class="lista__header-title">Mi Cartera</h1>
    <p class="lista__header-subtitle">Listado de juicios</p>
  </header>

  <!-- Elemento anidado con partición -->
  <div class="lista__sub-header-input-search">...</div>

  <!-- Modificador -->
  <span class="lista__sub-header-text--bold">...</span>
</section>
```

**Estructura BEM:**
- `lista` → bloque
- `lista__header` → elemento
- `lista__header-title` → partición del elemento
- `lista__sub-header-text--bold` → elemento con modificador

### 3.3 Clases y estilos dinámicos

- **No usar `[ngClass]`** ni **`[ngStyle]`**: además de ser menos legibles, tienen un costo de
  performance mayor que los bindings nativos.
- Usar **bindings nativos** `[class]` / `[class.x]` / `[style.x]`.

```html
<!-- ❌ MAL -->
[ngClass]="circuloLicencia(dataPendiente, 1)"
[ngStyle]="{ color: isActive ? 'red' : 'blue' }"

<!-- ✅ BIEN — clase dinámica desde un computed -->
[class]="iconoDestacado()"

<!-- ✅ BIEN — objeto de clases -->
[class]="{ isNew: isNew(), isFeatured: isFeatured() }"

<!-- ✅ BIEN — objeto con spread (v21.1+) -->
[class]="{ ...baseClasses, active: isActive() }"

<!-- ✅ BIEN — clase condicional individual -->
[class.lista__item--active]="leftListActive() === etapa.nombreObjeto"

<!-- ✅ BIEN — estilo dinámico y con unidad -->
[style.color]="isActive() ? 'red' : 'blue'"
[style.width.px]="anchoColumna()"
```

Se pueden encadenar múltiples `[class.x]` y `[style.x]` en el mismo elemento sin límite.

### 3.4 Control flow nativo

- **Prohibido** `*ngIf`, `*ngFor`, `*ngSwitch`. Usar la sintaxis nativa.
- En `@for` **siempre** declarar `track` (obligatorio en runtime; sin `track` el compilador tira
  error). Preferir una propiedad identificadora estable (`id`, `uuid`); usar `$index` solo con
  colecciones estáticas que nunca cambian de orden; usar el objeto entero (`track item`) es el último
  recurso, porque Angular pasa a comparar por referencia (`===`) y no puede mapear qué dato
  corresponde a qué nodo del DOM si la referencia cambia — es la opción con peor performance.
- Aprovechar `@empty` para estados vacíos.
- `@case` consecutivos comparten bloque (fall-through, v21.1+): sirve para colapsar `@case` que
  renderizan lo mismo sin duplicar markup.
- `@default never;` (o `@default never(expr);`) fuerza **verificación exhaustiva** de uniones en
  tiempo de compilación: si el tipo del discriminante se extiende con un valor nuevo y ningún `@case`
  lo cubre, el build falla con un error de TypeScript (`Type '"x"' is not assignable to type 'never'`)
  en vez de renderizar un estado roto en producción.
  - **Limitante importante**: la exhaustividad depende del *narrowing* de TypeScript, que solo
    aplica a **variables**, no a llamadas a función ni a una señal invocada directamente
    (`@switch (estado())` no dispara el chequeo). Solución: asignar primero con `@let`.

```html
<!-- ✅ BIEN -->
@if (mainSidebarService.perfiles()?.length === 0) {
  <p class="lista__content-left-title">No tiene perfiles disponibles.</p>
} @else if (cargando()) {
  <app-spinner />
} @else {
  <ul class="lista__content-list">
    @for (perfil of mainSidebarService.perfiles(); track perfil.id) {
      <li class="lista__content-list-item">{{ perfil.nombre }}</li>
    } @empty {
      <li class="lista__content-list-item--empty">Sin resultados</li>
    }
  </ul>
}

<!-- ✅ BIEN — switch con fall-through y exhaustividad -->
@let currentStatus = status(); <!-- @default never necesita una variable, no status() directo -->
@switch (currentStatus) {
  @case ('pending')
  @case ('processing') { <app-loading /> }
  @case ('completed')  { <app-success /> }
  @default never;
}
```

- **`@let`** para nombrar valores derivados en el template y evitar llamadas repetidas:

```html
@let user = currentUser();
@let fullName = user.firstName + ' ' + user.lastName;

<h1>{{ fullName }}</h1>
@if (user.isAdmin) { <app-admin-badge /> }
```

- **`@defer`** para lazy-loading de bloques pesados (`on idle` admite timeout opcional en ms):

```html
@defer (on viewport) {
  <app-heavy-chart [data]="data()" />
} @placeholder {
  <div class="chart-placeholder">…</div>
} @loading (minimum 500ms) {
  <app-spinner />
} @error {
  <p>No se pudo cargar el gráfico.</p>
}

<!-- Con timeout: si el navegador no queda idle en 2s, carga igual (pasa a requestIdleCallback) -->
@defer (on idle(2000)) { <app-widget-pesado /> }
```

  Triggers disponibles para `on`: `idle` (admite timeout, ej. `idle(500)`), `viewport`, `interaction`,
  `hover`, `immediate` y `timer(ms)`. Se pueden combinar varios separados por `;` (dispara el primero
  que ocurra). Para la variante de **hidratación** de estos mismos triggers en apps con SSR, ver
  §3.11.

#### Otras mejoras de template disponibles (v21.1 → v22)

- **Spread / rest en expresiones** (v21.1+): `{a: 1, ...foo}` en objetos, `[1, ...foo]` en arrays,
  `fn(1, ...foo)` al invocar funciones. Reemplaza helpers que solo concatenaban arrays/objetos antes
  de pasarlos al template.
- **Arrow functions en expresiones** (v21.2+): útiles para actualizar signals sin exponer un método
  nuevo en la clase: `(click)="count.update(n => n + 1)"`. **No sirven como manejador completo de un
  evento** — `(click)="() => doSomething()"` no se invoca nunca y el compilador lo marca en build:
  *"Arrow function will not be invoked in this event listener. Did you intend to call a method?"*.
  Para eso, llamar el método directo: `(click)="doSomething()"`.
- **`instanceof`** en el template (v21.2+): `@if (event instanceof MouseEvent) { ... }`.
- **Semántica JS real de `?.`**: si la cadena se corta, el resultado es `undefined`. Además hay
  narrowing verdadero después de un chequeo de verdad, así que el acceso posterior no necesita `?.`.
- **Comentarios `//` y `/* … */` dentro de la lista de atributos** de un elemento, útiles para
  documentar bindings largos.

### 3.5 Templates simples, lógica en `computed`/`@let`

- Los templates **no contienen lógica compleja**: aritmética, ternarios anidados, cadenas de
  llamadas. Si hace falta, derivarlo en un `computed()` o `@let`.
- **Evitar funciones del `.ts` llamadas directamente desde el template**: se ejecutan en **cada**
  ciclo de detección de cambios, lo que degrada mucho el rendimiento. Toda lógica de presentación se
  resuelve **en el HTML** o, si es derivada, en un **`computed()`** (que se recalcula solo cuando
  cambian sus dependencias).
- No asumir globales como `new Date()` — derivarlos en el componente como signal.

```html
<!-- ❌ MAL — método invocado en cada detección de cambios -->
<span>{{ calcularTotal(item) }}</span>

<!-- ✅ BIEN — derivado con computed -->
@let total = totalItem();
<span>{{ total }}</span>
```

### 3.6 Tablas (nzTable / Material / nativas)

Si hay que aplicar `flex` u otros estilos de bloque a celdas `<td>`, hacerlo en un `<div>` interno,
**nunca directamente en el `<td>`** (rompe el layout de la tabla).

```html
<!-- ✅ BIEN -->
<td>
  <div class="lista__content-table-column--numero">
    @if (data?.esReservado) {
      <p class="lista__content-table-column--numero-reservado-title">Reservado</p>
    }
    <p class="lista__content-table-column--numero-text"
       [innerHTML]="data?.idJuicio | highlightSearch : busquedatext.value">
    </p>
  </div>
</td>
```

### 3.7 Two-way binding moderno

Usar `model()` en los componentes hijos en lugar del par `input` + `output`.

```ts
// hijo
readonly value = model<string>('');
```
```html
<!-- padre -->
<app-search [(value)]="searchTerm" />
```

### 3.8 Tooltip solo cuando el texto está truncado (`appOverflowDetector`)

Para textos recortados por CSS (`line-clamp`, `text-overflow: ellipsis`) que deben mostrar el
contenido completo en un tooltip **solo si efectivamente se truncaron**, se usa la directiva
`OverflowDetectorDirective` (`shared/directives/overflow-detector/overflow-detector.directive.ts`).
**Nunca** se mide el desborde en el template.

```html
<h4
  class="content-instruccion__titulo"
  appOverflowDetector
  #titulo="appOverflowDetector"
  nz-tooltip
  [nzTooltipTitle]="informe.titulo"
  nzTooltipOverlayClassName="tooltip-zorro__library"
  [nzTooltipTrigger]="titulo.isOverflowing() ? 'hover' : null">
  {{ informe.titulo }}
</h4>
```

```scss
.content-instruccion__titulo {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}
```

```ts
imports: [NzTooltipModule, OverflowDetectorDirective],
```

#### La directiva

```ts
import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';

@Directive({
  selector: '[appOverflowDetector]',
  exportAs: 'appOverflowDetector',
})
export class OverflowDetectorDirective {
  private readonly _el = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly isOverflowing = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const el = this._el.nativeElement;
      const check = () => this.isOverflowing.set(el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth);

      check();

      const observer = new ResizeObserver(check);
      observer.observe(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
```

- Mide `scrollHeight > clientHeight || scrollWidth > clientWidth` del host **fuera** de la detección
  de cambios (`afterNextRender`), cuando el layout ya está resuelto.
- `ResizeObserver` re-mide solo cuando el elemento cambia de tamaño (resize de ventana, cambio de
  contenido, colapso de un panel vecino). Se desconecta en `DestroyRef.onDestroy`.
- Expone `isOverflowing: Signal<boolean>`; con `exportAs` se lee desde el template vía
  `#ref="appOverflowDetector"`. Sirve para cualquier binding, no solo `nzTooltipTrigger`
  (`[class.x--truncado]`, `[attr.title]`, mostrar un botón "ver más", etc.).
- Es zoneless-friendly sin nada extra: `signal.set()` dentro del callback de `ResizeObserver` (que
  corre fuera de Angular) igual notifica a los consumidores del signal y agenda la actualización de
  vista — no hace falta `NgZone.run()` ni `ApplicationRef.tick()`.
- **No necesita `host: {}`**: no fija clases, atributos ni listeners sobre el propio host, solo
  expone estado vía `exportAs`. Cuando una directiva sí necesita bindear algo al host (una clase, un
  `role`, un listener de teclado), hacerlo con el bloque `host: {}` del decorador — nunca con
  `@HostBinding`/`@HostListener` (son la API vieja; `host: {}` es plano, se ve todo junto y no agrega
  overhead de decoradores por miembro):

```ts
// ✅ BIEN — host: {} en vez de @HostBinding/@HostListener
@Directive({
  selector: '[appAlgo]',
  host: {
    '[class.is-active]': 'active()',
    '[attr.aria-expanded]': 'active()',
    '(click)': 'toggle()',
  },
})
export class AlgoDirective {
  readonly active = signal(false);
  toggle(): void { this.active.update((v) => !v); }
}
```

#### Prohibido medir layout en el template

```html
<!-- ❌ MAL — NG0100 ExpressionChangedAfterItHasBeenCheckedError -->
<h4
  #titulo
  [nzTooltipTrigger]="titulo.scrollHeight > titulo.clientHeight ? 'hover' : null">
```

Por qué falla: `scrollHeight` / `clientHeight` se leen **durante** el ciclo de detección de cambios,
antes de que el navegador termine el layout. En el primer chequeo el elemento no tiene tamaño final
(`null`); en la verificación de dev mode ya lo tiene (`'hover'`). Angular ve que la expresión cambió
entre las dos pasadas y tira `NG0100` (el error apunta al **padre** que renderiza el componente, no al
binding culpable). En producción no tira error, pero el tooltip queda con el valor de la primera
pasada: nunca aparece, o aparece siempre. Además fuerza un reflow sincrónico en cada ciclo de CD por
cada elemento medido.

Mismo criterio para cualquier lectura de `offsetWidth` / `offsetHeight`, `getBoundingClientRect()`
o `getComputedStyle()` dentro de un binding: **nunca en el template**; siempre en una directiva o en
`afterNextRender` / `afterRenderEffect`, volcado a un signal.

Para verificar que no se coló ninguno (debe devolver 0 resultados):

```
grep -rn "scrollHeight\|clientHeight\|scrollWidth\|clientWidth\|offsetWidth\|offsetHeight" src/app --include=*.html
```

---

### 3.9 `nz-select`: ancho del dropdown según el option más largo (`nzDropdownMatchSelectWidth`)

Por defecto NG-ZORRO fuerza el panel de opciones de `nz-select` al **ancho exacto del select**:
un option más largo que el control se corta con ellipsis. **No se arregla con SCSS** (no hay que
tocar `.ant-select-dropdown` ni `.ant-select-item`): es un input del componente
(`NzSelectComponent`).

```html
<nz-select
  formControlName="tipoVencimiento"
  nzPlaceHolder="Tipo"
  [nzDropdownMatchSelectWidth]="false">
  @for (tipo of $$tipos(); track tipo.id) {
    <nz-option
      [nzValue]="tipo.id"
      [nzLabel]="tipo.descripcion" />
  }
</nz-select>
```

Con `false`, el select sigue siendo el `min-width` del panel, pero el panel **crece hasta el
option más ancho** (el overlay se dimensiona por contenido). Es la opción a usar en selects
angostos con labels largos (tipos, prioridades, organismos), típicamente dentro de grids de
formulario con `nz-col` chicos.

- Mantener el default (`true`) cuando el select ya es ancho o las labels son cortas: un panel más
  ancho que el control rompe la alineación visual.
- Si el problema es el **control** (no el panel), ahí sí es CSS: `width: 100%` sobre el
  `nz-select` (clase BEM `&__control`), no sobre clases de `.ant-*`.

---

### 3.10 Componentización de Templates HTML (Evitar HTMLs kilométricos)

> **Regla de oro de templates:** Ningún archivo `.html` debe superar las ~150–200 líneas. Si un
> template crece hacia las 300–600 líneas, es obligatorio **partirlo en subcomponentes**.

#### Señales de alerta en un template que exigen partirlo:

1. **Página con formulario + tabla + modal en el mismo HTML**:
   - ❌ Un único `.html` de 500 líneas con filtros, tabla NG-ZORRO y dos `<nz-modal>` incrustados al final.
   - ✅ El template principal solo compone piezas: `<app-user-filters>`, `<app-user-table>` y `<app-user-modal>`.
2. **Página o detalle con secciones complejas en el mismo HTML**:
   - ❌ Un único `.html` de 500 líneas con cabecera, filtros, tabla y formularios de subdetalle incrustados.
   - ✅ El template principal compone subcomponentes anidados directamente: `<app-subdetalle>` dentro de `detalle/subdetalle/` (NUNCA agrupados en una carpeta `components/`; ver [01-project-structure.md](./01-project-structure.md) §1 — dentro de una feature o componente, `components/` no existe, cada subcomponente vive en la carpeta del padre que lo usa).
3. **Ramas `@if` / `@switch` extensas**:
   - Si una rama del `@if` tiene más de 40 líneas de estructura, esa vista alternativa es un subcomponente (`<app-user-empty-state>`, `<app-user-detail-view>`).
4. **Uso de `@defer` para subcomponentes que no se ven de inmediato**:
   - Diálogos, drawers de detalle, paneles de auditoría o modales deben estar en subcomponentes y diferirse con `@defer (on interaction)` o `@defer (when isOpen())`:
   ```html
   <!-- ✅ Carga diferida del subcomponente pesado -->
   @if (showDetails()) {
     @defer (prefetch on idle) {
       <app-user-audit-drawer [userId]="selectedUserId()" (closed)="showDetails.set(false)" />
     } @placeholder {
       <div class="user-page__loading-placeholder">Cargando detalles…</div>
     }
   }
   ```
5. **Legibilidad BEM**: Si las clases BEM empiezan a anidar 4 niveles de particiones (`bloque__elemento-sub-sub-item`), ese bloque interno pide a gritos ser su propio componente con su propio bloque BEM raíz.

---

### 3.11 Hidratación incremental con `@defer` (SSR)

En apps con **SSR** (`provideClientHydration()`), Angular hidrata por defecto **todo el árbol** de la
página: descarga y ejecuta el JS de cada componente para conectar sus event listeners, aunque el
usuario nunca llegue a interactuar con esa parte. La **hidratación incremental** deja partes de la
página **deshidratadas** (HTML estático, sin listeners todavía) hasta que ocurre un trigger, así el
arranque ejecuta menos JS y llega antes a interactivo.

- Está **habilitada por defecto** junto con `provideClientHydration()`. Habilita automáticamente
  *event replay* (si ya tenés `withEventReplay()` explícito, se puede sacar). Para desactivarla usar
  `withNoIncrementalHydration()`.

```ts
// app.config.ts
import { provideClientHydration, withNoIncrementalHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(), // incremental hydration + event replay incluidos por defecto
    // provideClientHydration(withNoIncrementalHydration()), // para desactivarla
  ],
};
```

- Se controla **por bloque** agregando triggers `hydrate` al `@defer`, separados con `;` de los
  triggers de carga normales (`on ...`). Angular hidrata con el que ocurra primero:

| Trigger | Dispara cuando |
|---|---|
| `hydrate on idle` | El navegador queda idle (`requestIdleCallback`); admite timeout opcional: `hydrate on idle(500)`. |
| `hydrate on viewport` | El contenido entra al viewport. |
| `hydrate on interaction` | El usuario interactúa (click/keydown) con el elemento. |
| `hydrate on hover` | El mouse pasa sobre el área. |
| `hydrate on immediate` | Apenas termina de renderizar el contenido no diferido. |
| `hydrate on timer(ms)` | Después de una duración fija. |
| `hydrate when <expr>` | Se cumple una condición custom evaluada en el componente padre. |
| `hydrate never` | El bloque queda estático en el render inicial (nunca hidrata desde SSR). |

```html
<!-- Carga y luego hidrata al entrar al viewport, o antes si el usuario interactúa -->
@defer (on viewport; hydrate on interaction) {
  <app-comments-panel [postId]="postId()" />
} @placeholder {
  <div class="post__comments-placeholder">Cargando comentarios…</div>
}

<!-- Contenido decorativo: nunca necesita JS en el primer render -->
@defer (on viewport; hydrate never) {
  <app-related-articles />
}
```

- `hydrate never` deshabilita la hidratación de **todo el subárbol** anidado bajo ese bloque: no
  poner triggers `hydrate` en `@defer` anidados adentro, no van a dispararse.
- `hydrate when` solo dispara si ese bloque es el **primer ancestro deshidratado**: si el padre
  todavía está deshidratado, la expresión de la condición (definida en el padre) no es resoluble
  todavía y el trigger no sirve ahí.
- **Usar en**: paneles de comentarios, widgets de terceros, contenido bajo el fold que no es crítico
  para el LCP ni para la primera interacción. **No usar** en contenido *above-the-fold* con el que el
  usuario va a interactuar de inmediato (ahí conviene hidratar rápido, no diferir).
