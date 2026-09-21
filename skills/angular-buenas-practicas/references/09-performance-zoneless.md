## 9. Performance y zoneless

Reglas no negociables para mantener una app zoneless rápida:

- **No declarar `Eager`** en componentes nuevos: `OnPush` (el default de v22) es lo que queremos.
- **Nunca mutar arrays/objetos** dentro de signals — siempre nueva referencia (§2.5).
- **Nunca `effect()`** para derivar estado — `computed()` (§2.7).
- **Sin funciones del `.ts` invocadas desde el template** — derivar con `computed`/`@let` (§3.5).
- **No `setTimeout` / `setInterval` para forzar CD** — era un anti-patrón con Zone.js y en zoneless
  directamente no funciona.
- **Imágenes**: `NgOptimizedImage` siempre que se pueda; `priority` en la imagen LCP.
- **Lazy loading de rutas**: `loadChildren: () => import('./feature/feature.routes')`.
- **`@defer`** para componentes pesados o below-the-fold; `injectAsync` para servicios pesados.
- **`content-visibility: auto`** para listas largas fuera del viewport.
- **Bundle**: chequear con `ng build --stats-json`. Meta para la ruta inicial: < 250 KB gzipped.

---
