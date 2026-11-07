## 18. Librerías Angular (ng-packagr) y librería privada del equipo

### Índice

- 18.1 Cuándo aplica
- 18.2 Entry points secundarios
- 18.3 `peerDependencies`, `dependencies` y `allowedNonPeerDependencies`
- 18.4 Estilos y assets de la librería
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

**Aplica solo si** el workspace ya tiene una librería `ng-packagr` (`projects/<lib>/ng-package.json`)
o la app consume la librería privada del equipo (un paquete `@scope/...` de un registry propio). El
usuario también puede pedir explícitamente crear una.

**Si el proyecto no tiene librería, no la crees.** Lo compartido entre features va en `shared/`
([01](./01-project-structure.md) §1.1, §1.5). Una librería suma versionado, publicación y un ciclo
de release: se justifica cuando **dos o más apps** consumen lo mismo (regla de simplicidad, §11.7.1).
Crear el esqueleto, si el usuario lo pidió: `ng generate library <nombre>` (verificá las opciones con
`ng generate library --help`).

### 18.2 Entry points secundarios

Un entry point secundario permite que el consumidor importe solo lo que usa (`@acme/ui-lib/table`)
y que el bundler descarte el resto. Cada subcarpeta es un paquete chico con su propio `ng-package.json`
y su `public-api.ts`:

```
projects/ui-lib/
├── ng-package.json            # entry point primario
├── package.json
├── src/
│   └── public-api.ts          # export * from './lib/...'
├── table/
│   ├── ng-package.json        # { "lib": { "entryFile": "src/public-api.ts" } }
│   └── src/
│       ├── public-api.ts
│       └── table.ts
└── forms/
    ├── ng-package.json
    └── src/public-api.ts
```

```json
// projects/ui-lib/table/ng-package.json
{
  "lib": { "entryFile": "src/public-api.ts" }
}
```

```ts
// projects/ui-lib/table/src/public-api.ts — lo único que ve el consumidor
export { DataTable } from './data-table';
export type { Column } from './column';
```

```ts
// en la app
import { DataTable } from '@acme/ui-lib/table';   // ✅ por entry point
```

Reglas:

- **Siempre importar por el nombre del paquete** (`@acme/ui-lib/table`). **Nunca** rutas relativas ni
  profundas entre entry points (`'../../forms/src/x'`, `'@acme/ui-lib/table/src/data-table'`): rompen
  el build de ng-packagr y exponen internos.
- **Sin ciclos**: si `table` importa de `forms`, `forms` no puede importar de `table`. Lo común va a
  un tercer entry point (`core`) del que ambos dependen. ng-packagr falla ante un ciclo: arreglarlo,
  nunca cortarlo con `any` ni con un import relativo.
- Lo que no está en el `public-api.ts` es privado. Exportar lo mínimo: cada símbolo exportado es
  contrato (§18.8).
- En el monorepo, el `tsconfig` de la app mapea `paths` al `dist/` de la librería; no al `src/`.

### 18.3 `peerDependencies`, `dependencies` y `allowedNonPeerDependencies`

| Campo | Qué va | Ejemplo |
| :--- | :--- | :--- |
| `peerDependencies` | Lo que la app **ya tiene y debe ser una sola instancia**: Angular, RxJS, la librería de UI | `@angular/core`, `@angular/common`, `rxjs` |
| `dependencies` | Código propio de la librería que la app no necesita conocer | Una utilidad chica, solo si es imprescindible |
| `devDependencies` | Todo lo de build del workspace | `ng-packagr`, `typescript` |

