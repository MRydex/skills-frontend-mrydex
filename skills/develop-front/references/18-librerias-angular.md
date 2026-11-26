## 18. Librerías Angular por entry points y librería privada del equipo

### Índice

- 18.1 Cuándo aplica
- 18.2 Entry points secundarios (18.2.1 crear uno nuevo, 18.2.2 reglas)
- 18.3 `peerDependencies`, `dependencies` y `allowedNonPeerDependencies`
- 18.4 Recursos de la librería: SCSS, imágenes, archivos
- 18.5 Contratos abstractos: la librería define, la app implementa
- 18.6 Configuración con `InjectionToken` y `provideUiLib()`
- 18.7 Registry privado y `.npmrc`
- 18.8 Versionado y CHANGELOG
- 18.9 Probar antes de publicar: `npm pack`
- 18.10 Desarrollo local: `npm link` y su alternativa
- 18.11 Documentación y relación con microfrontends

Los ejemplos usan nombres genéricos: `@acme/ui-lib`, `mi-app`, `https://registry.example.com`.

---

### 18.1 Cuándo aplica

**Aplica solo si** el workspace ya tiene una librería (`projectType: "library"` en `angular.json`)
o la app consume la librería privada del equipo (un paquete `@scope/...` de un registry propio). El
usuario también puede pedir explícitamente crear una.

**Si el proyecto no tiene librería, no la crees.** Lo compartido entre features va en `shared/`
([01](./01-project-structure.md) §1.1, §1.5). Una librería suma versionado, publicación y un ciclo
de release: se justifica cuando **dos o más apps** consumen lo mismo (regla de simplicidad, §11.7.1).

**Crear la librería** (solo si el usuario lo pidió), con scope desde el primer día (§18.7):

```bash
ng new mi-workspace --no-create-application   # workspace solo para la librería; omitir si ya existe
ng generate library @acme/ui-lib --prefix acme
ng build @acme/ui-lib                          # siempre antes de usarla: la app lee el dist/, no el src/
```

Crea `projects/acme/ui-lib/`, el proyecto en `angular.json` y el `paths` de `@acme/ui-lib` al
`dist/` en el `tsconfig.json` del workspace. No usar el prefijo `ng-` en el nombre (reservado).
`ng generate library` no tiene `--skip-tests`: borrar el `.spec.ts` que deja ([08](./08-sin-tests.md)).
El resto de las opciones: `ng generate library --help`.

**Hay dos builders, y cambian dónde se declaran los entry points.** Mirar
`architect.build.builder` de la librería en `angular.json` antes de tocar nada:

| Builder | Versión | Entry points | Assets y `allowedNonPeerDependencies` |
| :--- | :--- | :--- | :--- |
| `@angular/build:ng-packagr` | Hasta v22.2; deprecado desde v22.3 | Un `ng-package.json` por entry point | En `ng-package.json` |
| `@angular/build:library` | v22.3+ | Campo `exports` del `package.json` de la librería | En `options` del target `build` de `angular.json` |

En repos anteriores el mismo builder de ng-packagr figura como
`@angular-devkit/build-angular:ng-packagr`. No mezclar las dos formas: el builder nuevo descubre los
entry points desde `exports`, no desde `ng-package.json`. Migrar de uno a otro solo con pedido, con
el CLI 22.3 ya instalado: `ng update @angular/cli --name use-library-builder`. Borra los
`ng-package.json`, pasa los entry points a `exports` y los assets a `angular.json`; después,
`ng build` de la librería y comparar el contenido del `dist/` con el anterior.
El paquete que sale es el mismo en los dos (`fesm2022/`, `types/`, `exports` generado).

### 18.2 Entry points secundarios

Un entry point secundario permite que el consumidor importe solo lo que usa (`@acme/ui-lib/table`)
y que el bundler descarte el resto. Cada entry point es una subcarpeta de la librería con su propio
`public-api.ts`, y sale como un archivo aparte (`fesm2022/acme-ui-lib-table.mjs`):

