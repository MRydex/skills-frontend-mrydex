# Changelog

Cambios de la skill `develop-front` (antes `desarrollo-buenas-practicas`) y del instalador `skills-frontend-mrydex`.
Para actualizar en un proyecto: `npx -y github:MRydex/skills-frontend-mrydex`.

## [Unreleased]

### Agregado

- `15` §15.10: el nombre de un paquete npm no se escribe de memoria. Antes de un `npm install <paquete>` propuesto
  por el agente se corre `npm view <paquete>` y se confirma repo y autor. Versiones y flags se leen del proyecto o
  de la doc. Sale del repaso de drona23/claude-token-efficient (fila nueva en `FUENTES.md`); el resto de ese repo
  ya estaba cubierto o no aplica.
- `03` §3.3: un número sin unidad en una propiedad de longitud (`[style.width]="500"`) no aplica nada; va con
  sufijo de unidad o con el string completo. Desde v22.3 el compilador lo marca (`NG8119`).
- `README.md`: sección "Opcional: modo aprendizaje con VibeWise" (qué hace, cómo instalarlo y prenderlo, costos).
  No va en el instalador.
- `09` §9.6: botón "Volver" que no saca al usuario de la app. `location.back()` solo si
  `router.lastSuccessfulNavigation()?.previousNavigation` existe; si no, una ruta fija.
- `14` §14.9 y `13` §13.31: si el pedido es copiar una animación de una referencia, el agente avisa que existe la
  skill `reanimate` y propone instalarla, con sus requisitos (Bun, ~250 MB, Windows sin probar). No va en el
  instalador ni se instala sin el sí del usuario; sin ella se lee la referencia con `agent-browser`.

### Cambiado

- Angular 22.3.0 salió estable (18/11/2026). `04`, `09` y `18` ya no dicen "hoy `22.3.0-rc.0`" ni "no está en la
  estable" para `HttpClient.query()`, `scrollMargin` en `@defer`, `scroll` en `routerLink`, herencia de resources
  de ruta, `errorComponent` y `@angular/build:library`. Verificado contra el tag `v22.3.0`: `errorComponent` sigue
  `@developerPreview` y `focusReset` `@experimental`; `@angular/build:ng-packagr` queda deprecado.

- `15` §15.10, regla 8 de `SKILL.md`, `11` §11.9 y templates: con vulnerabilidades de `npm audit` se corrige
  siempre y en orden: `ng update` de Angular dentro de su major actual, `npm audit fix` y `overrides` en
  `package.json` para lo que siga. Se pregunta antes `--force`, subir Angular de major o un override que salta de
  major. Cada override se reporta con su motivo y se borra cuando el padre ya trae la versión corregida.
- `11` §11.9 paso 2: si el proyecto ya tiene los scripts `knip` y `jscpd` en `package.json`, la auditoría usa
  `npm run knip` y `npm run jscpd` en vez de `npx`.
- `15` §15.14: la auditoría de seguridad tiene un área propia "Campos de texto". Lista cada `<input>` y
  `<textarea>` del alcance y marca como hallazgo el que no tiene `pattern()` o `maxLength()` + `sinCodigo()`
  (§15.3.1). Antes quedaba implícito dentro de "XSS y render de datos".
- `15` §15.3.1: el ejemplo de texto codificado que el validador no cubre decía `<`; ahora `\u003cscript\u003e`.

### Corregido

- Instalador: `/grill-me` no hacía nada. El autor movió el método a la skill `grilling` y `grill-me` quedó como un
  envoltorio de una línea que la llama; ahora se instalan las dos.
- Instalador: la skill `agent-browser` es un índice que pide la CLI `agent-browser` de npm, y nadie la instalaba.
  Ahora el instalador corre `npm install -g agent-browser` si falta (Chromium sigue bajando en el primer uso) y
  `--doctor` la chequea. `14` §14.9 y `README.md` lo dicen.
- `14`: el índice enlazaba §14.5 con un ancla vieja.
- `01` §1: el alias `@/` va con `paths` sin `baseUrl`; en TypeScript 6 `baseUrl` corta la compilación con `TS5101`.
- `04` §4: `httpResource` con `method: 'QUERY'` y `body` compila en Angular 22.3.0 (antes decía "no verificado").
- `README.md`: VibeWise se instala desde su marketplace de GitHub (`/plugin marketplace add nykooi1/vibe-wise`),
  la ruta verificada.

Revisión de concurrencia de toda la skill: ejemplos que fallaban con doble clic, respuestas fuera de orden, muchos
usuarios a la vez o varias pestañas.

- `04` §4.12: todas las mutaciones del ejemplo bloquean el ítem mientras su request está en vuelo (`_conBloqueo`);
  antes `eliminar` y `renombrar` podían salir dos veces. `renombrar` y `cambiarActivo` reciben el `Usuario` entero.
- `04` §4.14 y `02` §2.9, §2.12: `exportar()`, `onClickGuardar` y `_setUsuarioIdArea` bloqueados contra doble clic
  y liberados también si el request falla.
- `04` §4.9 y §4.14: sondeos y refrescos de fondo con `SKIP_SPINNER` (el overlay global aparecía en cada vuelta);
  el refresco periódico usa `timer` con desfase al azar y se salta con la pestaña oculta.
- `05` §5.3: `ErrorNotifier` no repite el mismo aviso dentro de 5 s (con la API caída se apilaban N modales). El
  `errorInterceptor` deja pasar el 401 (lo resuelve `authInterceptor`) y el 409 (lo resuelve quien llama).
- `05` §5.3.2: `AppErrorHandler` manda cada crash una vez por mensaje y con tope por sesión.
- `05` §5.7: el reintento respeta `Retry-After` (segundos o fecha HTTP, con tope) y suma jitter.
- `15` §15.5: el logout recarga la página hacia el login (`location.assign`) en vez de navegar, para que una
  respuesta tardía del usuario anterior no caiga en un store vivo; `_cerrarLocal` es idempotente y `logout()` llama a
  `auth/logout` antes de cerrar en local (sin eso la cookie seguía válida y la sesión revivía al recargar).
- `16` §16.6 y §16.8: entrar y salir de una sala van por la misma cola; en un cambio rápido A, B, A el "salir"
  atrasado dejaba al usuario fuera de A.
- `16` §16.3, §16.5 y §16.10: reintentos con jitter proporcional al delay y primer reintento no inmediato (tras un
  deploy todos los clientes reconectaban en el mismo segundo). WebSocket nativo: igual, y recarga por HTTP al reconectar.
- `16` §16.4 y §16.6: la recarga por HTTP al reconectar se fusiona por id (`fusionar`) en vez de reemplazar; no se
  pierden ni se duplican los eventos que llegan durante el GET ni los reenvíos de `withStatefulReconnect`.
- `16` §16.9: `accessTokenFactory` usa `tokenVigente()`, que espera la renovación en curso.
- `19` §19.2 y §19.3: descarga con protección de doble clic y cancelación; subidas con progreso por archivo, tope
  de 3 en paralelo, cancelación y error por archivo (antes un `progress` compartido y `.subscribe()` sin manejo).