```json
// projects/ui-lib/package.json
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
- ng-packagr **falla** si hay un `dependencies` no declarado como permitido. Es a propósito.
  Autorizarlo solo si es imprescindible, de forma explícita, en `ng-package.json`:

```json
{
  "allowedNonPeerDependencies": ["date-fns"]
}
```

- Rango de peer: el major de Angular que soporta la librería (`^22.0.0`), no `*`. Al subir de major,
  actualizar la librería primero y publicar antes que las apps.
- No agregar dependencias a la librería "por comodidad": cada una se instala en todas las apps.

### 18.4 Estilos y assets de la librería

Los estilos de componentes van dentro del componente (encapsulados, [07](./07-styles-scss.md)). Lo que
es global (tokens, mixins, tema) se **distribuye como archivo** y el consumidor lo importa:

```json
// projects/ui-lib/ng-package.json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../../dist/ui-lib",
  "lib": { "entryFile": "src/public-api.ts" },
  "assets": [
    { "input": "styles", "glob": "**/*.scss", "output": "styles" }
  ]
}
```

ng-packagr copia los archivos pero **no los exporta solo**: para que `@use '@acme/ui-lib/styles/theme'`
resuelva, el `package.json` de la librería declara la condición `sass` (ng-packagr, "Exporting Styles"),
apuntando al parcial `styles/_theme.scss`:

```json
// projects/ui-lib/package.json
"exports": {
  "./styles/theme": { "sass": "./styles/_theme.scss" }
}
```

Con `exports` definido, también hay que listar ahí los entry points de código (`"."`, `"./table"`, ...) que
genera ng-packagr; verificá el resultado con `ng build` y un `npm pack` (§18.9).

Dos formas de consumirlo, la que el proyecto ya use:

```scss
// styles.scss de la app
@use '@acme/ui-lib/styles/theme';
```

```json
// o en angular.json de la app: no depende de `exports`
"styles": ["node_modules/@acme/ui-lib/styles/_theme.scss", "src/styles.scss"]
```

- Publicar **los tokens y mixins**, no CSS que pise selectores de la librería de UI (§7.4).
- Si el SCSS no resuelve `@acme/...`, la app necesita `stylePreprocessorOptions.includePaths`
  apuntando a `node_modules`. Verificá la ruta real antes de tocar la config.
- Íconos e imágenes: también en `assets` del `ng-package.json`; documentar la ruta de copia.

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
ng build ui-lib                         # genera dist/ui-lib
(cd dist/ui-lib && npm pack)             # crea dist/ui-lib/acme-ui-lib-1.4.0.tgz
cd <ruta-a>/mi-app && npm install <workspace>/dist/ui-lib/acme-ui-lib-1.4.0.tgz
ng build                                # la app compila con el paquete real
```

Revisar el contenido del `.tgz` (`tar -tf acme-ui-lib-1.4.0.tgz`): que estén `fesm2022/`, los `.d.ts`,
los estilos de §18.4 y que **no** estén `src/`, `.env`, `.npmrc` ni mapas con código interno. Después
probar a mano el flujo que usa la librería. Cualquier cosa rara: no publicar.

### 18.10 Desarrollo local: `npm link` y su alternativa

`npm link` suele fallar de una forma: la librería enlazada resuelve **su propio** `node_modules` y
carga una segunda copia de `@angular/core` (`NG0201`, signals que no reaccionan, `inject()` fuera de
contexto). Si ya usás `npm link`:

- En `angular.json` de la app, `"preserveSymlinks": true` en las `options` del builder, y `paths` del
  `tsconfig` que fuercen `@angular/*` al `node_modules` de la app.
- Reconstruir la librería (`ng build ui-lib --watch`) y que la app lea el `dist/`, no el `src/`.

**Alternativa recomendada**: instalar el `.tgz` (§18.9). Es lento pero reproduce lo que verá el
consumidor real, sin symlinks. Al terminar, `git status` limpio: el `package.json` de la app no debe
quedar apuntando a una ruta local ni a un `.tgz` (nunca commitearlo así).

### 18.11 Documentación y relación con microfrontends

- Un `README.md` **por entry point**: qué exporta, un ejemplo mínimo de uso, qué contratos
  (§18.5) y providers (§18.6) exige y el peer de Angular soportado.
- **La librería npm es la opción por defecto** para compartir código entre apps; un microfrontend
  ([17](./17-microfrontends.md) §17.1) se evalúa solo si hay equipos o deploys independientes. Dentro
  de un microfrontend, lo compartido sigue siendo la librería (§17.4).