```
projects/acme/ui-lib/
├── package.json               # name, version, peerDependencies, exports
├── ng-package.json            # solo ng-packagr: entry point primario, dest, assets
├── src/
│   └── public-api.ts          # entry point primario: @acme/ui-lib
├── core/                      # @acme/ui-lib/core: tokens, contratos, provideUiLib() (§18.5, §18.6)
│   ├── ng-package.json        # solo ng-packagr
│   └── src/
│       ├── public-api.ts
│       └── config.ts
├── table/                     # @acme/ui-lib/table
│   ├── ng-package.json        # solo ng-packagr
│   └── src/
│       ├── public-api.ts
│       └── data-table.ts
└── forms/                     # @acme/ui-lib/forms
    └── src/public-api.ts
```

**Cómo partir**: un entry point por componente o grupo que se usa junto (`table`, `forms`, `dialog`),
más `core` para lo que comparten los demás. El primario (`@acme/ui-lib`) puede tener su propio código
(`src/lib/`, exportado desde `src/public-api.ts`), pero **no reexporta** los secundarios: cada símbolo
tiene una sola ruta de import.

#### 18.2.1 Crear un entry point nuevo

**v22.3+ (`@angular/build:library`)**: un comando.

```bash
ng generate entry-point table --project @acme/ui-lib --skip-tests
ng generate entry-point testing/harness --project @acme/ui-lib --skip-tests   # subruta anidada
```

Crea `table/src/public-api.ts`, registra `"./table"` en `exports` del `package.json` de la librería y
agrega (una sola vez) el comodín `@acme/ui-lib/*` a los `paths` del workspace:

```json
// projects/acme/ui-lib/package.json: las rutas apuntan al fuente; el build las reemplaza
"exports": {
  ".": "./src/public-api.ts",
  "./core": "./core/src/public-api.ts",
  "./table": "./table/src/public-api.ts"
}
```

A mano es lo mismo: crear la carpeta con su `public-api.ts` y agregar la clave a `exports`.

**Hasta v22.2 (`@angular/build:ng-packagr`)**: no existe el schematic. Cuatro pasos:

1. Crear `projects/acme/ui-lib/table/src/public-api.ts`.
2. Crear `projects/acme/ui-lib/table/ng-package.json`:

   ```json
   { "lib": { "entryFile": "src/public-api.ts" } }
   ```

3. Agregar el comodín a los `paths` del `tsconfig.json` del workspace (una sola vez; cubre todos los
   entry points presentes y futuros):

   ```json
   "paths": {
     "@acme/ui-lib": ["./dist/acme/ui-lib"],
     "@acme/ui-lib/*": ["./dist/acme/ui-lib/*"]
   }
   ```

4. `ng build @acme/ui-lib`: el log debe decir `Building entry point '@acme/ui-lib/table'`.

En los dos builders, lo único que ve el consumidor es el `public-api.ts`:

```ts
// projects/acme/ui-lib/table/src/public-api.ts
export { DataTable } from './data-table';
export type { Column } from './data-table';
```

```ts
// table/src/data-table.ts: otro entry point de la misma librería se importa por nombre de paquete
import { UI_LIB_CONFIG } from '@acme/ui-lib/core';

// en la app
import { DataTable } from '@acme/ui-lib/table';
```

Después del build, el `package.json` del `dist/` trae el `exports` final; no se escribe a mano:

```json
"./table": { "types": "./types/acme-ui-lib-table.d.ts", "default": "./fesm2022/acme-ui-lib-table.mjs" }
```

#### 18.2.2 Reglas

- **Entre entry points, siempre por el nombre del paquete** (`@acme/ui-lib/core`). **Nunca** rutas
  relativas (`'../../core/src/config'`) ni profundas (`'@acme/ui-lib/table/src/data-table'`): exponen
  internos. ng-packagr corta el build con `TS6059 ... is not under 'rootDir'`. El builder nuevo **no avisa**:
  compila y saca el código a un chunk compartido. La regla vale igual.
- **Sin ciclos**: si `table` importa de `forms`, `forms` no puede importar de `table`. Lo común va a
  `core`. ng-packagr falla con `Entry point ... has a circular dependency on ...`; el builder nuevo
  **no lo detecta**, así que hay que revisarlo a mano (`grep` de los imports `@acme/ui-lib/` de cada
  entry point). Nunca cortarlo con `any` ni con un import relativo.
