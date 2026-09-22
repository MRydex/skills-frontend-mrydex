## 3. HTML — Convenciones

### 3.1 Accesibilidad (obligatorio)

- Todo HTML **debe pasar AXE** sin errores ni warnings críticos.
- Cumplir **WCAG AA** mínimo: contraste, foco visible, ARIA, navegación por teclado.
- Atributos ARIA dinámicos con `[attr.aria-*]`.
- Para componentes complejos (combobox, listbox, tabs, accordion, menu, tree, dialog) usar
  **`@angular/aria`** (estable desde v22: directivas headless que resuelven teclado y semántica ARIA
  y dejan el estilo en tus manos) o el **Angular CDK**. No inventar primitivas.
- Nunca `tabindex` positivos; manejar el foco programáticamente (`LiveAnnouncer`, `FocusManager`, o
  `focusBoundControl()` en Signal Forms).

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
- En `@for` **siempre** declarar `track` (obligatorio en runtime).
- Aprovechar `@empty` para estados vacíos.
- `@case` consecutivos comparten bloque (fall-through, v21.1+).
- `@default never;` (o `@default never(expr);`) para verificación **exhaustiva** de uniones en
  tiempo de compilación (v21.2+/v22).

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
@switch (status()) {
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

- **`@defer`** para lazy-loading de bloques pesados (`on idle` acepta timeout en ms desde v22):

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

@defer (on idle(2000)) { <app-widget-pesado /> }
```

#### Otras mejoras de template disponibles (v21.1 → v22)

- **Spread / rest**: `[...preferred, ...rest]`, `{{ sum(...numbers()) }}`.
- **Arrow functions con return implícito** en expresiones y event bindings (sin cuerpo de bloque,
  sin pipes adentro): `(click)="select((x) => x.id === item.id)"`.
- **`instanceof`** en el template: `@if (event instanceof MouseEvent) { ... }`.
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

#### ⛔ Prohibido medir layout en el template

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
tocar `.ant-select-dropdown` ni `.ant-select-item`): es un input del componente.

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

#### 🚩 Señales de alerta en un template que exigen partirlo:
1. **Página con formulario + tabla + modal en el mismo HTML**:
   - ❌ Un único `.html` de 500 líneas con filtros, tabla NG-ZORRO y dos `<nz-modal>` incrustados al final.
   - ✅ El template principal solo compone piezas: `<app-user-filters>`, `<app-user-table>` y `<app-user-modal>`.
1. **Página o detalle con secciones complejas en el mismo HTML**:
   - ❌ Un único `.html` de 500 líneas con cabecera, filtros, tabla y formularios de subdetalle incrustados.
   - ✅ El template principal compone subcomponentes anidados directamente: `<app-subdetalle>` dentro de `detalle/subdetalle/` (NUNCA agrupados en una carpeta `components/`).
2. **Ramas `@if` / `@switch` extensas**:
   - Si una rama del `@if` tiene más de 40 líneas de estructura, esa vista alternativa es un subcomponente (`<app-user-empty-state>`, `<app-user-detail-view>`).
3. **Uso de `@defer` para subcomponentes que no se ven de inmediato**:
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
4. **Legibilidad BEM**: Si las clases BEM empiezan a anidar 4 niveles de particiones (`bloque__elemento-sub-sub-item`), ese bloque interno pide a gritos ser su propio componente con su propio bloque BEM raíz.
