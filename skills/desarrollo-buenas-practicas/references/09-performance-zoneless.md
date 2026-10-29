## 9. Performance y Zoneless

**Contenido:**
- [9.1 Zoneless: qué dispara change detection y qué no](#91-zoneless-qué-dispara-change-detection-y-qué-no)
- [9.2 Errores típicos al migrar a zoneless](#92-errores-típicos-al-migrar-a-zoneless)
- [9.3 `@defer` para código y componentes pesados](#93-defer-para-código-y-componentes-pesados)
- [9.4 `track` en `@for`](#94-track-en-for)
- [9.5 `NgOptimizedImage`](#95-ngoptimizedimage)
- [9.6 Lazy loading de rutas: `loadComponent` / `loadChildren`](#96-lazy-loading-de-rutas-loadcomponent--loadchildren)
  - [9.6.1 Recrear componente y servicios al navegar a la misma ruta](#961-recrear-componente-y-servicios-al-navegar-a-la-misma-ruta)
  - [9.6.2 Router resources: datos de la ruta sin resolvers (v22.2+)](#962-router-resources-datos-de-la-ruta-sin-resolvers-v222)
  - [9.6.3 Navigation API del navegador (experimental)](#963-navigation-api-del-navegador-experimental)
  - [9.6.4 Guards y configuración del router](#964-guards-y-configuración-del-router)
- [9.7 Hydration incremental y event replay](#97-hydration-incremental-y-event-replay)
  - [9.7.1 SSR: modo de render por ruta, tareas pendientes y transfer cache](#971-ssr-modo-de-render-por-ruta-tareas-pendientes-y-transfer-cache)
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
| `ComponentRef.setInput()` (componentes creados desde TS) | `ref.setInput('user', u)` |
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
- **Mutar in-place un array u objeto que se pasa como input a un componente de librería**: desde
  NG-ZORRO 22 todos sus componentes son `OnPush` (igual que los de Angular Material), así que
  `this.filas.push(x)` no repinta un `nz-table`. Actualizar siempre de forma inmutable:
  `filas.update(f => [...f, x])`.
- **Para detectar bindings que cambian sin notificar** (el bug típico tras migrar), en desarrollo:
  `provideCheckNoChangesConfig({ exhaustive: true, interval: 1000 })` (developer preview). Revisa
  periódicamente todo el árbol y lanza `ExpressionChangedAfterItHasBeenCheckedError` donde un valor
  cambió sin signal. Solo en el `app.config` de desarrollo, nunca en producción.

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
| `on viewport({ trigger: ref, rootMargin: '100px', threshold: 0.5 })` | Igual, con las opciones de `IntersectionObserver` (salvo `root`) |
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

Cuándo `@defer` **no** separa el código (el componente termina igual en el bundle inicial):

- La dependencia se usa fuera del `@defer` en el mismo archivo, o en un `viewChild()`.
- Se importa desde un barrel (`index.ts`): el bundler trata el barrel como un solo módulo. Importar
  desde el archivo del componente.
- Con HMR activo (`ng serve` por defecto) se descargan todos los chunks de `@defer` al inicio, sin
  respetar triggers. Para probar triggers: `ng serve --no-hmr`.

### 9.4 `track` en `@for`

`@for` **exige** una expresión `track`; no hay forma de omitirla. Elegirla mal anula el beneficio:

```html
<!-- ❌ MAL — track por índice: al insertar/eliminar en el medio, Angular re-usa las filas mal
     y re-renderiza de más (o arrastra estado de fila equivocado, ej. un input con foco) -->
@for (item of items(); track $index) {
  <app-item-row [item]="item" />
}

<!-- ✅ BIEN — track por identidad estable: Angular reordena el DOM existente en vez de recrearlo -->
@for (item of items(); track item.id) {
  <app-item-row [item]="item" />
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
- `width`/`height` siempre, para reservar el espacio y evitar layout shift (CLS). Imagen responsive:
  dimensiones intrínsecas del archivo (el tamaño en pantalla lo da el CSS). Imagen de tamaño fijo:
  el tamaño renderizado, con la misma proporción. Con `fill` no van (el padre define el tamaño).
- Puede haber más de una imagen `priority` por página si el LCP cambia según el tamaño de pantalla.
- No aplica a imágenes en base64 inline.

**Imágenes responsive y CDN:**

```html
<!-- sizes es obligatorio para que genere el srcset responsive -->
<img ngSrc="banner.jpg" width="1600" height="600" sizes="(max-width: 768px) 100vw, 50vw" placeholder />
```

```ts
// app.config.ts: loader del CDN (preconnect automático al dominio pasado como literal)
providers: [provideImgixLoader('https://imagenes.ejemplo.com/')],
```

- Con loader, `ngSrcset="100w, 200w"` o `"1x, 2x"` arma el `srcset` (sin nombres de archivo).
- `placeholder` muestra una versión borrosa mientras carga; **necesita loader** (sin él, pasar un
  data URL base64 de menos de 4 KB). `[placeholderConfig]="{ blur: false }"` quita el blur.
- Loader propio: proveer una función en el token `IMAGE_LOADER`; `loaderParams` le pasa datos extra.
  `IMAGE_CONFIG` ajusta `breakpoints` y `placeholderResolution`.
- Si el dominio va en una variable, Angular no genera el `preconnect`: agregarlo a mano en
  `index.html`.

### 9.6 Lazy loading de rutas: `loadComponent` / `loadChildren`

```ts
// app.routes.ts
export const routes: Routes = [
  {
    path: 'items',
    loadComponent: () => import('./items/items').then((m) => m.Items),
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

#### 9.6.1 Recrear componente y servicios al navegar a la misma ruta

Por defecto el router **reutiliza** la instancia del componente si la configuración de ruta no
cambia (ej. `/items/1` → `/items/2`, o un link que apunta a la ruta actual). El estado anterior
queda vivo: signals, formularios, servicios del componente. **No limpiar ese estado a mano**
(resets, `linkedSignal` de reinicio, flags). Forzar a Angular a destruir y recrear todo:

```ts
import { Component, DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-detalle-item',
  templateUrl: './detalle-item.html',
  providers: [DetalleItemStore], // se recrea junto con el componente
})
export class DetalleItem {
  private readonly _router = inject(Router);

  constructor() {
    const original = this._router.routeReuseStrategy.shouldReuseRoute;
    this._router.routeReuseStrategy.shouldReuseRoute = () => false;

    // La estrategia es global del Router: restaurarla al salir de esta ruta
    inject(DestroyRef).onDestroy(() => {
      this._router.routeReuseStrategy.shouldReuseRoute = original;
    });
  }
}
```

Si el link apunta a la **misma URL exacta**, el router ignora la navegación
(`onSameUrlNavigation: 'ignore'` por defecto) y el componente no se recrea. Habilitarlo en la
configuración:

```ts
// app.config.ts
provideRouter(routes, withComponentInputBinding(), withRouterConfig({ onSameUrlNavigation: 'reload' }));
```

Qué se recrea y qué no:

| Se recrea | No se recrea |
| :--- | :--- |
| El componente de la ruta y sus hijos | Servicios `providedIn: 'root'` |
| Servicios en `providers` del `@Component` | Servicios en `providers` de la `Route` (su injector se crea una sola vez) |

- El estado que debe reiniciarse va en un servicio declarado en `providers` del componente, nunca en
  `root` ni en `providers` de la ruta.
- `shouldReuseRoute = () => false` aplica a **todo el árbol activo**, incluidos layouts padre: también
  se recrean mientras la estrategia esté activa. Por eso se restaura en `DestroyRef.onDestroy`.
- Si la app tiene un layout pesado (menú, header con estado) o varias rutas necesitan este
  comportamiento, usar una estrategia global que solo recree las rutas marcadas:

```ts
// shared/services/routing/recrear-ruta-strategy.ts
export class RecrearRutaStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(futuro: ActivatedRouteSnapshot, actual: ActivatedRouteSnapshot): boolean {
    if (futuro.routeConfig?.data?.['recrear'] === true) return false;
    return futuro.routeConfig === actual.routeConfig;
  }
}

// app.config.ts
{ provide: RouteReuseStrategy, useClass: RecrearRutaStrategy }

// feature.routes.ts
{ path: ':id', loadComponent: () => import('./detalle-item/detalle-item').then((m) => m.DetalleItem), data: { recrear: true } }
```

#### 9.6.2 Router resources: datos de la ruta sin resolvers (v22.2+)

**Developer preview desde v22.2.** `resources` en la `Route` reemplaza a los resolvers: el router
arranca la carga antes de activar el componente, en **paralelo** entre rutas padre e hijas (sin
cascada de resolvers anidados), y los params llegan como signals. Con `nonBlocking()` la página
renderiza ya y el dato llega después.

```ts
// productos.routes.ts
import { nonBlocking, Routes } from '@angular/router';

export const PRODUCTOS_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () => import('./producto-detalle/producto-detalle').then((m) => m.ProductoDetalle),
    resources: (ctx) => ({
      // Bloqueante (default): la navegación espera; el componente recibe el valor
      producto: httpResource<Producto>(() => `${environment.API_URL}productos/${ctx.params().id}`),
      // No bloqueante: renderiza ya; el componente recibe el Resource entero
      resenias: nonBlocking(
        httpResource<Resenia[]>(() => `${environment.API_URL}productos/${ctx.params().id}/resenias`),
      ),
    }),
  },
];
```

```ts
// producto-detalle.ts: requiere provideRouter(routes, withRouterResources(), withComponentInputBinding()).
// Sin withRouterResources() el router ignora `resources` sin error.
export class ProductoDetalle {
  readonly producto = input.required<Producto>();
  readonly resenias = input.required<Resource<Resenia[]>>(); // isLoading() / error() / value() en el template
}
```

- **Bloqueante** para lo que la página no puede mostrar sin el dato (el producto). **`nonBlocking`**
  para lo secundario que puede llegar tarde (reseñas, recomendaciones, una tarjeta lateral).
- Un error **bloqueante** cancela la navegación (ahí sí sirve `RedirectCommand`, ej. 404 → listado).
  Un error **no bloqueante** es solo UI: la navegación ya terminó, `RedirectCommand` no hace nada;
  manejar el `error()` en el template o redirigir con `router.navigateByUrl` desde el loader.
- Solo lecturas. Mutaciones con `HttpClient` en el servicio (§4.12).
- Código nuevo: router resources en vez de `ResolveFn`. Resolvers existentes no se migran salvo que
  se toque esa ruta. Es developer preview: confirmar la API en `angular.dev` antes de usar algo que
  no esté acá.
- Si el dato lo usa solo el componente y no hace falta adelantar la carga, un `httpResource` en el
  componente sigue siendo lo más simple (§4.3).

#### 9.6.3 Navigation API del navegador (experimental)

`provideRouter(routes, withExperimentalPlatformNavigation())` (v21.1+) hace que el router intercepte
la Navigation API del navegador: un `<a href="/usuarios/5">` plano navega como SPA sin `routerLink`,
y el navegador restaura scroll y foco.

- **No usar en producción**: la doc oficial lo marca "highly experimental". Bugs conocidos: intercepta
  `<a download>` (el archivo no se descarga) y formularios POST nativos.
- `window.navigation` no existe en el servidor: con SSR/prerender rompe si se habilita sin chequear.
- Hasta que sea estable, seguir con `routerLink`.

#### 9.6.4 Guards y configuración del router

Guards **funcionales** (`CanActivateFn`, `CanActivateChildFn`, `CanDeactivateFn`, `CanMatchFn`),
nunca clases. Son UX: la autorización real la hace el back (15 §15.5).

```ts
// core/guard/auth-guard.ts
export const authGuard: CanActivateFn = (_route, state) =>
  inject(Auth).autenticado() ||
  inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
```

- Para redirigir, **devolver** un `UrlTree` o un `RedirectCommand` (este acepta opciones de
  navegación: `new RedirectCommand(urlTree, { skipLocationChange: true })`). Desde v22.2 también se
  puede **lanzar** el `RedirectCommand` (22.2.4+ para que respete el orden de los guards); preferir
  devolverlo.
  - ❌ `router.navigate()` dentro del guard y `return false`.
  - `returnUrl` se valida al usarlo (15 §15.7).
- `canActivateChild` corre una vez por cada ruta hija: un solo guard en el padre en vez de repetirlo.
- `canMatch` devuelve `false` y el router **sigue probando** las rutas siguientes: sirve para que un
  mismo `path` cargue un componente distinto según rol o feature flag, sin descargar el chunk ajeno.
  Tercer parámetro `currentSnapshot` (obligatorio en la interfaz desde v22).
- Varios guards en una ruta arrancan **en paralelo**; gana el resultado del primero del array que no
  devolvió `true`. Un guard no depende de otro: la lógica compartida va en un servicio.

**Cambios sin guardar** (`canDeactivate`), con el `dirty()` de Signal Forms:

```ts
// shared/guards/cambios-sin-guardar-guard.ts
export interface ConFormulario {
  readonly form: FieldTree<unknown>;
}

export const cambiosSinGuardarGuard: CanDeactivateFn<ConFormulario> = (componente) =>
  !componente.form().dirty() ||
  inject(Confirmacion).preguntar('Hay cambios sin guardar. ¿Salir igual?'); // modal propio, Promise<boolean>
```

- Después de guardar, `reset()` del form ([06](./06-signal-forms.md) §6.8) para que el guard no vuelva a preguntar.
- No cubre cerrar la pestaña ni recargar: para eso, `beforeunload` solo mientras haya cambios
  ([16](./16-websocket-signalr.md) §16.5).

**Configuración** (`app.config.ts`):

```ts
provideRouter(
  routes,
  withComponentInputBinding(),
  withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
  withPreloading(PreloadAllModules),
),
```

- `withInMemoryScrolling`: vuelve arriba al navegar y restaura el scroll con atrás / adelante. Sin
  esto, la página nueva abre en la posición de scroll de la anterior.
- `withPreloading(PreloadAllModules)`: descarga los chunks lazy en segundo plano después del
  arranque. Con muchas features pesadas, una `PreloadingStrategy` propia que precargue solo las
  rutas marcadas (`data: { precargar: true }`).
- **v22 (breaking)**: `paramsInheritanceStrategy` pasa a `'always'` por defecto. Una ruta hija ve
  los params de todos sus padres. Si un hijo usa un param con el mismo nombre que el padre,
  renombrarlo. Volver al comportamiento anterior (`withRouterConfig({ paramsInheritanceStrategy:
  'emptyOnly' })`) solo al migrar.

**Rutas**:

- `redirectTo` acepta una función que recibe el snapshot parcial (`params`, `queryParams`) y
  devuelve `string` o `UrlTree`; desde v20 también `Promise` u `Observable`. Para redirects que
  dependen de la URL; si dependen de permisos, es un guard.
- `loadComponent` / `loadChildren` corren en el contexto de inyección de la ruta (v20.1+): pueden
  usar `inject()`.
- `providers` en la `Route` para un servicio que vive con una feature lazy (se crea una vez y no se
  recrea al volver, §9.6.1; salvo con `withAutoCleanupInjectors()`, [17](./17-microfrontends.md) §17.3). Estado que se reinicia: `providers` del componente.
- Rutas anidadas: `children` + `<router-outlet />` en el layout padre. Outlets con nombre solo para
  un panel que navega independiente de la página. `routerOutletData` (v19+) pasa datos del padre al
  componente de la ruta hija, que lo lee como signal con `inject(ROUTER_OUTLET_DATA)`, sin servicio.
- `runGuardsAndResolvers: 'paramsOrQueryParamsChange'` cuando los guards o resources tienen que
  volver a correr al cambiar un query param (por defecto solo con cambios de params de ruta). Desde
  v21.1, la forma función corre en contexto de inyección.

**Estado del router en signals**:

- `isActive(url, router, opciones?)` (v21.1+) devuelve un `Signal<boolean>`. Sirve para la clase
  activa fuera de un link, en lugar de suscribirse a `router.events`:
  `readonly enConfig = isActive('/config', this._router, { paths: 'exact' });`
- `router.lastSuccessfulNavigation()` (signal desde v21) y `router.currentNavigation()` (ejemplo de uso: §10.4)
  reemplazan filtrar `router.events` para saber dónde se está o si hay una navegación en curso.

### 9.7 Hydration incremental y event replay

Solo si la app usa SSR. `provideClientHydration()` habilita la hydration en el cliente. **Desde v22,
la hydration incremental viene activada por defecto** (para desactivarla:
`withNoIncrementalHydration()`), y con ella el **event replay**.

```ts
// app.config.ts
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(), // sin withEventReplay(): ya viene incluido
    // ...
  ],
};
```

- **Event replay**: si el usuario hace click/interactúa **antes** de que termine la hydration, el
  evento se guarda y se re-dispara apenas el componente correspondiente termina de hidratarse — evita
  clicks "perdidos" en la carga inicial. Si el proyecto tiene `withEventReplay()` explícito, se saca
  ([03](./03-html-templates.md) §3.11).
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
- **Nunca `isPlatformBrowser` en un `@if` del template**: el servidor y el cliente renderizan
  distinto y rompe la hydration. Código solo de navegador va en `afterNextRender()`; para acceder al
  documento, `inject(DOCUMENT)`, nunca `document` global. Antes que chequeos en runtime, preferir un
  provider distinto por plataforma (en `app.config.server.ts`).

#### 9.7.1 SSR: modo de render por ruta, tareas pendientes y transfer cache

Solo si la app usa SSR (con hosting estático en IIS no aplica: build sin SSR).

**Modo de render por ruta** (`@angular/ssr`): cada ruta elige servidor, cliente o prerender.

```ts
// app.routes.server.ts
import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Client },            // CSR
  { path: 'ayuda', renderMode: RenderMode.Prerender },    // estático en el build
  {
    path: 'expedientes/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,                  // ids no generados: SSR
    async getPrerenderParams() {
      const api = inject(ExpedientesApi);                // inject antes de cualquier await
      const ids = await api.ids();
      return ids.map(id => ({ id }));
    },
  },
  { path: '**', renderMode: RenderMode.Server },         // datos por usuario: SSR
];

// app.config.server.ts
providers: [provideServerRendering(withRoutes(serverRoutes))],
```

- Datos del request en el servidor: tokens `REQUEST`, `RESPONSE_INIT` y `REQUEST_CONTEXT` de
  `@angular/core`. Valen `null` en el navegador y en el build; chequear antes de usarlos.

**Tareas pendientes en zoneless**: sin Zone.js, Angular no sabe que hay trabajo async en curso y
puede serializar el HTML antes de tiempo. Registrar lo que tiene que aparecer en el HTML del
servidor:

```ts
// servicio que inicializa una librería de terceros con callback (no HttpClient)
private readonly _tareas = inject(PendingTasks);

iniciar(): void {
  const listo = this._tareas.add(); // la app queda "inestable" hasta llamar listo()
  libreria.init(() => listo());
}
```

Un flujo RxJS dentro de un servicio: `.pipe(pendingUntilEvent())` (`@angular/core/rxjs-interop`)
lo mantiene pendiente hasta que emite, completa o falla.

`HttpClient` (y por lo tanto `httpResource` / `rxResource` sobre él) ya se registra solo; esto es
para promesas o timers propios.

**HTTP transfer cache**: los GET hechos en el servidor se reusan en la hydration sin repetir la
request (§4.9). Por defecto excluye POST y requests con `Authorization`. Ajustarlo con:

```ts
provideClientHydration(
  withHttpTransferCacheOptions({
    includeHeaders: ['ETag'],
    filter: req => !req.url.includes('/api/perfil'),
  }),
),
```

Por request: `http.get(url, { transferCache: false })`. Nunca `includeRequestsWithAuthHeaders: true`
con datos por usuario: la respuesta queda serializada en el HTML.

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

> `*cdkVirtualFor` y `<ng-template nz-virtual-scroll>` (abajo) son las **únicas** excepciones
> admitidas a "control flow nativo" (§3.4 / checklists): ni la CDK ni NG-ZORRO tienen equivalente en
> `@for`, y sin ellos no hay virtualización.

**NG-ZORRO** (`nz-table`), si la tabla ya es `nz-table` (librería de UI principal del equipo):

```html
<!-- El virtual scroll se activa con nzVirtualItemSize; no existe un input nzVirtualScroll -->
<nz-table
  [nzData]="items()"
  [nzVirtualItemSize]="54"
  [nzVirtualForTrackBy]="trackById"
  [nzFrontPagination]="false"
  [nzShowPagination]="false"
  [nzScroll]="{ y: '480px' }"
>
  <thead>
    <tr><th>Nombre</th></tr>
  </thead>
  <tbody>
    <ng-template nz-virtual-scroll let-data let-index="index">
      <tr><td>{{ data.nombre }}</td></tr>
    </ng-template>
  </tbody>
</nz-table>
```

```ts
protected readonly trackById = (_: number, item: Item) => item.id;
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
<td>{{ formatearMonto(item.monto) }}</td>

<!-- ✅ BIEN — computed derivado, se recalcula solo si cambia la fuente -->
<td>{{ item.montoFormateado }}</td>
<!-- montoFormateado viene de un computed()/mapper aplicado una vez sobre el resource (§4.6) -->
```

- Cruzar dos listas: `find` / `includes` / `some` dentro de un loop o `filter` es O(n²). Armar un
  `Set` (existencia) o `Map` (por id) una vez y consultar con `has` / `get`, O(n) total. Dentro de un
  `computed()`, así se recalcula barato.

```ts
// ❌ O(n²): recorre pedidos por cada usuario
readonly conPedidos = computed(() =>
  this.usuarios().filter((u) => this.pedidos().some((p) => p.usuarioId === u.id)),
);

// ✅ O(n): un Set, una pasada
readonly conPedidos = computed(() => {
  const ids = new Set(this.pedidos().map((p) => p.usuarioId));
  return this.usuarios().filter((u) => ids.has(u.id));
});
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

- **Pista de Angular en Chrome DevTools → Performance**: `enableProfiling()` (de `@angular/core`)
  antes de `bootstrapApplication`, o `ng.enableProfiling()` en la consola. Agrega al timeline qué
  componentes, change detection y hydration consumieron cada tramo. Solo funciona en modo desarrollo.

  ```ts
  // main.ts
  if (isDevMode()) enableProfiling(); // antes del bootstrap, para capturar el arranque
  bootstrapApplication(App, appConfig);
  ```

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
- ¿Las listas largas usan virtual scroll (CDK o `nz-table` con `nzVirtualItemSize`, §9.9)?
- ¿Los arrays y objetos que van a componentes de librería se actualizan inmutables (§9.2)?
- ¿El bundle inicial está dentro del budget de `angular.json` (§9.8)?

---