- Dentro de un mismo entry point, imports relativos normales.
- Lo que no está en el `public-api.ts` es privado (no aparece en el `.d.ts`). Exportar lo mínimo: cada
  símbolo exportado es contrato (§18.8). Con `export { X }` por nombre se ve qué es público; con
  `export * from './archivo'` sale todo lo que ese archivo exporte.
- En el monorepo, los `paths` apuntan al `dist/` de la librería; nunca al `src/`. Mientras se
  desarrolla: `ng build @acme/ui-lib --watch` en una terminal y la app en otra.

### 18.3 `peerDependencies`, `dependencies` y `allowedNonPeerDependencies`

| Campo | Qué va | Ejemplo |
| :--- | :--- | :--- |
| `peerDependencies` | Lo que la app **ya tiene y debe ser una sola instancia**: Angular, RxJS, la librería de UI | `@angular/core`, `@angular/common`, `rxjs` |
| `dependencies` | Código propio de la librería que la app no necesita conocer | Una utilidad chica, solo si es imprescindible |
| `devDependencies` | Todo lo de build del workspace | `ng-packagr`, `typescript` |

```json
// projects/acme/ui-lib/package.json
{
  "name": "@acme/ui-lib",
  "version": "1.4.0",
  "peerDependencies": {
    "@angular/core": "^22.0.0",
    "@angular/common": "^22.0.0",
    "rxjs": "^7.8.0"
  },
  "sideEffects": false
}
```

- **Angular siempre `peerDependencies`**, nunca `dependencies`: dos copias de `@angular/core` rompen
  la DI (`NG0201`) y los signals.
- El build **falla** si hay un `dependencies` no declarado como permitido
  (`Dependency date-fns must be explicitly allowed using the "allowedNonPeerDependencies" option`). Es
  a propósito. Autorizarlo solo si es imprescindible, de forma explícita: en `ng-package.json`
  (ng-packagr) o en `options` del target `build` en `angular.json` (builder nuevo):

```json
{
  "allowedNonPeerDependencies": ["date-fns"]
}
```

- `tslib`: ng-packagr lo deja en `dependencies` (lo trae el esqueleto); el builder nuevo lo agrega
  solo si el código compilado lo usa. No tocarlo.

- Rango de peer: el major de Angular que soporta la librería (`^22.0.0`), no `*`. Al subir de major,
  actualizar la librería primero y publicar antes que las apps.
- No agregar dependencias a la librería "por comodidad": cada una se instala en todas las apps.

### 18.4 Recursos de la librería: SCSS, imágenes, archivos

El build solo empaqueta el código de los entry points. Todo lo demás (SCSS, imágenes, JSON, fuentes,
un `CHANGELOG.md`) sale en el paquete **solo si se declara como asset**. `README.md` y `LICENSE` se
copian solos. Qué hacer según el recurso:

| Recurso | Cómo se distribuye | Qué hace la app |
| :--- | :--- | :--- |
| Estilos de un componente | Dentro del componente (encapsulados, [07](./07-styles-scss.md)). Tamaños en `px`, nunca `rem`: dependen del `html` de cada app consumidora ([07](./07-styles-scss.md) §7.2) | Nada |
| Imagen de fondo de un componente | `url('./img/fondo.svg')` **relativo** en los estilos del componente: el build la incrusta como data URL | Nada |
| Tokens, mixins, tema (SCSS) | Asset + condición `sass` en `exports` | `@use '@acme/ui-lib/styles/theme'` |
| Hoja con reglas globales (clases, reset) | Asset | La declara en `styles` de su `angular.json` |
| Íconos, imágenes de `<img>`, JSON, fuentes | Asset | Los copia con `assets` de su `angular.json` |

**1. Declarar los assets** en la librería. Carpetas al lado de `src/`:

```
projects/acme/ui-lib/
├── styles/_theme.scss
└── assets/
    ├── icons/logo.svg
    └── textos.es.json
```

```json
// ng-packagr: projects/acme/ui-lib/ng-package.json (rutas relativas a la librería)
{
  "$schema": "../../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../../../dist/acme/ui-lib",
  "lib": { "entryFile": "src/public-api.ts" },
  "assets": [
    "CHANGELOG.md",
    { "input": "styles", "glob": "**/*.scss", "output": "styles" },
    { "input": "assets", "glob": "**/*", "output": "assets" }
  ]
}
```