- `09` §9.3 y §9.10: `shouldReuseRoute` capturado con `bind`; el worker de búsqueda recibe el `abortSignal`.
- `10` §10.14: el chequeo del Service Worker lleva desfase al azar y se salta con la pestaña oculta.

### Agregado

- `12` §12.6 y checklists: lo aprendido al limpiar warnings de Sonar en un proyecto real. Mensajes de estado con
  `<output>` (no `role="status"`), íconos clickeables con `<button>`, `aria-label` de `<select>` con texto de las
  opciones, `NOSONAR` justificado para `role="application"` y para `&` en mixins (`css:S8776`). Checklist CSS:
  `!important` sobre NG-ZORRO, selectores repetidos, contraste sobre fondos `rgba()`. Checklist TS: las reglas de
  Sonar que más saltan (`ReadonlySet`, operador coma, `await` en loop, `== false`, `readonly`). Transiciones: tampoco
  `transition: 0.3s` sin propiedad (`css:S9449`).
- `15` §15.3.1 (nueva): ningún `<input>` ni `<textarea>` acepta etiquetas ni código. Validador `sinCodigo()` para texto
  libre (etiquetas, atributos sueltos como `" onerror=` o `" style=`, `javascript:` y `data:` al inicio de un valor,
  entidades, caracteres de control, Unicode inválido y marcas combinantes apiladas) y `pattern()` con caracteres
  permitidos para campos con formato. Se rechaza con error de campo, no se limpia. Misma respuesta que `SinCodigo()`
  del backend. `06` §6.3 y checklists lo suman.
- `15` §15.5.3 (nueva): renovación del token. Una sola renovación en curso para todos los requests, reintento único
  del request original, cierre de sesión una vez si falla, `navigator.locks` entre pestañas y `tokenVigente()`. Con
  librería OIDC la renueva ella. `05` §5.4 suma `SKIP_AUTH` para login y renovación.
- `04` §4.12: conflictos de edición con `rowVersion` (base64 en el body del PUT / PATCH, 409 si no coincide): no se
  reintenta ni se pisa, el usuario elige recargar o seguir editando. Mismo contrato en la skill de backend.
- `05` §5.7.1 (nueva): `Idempotency-Key` en altas que no admiten duplicado; una key por intención del usuario,
  reutilizada en el reintento. Mismo contrato en la skill de backend.
- `04` §4.12: qué hace un resource con `set` / `update` durante una carga (la cancela y descarta su respuesta), y
  cuándo se justifica un update optimista con rollback.
- Notas: `16` §16.2 (cada pestaña es otra conexión) y §16.4 (ráfagas de eventos), `09` §9.9.1 (agrupar ráfagas solo
  si se mide), `02` §2.13.1 (una pestaña nueva no recibe el estado de un `BroadcastChannel`) y §2.9 (inactividad con
  varias pestañas).

- `04` §4.5: resource que depende de otro con `chain()` (v22+): devuelve el valor solo cuando el otro resolvió y
  propaga su estado (`idle`, `loading`, error con `ResourceDependencyError`). Reemplaza leer `otro.value()` a mano.
- `09`: `prefetch on hover(ref)` junto a `on interaction(ref)` para bajar el código de un bloque `@defer` cuando el
  puntero llega al botón que lo abre.
- `13` §13.14: container scroll-state queries (`scrollable`, `stuck`, `snapped`) para un botón "volver arriba" o la
  sombra de una cabecera pegada sin JavaScript. Solo Chromium 133+; sin soporte queda el estado por defecto.

- `04` §4.12: mutación repetida sobre el mismo ítem (me gusta, activar / desactivar por fila). El ítem queda
  bloqueado mientras su request está en vuelo, con los ids en un signal; una escritura no se cancela, así que no va
  `switchMap` ni `Subject` + `groupBy`. El checklist lo pregunta.
- `04` §4.9: refresco al volver a la pestaña con `visibilitychange` + `throttleTime` + `reload()`, sin `effect()`
  (duplica la carga inicial). El checklist lo pregunta.
- `04` §4.14 (nueva): sondeo de un trabajo largo. POST por `HttpClient`, estado por `rxResource` sobre el id,
  `timer` + `exhaustMap` + `takeWhile(..., true)` con tope de intentos en el servicio. El checklist lo pregunta.
- `02` §2.16: `withProps()` de SignalStore para servicios inyectados y constantes del store.
- `09` §9.6: error boundary por ruta (`errorComponent` + `withErrorBoundaries()`, developer preview 22.3, hoy solo
  en `22.3.0-rc.0`). Sin `withErrorBoundaries()` el `errorComponent` se ignora. `03` §3.12 lo enlaza.
- `09` §9.6.2: router resources: recarga sin renavegar (`ActivatedRoute.resources`), herencia desde rutas
  ancestro y `chain()` para un resource hijo que depende de uno del padre (v22.3).
- `09` §9.6.4: `unmatchedInputBehavior: 'undefinedIfStale'` en `withComponentInputBinding` y `browserUrl` en
  `RedirectCommand` para mostrar "no encontrado" conservando la URL pedida.
- `20` paso 5: schematics `ngclass-to-class-migration` y `ngstyle-to-style-migration`.
- `09` §9.5: `await img.decode()` antes de mostrar una imagen creada por código.
- `12`: copiar una tabla al portapapeles con `ClipboardItem` (`text/plain` + `text/html`).
- `09` §9.3: `scrollMargin` en `@defer (on viewport(...))` para contenedores con scroll propio (v22.3).

### Cambiado

- `18` reescrito para construir una librería por entry points de punta a punta: crear la librería, los dos
  builders (`@angular/build:ng-packagr` hasta v22.2 y `@angular/build:library` desde v22.3), crear un entry point
  nuevo paso a paso en cada uno (§18.2.1) y distribuir SCSS, imágenes y archivos como assets, con su consumo desde
  la app (§18.4): `@use` para tokens y mixins, `styles` del `angular.json` para una hoja con reglas. El checklist
  lo pregunta.
- `18` §18.4 y `10` §10.13: URLs de assets bajo `baseHref`. `url('/assets/...')` en CSS ignora el `baseHref`; en
  SCSS se referencia por nombre de paquete (`"./assets/*"` en `exports`). En Git Bash, `--base-href /mi-app/` se
  convierte en ruta de disco. El checklist lo pregunta.
- `18` §18.10: `npm link`: cómo se ve el fallo (build que pasa, bundle más grande, componentes que no
  renderizan), `preserveSymlinks` alcanza con el builder `application`, y `prebundle.exclude` para `ng serve`.
- `18` §18.1: comando de la migración `use-library-builder` confirmado.
- `18` §18.4: corregido. El `exports` propio se fusiona con los entry points de código; no hay que listarlos a mano.
- `18` §18.2.2: el builder nuevo no corta el build ante un import relativo entre entry points ni ante un ciclo.
- `09` §9.6: `scroll="manual"` en `routerLink` pasa de "anunciado" a confirmado en el changelog oficial (v22.3).
- `13` §13.30: `withViewTransitions` es estable desde v22.3.

## [1.50.2] - 2026-11-17

