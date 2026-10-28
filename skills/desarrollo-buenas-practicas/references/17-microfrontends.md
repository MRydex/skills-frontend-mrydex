## 17. Microfrontends — Native Federation

### Índice

- 17.1 Cuándo sí y cuándo no
- 17.2 Herramienta y versión
- 17.3 Crear shell y remotes, `main.ts` y DI
- 17.4 `federation.config.mjs`: qué se comparte
- 17.5 Manifest en runtime y mismo origen
- 17.6 Exponer y cargar rutas (con fallback)
- 17.6.1 Exponer un componente embebido (widget)
- 17.7 Comunicación y estado entre microfrontends
- 17.8 Auth, HTTP e interceptores
- 17.9 Estilos y librería de componentes
- 17.10 Versiones y actualizaciones
- 17.11 Despliegue en IIS: cache y CORS
- 17.12 Seguridad
- 17.13 Verificación manual
- 17.14 Antipatrones

Fuentes: docs de Native Federation v4 (native-federation.com, Manfred Steyer / angulararchitects.io),
docs de Angular (router, DI, `createComponent`). Criterio: microfrontends solo para equipos grandes
e independientes; si no, alcanza con lazy loading. Ejemplo de los snippets:
un shell que embebe un chat como remote (`./ChatEmbebido`, panel flotante).
Lo compartido entre apps sigue en una librería npm de la empresa (en los ejemplos, `@corp/ui-compartida`).

---

### 17.1 Cuándo sí y cuándo no

**Por defecto, no.** Un microfrontend suma un deploy, un manifest, versiones a coordinar, CORS y una
falla más en runtime. Se justifica solo si se cumplen al menos dos:

| Señal | Ejemplo |
| :--- | :--- |
| Equipos distintos dueños de partes distintas | Un equipo para pedidos, otro para notificaciones |
| Necesidad real de deploy independiente | Notificaciones sale cada semana, el resto cada mes |
| App que integra módulos de varios sistemas en un solo portal | Chat embebido en un portal de gestión |
| Build o app tan grande que frena a todos | Build de varios minutos con features que no se tocan entre sí |

| Necesidad | En vez de microfrontend |
| :--- | :--- |
| Reusar componentes entre apps | Librería npm (`@corp/ui-compartida`) |
| Ordenar una app grande | Features lazy con límites claros ([01](./01-project-structure.md), [09](./09-performance-zoneless.md) §9.6) |
| Que una parte cargue tarde | `loadChildren` / `@defer` |

Decisión de adoptar: ADR con el porqué (skill `documentation-and-adrs`). Granularidad: **un remote
por dominio de negocio**, nunca por componente.

### 17.2 Herramienta y versión

- **Native Federation** (`@angular-architects/native-federation`): builder esbuild de Angular, ES
  modules e import maps. **Nunca Module Federation de webpack** en proyectos nuevos: obliga a volver al
  builder webpack.
- **Versión del paquete = mismo major que Angular** (22.x para Angular 22), la última de ese major;
  `ng update` las alinea. Angular 22+ usa
  Native Federation v4 con el runtime *Orchestrator*.
- Angular 20/21: v4 se instala como `@angular-architects/native-federation-v4` (builder
  `@angular-architects/native-federation-v4:build`); el paquete sin sufijo es v3, con el runtime clásico
  deprecado. Proyecto nuevo o migración: v4. Pasar a Angular 22: `ng update
  @angular-architects/native-federation`.
- Shell y remotes en la **misma versión exacta** de Angular y de todo lo compartido (§17.10), y zoneless.

### 17.3 Crear shell y remotes, `main.ts` y DI

```bash
npm i -D @angular-architects/native-federation
ng g @angular-architects/native-federation:init --project pedidos --port 4201 --type remote
ng g @angular-architects/native-federation:init --project portal --port 4200 --type dynamic-host
```

El schematic cambia `build` y `serve` de `angular.json` al builder de federation (que envuelve al
original) y separa `main.ts` (arma el import map) de `bootstrap.ts` (arranca Angular). No juntarlos: el
import map tiene que existir antes de cargar Angular. Cada configuración propia del proyecto
(`production`, `dev`, `uat`...) tiene que existir en los dos niveles; si falta una, `ng build -c` falla.

