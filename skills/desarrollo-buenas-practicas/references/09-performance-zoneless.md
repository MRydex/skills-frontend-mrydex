## 9. Performance y Zoneless

**Contenido:**
- [9.1 Zoneless: qué dispara change detection y qué no](#91-zoneless-qué-dispara-change-detection-y-qué-no)
- [9.2 Errores típicos al migrar a zoneless](#92-errores-típicos-al-migrar-a-zoneless)
- [9.3 `@defer` para código y componentes pesados](#93-defer-para-código-y-componentes-pesados)
- [9.4 `track` en `@for`](#94-track-en-for)
- [9.5 `NgOptimizedImage`](#95-ngoptimizedimage)
- [9.6 Lazy loading de rutas: `loadComponent` / `loadChildren`](#96-lazy-loading-de-rutas-loadcomponent--loadchildren)
- [9.7 Hydration incremental y `withEventReplay`](#97-hydration-incremental-y-witheventreplay)
- [9.8 Presupuestos de bundle y análisis](#98-presupuestos-de-bundle-y-análisis)
- [9.9 Virtual scroll para listas largas](#99-virtual-scroll-para-listas-largas)
- [9.10 `computed()` caro y funciones invocadas desde el template](#910-computed-caro-y-funciones-invocadas-desde-el-template)
- [9.11 Memory leaks: `DestroyRef` y `takeUntilDestroyed`](#911-memory-leaks-destroyref-y-takeuntildestroyed)
- [9.12 Profiling: Chrome DevTools y Angular DevTools](#912-profiling-chrome-devtools-y-angular-devtools)
- [9.13 Checklist rápida](#913-checklist-rápida)

### 9.1 Zoneless: qué dispara change detection y qué no

Sin Zone.js, Angular ya no "sabe" que algo cambió por parchear `setTimeout`/`Promise`/eventos del DOM:
solo re-renderiza cuando recibe una **notificación explícita**. Conocer la lista exacta es la base de
todo lo demás en este archivo.

**Sí dispara CD:**

| Disparador                                      | Ejemplo                                                 |
|--------------------------------------------------|----------------------------------------------------------|
| Un **signal** leído en el template cambia         | `count.set(count() + 1)` con `{{ count() }}` en el HTML  |
| Un **evento de template/host** se ejecuta         | `(click)="onAddElement()"`, `host: { '(click)': '...' }` |
| `AsyncPipe` recibe un nuevo valor del Observable  | `{{ dato$ \| async }}`                                    |
| `ComponentRef.setInput()` (usado por Angular y por los tests, §8.5) | `fixture.componentRef.setInput('user', u)` |
| `ChangeDetectorRef.markForCheck()`                | Excepcional: solo al envolver una API de terceros no reactiva |

**No dispara CD por sí solo** (y en zoneless ya no vale la pena intentarlo):

- `setTimeout` / `setInterval` — con Zone.js "colaban" un chequeo global; en zoneless no hacen nada.
- Una `Promise` resuelta fuera de un signal/resource — el `.then()` corre, pero nada le avisa a
  Angular que hay que repintar.
- Callbacks de librerías de terceros que tocan el DOM o mutan estado por fuera de Angular (un mapa,
  un gráfico, un WebSocket crudo).
- Mutar un signal **sin** llamar a `set()`/`update()` (mutación in-place — ver
  [02-typescript-signals.md](./02-typescript-signals.md) §2.5): el signal compara por referencia, así
  que si el objeto/array no cambia de referencia, Angular ni se entera de que "cambió".

> **Por qué importa**: cada `effect()`/`setTimeout` que alguien agrega "para forzar el refresco" es una
> señal de que falta modelar ese dato como signal, `computed()` o resource. La solución casi siempre
> es reactiva, no imperativa (ver la tabla de reemplazos en
> [02-typescript-signals.md](./02-typescript-signals.md) §2.7).

### 9.2 Errores típicos al migrar a zoneless

- **Dejar `zone.js` en `polyfills` de `angular.json`** después de migrar: si sigue cargado, la app
  vuelve a comportarse (y a pesar) como zone-based, y esconde bugs de reactividad que después
  explotan en producción si alguien lo saca.
- **Usar `setTimeout`/`setInterval` esperando que "total, algo va a refrescar"**: en zoneless no pasa
  nada. Reemplazo: signal + `computed()`, o `debounced()` para temporización (§2.5).
- **Depender de `NgZone.onMicrotaskEmpty` / `onUnstable` / `onStable`**: estos observables **nunca
  emiten** en una aplicación zoneless. Si hay código legado que escucha alguno, hay que migrarlo a
  `afterNextRender()` / `afterRenderEffect()` o a la señal de dominio correspondiente.
- **Formularios que escriben estado por fuera de signals** (`setValue`/`patchValue` de Reactive
  Forms) no disparan CD por sí solos en zoneless. No aplica si el equipo ya usa exclusivamente Signal
  Forms (§6), pero es el motivo técnico por el que Reactive Forms está prohibido en código nuevo.
  Cualquier código legado en Reactive Forms que conviva con la migración necesita conectarse
  manualmente a una notificación de cambio.
- **`ChangeDetectorRef.detectChanges()`/`markForCheck()` esparcidos "por las dudas"**: si hace falta
  llamarlos seguido, el estado no está bien modelado en signals. Es la misma señal de alarma que un
  `effect()` de sincronización (§2.7).

### 9.3 `@defer` para código y componentes pesados

`@defer` separa un bloque del bundle inicial y lo carga bajo demanda. Usar en componentes pesados,
modales, gráficos, contenido below-the-fold.

```html
@defer (on viewport) {
  <app-grafico-pesado [data]="datos()" />
} @placeholder (minimum 200ms) {
  <div class="grafico-pesado__placeholder">Cargando…</div>
} @loading (after 100ms; minimum 500ms) {
  <app-spinner />
} @error {
  <p>No se pudo cargar el gráfico.</p>
}
```

**Triggers disponibles** (por defecto: `on idle`):

| Trigger                     | Dispara cuando…                                             |
|------------------------------|--------------------------------------------------------------|
| `on idle` / `on idle(500)`   | El navegador queda inactivo (con timeout opcional en ms)     |
| `on viewport` / `on viewport(ref)` | El bloque (o el elemento `ref`) entra en el viewport    |
| `on interaction` / `(ref)`   | Click/keydown sobre el bloque o sobre `ref`                   |
| `on hover`                   | Hover sobre el bloque                                         |
| `on timer(500ms)`            | Pasa el tiempo indicado                                       |
| `on immediate`               | Apenas se resuelve el render inicial (sin esperar idle)       |
| `when condicion`             | Una expresión propia se vuelve `true`                         |

`prefetch` descarga el código **antes** de mostrarlo, sin renderizarlo todavía — combinar triggers de
render "lazy" con un prefetch más agresivo:

```html
@defer (on interaction; prefetch on idle) {
  <app-modal-pesado />
}
```

Para servicios pesados (no componentes), usar `injectAsync()` en vez de `@defer` (ver
[02-typescript-signals.md](./02-typescript-signals.md) §2.4).

### 9.4 `track` en `@for`

`@for` **exige** una expresión `track`; no hay forma de omitirla. Elegirla mal anula el beneficio:

```html
<!-- ❌ MAL — track por índice: al insertar/eliminar en el medio, Angular re-usa las filas mal
     y re-renderiza de más (o arrastra estado de fila equivocado, ej. un input con foco) -->
@for (juicio of juicios(); track $index) {
  <app-juicio-row [juicio]="juicio" />
}

<!-- ✅ BIEN — track por identidad estable: Angular reordena el DOM existente en vez de recrearlo -->
@for (juicio of juicios(); track juicio.id) {
  <app-juicio-row [juicio]="juicio" />
}
```

`track $index` solo es aceptable en listas **verdaderamente estáticas** (que nunca se reordenan, ni
insertan, ni eliminan ítems intermedios). Para el resto, siempre un identificador estable del dato
(`id`, `key`), nunca el objeto completo (cambia de referencia en cada fetch aunque el `id` sea el
mismo, y se pierde el beneficio de reconciliación de `track`).

### 9.5 `NgOptimizedImage`

```ts
import { NgOptimizedImage } from '@angular/common';

@Component({
  imports: [NgOptimizedImage],
})
```

```html
<!-- Imagen LCP (la más grande sobre el fold): priority + dimensiones explícitas -->
<img ngSrc="hero.jpg" width="800" height="400" priority />

<!-- Resto de las imágenes: lazy por defecto -->
<img ngSrc="avatar.jpg" width="48" height="48" />

<!-- Contenedor de tamaño dinámico: fill (el padre necesita position relative/absolute/fixed) -->
<div class="card__cover-wrapper">
  <img ngSrc="cover.jpg" fill />
</div>
```

- `ngSrc` reemplaza a `src` (Angular necesita controlar `loading` antes de que el navegador arranque
  la descarga; con `src` normal ya sería tarde).
- `priority` en la imagen LCP: fija `fetchpriority="high"`, `loading="eager"` y genera el `preload`
  link en SSR. **Sin esto, la imagen más grande del viewport inicial compite por ancho de banda con
  todo lo demás** y empeora el LCP.
- `width`/`height` siempre, para reservar el espacio y evitar layout shift (CLS).
- No aplica a imágenes en base64 inline.

### 9.6 Lazy loading de rutas: `loadComponent` / `loadChildren`

```ts
// app.routes.ts
export const routes: Routes = [
  {
    path: 'juicios',
    loadComponent: () => import('./juicios/juicios').then((m) => m.Juicios),
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
];
```

- `loadComponent` para una sola ruta/componente; `loadChildren` para un subárbol de rutas de una
  feature completa. Ambos generan un **chunk separado** que solo se descarga al navegar ahí.
- Cualquier ruta que no sea parte del flujo inicial (login → dashboard) es candidata a lazy loading.
- `provideRouter(routes, withComponentInputBinding())` sigue funcionando igual con rutas lazy: los
  parámetros de ruta llegan como `input()` al componente cargado.

### 9.7 Hydration incremental y `withEventReplay`

`provideClientHydration()` habilita SSR + hydration en el cliente. **Desde v22, la hydration
incremental viene activada por defecto** al usar `provideClientHydration()` (para desactivarla:
`withNoIncrementalHydration()`).

```ts
// app.config.ts
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    // ...
  ],
};
```

- `withEventReplay()`: si el usuario hace click/interactúa **antes** de que termine la hydration, el
  evento se guarda y se re-dispara apenas el componente correspondiente termina de hidratarse — evita
  clicks "perdidos" en la carga inicial.
- **Hydration incremental**: un `@defer` puede declarar un trigger `hydrate` para decirle a Angular
  "renderizá esto en el servidor, pero dejalo **deshidratado** en el cliente hasta que ocurra esto":

```html
@defer (hydrate on interaction) {
  <app-panel-filtros />
} @placeholder {
  <div class="panel-filtros__placeholder"></div>
}
```

  Triggers de hydrate disponibles: `hydrate on idle`, `on viewport`, `on interaction`, `on hover`,
  `on timer(ms)`, `on immediate`, `hydrate when condición`, y `hydrate never` (el bloque queda
  deshidratado indefinidamente — para contenido puramente decorativo o que no necesita interactividad
  del lado del cliente).
- **Requisito no negociable de hydration**: el DOM generado en servidor y cliente debe ser
  **idéntico**. Manipulación directa del DOM (`innerHTML`, `appendChild` a mano, librerías de
  terceros que tocan el DOM) rompe el matching y fuerza a Angular a descartar y re-renderizar ese
  subárbol (pierde el beneficio de la hydration). Si un componente puntual no se puede arreglar,
  `ngSkipHydration` lo excluye — pero sacrifica performance para ese árbol.

### 9.8 Presupuestos de bundle y análisis

```json
// angular.json
"budgets": [
  { "type": "initial", "maximumWarning": "250kb", "maximumError": "300kb" },
  { "type": "anyComponentStyle", "maximumWarning": "4kb", "maximumError": "8kb" }
]
```

- Meta del equipo para la ruta inicial: **< 250 KB gzipped**. El budget de arriba avisa antes de
  pasarse; ajustarlo hacia abajo, nunca subirlo para "que pase" sin antes intentar reducir el bundle
  (lazy loading, §9.6; `@defer`, §9.3).
- Analizar qué ocupa espacio: `ng build --stats-json` genera un `stats.json` (metafile de esbuild) en
  `dist/<app>/`. Subirlo a https://esbuild.github.io/analyze/ (o una herramienta equivalente) muestra
  el árbol de dependencias y qué módulo pesa más — típicamente una librería importada sin tree-shaking
  (import del paquete completo en vez de la función puntual) o un ícono/SVG grande sin lazy load.

### 9.9 Virtual scroll para listas largas

Para listas de cientos/miles de filas, renderizar todo el DOM de una es el cuello de botella más
común. Angular no tiene virtualización nativa en `@for`; se resuelve con CDK o con la librería de UI.

**Angular CDK** (`@angular/cdk/scrolling`):

```ts
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({ imports: [ScrollingModule] })
```

```html
<cdk-virtual-scroll-viewport itemSize="48" class="lista__viewport">
  <div class="lista__item" *cdkVirtualFor="let item of items()">{{ item.nombre }}</div>
</cdk-virtual-scroll-viewport>
```

> `*cdkVirtualFor` es la **única** excepción admitida a "control flow nativo" (§2 / checklists): CDK
> todavía no tiene equivalente en `@for`, y sin él no hay virtualización posible con la CDK.

**NG-ZORRO** (`nz-table`), si la tabla ya es `nz-table` (librería de UI principal del equipo):

```html
<nz-table
  [nzData]="juicios()"
  [nzVirtualScroll]="true"
  [nzVirtualItemSize]="54"
  [nzVirtualMaxBufferPx]="200"
  [nzVirtualMinBufferPx]="100"
  [nzScroll]="{ y: '480px' }"
>
  ...
</nz-table>
```

Para listas moderadas que no justifican virtualización completa, `content-visibility: auto` en el
contenedor sigue siendo una mejora barata (el navegador se salta el layout/paint de lo que está fuera
del viewport).

### 9.10 `computed()` caro y funciones invocadas desde el template

- Un `computed()` **memoiza** por sus dependencias: si ninguna cambió, devuelve el valor cacheado sin
  recalcular. Un `computed()` "caro" (ordenar/filtrar un array grande, formatear muchas fechas) sigue
  siendo válido siempre que sus dependencias sean **finas** — si depende de un signal que cambia de
  referencia en cada tick sin necesidad (por ejemplo, un objeto reconstruido en cada render en vez de
  solo cuando cambia el dato real), pierde el beneficio de la memoización y recalcula de más.
- **Nunca invocar un método del `.ts` directamente desde el template** (ver
  [03-html-templates.md](./03-html-templates.md) §3.5): a diferencia de un `computed()`, un método
  se re-ejecuta en **cada ciclo de detección de cambios**, sin memoización, aunque sus datos no hayan
  cambiado.

```html
<!-- ❌ MAL — formatearMonto() corre en cada CD, sin memoizar -->
<td>{{ formatearMonto(juicio.monto) }}</td>

<!-- ✅ BIEN — computed derivado, se recalcula solo si cambia la fuente -->
<td>{{ juicio.montoFormateado }}</td>
<!-- montoFormateado viene de un computed()/mapper aplicado una vez sobre el resource (§4.6) -->
```

### 9.11 Memory leaks: `DestroyRef` y `takeUntilDestroyed`

El estado del equipo es signals (§2.5/§2.9), así que la superficie para leaks de suscripciones es
chica — pero sigue existiendo en los puntos donde se interopera con RxJS "en el borde" (una librería
de terceros que solo expone Observables) o con listeners nativos del navegador.

```ts
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Service()
export class GeolocationWatcher {
  private readonly _destroyRef = inject(DestroyRef);

  watch(): void {
    algunaLibreriaExterna
      .streamDeUbicacion()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((pos) => this._actualizar(pos));
  }
}
```

- `takeUntilDestroyed(destroyRef)` reemplaza al patrón manual `Subscription` + `unsubscribe()` en
  `ngOnDestroy` (prohibido, ver [02-typescript-signals.md](./02-typescript-signals.md) §2.9): se
  desuscribe solo cuando se destruye el componente/servicio con scope.
- Llamado dentro de un contexto de inyección (constructor, campo de clase, o con `inject()` como en el
  ejemplo) no hace falta pasar `destroyRef` explícito — pero pasarlo explícito es más claro cuando el
  `.subscribe()` ocurre dentro de un método, como en el ejemplo.
- `DestroyRef.onDestroy(callback)` es la base de más bajo nivel: registrar cualquier cleanup (cerrar
  un `WebSocket`, un `ResizeObserver`, remover un `addEventListener` agregado a mano) sin esperar a un
  `ngOnDestroy` explícito.
- Un `resource()`/`httpResource()`/`rxResource()` **no necesita nada de esto**: se limpia solo al
  destruirse el contexto que lo creó (ver [04-resource-api.md](./04-resource-api.md) §4.8).

### 9.12 Profiling: Chrome DevTools y Angular DevTools

- **Angular DevTools → pestaña Profiler**: graba una sesión y muestra cada ciclo de detección de
  cambios, cuánto tardó y qué componentes se re-evaluaron. Señales de alarma: ciclos muy frecuentes
  sin interacción del usuario (algo dispara CD de más, ver §9.1) o un componente puntual que aparece
  en **todos** los ciclos (candidato a que su `computed()` no esté memoizando bien, §9.10).
- **Chrome DevTools → Performance**: graba CPU/paint/layout real del navegador. Útil para separar
  "Angular re-renderiza de más" (se ve en Angular DevTools) de "el navegador tarda en pintar/hacer
  layout" (listas gigantes sin virtualizar, §9.9; imágenes sin `width`/`height`, §9.5).
- **Lighthouse** (integrado en Chrome DevTools) para métricas de Core Web Vitals (LCP, CLS, INP) en
  una carga real — el punto de partida para saber si `priority`/lazy loading/hydration incremental
  están dando resultado.

### 9.13 Checklist rápida

- ¿Todo cambio de UI pasa por un signal (§2.5), nunca por `setTimeout`/mutación in-place (§9.1)?
- ¿Las rutas no críticas están detrás de `loadComponent`/`loadChildren` (§9.6)?
- ¿Los componentes pesados o below-the-fold están en `@defer` (§9.3)?
- ¿Todo `@for` tiene `track` por identidad estable, no por índice ni por objeto completo (§9.4)?
- ¿La imagen LCP tiene `NgOptimizedImage` + `priority` (§9.5)?
- ¿Ninguna plantilla llama a un método del componente directamente; todo pasa por `computed`/`@let`
  (§9.10, [03-html-templates.md](./03-html-templates.md) §3.5)?
- ¿Las listas largas usan virtual scroll (CDK o `nz-table`, §9.9)?
- ¿El bundle inicial está dentro del budget de `angular.json` (§9.8)?

---