### Agregado

- `02` §2.15: moneda con el pipe `currency` en el template y `Intl.NumberFormat` con `style: 'currency'` en TS; el
  formateador se crea una vez y nunca se arma el texto con `toFixed` + `replace`.

## [1.50.0] - 2026-11-15

### Agregado

- Instalador: `--no-external` instala solo la skill, sus subagentes y hooks; saltea caveman, las skills externas y
  los plugins de Claude Code.
- Instalador (Claude Code): `~/.claude/settings.json` recibe `skillListingBudgetFraction: 0.025` y las skills que
  instala el paquete quedan en `skillOverrides` como `name-only`. Con el presupuesto por defecto, el listado de
  skills se cortaba y 77 quedaban sin descripción. Medido con una consulta por skill: 99/99 bien elegidas con 45.900
  tokens de prompt, contra 60.600 con las descripciones completas. No pisa valores que ya estén puestos; una skill
  vuelve a mostrar su descripción con `"on"` en su entrada de `skillOverrides`.
- Instalador: las skills externas que `skills add` saltea por no tener frontmatter (10 de `SnailSploit/claude-red`)
  se copian igual, con un frontmatter mínimo. Antes salía con 0 y no quedaban instaladas.
- Instalador: las skills externas que su autor marcó solo para uso manual (`disable-model-invocation: true`) quedan
  habilitadas para que el agente las cargue solo.
- `SKILL.md` §0 y `02` §2.1: nunca `$any()` en el template; el valor de un `<input>` se lee con una variable de
  template (`#buscador` → `buscador.value`). Medido en 3 tareas reales: aparecía en 1 de 3, ahora en ninguna.

### Corregido

- Instalador: `--target` o `--agent` sin valor (seguido de otra opción) ahora da error en vez de tomar la opción
  como valor; un agente desconocido se rechaza con la lista de los válidos.
- Instalador: instalar sobre la carpeta de la propia skill (origen igual a destino) se saltea con un aviso en vez de
  borrarla.
- Instalador: cada comando externo tiene un tope de 10 minutos; uno colgado ya no deja la instalación esperando
  para siempre.
- Instalador: con los dos paquetes instalados, la sección de Graphify quedaba duplicada en el bloque global
  (`~/.claude/CLAUDE.md` y equivalentes). Ahora la escribe uno solo.
- Instalador: la copia `.bak` de un archivo de agente se crea solo si no existe, así una segunda instalación no
  pisa el respaldo del original.
- `--doctor`: daba falsa alarma por el hook `SessionStart` cuando lo había registrado el paquete hermano, y no
  avisaba si quedaba la carpeta de la skill con el nombre viejo.
- Hook `guard-secrets`: una contraseña o API key literal en archivos de test (`*.spec.ts`, `*Tests.cs`, `tests/`,
  `fixtures/`) ya no bloquea; son datos de ejemplo. En la regla del token de `.npmrc`, un valor con `(` o `[` se
  toma como código y no como secreto.
- Hook `SessionStart`: un error interno ya no muestra el hook como roto al abrir la sesión.
- Hook `guard-rules`: la regla de grilla utilitaria (`row`, `col-*`) marcaba clases propias que solo terminan en
  esas palabras (`tabla-row`). Ahora exige la clase entera.

### Cambiado

- `SKILL.md`: sale la sección "Graphify (sin paso de arranque)", que repetía la regla 6 del modo de operación y
  `14` §14.5. La regla 6 suma qué hacer si `graphify update .` falla.
- `SKILL.md` regla 7: `ponytail-review` se carga en la misma tanda de llamadas que el build final. Medido en 3
  tareas reales: la revisión pasó de hacerse 1 de 3 a 3 de 3.

## [1.49.1] - 2026-11-15

### Agregado

- `07` §7.2: tabla de unidades (texto en `rem`, anchos en `%` / `fr`, pantalla completa con `100%` y `dvh`, bordes en
  `px`, `vw` y `cqi` solo dentro de `clamp()`). `clamp()` deja de ser solo tipografía: función Sass `fluido()` para
  generar tokens de texto y espaciado, y `min()` / `clamp()` para anchos. Checklist y `13` §13.11 lo citan; el
  ejemplo de `06` pasa de `14px` a `0.875rem`.
- `07` §7.2: `px` queda solo para bordes, `outline`, sombras, `blur()`, radios chicos, atributos `width` / `height`
  de imágenes y APIs que solo aceptan píxeles, con las fuentes (MDN, WCAG 1.4.4, W3C). Breakpoints de `@media` en
  `em` y cortes de `@container` en `rem`. Los ejemplos de `06`, `07`, `09`, `12` y `13` pasan de `px` a `rem` / `em`.
- Hook `guard-rules`: avisa `font-size` y `line-height` en `px` en un `.scss`.

## [1.49.0] - 2026-11-14

### Corregido

- Hook `SessionStart`: el aviso de versión nueva salía solo por `systemMessage`, que en la extensión de VS Code puede no
  verse. Ahora va también por `additionalContext` y el modelo lo dice en la primera respuesta (unos 60 tokens, solo
  en la sesión con aviso).
- Instalador: `graphify install` reescribe `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md` y `~/.gemini/GEMINI.md` y se
  llevaba los bloques globales marcados. Instalar una skill borraba el bloque de la otra, e instalar con `--target`
  borraba también el propio. Ahora se guardan antes y se devuelven los que falten.
- Instalador: en `--dry-run`, el aviso de la carpeta con el nombre anterior ya no dice que la quitó.

### Cambiado

- La skill pasa a llamarse `develop-front` (antes `desarrollo-buenas-practicas`): se invoca con `/develop-front`.
  Al actualizar, el instalador borra la carpeta con el nombre anterior en cada destino y reescribe el bloque global.
  Las citas a la otra skill pasan a `develop-back`. El `.gitignore` de un proyecto ya instalado conserva la línea vieja
  (`skills/desarrollo-buenas-practicas/`); se puede borrar a mano.
- README: secciones "Usar" y "Actualizar" propias; "Modelos: qué corre dónde" baja después de "Contenido". Cada comando de instalación en su bloque. Sale "Publicar cambios".

## [1.48.10] - 2026-11-13

### Agregado

- `04` §4.3: método HTTP `QUERY` (RFC 10008) y `HttpClient.query()`, anunciado para Angular 22.3 (hoy en
  `22.3.0-rc.0`). Nota con las tres condiciones para usarlo; hasta entonces sigue `GET` o `POST`.

## [1.48.9] - 2026-11-13

### Agregado

- Aviso de versión nueva (Claude Code): el hook `SessionStart` compara la versión instalada con la de GitHub una vez
  por día y muestra una línea con el comando para actualizar. Cubre las dos skills (front y backend). No gasta
  tokens ni actualiza solo. Empieza a avisar después de reinstalar con esta versión. `14` §14.8.

## [1.48.8] - 2026-11-13

### Agregado

- `15` §15.10: feed Zero Wire de Cloudflare Radar (`https://radar.cloudflare.com/zero-wire/rss`) para lo que
  `npm audit` no ve: Node, IIS y Angular SSR. Se lee solo en la auditoría de seguridad (§15.14 paso 3), unos 3 KB
  por lectura. Sin hook ni tarea programada.

