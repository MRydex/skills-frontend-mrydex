## 20. Migración de un proyecto Angular legacy

### Índice

- 20.1 Cuándo aplica y reglas
- 20.2 Orden de la migración
- 20.3 Pasos 0 a 3: baseline, `ng update`, tslint, builder
- 20.4 Pasos 4 a 8: standalone, control flow, `inject`, signals, rutas lazy
- 20.5 Paso 9: zoneless
- 20.6 Pasos 10 a 12: Signal Forms, estado, jQuery y CSS legacy
- 20.7 Qué hacer si falla
- 20.8 Qué usar según la versión del proyecto (sin migrar)

---

### 20.1 Cuándo aplica y reglas

**Aplica solo cuando el usuario pide migrar o actualizar** un proyecto legacy: `NgModule`, `zone.js`,
builder webpack (`@angular-devkit/build-angular`), `tslint`, Reactive Forms, estado con RxJS.

- **Nunca migrar por iniciativa propia** durante otra tarea ("ya que estoy"). Una migración es un
  pedido aparte, con su rama y su `tasks/todo.md` ([11](./11-workflow-orchestration.md)).
- **No refactorizar código que no se toca.** Cada paso aplica el schematic oficial y arregla lo que
  rompe; no se reescribe lo que anda por gusto (SKILL.md, regla de alcance).
- **Un commit por paso, con el build en verde en cada uno.** Si un paso no compila, no se sigue con el
  siguiente. Así cualquier paso se revierte solo.
- El código migrado queda con las reglas del equipo ([02](./02-typescript-signals.md),
  [03](./03-html-templates.md), [06](./06-signal-forms.md)). Lo que el schematic deja a medias se
  anota, no se apura.
- **Sin tests**: la verificación de cada paso es build, lint y recorrer el flujo en la app ([08](./08-sin-tests.md)
  §8.3). Si el proyecto ya tiene specs, que sigan en verde (§8.2).

### 20.2 Orden de la migración

| # | Paso | Herramienta |
| :--- | :--- | :--- |
| 0 | Baseline: build, lint y `npm audit` antes de tocar | `ng build`, `ng lint` |
| 1 | Actualizar un major por vez | `ng update @angular/core@N @angular/cli@N` |
| 2 | Sacar `tslint` / `codelyzer` | Migrar a ESLint (`ng add angular-eslint`) |
| 3 | Builder a `application` (esbuild) | migración `use-application-builder` |
| 4 | Standalone | `ng generate @angular/core:standalone` |
| 5 | Control flow | `ng generate @angular/core:control-flow` |
| 6 | `inject()` | `ng generate @angular/core:inject` |
| 7 | Signal inputs / outputs / queries | `signal-input-migration`, `output-migration`, `signal-queries-migration` |
| 8 | Rutas lazy | `ng generate @angular/core:route-lazy-loading` |
| 9 | Zoneless (al final de los pasos con schematic, 4-8) | `provideZonelessChangeDetection()` |
| 10 | Reactive Forms a Signal Forms | A mano, **por formulario**, solo si se toca |
| 11 | `BehaviorSubject` como estado a signals | Gradual, por servicio |
| 12 | jQuery y frameworks CSS legacy | Último |

Verificá los nombres con `ng generate @angular/core: --help` (lista los schematics de la versión
instalada) y la guía oficial en `update.angular.dev`: algunos cambian entre majors.

### 20.3 Pasos 0 a 3: baseline, `ng update`, tslint, builder

**Paso 0 — Baseline.** Antes de tocar nada: `ng build`, `ng lint` y `npm audit` en el estado actual, y
anotar los errores y warnings que ya existen. "Sin errores **nuevos**" se mide contra esto (§11.3). Si el
build ya está roto, avisar y no empezar.

**Paso 1 — `ng update`, un major por vez.** Con el árbol de git limpio:

```bash
ng update @angular/core@20 @angular/cli@20     # N = el siguiente major, nunca saltear
```

- Consultá `update.angular.dev` con la versión de origen y la de destino: lista los pasos manuales y los
  breaking changes de cada salto.
- Después de cada major: instalar, `ng build`, `ng lint`, recorrer la app y commitear. Recién ahí el
  siguiente major.
- Librerías que van atadas a Angular (`ng-zorro-antd`, `@angular/material`, `angular-eslint`): `ng
  update` también, en el mismo paso. Las que no tienen versión compatible se reportan, no se parchean.
- Actualizar Node y TypeScript a lo que pide cada major (se ve en el error de `ng update` o en la doc).
- `tsconfig.json` con `strict: false` (o sin `strict`): activar de a un flag, en este orden, corrigiendo
  los errores de cada uno antes del siguiente: `strictNullChecks: true` (el que más errores saca y más
  bugs evita: `null` / `undefined` sin chequear), `noImplicitAny: true`, después `strict: true` y borrar
  los flags sueltos; en `angularCompilerOptions`, `strictTemplates: true`. Corregir con angostado
  (`if (!x) return`, `?.`, `??`), nunca con `!` ni `as` en masa. Si un flag deja cientos de errores,
  commitear por carpeta (`src/app/<feature>`), sin mezclar con el `ng update`.