```ts
// main.ts del shell
initFederation('federation.manifest.json', { hostRemoteEntry: { url: './remoteEntry.json' } })
  .then((nf) => import('./bootstrap').then((m) => m.bootstrap(nf)))
  .catch((err) => console.error(err));

// main.ts del remote: sin manifest
initFederation()
  .then(() => import('./bootstrap'))
  .catch((err) => console.error(err));
```

```ts
// app.config.ts del shell: el resultado de initFederation entra por DI
import { NativeFederationResult } from '@angular-architects/native-federation';
export const MODULE_LOADER = new InjectionToken<NativeFederationResult>('MODULE_LOADER');

export const appConfig = (nf: NativeFederationResult): ApplicationConfig => ({
  providers: [
    { provide: MODULE_LOADER, useValue: nf },
    provideRouter(routes(nf), withAutoCleanupInjectors()),
    // ...resto de providers
  ],
});
```

- **`loadRemoteModule` sale del resultado de `initFederation`**, provisto por DI (`MODULE_LOADER`).
  El `loadRemoteModule` importado del paquete está deprecado en v4. Proveer el objeto entero, no solo la
  función: trae también `initRemoteEntry` y `as<T>()` (tipado).
- `hostRemoteEntry`: las versiones del shell ganan sobre las de los remotes.
- `withAutoCleanupInjectors()` (estable desde 22.2; en 21.1 a 22.1, `withExperimentalAutoCleanupInjectors()`;
  con CDK / NG-ZORRO ver angular/components#33919, NG0205): destruye el
  inyector de una ruta al salir. Sin esto, los `providers` de una ruta del remote viven hasta que se
  cierra la app.
- Un remote también corre solo (`ng serve pedidos`). Su `app.config.ts` se usa solo así: cargado por el
  shell, rigen los providers del shell (§17.8). El README del remote documenta qué expone, sus
  inputs / outputs y qué libs comparte.
- Repos: uno por remote si hay equipos distintos (es el motivo para adoptar). Monorepo si un solo
  equipo mantiene todo.

### 17.4 `federation.config.mjs`: qué se comparte

```js
// federation.config.mjs del remote (v4: ESM, import / export default)
import { withNativeFederation, fromPackageJson } from '@angular-architects/native-federation/config';

export default withNativeFederation({
  name: 'pedidos',
  exposes: {
    './routes': './src/app/app.routes.ts',          // exponer rutas, no la app
  },
  shared: fromPackageJson({ singleton: true, strictVersion: true, requiredVersion: 'auto', build: 'package' })
    .patch(['@angular/*'], { includeSecondaries: { keepAll: true } })
    .get(),
  skip: ['rxjs/ajax', 'rxjs/fetch', 'rxjs/testing', 'rxjs/webSocket'],
  features: { ignoreUnusedDeps: true },
});
```

- **Partir de lo que genera el schematic** y tocar lo mínimo. `shareAll({...})` es equivalente a
  `fromPackageJson(...)` (configs viejas).
- **`singleton: true` en `@angular/*`, NG-ZORRO, la librería compartida y `@microsoft/signalr`**: dos
  copias de `@angular/core` rompen DI y signals (dos inyectores raíz, servicios duplicados).
- **`ignoreUnusedDeps: true`**: comparte solo lo que el código importa, locales de `@angular/common`
  incluidos. En v4 viene activo por defecto: declararlo solo documenta la intención.
- **`skip`**: secondaries que no se usan y alias propios de `tsconfig` (`/^@\//`). Cada paquete
  compartido es un request más.
- El shell puede compartir una lista explícita (`share({...})`) con solo lo que usan los remotes; lo
  que el shell no comparte, el remote lo trae en su copia. Sirve para libs sin estado, nunca para
  `@angular/*`, NG-ZORRO ni una lib con servicios singleton.
- **`exposes` chico**: rutas (§17.6) o un componente de entrada (§17.6.1). Servicios y modelos
  compartidos van a la librería, no a `exposes`.

### 17.5 Manifest en runtime y mismo origen

```json
{
  "chat": "/chat/remoteEntry.json"
}
```

- **`federation.manifest.json` se reemplaza por entorno en el deploy**, igual que `appsettings.json`
  ([10](./10-environment-tooling.md) §10.4). Nunca URLs de remotes en `environment.*.ts` ni en código.
- **Mismo origen con prefijo por remote** (`/chat/`): el bundle, la API y el hub del remote cuelgan
  del prefijo y el proxy los resuelve. Sin CORS (§17.11). En desarrollo, `proxy.conf.*.json` del shell,
  de la regla más específica a la más general:

```json
{
  "/chat/api":  { "target": "https://<backend-chat>", "changeOrigin": true, "pathRewrite": { "^/chat": "" } },
  "/chat/hubs": { "target": "https://<backend-chat>", "changeOrigin": true, "ws": true, "pathRewrite": { "^/chat/hubs": "/api/hubs" } },
  "/chat":      { "target": "https://localhost:4300", "changeOrigin": true, "pathRewrite": { "^/chat": "" } }
}
```

  En servidor, el mismo mapeo en el reverse proxy (IIS / YARP). El remote arma sus URLs relativas al
  prefijo, nunca con el host del backend.

### 17.6 Exponer y cargar rutas (con fallback)

```ts
// app.routes.ts del remote: lo que expone './routes'
export const routes: Routes = [
  {
    path: '',
    providers: [PedidosStore],                       // providers propios del dominio
    loadComponent: () => import('./pedidos-lista/pedidos-lista').then((m) => m.PedidosLista),
  },
  { path: ':id', loadComponent: () => import('./pedido-detalle/pedido-detalle').then((m) => m.PedidoDetalle) },
];

// app.routes.ts del shell: función que recibe el resultado de initFederation
export const routes = ({ loadRemoteModule }: NativeFederationResult): Routes => [
  {
    path: 'pedidos',
    canMatch: [puedeVerPedidos],
    loadChildren: () =>
      loadRemoteModule<{ routes: Routes }>('pedidos', './routes')
        .then((m) => m.routes)
        .catch(() => [{ path: '**', component: RemoteNoDisponible }]),
  },
];
```

- **Exponer rutas, cargar con `loadChildren`.** El remote es dueño de su navegación interna; el shell
  solo conoce el prefijo. `routes` es una función porque al armar las rutas todavía no hay inyector.
- **Siempre fallback.** Remote caído o con deploy roto: el shell muestra `RemoteNoDisponible`
  ("Pedidos no está disponible, reintentá en unos minutos") y el resto del portal sigue andando. Sin
  `catch`, falla la navegación entera.
- Providers del dominio en la ruta (`providers: [...]`), no en el `app.config.ts` del remote, que el
  shell no ejecuta. Se liberan al salir solo con `withAutoCleanupInjectors()` (§17.3).
- Guards de acceso en la ruta del shell (`canMatch`): no se descarga un remote al que el usuario no
  tiene acceso.
- Remote que se registra recién al navegar: `initRemoteEntry(url, nombre)` en el `loadChildren`. Por
  defecto, si el registro falla no rechaza (avisa en consola y el error aparece en el próximo
  `loadRemoteModule`); con `strict: { strictRemoteEntry: true }` en `initFederation` rechaza en el acto.

### 17.6.1 Exponer un componente embebido (widget)

Cuando el remote no es una sección sino algo que vive en todas las pantallas (chat, notificaciones),
se expone un componente de entrada y el shell lo crea con `createComponent`.

```ts
// shell: chat-remoto.ts
private readonly _nf = inject(MODULE_LOADER);

protected readonly chat = resource({
  params: () => this.usuario() || undefined,         // se carga recién con sesión
  loader: async ({ abortSignal }): Promise<true> => {
    const { ChatEmbebido } = await this._nf
      .as<{ ChatEmbebido: Type<unknown> }>()
      .loadRemoteModule('chat', './ChatEmbebido');
    if (abortSignal.aborted) return true;            // cambió el usuario durante la descarga
    const contenedor = this._contenedor();
    contenedor.clear();
    contenedor.createComponent(ChatEmbebido, {
      bindings: [
        inputBinding('usuario', this.usuario),
        inputBinding('visible', this.abierto),
        outputBinding<number>('sinLeer', (n) => this.sinLeer.set(n)),
      ],
    });
    return true;
  },
});
```

```html
<ng-container #contenedor />
@if (chat.error()) {
  <p role="alert">No se pudo cargar el chat. Probá de nuevo más tarde.</p>
} @else if (chat.isLoading()) {
  <p>Cargando chat…</p>
}
```

- **`resource` + `loadRemoteModule`**: estados de carga y error sin código extra (el fallback de
  §17.6) y recarga sola si cambia el usuario. Con `params` en `undefined` (logout) el loader no corre y
  el widget anterior sigue montado: el logout llama `contenedor.clear()`.
- **`createComponent` con `inputBinding` / `outputBinding`** cuando hace falta escuchar outputs.
- **Contrato = inputs y outputs del componente expuesto**, documentado en el README del remote. El
  widget no lee servicios del shell.
- Output desde un signal del remote: `outputFromObservable(toObservable(signal))`, sin `effect()`.
- Panel oculto sin destruir: el widget sigue vivo para recibir eventos (badge de sin leer). El input
  `visible` le avisa; destruirlo al cerrar cortaría el socket.
- **Modo embebido con `InjectionToken`** (`CHAT_EMBEBIDO`, `factory: () => false`; el componente
  expuesto lo provee en `true`): embebido, el remote no toca lo que es del shell (título, favicon,
  tema en `<html>`, storage de sesión).
- Layout con `@container` y no `@media`: el ancho que importa es el del panel, no el de la pantalla.
  Alto desde una custom property que define el componente expuesto (`--chat-alto`).

### 17.7 Comunicación y estado entre microfrontends

Regla base: **cada microfrontend es dueño de su estado de negocio.** Entre microfrontends se comparte
solo identidad y contexto (usuario, permisos, unidad elegida) y avisos puntuales. Cada dato compartido
es un contrato entre equipos: cuanto menos, mejor. Usar el primer mecanismo que alcance:

| Mecanismo | Para | Condición |
| :--- | :--- | :--- |
| **URL** (params, query params) | Qué se está viendo: id, filtros, pestaña | Ninguna; sobrevive a un refresh y a un link compartido |
| **Inputs / outputs** del componente expuesto | Widget embebido (§17.6.1) | El shell crea el componente |
| **Servicio singleton en la librería compartida**, estado en signals (`SesionUsuario`, `ContextoPortal`) | Estado vivo que leen varios: sesión, permisos | La librería en `shared` como singleton y **misma versión exacta** en todas las apps (§17.10). Lib de monorepo: `sharedMappings` / `mappingsFromWorkspace` |
| **Eventos**: `CustomEvent` en `window`, o el *Event Registry* de Native Federation v4 (opt-in, streams tipados con replay) | Avisos de una sola vez entre remotes que no comparten librería | Payload tipado en la librería y validado al recibir |
| `BroadcastChannel` | Avisos entre pestañas (logout en todas) | Mismo origen; validar el payload |

- **Signals para estado, eventos para eventos.** Un signal guarda solo el último valor: un evento que
  llega dos veces seguidas se pierde. Lo que pasa (mensaje recibido, guardado OK) viaja como evento;
  lo que es (usuario actual) vive en un signal.
- **Un store compartido** (signals o NgRx Signal Store) va en la librería compartida, como singleton,
  con escritura por métodos de ese store. Nunca un store por microfrontend que se sincroniza con otro.
- Un remote **nunca importa código de otro remote** ni del shell. Lo común va a la librería.
- Nunca `effect()` para sincronizar estado entre microfrontends (regla 1): el estado vive en un solo
  servicio y los demás lo leen.
- Sin `window.miEstado` global ni `localStorage` como bus: sin tipos, sin dueño y legible por cualquier
  script.

### 17.8 Auth, HTTP e interceptores

- **El shell es dueño del login.** Provee `provideHttpClient(withInterceptors([...]))`, el token y el
  manejo global de errores. Los remotes cargados como rutas usan el inyector del shell: heredan
  interceptores, spinner y errores ([05](./05-http-interceptors.md)) sin declararlos.
- El remote **no** vuelve a llamar `provideHttpClient` en sus rutas: crea otro `HttpClient` sin los
  interceptores del shell.
- Un componente embebido creado con `createComponent` también pasa por los interceptores del shell. Si
  el remote maneja sus propios errores (ej. 404 de foto = sin foto), el interceptor de errores del
  shell lo excluye con un `HttpContextToken` de la librería compartida ([05](./05-http-interceptors.md))
  o, si el remote no la usa, por su prefijo (`requestUrl.startsWith('/chat/')`). Nunca silenciar
  errores por status en general.
- **Identidad**: el remote recibe del shell el token o la sesión (servicio singleton compartido), nunca
  la lee de la URL ni del storage del shell. Un username pasado sin token deja la identidad en manos
  del cliente ([16](./16-websocket-signalr.md) §16.9).
- `authInterceptor` compara origen con `URL` ([15](./15-security.md) §15.5): el token va solo a las
  APIs propias, nunca al host de un remote ni a terceros.
- Hub de SignalR que usan varios remotes: vive en la librería compartida como singleton (una conexión
  por pestaña, [16](./16-websocket-signalr.md) §16.2).

### 17.9 Estilos y librería de componentes

- **Tema global y NG-ZORRO una sola vez, en el shell.** Los `styles` de `angular.json` del remote no se
  cargan cuando lo carga el shell: el remote no puede depender de ellos.
- Estilos del remote en sus componentes (encapsulación emulada, BEM, [07](./07-styles-scss.md)).
- **`ViewEncapsulation.None` solo en el componente expuesto**, con todo anidado bajo su clase de host
  (`.chat-embebido { ... }`) y como excepción documentada: hace falta para resets y para lo que el
  remote dibuja en el overlay del CDK (modales de NG-ZORRO). Nunca selectores globales sueltos.
- **Tokens del remote con prefijo propio** (`--chat-*`) en `:root`: los usa el overlay del CDK, que se
  dibuja fuera del componente. Clases de overlay también con prefijo (`.chat-modal`).
- Lo global que el remote necesita embebido va en un partial aparte (`_chat-global.scss`) que usan el
  componente expuesto y el `styles.scss` de la app suelta. Íconos y animaciones comunes los pone el shell
  desde la librería compartida.
- El reset de NG-ZORRO del shell se impone (ej. `h1..h6` con color): corregirlo dentro de la clase del
  componente expuesto, no tocando el shell.
- Tokens SCSS y partials comunes desde la librería compartida (`@use` con `includePaths`,
  [07](./07-styles-scss.md) §7.1).
- Misma librería de componentes y misma versión en todo el portal (§0: nunca mezclar dos).

### 17.10 Versiones y actualizaciones

- **Misma versión exacta (también el patch)** de Angular, NG-ZORRO, `@microsoft/signalr` y la librería
  compartida en shell y remotes. Con un desfase, `strictVersion: true` **no falla**: el remote carga su
  propia copia y solo avisa en consola. Para `@angular/core` eso son dos Angular en la página.
- Para que un desfase falle al cargar y no en producción a mitad de un flujo:
  `initFederation(manifest, { strict: { strictExternalCompatibility: true } })`.
- `shareScope: autoShareScope()` en el config limita el sharing a remotes con el mismo minor declarado de `@angular/core` (default `level: 'minor'`).
- Diagnóstico: extensión *Native Federation DevTools* de Chrome (qué versión se eligió y por qué).
- **Actualización en bloque**: librería compartida → remotes → shell, cada uno con build y prueba
  contra el shell.
- Multi-versión (un remote en otro major) solo como web component: `createApplication` +
  `createCustomElement`, un prefijo de URL propio por remote para que los routers no se pisen. Costo
  alto: preferir actualizar en bloque.

### 17.11 Despliegue en IIS: cache y CORS

Partir del `web.config` base ([10](./10-environment-tooling.md) §10.2) y sumar, en el sitio de cada app:

```xml
<!-- Sin hash en el nombre: sin cache, o el shell sigue cargando la versión anterior
     después de un deploy. `path` es relativo al web.config: uno por carpeta. -->
<location path="remoteEntry.json">
  <system.webServer>
    <staticContent>
      <clientCache cacheControlMode="DisableCache" />
    </staticContent>
  </system.webServer>
</location>
<location path="federation.manifest.json">
  <system.webServer>
    <staticContent>
      <clientCache cacheControlMode="DisableCache" />
    </staticContent>
  </system.webServer>
</location>
```

- Los chunks con hash conservan el cache largo de §10.2.
- El Orchestrator también cachea `remoteEntry.json` en memoria: `hostRemoteEntry: { url, cacheTag:
  BUILD_HASH }` fuerza la versión nueva después de un deploy.
- **Remote en otro origen** que el shell: los ES modules se cargan con CORS. El sitio del remote responde
  `Access-Control-Allow-Origin` con el **origen exacto del shell**, nunca `*`. Mejor: mismo sitio con
  subcarpetas (`/pedidos/`) y sin CORS.
- Excluir `remoteEntry.json` de la regla de rewrite a `index.html`, como las rutas de API.
- `<base href>` y `--base-href` de cada remote según su subcarpeta.

### 17.12 Seguridad

- **URLs de remotes solo desde el manifest del deploy.** Nunca armadas con query params, `localStorage`
  o datos del usuario: cargar un remote es ejecutar su código con la sesión del usuario.
- Integridad: el Orchestrator v4 acepta hashes SRI por entrada del manifest. Usarlos cuando el remote
  se publica en otro sitio.
- CSP del shell: `script-src` con los orígenes de los remotes, nada más. Con Trusted Types, permitir la
  política `nfo` del Orchestrator ([15](./15-security.md) §15.4).
- Cada remote pasa su propia auditoría (`npm audit`, §15.10): una dependencia vulnerable en un remote
  corre con la sesión de todo el portal.
- `CustomEvent` / `postMessage` entre remotes: validar forma y, en `postMessage`, `event.origin`
  (§15.7).

### 17.13 Verificación manual

1. Shell con todos los remotes: navegar a cada uno, refrescar en una ruta interna (deep link). Widget:
   aparece al loguearse, sobrevive a la navegación y cerrar el panel no corta el socket.
2. Apagar un remote: el shell muestra el fallback y el resto sigue andando.
3. DevTools → Network: `@angular/core` se descarga una sola vez. Consola sin avisos de versión
   (DevTools de Native Federation para ver qué se eligió).
4. Deploy de un remote: el shell abierto toma la versión nueva al recargar (manifest y
   `remoteEntry.json` sin cache).
5. Logout en el shell: los remotes pierden la sesión (servicio singleton compartido) y las otras
   pestañas también (`BroadcastChannel`).
6. Estilos: ninguna pantalla del shell cambia al cargar un remote; los modales del remote se ven bien.
7. Cada configuración de build compila con el builder de federation.
8. El remote sigue andando suelto (`ng serve` en su puerto).

### 17.14 Antipatrones

| Antipatrón | En su lugar |
| :--- | :--- |
| Microfrontend para reusar componentes | Librería npm compartida |
| Un remote por componente o por pantalla | Un remote por dominio de negocio |
| Module Federation de webpack en proyecto nuevo | Native Federation |
| URLs de remotes en `environment.ts` | `federation.manifest.json` por entorno |
| `loadRemoteModule` importado del paquete (v4) | El de `initFederation`, por DI |
| `loadRemoteModule` sin `catch` | Fallback `RemoteNoDisponible` |
| `provideHttpClient` / login propio en el remote | Los hereda del shell |
| Remote que importa código de otro remote | Lo común a la librería compartida |
| Estado de negocio compartido entre remotes | URL, inputs / outputs o servicio de contexto mínimo |
| Un store por microfrontend sincronizado con otro | Un store singleton en la librería compartida |
| Eventos como signals | `CustomEvent` / Event Registry; signals para estado |
| Confiar en `strictVersion` para detectar desfases | Versiones exactas + `strictExternalCompatibility` |
| Tema global o selectores globales sueltos en el remote | Tema en el shell; `None` solo en el expuesto, bajo su clase |
| Widget remoto destruido al cerrar el panel | Vivo y oculto, input `visible` |
| Remote que toca título, favicon o tema del shell | `InjectionToken` de modo embebido |
| Identidad por username pasado del shell sin token | Token o sesión del shell, identidad en el back |
| `remoteEntry.json` o manifest con cache largo | `DisableCache` en `web.config` + `cacheTag` |