## [1.48.7] - 2026-11-12

### Agregado

- `06` §6.9: control propio con `FormValueControl` pasa de "preferido" a única vía: prohibido escribir un
  `ControlValueAccessor` propio (el de terceros se sigue consumiendo con `[formField]`). Ejemplo mínimo y lista de
  inputs opcionales (`disabled`, `errors`, `touched`, `required`...). `guard-rules` lo marca en `.ts` (Angular 22+).

## [1.48.6] - 2026-11-12

### Agregado

- Hook `guard-rules` (Claude Code, `Stop`): en repos Angular revisa las líneas agregadas y los archivos nuevos del
  turno contra las reglas que más se violan y devuelve el turno una vez con la lista. Sin hallazgos no imprime nada.
  `--reporte` para otros agentes o CI. `10` §10.12.

## [1.48.5] - 2026-11-11

### Agregado

- `09` §9.3: `@if` no es lazy loading; bloque pesado que se muestra y oculta va con `@defer (on immediate)` adentro
  del `@if`. §9.6: `focusReset: 'manual'` (`@experimental 22.3`, solo con `withExperimentalPlatformNavigation()`).
- `03` §3.15: directiva sobre más de un tag con `inject(HOST_TAG_NAME)` (`disabled` en `<button>`, `aria-disabled` en `<a>`).
- `15` §15.6: versión mínima de `@angular/common` por la fuga del token XSRF (GHSA-jfgx-762w-99vr): 20.3.34 / 21.0.3.
  §15.7: `esRutaInterna` compara el origen con `URL.parse`, como resuelve el navegador (antes miraba prefijos y
  dejaba pasar `/\t/evil.example`).

## [1.48.4] - 2026-11-11

### Quitado

- `14` §14.9: skills bajo demanda que no son de desarrollo: `video-lens`, `video-use`, `content-strategy`, `pricing`,
  `ai-seo` y `canvas-design`. Nunca las instaló el instalador; salen de la tabla y de la lista bajo demanda.

## [1.48.3] - 2026-11-11

### Corregido

- Instalador: prueba `python -m pip`, `py -m pip` y `python3 -m pip` antes que `pip` a secas. En Windows con Smart
  App Control, `pip.exe` no está firmado y cada instalación mostraba un aviso de Seguridad de Windows, aunque
  graphify quedaba bien instalado.

## [1.48.2] - 2026-11-11

### Agregado

- Reglas de plataforma web tomadas de las guías oficiales de
  [modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) (Chrome, Edge, Firefox y MDN;
  Apache-2.0), escritas como texto en cada referencia, sin instalar nada. De 75 guías revisadas quedó solo lo que
  la skill no cubría y sirve en una app Angular con librería de UI:
  - `13`: barra de scroll (`scrollbar-color` con fallback), `overflow: clip`, `scrollbar-gutter`, región con
    scroll accesible, truncado en tablas, subgrid, trampas de flex y grid, `translate` / `scale` como propiedades
    sueltas, colapsar sin dejar contenido leíble, límites de `text-wrap`, texto alternativo en `content`, pausa
    del movimiento automático. §13.19 corregido: `allow-discrete` va en `transition-behavior`, no dentro del
    shorthand `transition`.
  - `07` §7.2: tope de `clamp()` para el zoom, `color-scheme` en `:root`, `light-dark()` con imágenes, alto
    contraste del sistema.
  - `12`: `<dialog>` propio (qué no agregar, click afuera con handler, cambios sin guardar), `aria-disabled`,
    nombres repetidos, `role="list"` en Safari, `inert`, `<search>`, botón de copiar, campos de identificadores.
  - `06` §6.7: un solo anunciador de errores (`LiveAnnouncer`), `aria-invalid="false"` explícito, error con
    texto visible.
  - `09`: `scheduler.yield()` para tareas de 50 a 250 ms, reglas de `content-visibility`, `scrollend`, fases de
    INP.
  - `15`: cookie `__Host-`, `Clear-Site-Data` en logout, `X-Frame-Options` / COOP / CORP en IIS, HSTS gradual,
    SRI completo, origen `"null"` en `postMessage`, `Reporting-Endpoints`.
  El CLI y la skill de ese repo no se instalan. Probado con 8 corridas de subagente: sin un permiso permanente
  para ejecutar `npx` de un paquete externo la guía no llega al agente, y su telemetría manda a Google el texto
  de cada búsqueda.

### Corregido

- Instalador: después de instalar Python con `winget`, graphify seguía fallando con "Python was not found; run
  without arguments to install from the Microsoft Store" porque `python` resolvía al alias de la Tienda
  (`WindowsApps\python.exe`). Ahora ubica el `python.exe` oficial en `%LOCALAPPDATA%\Programs\Python` o
  `%ProgramFiles%` y corre pip por ruta absoluta. Si `winget` termina y no hay Python en esas carpetas, lo dice;
  si pip instala pero `graphify` no arranca, muestra ese error y no el de un intento anterior.

## [1.48.1] - 2026-11-11

### Agregado

- Instalador: si Windows Smart App Control bloquea el Python que trae uv ("Una directiva de Control de aplicaciones
  bloqueó este archivo", os error 4551) o no hay Python, instala el Python 3.13 oficial con `winget` (firmado, por
  usuario, sin admin), saca el shim roto `uv tool uninstall graphifyy` y reintenta `pip install graphifyy`.

## [1.48.0] - 2026-11-11

### Cambiado

- Graphify sin ceremonia (medido en nov 2026 contra `grep` en los dos repos de skills y en una app de 12.598 nodos:
  `grep -l` costó de 10 a 120 veces menos que `graphify query`, también en el repo grande; sin nombre conocido el
  grafo devolvió ruido). Paso 0 queda en `graphify update .` (gratis); `graphify query` pasa a último recurso con
  `--budget 800`. El instalador deja de correr `graphify <agente> install` por proyecto y el modo `--strict`
  (hook `hook-guard` que sumaba 130-180 tokens a cada `Bash` / `Grep` / `Read` / `Glob`), y quita ese hook de
  `~/.claude/settings.json`. `14` §14.5 reescrita con la medición; templates, subagentes y bloque global al día.
  Segunda medición: `graphify update .` sin cambios tarda 0,7 s (584 nodos), 1 s (1.247) y 17,4 s (12.598); Paso 0
  queda sin comando (el hook git actualiza en cada commit; `update` solo justo antes de un `query`). El hook
  `SessionStart` poda los snapshots diarios `graphify-out/AAAA-MM-DD` (graphify no los borra: 442 MB en 27
  carpetas en el repo grande), quedan los 2 más nuevos.

## [1.47.0] - 2026-11-11

### Quitado