**Paso 2 — Sacar `tslint` y `codelyzer`.** Están discontinuados. `ng add angular-eslint` y
migrar las reglas (`ng generate angular-eslint:...` según versión; verificá con `--help`). Borrar
`tslint.json`, `codelyzer` y los scripts viejos. Si el proyecto ya usa ESLint, saltear el paso.

**Paso 3 — Builder `@angular/build:application`.** Reemplaza al builder webpack
`@angular-devkit/build-angular:browser`:

```bash
ng update @angular/cli --name=use-application-builder
```

- Mueve `main` a `browser`, ajusta `polyfills`, `assets`, `styles` y el target `serve`, y agrega
  `@angular/build`.
- Revisar a mano lo que no se migra solo: `webpack` customizado (`@angular-builders/custom-webpack`),
  `require` / `import` de rutas no soportadas, `proxy.conf`, `baseHref`. Si hay config webpack propia,
  documentar qué hacía y reemplazarla por la opción equivalente o avisar al usuario.
- Comparar la salida (`dist/`) y los budgets antes de commitear; en IIS, verificar que `web.config` sigue
  sirviendo el `browser/` correcto ([10](./10-environment-tooling.md) §10.2).

### 20.4 Pasos 4 a 8: standalone, control flow, `inject`, signals, rutas lazy

**Paso 4 — Standalone.** El schematic corre en **tres modos, en orden**, con commit entre cada uno:

```bash
ng generate @angular/core:standalone     # 1) "Convert all components, directives and pipes to standalone"
ng generate @angular/core:standalone     # 2) "Remove unnecessary NgModule classes"
ng generate @angular/core:standalone     # 3) "Bootstrap the project using standalone APIs"
```

- Al terminar el modo 3: `main.ts` con `bootstrapApplication(App, appConfig)` y providers en
  `app.config.ts` (`provideRouter`, `provideHttpClient`), sin `AppModule`.
- `HttpClientModule` / `HTTP_INTERCEPTORS` de clase pasan a `provideHttpClient(withInterceptorsFromDi())`
  para no cambiar el orden; recién después se convierten a funcionales ([05](./05-http-interceptors.md)).
- Desde v19 `standalone: true` es el default y el schematic lo saca; en v18 o menor se declara
  (SKILL.md, regla 4).

**Paso 5 — Control flow.** `ng generate @angular/core:control-flow` reemplaza `*ngIf`, `*ngFor` y
`*ngSwitch` por `@if`, `@for`, `@switch`. Revisar que cada `@for` tenga un `track` correcto (el
schematic pone `$index` si no encuentra `trackBy`: pasar a una clave estable, [09](./09-performance-zoneless.md)).
Después: `ng generate @angular/core:cleanup-unused-imports` para sacar `NgIf`/`NgFor` de `imports`.

**Paso 6 — `inject()`.** `ng generate @angular/core:inject` convierte la inyección por constructor.
Revisar clases con herencia (el schematic tiene la opción `--backwards-compatible-constructors`,
verificá con `--help`) y que el orden de campos siga §2.6.

**Paso 7 — Signal inputs, outputs y queries.** Tres schematics independientes, un commit cada uno:

```bash
ng generate @angular/core:signal-input-migration
ng generate @angular/core:output-migration
ng generate @angular/core:signal-queries-migration
```

Piden el path a migrar: arrancar por una carpeta chica, validar y ampliar. Lo que no puede migrar
(escrituras al input desde adentro, `@Input` con setter complejo) lo deja con un `TODO`: resolver a mano
solo si ese componente se toca.

**Paso 8 — Rutas lazy.** `ng generate @angular/core:route-lazy-loading` convierte rutas con
`component:` en `loadComponent: () => import(...)`. Mantener eager solo lo que debe cargar al
inicio (shell, login). Resultado esperado: chunks más chicos en el build ([09](./09-performance-zoneless.md) §9.6).

### 20.5 Paso 9: zoneless

**Al final de los pasos con schematic (4 a 8)**: zoneless rompe lo que dependía de que `zone.js` dispare el change detection, y
recién con los pasos 4 a 8 (standalone, signals, rutas lazy) el código está preparado.

```ts
// app.config.ts
providers: [provideZonelessChangeDetection(), /* ... */]
```

```json
// angular.json → build.options: sacar "zone.js" de polyfills
"polyfills": []
```

Desinstalar `zone.js` (`npm uninstall zone.js`) y borrarlo de `polyfills`/`main.ts` y de `test` si existe.

Qué rompe y cómo arreglarlo:

| Síntoma | Causa | Arreglo |
| :--- | :--- | :--- |
| La vista no se actualiza tras un evento o `setTimeout` | Estado en variables sueltas | Pasar a `signal()` ([02](./02-typescript-signals.md) §2.5) |
| `NG0908: In this configuration Angular requires Zone.js` | Quedó `zone.js` o `provideZoneChangeDetection()` | Sacar la config y el polyfill |
| Un valor de un `Observable` no se ve | `async` pipe ausente o suscripción manual | `toSignal()` o `rxResource` |
| Librería de terceros que usaba `NgZone.run` | Dependía de zone.js | Actualizarla; si no, avisar al usuario |
| `NgZone.onStable` / `NgZone.isStable` | API atada a la zona | `afterNextRender` / `ApplicationRef.whenStable()` |

La herramienta del CLI MCP `onpush_zoneless_migration` (§10.8) guía el análisis. Detalle de cómo
diagnosticar vistas que no se actualizan: [09](./09-performance-zoneless.md).

### 20.6 Pasos 10 a 12: Signal Forms, estado, jQuery y CSS legacy

**Paso 10 — Reactive Forms a Signal Forms.** **Por formulario y solo cuando se toca** esa pantalla por
otra razón o el usuario lo pide; nunca un big bang. No hay schematic: se reescribe el formulario con
`form()` ([06](./06-signal-forms.md)). Para convivir mientras tanto: `SignalFormControl`
(`@angular/forms/signals/compat`, §6.9). Los formularios que no se tocan se dejan como están.

**Paso 11 — `BehaviorSubject` como estado a signals.** Servicio por servicio, gradual: el estado pasa
a `signal()` privado + `asReadonly()` (§2.3), y RxJS queda solo para flujos ([02](./02-typescript-signals.md)
§2.9). Si un consumidor todavía necesita un `Observable`, `toObservable()` lo puentea hasta migrarlo.

**Paso 12 — jQuery y frameworks CSS legacy** (Bootstrap viejo, plugins jQuery). Último y por
pantalla: reemplazar por HTML semántico ([12](./12-html5-semantics-seo.md)), la librería de UI del
proyecto y SCSS con BEM ([07](./07-styles-scss.md)). Sacar el paquete recién cuando no queda ningún uso
(`graphify query` o `grep` del import/global `$`). No mezclar este paso con otros.

### 20.7 Qué hacer si falla

| Falla | Qué hacer |
| :--- | :--- |
| `ng update` pide `--force` o hay peer deps en conflicto | No forzar. Leer el conflicto, actualizar primero la librería afectada o reportar la que no tiene versión compatible |
| `ng update` deja cambios a medio aplicar | `git restore .` al último commit verde y repetir ese paso solo |
| El build no compila tras un schematic | Arreglar solo lo que el schematic tocó; si son muchos errores, revertir el commit y migrar una carpeta por vez |
| El schematic dice "nada para migrar" o falla con un path | Verificá que el path exista y que el paso anterior esté commiteado; revisá `ng generate @angular/core: --help` |
| La app arranca pero algo no anda (post-zoneless) | Revertir solo el paso 9; el resto sigue en verde |
| Tercero (librería) incompatible con el nuevo major | Reportarlo al usuario con la versión mínima requerida; no hacer fork ni parches en `node_modules` |
| 3 intentos fallidos sobre el mismo error | Parar y reportar el bloqueo (SKILL.md, regla 11) |

### 20.8 Qué usar según la versión del proyecto (sin migrar)

Para código nuevo en un proyecto que todavía no está en v22. Migrar solo con pedido (§20.1).

| Necesidad | v22+ | v20 – v21 | v19 o menor |
| :--- | :--- | :--- | :--- |
| Formularios | Signal Forms (§6) | v21: Signal Forms (experimental, se usa). v20: `signal` + `computed` de errores + `[value]` / `(input)` (§6, intro) | Igual que v20; Reactive Forms donde ya existen |
| Debounce de una búsqueda | `debounced()` (§2.5) | Búsqueda al enviar el form; tipeo en vivo: `debounceTime` dentro del `stream` de `rxResource` (excepción a §4.13, que es para v22), donde el repo declara sus resources | Igual que v20 – v21 |
| `resource` / `rxResource` | `params` + `loader` / `stream` | Igual (v20 renombró `request` a `params` y, en `rxResource`, `loader` a `stream`) | `request` + `loader` |
| Leer `value()` de un resource con error | `hasValue()` antes de leer | Igual: desde v20, `value()` lanza en estado de error | `value()` devuelve `undefined` |
| Servicio singleton | `@Service()` | `@Injectable({ providedIn: 'root' })` | Igual que v20 – v21 |
| Change detection | OnPush por defecto: no declarar | `ChangeDetectionStrategy.OnPush` explícito (regla 4) | Igual que v20 – v21 |
| Zoneless | Default | v21 default; v20 `provideZonelessChangeDetection()` | Experimental: no migrar sin pedido |
| Primitivas accesibles | `@angular/aria` | ARIA a mano o CDK a11y | Igual que v20 – v21 |