```json
// builder nuevo (v22.3+): angular.json, options del target build (rutas desde la raíz del workspace)
"assets": [
  "projects/acme/ui-lib/CHANGELOG.md",
  { "glob": "**/*.scss", "input": "projects/acme/ui-lib/styles", "output": "styles" },
  { "glob": "**/*", "input": "projects/acme/ui-lib/assets", "output": "assets" }
]
```

**2. Exportar el SCSS.** Para que `@use '@acme/ui-lib/styles/theme'` resuelva en cualquier
herramienta, el `package.json` de la librería declara la condición `sass` apuntando al parcial. El
builder de aplicación de Angular también lo encuentra por ruta dentro de `node_modules` sin esta
clave; otros resolvedores, que respetan `exports` de forma estricta, no:

```json
// projects/acme/ui-lib/package.json
"exports": {
  "./styles/theme": { "sass": "./styles/_theme.scss" },
  "./assets/*": { "default": "./assets/*" }
}
```

`"./assets/*"` deja que la app referencie un archivo de la librería por nombre de paquete desde su
SCSS (paso 3). Sin esa clave, el build de la app falla con `Could not resolve "@acme/ui-lib/assets/..."`.

Solo se escriben las claves propias. Los dos builders **fusionan** este `exports` con los entry
points de código que generan (`"."`, `"./table"`, ...): no hay que listarlos a mano. CSS ya
compilado: `"./tema.css": { "style": "./tema.css" }`. Después de tocar `exports`, verificar el
`package.json` del `dist/` con `ng build` y un `npm pack` (§18.9).

**3. Consumir desde la app.**

```scss
// SCSS global de la app
@use '@acme/ui-lib/styles/theme';

:focus-visible {
  @include theme.foco;
}
```

Si el SCSS no resuelve `@acme/...` (builder viejo, librería sin la condición `sass`), la app necesita
`stylePreprocessorOptions.includePaths` apuntando a `node_modules`. Verificá la ruta real antes de
tocar la config.

Si la librería trae una hoja que **emite reglas** (clases globales, reset, custom properties en
`:root`), el `@use` no hace falta:
se declara en `styles` de la app y entra al CSS global. No depende de `exports`:

```json
// angular.json de la app, options del target build
"styles": ["node_modules/@acme/ui-lib/styles/base.scss", "src/styles.scss"]
```

- `@use` para tokens y mixins (no emiten nada solos); `styles` para una hoja con reglas. Un archivo
  de solo mixins puesto en `styles` no agrega nada al CSS.
- La hoja de la librería va **antes** que `src/styles.scss`, así la app puede pisarla.

```json
// angular.json de la app: copiar íconos, imágenes y JSON de la librería
"assets": [
  { "glob": "**/*", "input": "public" },
  { "glob": "**/*", "input": "node_modules/@acme/ui-lib/assets", "output": "assets/ui-lib" }
]
```

```html
<img src="assets/ui-lib/icons/logo.svg" alt="" width="16" height="16" />
```

- La copia en `angular.json` va por ruta de archivo: no depende de `exports`.
- **Las URLs de assets nunca empiezan con `/`.** Con la app publicada bajo una subcarpeta
  (`baseHref: "/mi-app/"`, [10](./10-environment-tooling.md) §10.13), `/assets/ui-lib/...` apunta a la
  raíz del host y da 404. Qué escribir en cada lugar:

| Dónde | Forma correcta | Por qué |
| :--- | :--- | :--- |
| Template (`src`, `href`) y TS (`HttpClient`, `fetch`) | `assets/ui-lib/icons/logo.svg` (relativa, sin `/`) | El navegador la resuelve contra el `<base href>` |
| SCSS / CSS de la app | `url('@acme/ui-lib/assets/icons/logo.svg')` | El build copia el archivo a `media/` con hash y escribe una URL relativa al CSS. No necesita la copia de `assets` ni depende del `baseHref` |
| SCSS / CSS, **mal** | `url('/assets/ui-lib/icons/logo.svg')` | El build la deja literal: ignora el `baseHref` |

- **Un componente de la librería no puede asumir dónde copió la app sus imágenes.** Dentro de la
  librería: SVG en el template, o `url()` relativo en los estilos (queda incrustado). Lo que la app
  deba copiar se documenta en el README del entry point con la línea exacta de `assets`.