- Headroom. Medido en 14.558 requests (oct-nov 2026, suscripción): ahorró 1,52% de los tokens de entrada; a cambio el
  proxy se colgaba sin aviso, la tarea de Windows entraba en loop de reinicios (`[winerror 10048]`) y el hook
  `PreToolUse` sumaba hasta 45 s por comando. El instalador ya no lo instala ni lo configura; si quedó de una
  versión anterior, quita `env.ANTHROPIC_BASE_URL` (`http://127.0.0.1:8787`) y los hooks `headroom init hook ensure`
  de `~/.claude/settings.json`. Para el resto (tarea `headroom-init-user-health`, variables de usuario `HEADROOM_*`):
  `headroom install remove --profile init-user` y `headroom unwrap claude`. `14` §14.8 documenta la medición.

### Corregido

- `02` §2.1: `strict: true` ya incluye `strictNullChecks` y los demás flags estrictos; nunca apagarlos. `20` §20.3
  Paso 1: en un legacy con `strict: false`, activar de a un flag (`strictNullChecks` primero, después
  `noImplicitAny`, después `strict`), corrigiendo con angostado y no con `!`. Checklist TypeScript: ítem nuevo.

## [1.46.0] - 2026-11-11

### Corregido

- `06` §6.2 / §6.3 errores del servidor como errores de campo: la `action` de `submission` devuelve
  `{ fieldTree, kind: 'server', message }` por campo rechazado (o `undefined` en éxito) y el template los muestra
  con el mismo `errors()` que los validadores; mapeo de `ProblemDetails.errors` en la `action`. Checklist nuevo.
- `09` §9.10.1 Web Worker con un `MessageChannel` por llamada (el worker contesta por `ports[0]`), sin ids ni `Map`
  de pendientes; errores por el puerto, `resource` + `debounced()` en el componente, dataset grande enviado una
  sola vez. Checklist nuevo.
- `14` §14.3.1 effort antes que modelo (Anthropic, nov 2026): arrancar en effort medio, autoverificación → un nivel
  de effort → modelo siguiente en effort más bajo; tareas verificables en `low` con reintento en `high` solo de lo
  que falló; `Explore` propio con `model: haiku`. §14.3.4 dato nuevo sobre el advisor (ningún pareo superó al
  ejecutor solo) junto al anterior, sin promediar; orquestador + 25 ejecutores Sonnet ~1/3 más barato. §14.4
  cambio de modelo solo en un corte natural con `/compact` (caché y razonamiento no se heredan hacia abajo). §14.7
  fila para el dial de esfuerzo. §14.3.4 medición real 2 (sesión Fable 5.1): `Explore` de fábrica corre en Opus
  ($0.14 por búsqueda) contra `Explore` propio en Haiku ($0.002); `general-purpose` hereda la sesión ($0.90 la
  corrida) contra `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` ($0.15); mismo resultado en las 6 corridas.
- Instalador (Claude Code): subagente `Explore` propio en Haiku con `effort: low` (reemplaza al de fábrica) y
  `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` en `~/.claude/settings.json` si no estaba.

### Cambiado

- Instalador: el advisor ya no se configura por defecto (Anthropic, nov 2026: ningún pareo superó claramente al
  ejecutor solo; el equipo midió 10x con un advisor del mismo nivel). `--advisor fable|opus` lo activa, `--advisor
  off` quita el que haya. §14.3.4, §14.3.5, README (sección nueva "Modelos: qué corre dónde": qué modelo corre cada
  cosa, qué pasa con sesión Fable / Opus / Sonnet, cuándo cambiar effort o modelo, cuándo prender el advisor) y
  `templates/CLAUDE.md` actualizados.

## [1.45.1] - 2026-11-10

### Cambiado

- Lecciones de un proyecto real en producción (Angular 21, NG-ZORRO) incorporadas como reglas:
  - `02` §2.17 constantes de dominio (`as const` único, sin ids sueltos ni duplicados), permisos por flag del
    backend en un solo `computed` (nunca `idUsuario` / `idArea` hardcodeados en el template) y rutas escritas una
    vez; §2.4 el modal no arrastra estado entre aperturas (`afterClose`). §15.5 enlaza.
  - `03` §3.6 filtros persistidos: clave natural estable, reconciliar contra las opciones antes de filtrar, todo en
    signals.
  - `04` §4.9 mismo valor de `params` no recarga (`reload()` explícito), polling solo en el servicio con `interval`
    + `takeUntilDestroyed()`, tabla paginada que conserva la página anterior con `linkedSignal`.
  - `06` §6.3 doble envío bloqueado (`submitting()` o signal que vuelve a `false` en éxito y error), select hijo
    reseteado al cambiar el padre.
  - `09` §9.6.4 un guard no usa `alert()` ni toca el DOM; `11` §11.3 releer el diff también busca `console.log`,
    código comentado y tipos pasados a `any`; `15` §15.10 nunca `postinstall` que edite `node_modules`, paquetes
    internos con versión exacta y `ng build` tras cada upgrade.
  - `checklists.md`: un ítem por cada regla nueva.

## [1.45.0] - 2026-11-10

### Cambiado

- `10` §10.14 actualizaciones sin cortar al usuario: `@angular/service-worker` como estándar (`ngsw-config.json`
  sin `dataGroups`, `enabled: !isDevMode()`, HTTPS), servicio `AppUpdate` (chequeo al estabilizar, al volver a la
  pestaña y al navegar, tope de 1 cada 5 min, `unrecoverable`), aviso no bloqueante, registro de formularios sucios
  sin `effect()`, fallback con `withNavigationErrorHandler`, SignalR solo como disparador en `onreconnected`,
  `X-App-Version` + `426` con el back, verificación manual y antipatrones. §10.4 y §16.1 enlazan; checklist nuevo.
- `02` §2.13.1 `broadcastSignal()`: signal compartido entre pestañas con `BroadcastChannel` y el `set` custom de
  `linkedSignal` (v22.1+), sin `effect()`; payload validado, nunca datos sensibles. §2.5 y §2.7 enlazan.
- `05` §5.3.2 telemetría de salida y reporte de crashes: `pagehide` + `visibilitychange` con `HttpClient`
  `keepalive: true` (v20.1+, solo `FetchBackend`, 64 KiB), `ErrorHandler` que no entra en bucle si el POST
  falla, `sendBeacon` solo para endpoints anónimos, sin PII ni stack. §16.5 y checklist enlazan.

## [1.44.0] - 2026-11-09

### Cambiado

- `13` §13.31 reglas de movimiento de interfaz (150-250 ms, `ease-out` / `ease-in`, sin overshoot en
  menús, `transform-origin` desde el disparador, CPU throttling, fade con `prefers-reduced-motion`);
  §13.26 texto sobre imagen con scrim; §13.18 line drawing con `pathLength="1"`.
- `02` §2.11 tipos derivados (`Pick` / `Omit` / `Partial`) sin romper el espejo con el record de C#.
- `checklists.md`: checklist de salida a producción (legales, consentimiento, SEO técnico, licencias,
  secretos y cabeceras, páginas de error).

## [1.43.0] - 2026-11-09

### Cambiado

- Advisor y orquestador según lo publicado con Fable 5.2 (§14.3): alias `fable` en `/advisor`, `advisorModel` y
  frontmatter `model`; tabla de pareo (Fable solo acepta Fable); Claude Code 2.1.321+; límites reales de Claude
  Code (20 en paralelo, 3 niveles) frente a los de Managed Agents (25 hijos, un nivel); link a la doc de
  Managed Agents.
- Instalador: advisor `fable` en `~/.claude/settings.json` (`advisorModel`) si no había uno, la sesión no es
  Fable y no hay Bedrock/Vertex (ahí no existe). `--advisor <fable|opus|sonnet|off>` elige otro o lo quita.
  El modelo lo consulta solo al orientarse, al trabarse y antes de terminar; se cobra al precio del advisor.

## [1.42.0] - 2026-11-09

### Skill `desarrollo-buenas-practicas`

- §12.8 migas de pan desde el `title` resuelto de cada ruta (`ActivatedRouteSnapshot.title`): una sola fuente
  para la pestaña y las migas, `computed()` sobre `lastSuccessfulNavigation()` + `routerState.snapshot`, sin
  `data: { breadcrumb }`, `router.events` ni `effect()`; marcado `<nav aria-label>` + `<ol>` + `aria-current="page"`.
  Cruce en §9.6.4 y checklist HTML.
- §15.5 logout en todas las pestañas con `BroadcastChannel` desde el servicio de auth, sin `effect()` (el
  método que cierra sesión avisa; `onmessage` escribe el signal); el mensaje es un evento, nunca el token.
  Fila nueva en la tabla de §2.7 y checklist de seguridad.
- §2.8 el constructor solo llama métodos privados con nombre; nunca lógica inline ni callbacks escritos ahí. Los
  snippets de la skill con lógica en el constructor (§2.8, §3.8, §9.6.1, §9.10.1, §15.5, §16.5, §19.7) quedan así.
- §2.15 lista de literales `as const` → unión → type guard (`(ROLES as readonly string[]).includes(v)`) para
  validar strings externos (query param, back, storage), nunca `v as Rol`.
- §14.1 y templates: código en el chat como diff (líneas cambiadas + contexto), nunca el archivo entero; no
  volver a explicar lo ya decidido en la sesión.

## [1.41.0] - 2026-11-08

### Skill `desarrollo-buenas-practicas`

- §13.18 animaciones por scroll, ampliado (Baseline desde nov 2025): `scroll()` / `view()`, rangos de
  `animation-range` (también dentro de los keyframes), timelines con nombre y `timeline-scope`, sección alta +
  `sticky` con el progreso repartido por `--i` / `--n` desde `@for`, `@property` para fuentes variables y
  contadores, catálogo de patrones, qué sigue necesitando JS. Regla: el estado estático es el final y el inicial
  va en `from`, así sin soporte o con `prefers-reduced-motion` nada queda oculto. Checklist CSS con dos ítems.
- §14.9 suma `web-design-guidelines` (revisar a11y + UX de una pantalla), `agent-browser` (verificar en
  navegador sin archivos de test), `grill-me`, `find-skills`, SEO (`seo-audit`, `ai-seo`) y las skills bajo
  demanda con su repo (`anti-ui-slop`, `canvas-design`, `video-lens`, `video-use`, `content-strategy`, `pricing`).

### Instalador

- Skills externas nuevas, siempre en su última versión: `web-design-guidelines` y `agent-browser` (Vercel),
  `grill-me` (mattpocock) y `find-skills` (vercel-labs/skills). Las de SEO, video, marketing y `anti-ui-slop`
  quedan bajo demanda en §14.9.

## [1.40.0] - 2026-11-07

### Cambiado

- Headroom vuelve solo si se cae: en Windows la tarea oculta lo revisa cada 2 min (antes 5), dentro
  de los ~3 min que Claude Code reintenta. README: qué hacer si sigue caído; el aviso del hook da el
  comando según el sistema.

## [1.39.0] - 2026-11-07

### Seguridad

- Instalador: `-t` solo borra una instalación propia (`name:` de la skill en `SKILL.md`); el reintento de caveman
  solo corre `skills add JuliusBrussee/caveman`; `--doctor` sugiere `npx -y github:MRydex/...` (el paquete no está en npm);
  el `.bak` de `settings.json` guarda el original de la corrida; permisos de graphify solo para `query`, `update`,
  `explain` y `path` (se quita el `graphify:*` de versiones previas); ruta `C:\Windows` corregida.
- `guard-secrets`: también NotebookEdit; en Markdown, solo formatos inconfundibles (clave privada, AWS, GitHub, Slack,
  Anthropic, Stripe, Google); reglas nuevas para JWT literal, firma SAS y `KEY=valor` en `.env` y similares.
- `session-start`: un `tasks/lessons.md` versionado en el repo no se carga solo (puede traer instrucciones de un tercero);
  para compartir lecciones de equipo, llevarlas a `CLAUDE.md` / `AGENTS.md`.
- Skill: el plugin `claude-security` (multiagente, caro) solo con pedido explícito o costo aceptado, también en la
  auditoría completa; si falta una skill externa se instala solo esa, no el instalador entero; `revisor-auth` en los
  cambios de auth.

### Skill `desarrollo-buenas-practicas`

- Angular moderno: retry con backoff exponencial solo para errores reintentables (0, 408, 429, 5xx); inactividad
  con `fromEvent` + `switchMap` + `timer` → `toSignal`; `InjectionToken` con `factory`; atajos con pseudo-eventos
  (Ctrl y Cmd); `@if (x; as alias)`; autoscroll de chat con fases de `afterRenderEffect`; `PreloadingStrategy`
  por flag; Signal Forms con `hidden` + `required` y la forma `{ when }`. §2.15: `satisfies`, métodos de `Set` e
  `Intl` (pipe "hace X") sin librerías de fechas. §2.16: NgRx SignalStore y events plugin, solo si el repo ya usa NgRx.
  Regla 4: en menor a v22, `OnPush` en componentes nuevos; a uno existente se propone, no se agrega sin pedido.

## [1.38.0] - 2026-11-07

### Skill `desarrollo-buenas-practicas`

Todo lo nuevo aplica solo si el proyecto ya usa esa tecnología o el usuario lo pide.

- §14.9 skills externas por área: cada área (UI, animaciones, bugs, rendimiento, seguridad, migración,
  CI, git...) nombra la skill externa que la acompaña y la regla del repo que gana si chocan. Regla 7
  de SKILL.md, templates y bloque global apuntan a §14.9.
- Repo con front y back: cada skill rige sus archivos y el Paso 0 corre una vez (también en `desarrollo-backend-buenas-practicas`).
  §14.9 suma `ponytail-debt` en auditorías y limpieza; `ponytail-help` / `ponytail-gain` solo las pide el usuario.
  Gentleman-Skills revisado y no instalado: sus skills de Angular contradicen esta y no trae .NET (motivo en `bin/cli.js`).
- Seguridad: "¿es seguro X?" es pregunta de solo lectura (guía, sin auditoría completa); STRIDE de una línea por
  amenaza; en solo lectura se profundiza solo lo sensible o con hallazgo. `bypassSecurityTrust` admite `blob:` propias.
- v20: debounce y checklist remiten a §20.8; Reactive Forms existentes en v19 o menor se respetan. CSV con `;`,
  BOM y escape de fórmulas; "Excel" sin `exceljs` = CSV avisado. Build ya roto: `ngc --noEmit`.