- En el monorepo, antes de publicar, el `input` es `dist/acme/ui-lib/assets`; el `@use` por nombre de
  paquete necesita el paquete en `node_modules` (instalar el `.tgz`, §18.9).
- Publicar **los tokens y mixins**, no CSS que pise selectores de la librería de UI (§7.4).
- Nada sensible en `assets`: todo lo que se declara ahí termina en el paquete publicado (§18.9).

### 18.5 Contratos abstractos: la librería define, la app implementa

La librería **no tiene lógica de negocio** ni conoce el backend de ninguna app. Cuando necesita algo
que depende de la app (obtener el usuario, abrir un modal, notificar), exporta una **clase abstracta**
que sirve de token de DI, y la app aporta la implementación:

```ts
// @acme/ui-lib/core — contrato
export abstract class NotificationService {
  abstract show(message: string, kind: 'info' | 'error'): void;
}
```

```ts
// mi-app — implementación con la librería de UI de la app
@Service()
export class AppNotificationService extends NotificationService {
  private readonly _modal = inject(NzModalService);
  show(message: string, kind: 'info' | 'error'): void { /* ... */ }
}

// app.config.ts
providers: [
  { provide: NotificationService, useClass: AppNotificationService },
  // o, si la clase ya está provista en otro lado, la misma instancia:
  // { provide: NotificationService, useExisting: AppNotificationService },
]
```

- Los componentes de la librería inyectan `NotificationService` (la abstracta) con `inject()`; nunca la
  implementación.
- Si la app olvida el provider, falla con `NG0201` al arrancar: documentar en el README del entry
  point qué contratos hay que proveer.
- Un contrato abstracto solo si **hay o habrá dos implementaciones** o la app es dueña del dato; si no,
  es una abstracción "por si acaso" (§11.7.1).

### 18.6 Configuración con `InjectionToken` y `provideUiLib()`

Lo que se configura por app (URL base, textos, flags) entra por un `InjectionToken` y se registra con
una función `provideX()` que devuelve `EnvironmentProviders`, como hace Angular:

```ts
// @acme/ui-lib/core
export interface UiLibConfig {
  readonly apiBase: string;
  readonly locale?: string;
}

export const UI_LIB_CONFIG = new InjectionToken<UiLibConfig>('UI_LIB_CONFIG');

export function provideUiLib(config: UiLibConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: UI_LIB_CONFIG, useValue: config }]);
}
```

```ts
// app.config.ts
providers: [provideUiLib({ apiBase: '/api', locale: 'es-AR' })]
```

- La config es **solo datos**. Nada de secretos ni tokens (§15.8).
- Valores que cambian por entorno: leerlos de la config en runtime de la app ([10](./10-environment-tooling.md)
  §10.4) y pasarlos a `provideUiLib(...)`; la librería nunca importa un `environment.ts`.
- Con config obligatoria, un token sin valor por defecto hace que un `provideUiLib()` olvidado falle
  al inyectar (se nota al arrancar). Para config opcional, `new InjectionToken(..., { factory: () => DEFAULTS })`.

### 18.7 Registry privado y `.npmrc`

Si la librería se publica en un registry propio, la config va en `.npmrc` del repo (se commitea);
**el token jamás**:

```ini
# .npmrc (commiteado)
@acme:registry=https://registry.example.com/npm/
//registry.example.com/npm/:_authToken=${NPM_TOKEN}
```

- `${NPM_TOKEN}` se lee de una **variable de entorno**: en local, de la sesión del desarrollador; en
  CI, de un secreto del pipeline. Nunca un token literal en el archivo ni en el historial de git
  (el hook `guard-secrets` bloquea escribirlo, [10](./10-environment-tooling.md) §10.12).
- **Siempre HTTPS**. Un registry en `http://` expone el token y permite alterar paquetes.
- El registry **debe exigir autenticación para publicar** (y para leer, si el código es interno).
  Un registry que acepta `npm publish` anónimo es un vector de supply chain.
- Solo el scope del equipo apunta al registry privado (`@acme:registry=...`); el resto sigue en el
  registry público. Evita la confusión de dependencias: el nombre interno **siempre con scope**
  (§15.10).