- Guard de cambios sin guardar: `beforeunload` por `host` sin `effect`, `canceledNavigationResolution: 'computed'`
  para el botón atrás y `dirty` en v20. Cierre de un cambio de riesgo alto: la fila completa de §11.3.
- Lo legacy se moderniza solo en las líneas que el pedido cambia. "Scope Rule" nombrada en §1.
- "Antes de entregar" en SKILL.md: autorevisión de 6 puntos (alcance, corrección, seguridad, escalabilidad,
  accesibilidad y legibilidad, verificación); la revisión de riesgo alto es parte de terminar (sin subagentes:
  `checklists.md` completo) y lo que marque el revisor (MEDIO o más) se corrige antes de entregar.
  El parser de datos del back o del socket valida cada campo usado, y ningún `catch` traga en silencio.
- Formularios en v20: precarga async con `linkedSignal` y `preventDefault` en `(submit)`; error del guardado
  sin duplicar el aviso del interceptor global. `.gitignore` creado de cero con `node_modules/`, `dist/`, `.angular/`.
- Índice de SKILL.md: 14 y 15 ya no son lectura "siempre"; se lee la sección que cita la regla.
- §8: el hook `guard-spec` le pregunta al usuario, no al agente. §10: ejemplo de registry con HTTPS.
- Subagentes: los que citan la skill reciben dónde buscarla; el bloque global nombra la skill en cada §.
- `18-librerias-angular.md`: librerías ng-packagr con entry points secundarios, contratos abstractos
  inyectados por la app, estilos distribuidos, registry privado con token por variable de entorno.
- `19-archivos-pdf-excel-editor.md`: descargas y subidas sin dependencias extra, Excel con import
  diferido, CSV injection, visor PDF con `pdfjs-dist`, editor TipTap.
- `20-migracion-angular.md`: migración de proyectos legacy paso a paso con los schematics oficiales.
- §5.10 interceptor de fechas (solo con contrato de fechas locales), §15.5.1 auth OIDC en la SPA,
  §15.5.2 firma digital en el cliente, §8.2 proyectos con tests ya configurados, §10.12 hooks,
  §10.13 `baseHref`, configuraciones, HTTPS local y Docker, §10.8 MCP por proyecto, prefijos de
  naming existentes en §02.

### Instalador

- Hooks de Claude Code `guard-spec`, `guard-secrets` (compartido con la skill de backend) y
  `format-prettier`.
- Subagentes `migrador-angular`, `auditor-contrato-api` y `revisor-auth` (los dos últimos,
  compartidos con la skill de backend).

## [1.34.0] - 2026-10-29

### Skill `desarrollo-buenas-practicas`

- `<ng-template>` tipado con `ngTemplateContextGuard` (§3.15) y `viewProviders` para el estado
  interno de componentes con slots (§3.13).
- Lecciones: línea opcional `Skill:` en `tasks/lessons.md` para marcar las que sirven a la skill
  del equipo (§11.8).

## [1.33.0] - 2026-10-29

### Instalador

- uv se instala desde el binario de la última versión publicada, verificado con el `sha256.sum`
  del mismo release antes de copiarlo a `~/.local/bin`; ya no `irm | iex` ni `curl | sh`. Solo usa
  Node (sin curl, wget ni tar del sistema) y cubre Windows, macOS y Linux en todas las
  arquitecturas que publica uv (x64, arm64, 32 bits, ARM, riscv64, ppc64le, s390x).
- `engines.node >= 18` en `package.json` (usa `fetch`).
- `~/.claude/settings.json` y el bloque de `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` se escriben con
  copia `.bak` y reemplazo atómico; un corte a mitad ya no deja el archivo roto.

### Skill `desarrollo-buenas-practicas`

Revisión contra la documentación oficial de Angular 22.2, Angular Material 22.2 y NG-ZORRO 22.1.

- Corregido:
  - Ejemplo de `nz-table` virtual (§9.9): `nzVirtualScroll` no existe; ahora usa
    `<ng-template nz-virtual-scroll>`, que queda junto con `*cdkVirtualFor` como excepción al
    control flow nativo.
  - §9.7: la hydration incremental ya incluye event replay, sin `withEventReplay()`.
  - §15.4: `autoCsp` no funciona con SSR, `CSP_NONCE` choca con el inlining de CSS crítico y la
    política de Trusted Types lleva `angular#unsafe-bypass` solo si se usa `bypassSecurityTrust*`.
  - §7.5: presets de NG-ZORRO (`ng-zorro-antd.dark.less`) y API real del tema dinámico. Las
    clases internas de Angular Material son privadas.
- Nuevo:
  - NG-ZORRO 22:
    - Setup base (§10.10): versión mínima 22.1.2, adaptador de fechas obligatorio,
      `provideNzI18n`, `provideNzConfig`, íconos y APIs eliminadas.
    - Tabla y select con datos del servidor (§3.6, §3.9) e íconos (§3.16).
    - Datos del modal con `NZ_MODAL_DATA` (§2.4).
  - Angular Material:
    - Tema M3 con `mat.theme`, tokens `--mat-sys-*` y overrides, densidad, foco visible y alto
      contraste (§7.12).
    - `mat-table` (§3.6) y accesibilidad de `MatDialog` (§2.4).
  - Angular:
    - SSR con `ServerRoute` y `PendingTasks` (§9.7.1); sin `isPlatformBrowser` en templates (§9.7).
    - `enableProfiling()` (§9.12) y `provideCheckNoChangesConfig` (§9.2).
    - `NgOptimizedImage` con `sizes`, loaders y placeholder (§9.5).
    - `@defer on viewport({...})` y casos en que `@defer` no separa el bundle (§9.3).
    - `HttpClient` sin provider desde v21; con SSR, sin `withXhr()` en el servidor (§5.5, §5.9).
    - Transiciones entre rutas (§13.30), `animate.leave` en hijos (§13.25) e i18n con
      `$localize` (§10.11).
    - Usos válidos de `effect()` (§2.7) y fases de `afterRenderEffect` (§2.8).
    - Router (§9.6.4): guards funcionales con `UrlTree` / `RedirectCommand`, `canDeactivate` con
      `dirty()` de Signal Forms, `withInMemoryScrolling`, `withPreloading`, `redirectTo` como
      función, `routerOutletData`, `isActive()` y `lastSuccessfulNavigation()`. Cambio de v22:
      `paramsInheritanceStrategy` en `'always'`.
    - `strictUnclaimedEventNames` (v22.2) junto a `strictTemplates`.
    - Título dinámico con `ResolveFn<string>` en lugar de una clase resolver (§12.8).
  - Seguridad: con SSR, `allowedHosts` y `trustProxyHeaders` contra SSRF (§15.4).

## [1.32.3] - 2026-10-29

### Instalador

- `-t <ruta>` ya no borra una carpeta con contenido que no es una instalación de la skill (ej. `-t .`).
- `--bridge` no pisa un `CLAUDE.md`, `AGENTS.md` o `.cursorrules` propio del proyecto.
- El bloque de `~/.claude/CLAUDE.md` con un marcador sin su par no se toca (antes podía borrar texto).
- README: árbol de referencias completo.

## [1.32.2] - 2026-10-29

### Skill `desarrollo-buenas-practicas`

- Auditoría de calidad (§11.9, regla 10): suma las áreas Legibilidad y mantenimiento (`madge
  --circular`, reglas `complexity` y `max-depth` de ESLint), Escalabilidad e Instrucciones de
  agentes (`/doctor prompt-audit`: reglas para modelos viejos, referencias rotas, contradicciones,
  `CLAUDE.md` de más de 200 líneas). Eficiencia prioriza por impacto medido: sin
  micro-optimizaciones que empeoren la legibilidad.
- Chequeo antes de entregar (§11.7.1): forma más simple, aprobaría un staff engineer, qué se
  rompe primero y `tasks/lessons.md` actualizado.
- Bug con evidencia: directo a reproducir y a la causa raíz, sin pedir guía (§11.6).
- Lecciones con línea `Chequeo` para detectar el error antes (§11.8).

### Instalador

- `readClaudeSettings` único para leer `~/.claude/settings.json` (antes, 5 copias). `--doctor`
  ya no falla y los permisos de graphify ya no rompen la instalación si el archivo contiene `null`
  o un array.

## [1.32.1] - 2026-10-29

### Skill `desarrollo-buenas-practicas`

- Auditar = control de calidad completo (§11.9, regla 10): calidad, eficiencia, dependencias,
  código duplicado y sin uso, con tabla de cobertura por área, candidatos verificados contra uso
  dinámico y correcciones en tandas (borrar sin uso, unificar duplicados, optimizar).
- "Auditá" a secas corre además la auditoría de seguridad completa (§15.14); solo seguridad corre
  solo §15.14; solo calidad suma la seguridad base.
- Auditoría de seguridad red + blue + network (§15.14): modelo de amenazas, TLS, superficie expuesta,
  cabeceras, clickjacking, WebSocket y logs; pruebas en vivo solo contra hosts autorizados.
- `npm audit` en la auditoría: corrige vulnerabilidades, reverifica con `npm ci`, build y
  `npm audit` de nuevo (§11.9, §15.10).
- CSS: medios sin layout shift con `aspect-ratio` + `object-fit` (§13.26), `dvh`/`svh`/`lvh`
  (§13.27), gráficos con `conic-gradient()` (§13.28), contadores con `@property` + `counter()`
  (§13.29).
- Rendimiento: cruce de listas con `Set`/`Map` en vez de `find`/`some` en loop (§9.10).
- `localStorage` con vencimiento y lectura defensiva (§15.8).

### Instalador

- Skills de network y Blue Team (TLS, cabeceras, host header, cache poisoning, clickjacking,
  WebSocket, nmap, logs, threat modeling) y `offensive-tls-attacks`, `offensive-network-attacks`.

## [1.32.0] - 2026-10-28

Actualizacion de version

### Skill `desarrollo-buenas-practicas`

- Microfrontends (§17):
  - Librería compartida opcional: cada regla que la usa trae su alternativa sin ella (auth por input
    `obtenerToken`, exclusión de errores por prefijo, íconos del remote con prefijo propio).
  - `shared`: shell y remotes con la misma estrategia y la cadena completa de librerías con DI; la poda
    de `ignoreUnusedDeps` también saca lo declarado explícito (verificar en `remoteEntry.json`).
  - Versiones: cuenta la instalada, no el rango; script para comparar; diferencia v3 / v4.
  - Auth: Bearer al API del remote, sus errores fuera del manejo global del shell, "Cerrar sesión"
    oculto embebido, audiencia del shell aceptada en el back del remote.
  - Cliente OIDC: `customUrlValidation` primero; `allowedUrls` con `/` final; nunca
    `sendAccessToken: true` sin lista ni validación.
  - Widget oculto con `display: none` (con `opacity` / `visibility` sigue en el layout y `@defer (on viewport)` carga igual).
  - Remote autosuficiente: contrato mínimo del shell; estilos globales en el componente expuesto,
    acotados con `meta.load-css`; clase de overlay en todo overlay; íconos nuevos a la librería.
  - Nueva §17.13 "Diagnóstico por síntoma" (`NG0201`, `NG0912`, builder no encontrado, cache de
    federation, cuadrado en lugar de ícono, 404 de recursos opcionales). Verificación pasa a §17.14 y
    Antipatrones a §17.15.
  - Verificación, antipatrones y checklist al día.
- Tiempo real (§16.9): token del hub de un remote embebido desde el auth compartido del shell o, sin él, de un input `obtenerToken`.
- Entorno (§10): contrato de respuesta envuelta con nombre de ejemplo genérico.

## [1.31.0] - 2026-10-27

Primera versión publicada con historial unificado.

### Skill `desarrollo-buenas-practicas`

- `SKILL.md` liviano: Paso 0 (graphify), reglas que más se violan, modo de operación del agente,
  stack, índice de referencias y alcance (los ejemplos son convenciones, no el código del proyecto).
- Angular 22+ zoneless y signals, sin `effect()`; Resource API (`resource`, `rxResource`,
  `httpResource`, `snapshot`); Signal Forms con `[formField]`; `inject()`; naming sin sufijos en
  componentes, servicios y directivas (pipes, guards, resolvers e interceptors sí, como el CLI).
- Referencias `01`–`17` y `checklists.md`: estructura por zona de acceso, TypeScript y signals,
  templates, Resource API, HTTP e interceptores, Signal Forms, SCSS con BEM y tokens, sin archivos de
  test, performance, entorno y tooling, flujo de trabajo, HTML5 semántico y SEO, CSS3 y animaciones,
  eficiencia del agente, seguridad Red/Blue Team, tiempo real con SignalR y microfrontends con Native
  Federation v4.
- Revisión según riesgo (trivial / medio / alto), auditoría de seguridad por áreas (§15.14) y
  `npm audit` al empezar y tras cada cambio de dependencias.
- Delegación a subagentes solo cuando baja el total de tokens; compactar propuesto al ~30%.
- APIs verificadas contra los paquetes de Angular 22.2.

### Instalador

- `npx skills-frontend-mrydex`: skill global (Claude Code, Codex, Antigravity) y en el repo; archivos
  puente `CLAUDE.md`, `AGENTS.md` y `.cursorrules`; entradas de IA en `.gitignore`.
- Graphify (CLI, integración por agente, modo estricto en Claude Code, hooks git y primer grafo), uv
  sin admin cuando falta Python, caveman, subagentes y bloque global en `CLAUDE.md` / `AGENTS.md` /
  `GEMINI.md`.
- Herramientas del agente: Headroom, plugins `claude-code-setup` y `claude-security`, MCP `context7`,
  `permissions.deny` de secretos, skills externas (`security-audit`, ponytail, agent-skills, skills
  web de animación y UI).
- Volver a correrlo actualiza todo lo que instala.
- `--doctor` (chequeo de solo lectura) y `--dry-run`.

### Seguridad

- El instalador no escribe a través de symlinks ni junctions dentro del repo.