- Token de solo lectura para las apps y CI de build; token de publicación solo en el pipeline de release.
- Si el token se filtró: revocarlo y rotarlo antes de cualquier otra cosa (§15.11).

### 18.8 Versionado y CHANGELOG

- **SemVer estricto**: `patch` = fix sin cambio de API; `minor` = API nueva compatible; `major` =
  cambio incompatible (símbolo exportado removido o con firma distinta, peer de Angular nuevo, contrato
  abstracto con método nuevo obligatorio).
- Un `CHANGELOG.md` en la librería con una línea por cambio visible para el consumidor y la migración
  si es `major`. Sin changelog, la actualización es una apuesta para las apps.
- Deprecar antes de borrar: marcar con `@deprecated` y la alternativa, mantener un `minor` completo.
- Publicar **desde el pipeline**, con tag de git igual a la versión; nunca desde la máquina de un
  desarrollador.

### 18.9 Probar antes de publicar: `npm pack`

Sin archivos de test ([08](./08-sin-tests.md)), la verificación de una librería es empaquetar y
consumirla:

```bash
ng build @acme/ui-lib                    # producción por defecto: compilación parcial, la que se publica
(cd dist/acme/ui-lib && npm pack)         # crea acme-ui-lib-1.4.0.tgz
cd <ruta-a>/mi-app && npm install <workspace>/dist/acme/ui-lib/acme-ui-lib-1.4.0.tgz
ng build                                 # la app compila con el paquete real
```

En el monorepo, sacar antes los `paths` de `@acme/ui-lib` del `tsconfig.json` (si no, la app sigue
leyendo el `dist/` y no el paquete instalado) y reponerlos al terminar.

Revisar el contenido del `.tgz` (`tar -tf acme-ui-lib-1.4.0.tgz`): que estén un
`fesm2022/acme-ui-lib-<entry>.mjs` y un `types/acme-ui-lib-<entry>.d.ts` **por cada entry point**,
`styles/` y `assets/` de §18.4, y que **no** estén `src/`, `.env`, `.npmrc` ni mapas con código interno. Después
probar a mano el flujo que usa la librería. Cualquier cosa rara: no publicar.

### 18.10 Desarrollo local: `npm link` y su alternativa

`npm link` suele fallar de una forma: la librería enlazada resuelve **su propio** `node_modules` y
carga una segunda copia de `@angular/core` (`NG0201`, signals que no reaccionan, `inject()` fuera de
contexto). Si ya usás `npm link`:

- Cómo se ve: **el build pasa**, el bundle crece (en una prueba, de 285 kB a 321 kB) y los componentes
  de la librería no renderizan, a veces sin ningún error en consola.
- En `angular.json` de la app, `"preserveSymlinks": true` en las `options` del target `build`. Con eso
  alcanza con el builder `application`. Si igual queda una segunda copia de Angular (builder webpack,
  repos viejos): `paths` del `tsconfig` que fuercen `@angular/*` al `node_modules` de la app.
- Con `ng serve`, además `"prebundle": { "exclude": ["@acme/ui-lib"] }` en las `options` del target
  `serve`. Sin eso, los cambios de la librería enlazada no se ven hasta reiniciar el servidor. La
  librería tiene que estar en `--watch`: un `ng build` completo borra y recrea el `dist/`, y el
  servidor no lo toma.
- Reconstruir la librería (`ng build @acme/ui-lib --watch`) y que la app lea el `dist/`, no el `src/`.

**Alternativa recomendada**: instalar el `.tgz` (§18.9). Es lento pero reproduce lo que verá el
consumidor real, sin symlinks. Al terminar, `git status` limpio: el `package.json` de la app no debe
quedar apuntando a una ruta local ni a un `.tgz` (nunca commitearlo así).

### 18.11 Documentación y relación con microfrontends

- Un `README.md` **por entry point**: qué exporta, un ejemplo mínimo de uso, qué contratos
  (§18.5) y providers (§18.6) exige y el peer de Angular soportado.
- **La librería npm es la opción por defecto** para compartir código entre apps; un microfrontend
  ([17](./17-microfrontends.md) §17.1) se evalúa solo si hay equipos o deploys independientes. Dentro
  de un microfrontend, lo compartido sigue siendo la librería (§17.4).
