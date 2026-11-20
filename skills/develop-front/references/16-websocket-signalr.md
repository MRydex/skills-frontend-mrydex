## 16. Tiempo real — WebSocket con SignalR

### Índice

- 16.1 Cuándo usar tiempo real y qué tecnología
- 16.2 Un servicio por hub, una conexión por pestaña
- 16.3 Construir la conexión (`HubConnectionBuilder`)
- 16.4 Estado en signals y zoneless
- 16.5 Ciclo de vida: iniciar, detener, limpiar
- 16.6 Reconexión: estado, grupos y datos perdidos
- 16.7 Contrato con el hub: eventos, payloads, `invoke` vs `send`
- 16.8 Datos por parámetro: `resource({ stream })`
- 16.9 Autenticación y seguridad
- 16.10 WebSocket nativo (backend que no es SignalR)
- 16.11 Verificación manual
- 16.12 Antipatrones

Fuentes: docs de Angular (Resource API, signals, zoneless), docs de ASP.NET Core SignalR (cliente
JavaScript, configuración, seguridad), web.dev y developer.chrome.com (bfcache, Page Lifecycle) y Manfred
Steyer (*streaming resources* con WebSockets).

---

### 16.1 Cuándo usar tiempo real y qué tecnología

| Necesidad | Usar |
| :--- | :--- |
| El servidor avisa cambios a varios usuarios (chat, presencia, notificaciones, tableros) con backend .NET | **SignalR** (`@microsoft/signalr`), estándar del equipo |
| Solo servidor → cliente, sin grupos ni presencia, sin hub existente | SSE (`EventSource`) o el hub existente si ya hay uno |
| Dato que cambia poco y no urge (minutos) | `httpResource` + `reload()` periódico, sin socket |
| Avisar que hay una versión nueva del front (deploy) | Service Worker + chequeo propio ([10](./10-environment-tooling.md) §10.14), nunca un hub para eso; si ya hay hub, `onreconnected` dispara `verificar(true)` |
| Backend que no es SignalR (WebSocket crudo de terceros) | `webSocket()` de RxJS dentro del servicio (§16.10) |

- **Comandos por HTTP, avisos por socket.** Lo que valida datos o devuelve `ProblemDetails` (crear,
  editar, borrar, enviar un mensaje) va por `HttpClient`: hereda interceptores de auth, spinner y
  errores ([05](./05-http-interceptors.md)). El hub solo empuja eventos.
- `invoke` al hub solo para operaciones propias de la conexión: unirse o salir de un grupo, marcar
  presencia, typing.

### 16.2 Un servicio por hub, una conexión por pestaña

- **Un servicio singleton por hub** (`@Service()` en v22+, `providedIn: 'root'` antes), en la carpeta de la feature o en `shared/` si lo usan
  varias features ([01](./01-project-structure.md) §1.1). El nombre dice el hub: `ChatHub`,
  `NotificacionesHub`, `PresenciaHub`.
- **Una sola conexión por hub y por pestaña.** Nunca proveer el servicio en `providers` de un componente
  que aparece en varias pantallas: cada instancia abre un socket nuevo y navegar entre pantallas
  reconecta. Si la conexión tiene sentido solo en una feature, el servicio se inicia al entrar a la ruta
  y se detiene al salir (§16.5), pero sigue siendo uno. Cada pestaña abierta es otra conexión: con muchos
  usuarios y varias pestañas cada uno, el servidor sostiene un múltiplo de sockets (avisar al back para
  dimensionar). Compartir un socket entre pestañas es un tema aparte y no se hace por iniciativa propia. Un servicio en `providers` de la ruta no se
  destruye al salir salvo con `withAutoCleanupInjectors()` en `provideRouter`: sin eso, `detener()`
  explícito.
- **El componente nunca ve `HubConnection`.** El servicio expone signals de solo lectura y métodos con
  nombre de negocio (`unirseASala(id)`), no `on` / `invoke` crudos.
- Servicio de más de 250 líneas ([01](./01-project-structure.md) §1.4): separar por dominio. Ejemplo:
  `chat-hub.ts` tiene la conexión y `chat-grupos-eventos.ts` registra los eventos de grupos con
  `registrar(hub)`.

### 16.3 Construir la conexión (`HubConnectionBuilder`)

```ts
const BASE_MS = 5_000;
const TOPE_MS = 30_000;
const PISO_MS = 1_000;

/** Full jitter: al azar entre PISO_MS y un techo que se duplica por intento (5, 10, 20, 30 s). Nunca 0. */
export function esperaReintentoMs(intento: number): number {
  const techo = Math.min(TOPE_MS, BASE_MS * 2 ** intento);
  return PISO_MS + Math.random() * (techo - PISO_MS);
}

private _crearHub(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${this._settings.apiUrl()}hubs/notificaciones`, {
      transport: HttpTransportType.WebSockets,
      skipNegotiation: true,                        // válido solo con transport WebSockets
      // tokenVigente() espera la renovación en curso: nunca reconecta con un token vencido (§16.9)
      accessTokenFactory: () => this._auth.tokenVigente().then((token) => token ?? ''),
    })
    .withAutomaticReconnect({
      // Nunca se rinde. El jitter es proporcional al delay: tras un deploy miles de clientes
      // reconectan al mismo tiempo, y un jitter fijo de 1 s no los reparte.
      nextRetryDelayInMilliseconds: ({ previousRetryCount }) => esperaReintentoMs(previousRetryCount),
    })
    .withServerTimeout(60_000)                      // >= 2 x KeepAliveInterval del servidor
    // .withStatefulReconnect(): solo sin skipNegotiation (se negocia en /negotiate)
    .configureLogging(environment.production ? LogLevel.Warning : LogLevel.Information)
    .build();
}
```

- **URL desde la configuración en runtime** (`appsettings.json`, [10](./10-environment-tooling.md) §10.4),
  nunca hardcodeada ni con el host de un entorno en `environment.*.ts`. Mismo origen que la API
  (detrás del gateway): `/api/hubs/...`. Hub de un microfrontend embebido: relativo al prefijo del
  remote (`/chat/hubs/...`), que resuelve el proxy del shell ([17](./17-microfrontends.md) §17.5).
- **`transport: WebSockets` + `skipNegotiation: true`** cuando el gateway y IIS soportan WebSocket
  (YARP lo soporta por defecto; feature WebSocket Protocol de IIS instalada). Ahorra el `POST /negotiate`. Si hace
  falta fallback a long polling, quitar ambos. Con `skipNegotiation`, el `connectionId` de
  `onreconnected` llega `undefined` y no sirve con Azure SignalR Service.
- **`withAutomaticReconnect` con política propia.** El default (0, 2, 10, 30 s) se rinde a los 4
  intentos y deja el socket muerto. Regla del equipo: la misma política en todos los hubs. No cubre el
  primer `start()` (§16.5).
- **`withStatefulReconnect()`** (.NET 8+, con `AllowStatefulReconnects` en `MapHub`; se negocia en
  `/negotiate`, así que con `skipNegotiation: true` queda inactivo sin aviso: elegir uno): en cortes cortos
  el servidor reenvía lo que se perdió. No reemplaza la recarga por HTTP de cortes largos (§16.6).
- `withServerTimeout` (default 30 s) debe ser al menos el doble del `KeepAliveInterval` del servidor
  (default 15 s). Si el back sube el keep-alive, subir este valor.
- Logging: `Warning` en producción. `Information` o `Trace` loguean URLs con el `access_token`.

### 16.4 Estado en signals y zoneless

```ts
type EstadoHub = 'desconectado' | 'conectando' | 'conectado' | 'reconectando';

private readonly _estado = signal<EstadoHub>('desconectado');
private readonly _notificaciones = signal<Notificacion[]>([]);

readonly estado = this._estado.asReadonly();
readonly notificaciones = this._notificaciones.asReadonly();
readonly sinLeer = computed(() => this._notificaciones().filter((n) => !n.leida).length);
```

- **Todo estado es un signal privado expuesto con `asReadonly()`.** Nunca `Subject` /
  `BehaviorSubject` como estado (regla 2), nunca `effect()` para reaccionar a un evento (regla 1): el
  handler del evento hace `set` / `update` y lo derivado va en `computed()`.
- **Zoneless**: los callbacks de SignalR corren fuera de cualquier zona y no agendan change detection.
  Dentro de un callback, la vista se entera por un `set` / `update` de signal; asignar un campo común
  (`this.lista.push(x)`) no la actualiza ([09](./09-performance-zoneless.md) §9.1).
- **Estado en signals, eventos en listas.** Un signal guarda solo el último valor: dos mensajes
  seguidos con un solo `set` pierden el primero. Acumular en un array con `update`.
- **Listas acotadas.** Un evento por segundo durante una jornada es memoria sin techo. Cortar con
  `slice(-N)` en el `update` o paginar el historial por HTTP.
- **Inmutable**: nunca mutar el array del signal. Y **deduplicar por id**: el servidor puede reenviar
  (`withStatefulReconnect`) y la recarga por HTTP (§16.6) trae mensajes que el socket ya entregó.

```ts
/** Orden de `base`, luego los nuevos; un id repetido se reemplaza en su lugar. */
function fusionar<T extends { id: number }>(base: T[], nuevos: T[], max = 200): T[] {
  const porId = new Map(base.map((x) => [x.id, x] as const));
  for (const n of nuevos) porId.set(n.id, n);
  return [...porId.values()].slice(-max);
}
```

- **Ráfagas**: cada evento es un `update` con una copia de a lo sumo `max` elementos; acotada, no hace
  falta agrupar. Si medís cientos de eventos por segundo, juntarlos en un buffer y volcarlos con un
  `setTimeout` corto (no `requestAnimationFrame`: se pausa con la pestaña oculta).

### 16.5 Ciclo de vida: iniciar, detener, limpiar

```ts
private _hub: HubConnection | null = null;
private _cola: Promise<void> = Promise.resolve();
private _detenidoAMano = false;   // onclose también corre después de stop(): no reconectar
private _reintento?: ReturnType<typeof setTimeout>;
private _fallos = 0;               // intentos seguidos sin conectar; _alConectar lo vuelve a 0
private readonly _destroyRef = inject(DestroyRef);

constructor() {
  this._detenerAlDestruir();
}

private _detenerAlDestruir(): void {
  this._destroyRef.onDestroy(() => void this.detener());
}

/** Idempotente: llamar dos veces no abre dos conexiones. */
iniciar(): Promise<void> {
  return this._encolar(async () => {
    this._detenidoAMano = false;
    this._hub ??= this._crearHub();
    if (this._hub.state !== HubConnectionState.Disconnected) return;
    this._registrarEventos(this._hub);   // una vez por instancia de hub (guardia interna)
    this._estado.set('conectando');
    try {
      await this._hub.start();
    } catch {
      this._estado.set('desconectado');
      this._programarReintento();        // withAutomaticReconnect no cubre el primer start
      return;
    }
    await this._alConectar(this._hub);   // misma rutina que onreconnected
  });
}

detener(): Promise<void> {
  return this._encolar(async () => {
    this._detenidoAMano = true;
    clearTimeout(this._reintento);     // un reintento pendiente no reabre tras logout
    await this._hub?.stop();
    this._estado.set('desconectado');
  });
}

// Serializa start/stop: un stop durante un start en curso falla sin la cola.
private _encolar(paso: () => Promise<void>): Promise<void> {
  this._cola = this._cola.then(paso, paso);
  return this._cola;
}

private _programarReintento(): void {
  clearTimeout(this._reintento);
  this._reintento = setTimeout(() => {
    if (!this._detenidoAMano) void this.iniciar();
  }, esperaReintentoMs(this._fallos++));   // misma política que withAutomaticReconnect (§16.3)
}
```

- **Quién inicia**: la ruta o el layout de la feature que lo necesita (el layout del chat llama `iniciar()`), o el login si el hub es global. **Quién detiene**: logout (siempre: el socket tiene la
  identidad del usuario anterior; además vaciar `_salas`, que `pagehide` sí conserva) y salir de la
  feature si la conexión es de esa feature.
- **`unirseASala` / `salirDeSala`** actualizan `_salas` antes del `invoke` y solo invocan con el hub en
  `Connected`; si no, la sala queda anotada y `_alConectar` la une al conectar. Ambos van por `_encolar`
  (§16.6): entrar y salir de la misma sala en ráfaga se ejecuta en el orden de las llamadas.
- **El reintento programado revisa `_detenidoAMano`** antes de llamar `iniciar()`, y `detener()` cancela
  el timer pendiente. Si no, un reintento después del logout reabre el socket sin usuario (401 sin fin).
- **`hub.on` una sola vez por instancia de hub.** Registrar en cada `iniciar()` duplica los handlers
  y cada evento se procesa N veces.
- **Listeners de `window` con `AbortController`** (`{ signal: this._abort.signal }`) y `abort()` en
  `onDestroy`.
- **bfcache**: `pagehide` → `detener()`; `pageshow` con `event.persisted` → `iniciar()` si hay sesión.
  Nunca `hub.stop()` directo: `onclose` lo tomaría como corte y reintentaría. Un WebSocket
  abierto todavía saca la página del bfcache en algunos navegadores. Con `iniciar()` idempotente,
  escuchar varios eventos no abre dos conexiones.
- **Nunca `unload`**: saca la página del bfcache. `beforeunload` solo mientras haya cambios sin guardar.
- Avisar salida en `pagehide` con `send` (no espera respuesta), no `invoke`. Puede no llegar: el aviso
  confiable de salida es el `OnDisconnectedAsync` del servidor. Sin hub, el mismo aviso va por HTTP con
  `keepalive` ([05](./05-http-interceptors.md) §5.3.2).
- Pestaña congelada (Page Lifecycle): `freeze` → `detener()`, `resume` → `iniciar()` si hay sesión.
- **Conectividad**: evento `online` → `iniciar()` ya si hay sesión, sin esperar el próximo backoff
  (acelera el reintento programado; durante `Reconnecting` no hace nada).
- Presencia: usar `visibilitychange` (`document.visibilityState`), no `blur` / `focus`. `blur` se
  dispara al pasar a otra ventana con la página todavía visible y marca ausente a quien sigue mirando.

### 16.6 Reconexión: estado, grupos y datos perdidos

```ts
private readonly _salas = new Set<number>();   // unirseASala / salirDeSala la mantienen
private _eventosRegistrados = false;

private _registrarEventos(hub: HubConnection): void {
  if (this._eventosRegistrados) return;
  this._eventosRegistrados = true;
  hub.onreconnecting(() => this._estado.set('reconectando'));
  hub.onreconnected(() => void this._alConectar(hub));
  hub.onclose(() => {
    this._estado.set('desconectado');
    if (!this._detenidoAMano) this._programarReintento();   // el server cerró; logout no reconecta
  });
  // hub.on(...) de cada evento (§16.7)
}

// Conexión nueva (start o reconexión): el servidor olvidó los grupos.
private async _alConectar(hub: HubConnection): Promise<void> {
  this._estado.set('conectado');
  this._fallos = 0;
  // allSettled: una sala que falla no deja sin recargar el resto
  await Promise.allSettled([...this._salas].map((id) => hub.invoke(HubMetodos.UNIRSE, id)));
  void this._refrescar();            // lo emitido durante el corte no llega
}

// Mergea, no reemplaza: lo que el socket entregó mientras corría el GET se conserva y no se duplica.
private async _refrescar(): Promise<void> {
  try {
    const raw = await firstValueFrom(this._http.get<unknown[]>(`${this._settings.apiUrl()}notificaciones`));
    const servidor = raw.map(parsearNotificacion).filter((n): n is Notificacion => n !== null);
    this._notificaciones.update((actual) => fusionar(servidor, actual));   // §16.4
  } catch {
    // sin red todavía: la próxima reconexión o el próximo evento lo corrige
  }
}

unirseASala(id: number): Promise<void> {
  this._salas.add(id);
  return this._encolar(() => this._invocarSala(HubMetodos.UNIRSE, id));
}

salirDeSala(id: number): Promise<void> {
  this._salas.delete(id);
  return this._encolar(() => this._invocarSala(HubMetodos.SALIR, id));
}

private async _invocarSala(metodo: string, id: number): Promise<void> {
  if (this._hub?.state === HubConnectionState.Connected) await this._hub.invoke(metodo, id);
}
```

- **Reconectar = conexión nueva** (`connectionId` nuevo). El servidor olvidó los grupos: volver a
  unirse a cada uno desde el estado del servicio (`_salas`).
- **Lo que pasó durante el corte se perdió.** Al reconectar, traerlo por HTTP y **fusionarlo** con lo
  que ya hay. No `resource.reload()` ni `set` con la respuesta: reemplazar descarta los eventos que
  llegaron mientras corría el GET. Con `withStatefulReconnect` el servidor además reenvía mensajes: por
  eso `fusionar` deduplica por id.
- **Entrar y salir de una sala van por la cola (`_encolar`).** Si el "salir" corriera fuera de ella, en A, B, A
  (cambio rápido de sala) el "salir" de la primera A llegaría después del "unirse" de la segunda y dejaría
  al usuario fuera de A. En cola, el orden de las llamadas es el orden en el servidor y `_salas` queda bien.
  Si dos consumidores usan la misma sala a la vez, hace falta un conteo por sala.
- **UI del estado de conexión** con `@switch (hub.estado())`, en una región `aria-live="polite"`
  ([12](./12-html5-semantics-seo.md) §12.6). Mostrar "reconectando" y un botón "reintentar"; "reconectado"
  por unos segundos y desaparece. Nunca un spinner que bloquea la pantalla.

```html
<p class="estado-conexion" aria-live="polite">
  @switch (hub.estado()) {
    @case ('reconectando') { Reconectando… }
    @case ('desconectado') {
      Sin conexión. <button type="button" (click)="hub.iniciar()">Reintentar</button>
    }
    @default {}
  }
</p>
```

### 16.7 Contrato con el hub: eventos, payloads, `invoke` vs `send`

```ts
// 1:1 con INotificacionesClient del backend (hub tipado). Cambiar en los dos lados.
export const NotificacionesEventos = {
  NUEVA: 'NotificacionNueva',
  LEIDA: 'NotificacionLeida',
} as const;

hub.on(NotificacionesEventos.NUEVA, (raw: unknown) => {
  const notificacion = parsearNotificacion(raw);   // mapper: guard + ISO string -> Date
  if (!notificacion) return;                       // payload inválido: se descarta, no rompe
  this._notificaciones.update((l) => fusionar(l, [notificacion]));   // dedupe por id (§16.4)
});
```

- **Nombres de eventos y métodos en un objeto `as const`**, nunca strings sueltos. SignalR no avisa
  si el nombre no coincide: el evento simplemente no llega.
- **Payload como `unknown` + parser**, igual que un Response del back
  ([02](./02-typescript-signals.md), mapeo Request / Response). El socket es entrada externa: validar
  forma antes de usar.
- **`invoke`** cuando hace falta la respuesta o saber si falló (unirse a un grupo). **`send`** cuando no
  (avisar salida en `pagehide`, typing). Errores de `invoke` con `try/catch`: el hub devuelve
  `HubException`, no `ProblemDetails`.
- Fechas en ISO 8601 UTC, igual que la API ([10](./10-environment-tooling.md) §10.3).

### 16.8 Datos por parámetro: `resource({ stream })`

Cuando el componente necesita un flujo atado a un parámetro (sala, pedido), el servicio expone
`escuchar()` que devuelve la función de baja, y el componente arma un resource con `stream`. El
`abortSignal` se dispara al cambiar `params`, en `reload()` y al destruirse el componente: ahí se da de
baja. Cuando `params` pasa a `undefined` no se dispara: el stream anterior sigue escuchando hasta el
próximo valor o la destrucción, así que no usar `undefined` para "pausar" un stream.

```ts
// servicio
escuchar<T>(evento: string, parsear: (raw: unknown) => T | null, handler: (x: T) => void): () => void {
  const fn = (raw: unknown): void => {
    const x = parsear(raw);
    if (x) handler(x);
  };
  const hub = (this._hub ??= this._crearHub());   // on() vale antes de start()
  hub.on(evento, fn);
  return () => hub.off(evento, fn);
}

// componente
protected readonly mensajes = resource({
  params: () => this.salaId(),
  stream: async ({ params, abortSignal }) => {
    const items = signal<ResourceStreamItem<Mensaje[]>>({ value: [] });
    const baja = this._chat.escuchar(ChatEventos.MENSAJE, parsearMensaje, (m) => {
      if (m.salaId === params) items.update((i) => ('value' in i ? { value: fusionar(i.value, [m]) } : i));
    });
    // Antes del await: si cambia la sala durante unirseASala, la baja igual corre.
    const union = this._chat.unirseASala(params);
    abortSignal.addEventListener(
      'abort',
      () => {
        baja();
        // salirDeSala va por la misma cola que unirseASala: corre después de la unión y antes de la
        // unión de la próxima sala. Un `union.then(salir)` tardío pisaría al unirse de nuevo a la misma.
        void this._chat.salirDeSala(params).catch(() => {});
      },
      { once: true },
    );
    await union;
    return items;
  },
});
```

- Handler registrado desde un consumidor que se destruye = **`off` obligatorio**. El hub vive más
  que el componente.
- Si el dato es global (notificaciones del usuario), no hace falta resource: el signal del servicio
  alcanza.

### 16.9 Autenticación y seguridad

- **Identidad solo del token.** `accessTokenFactory` devuelve el token en memoria
  ([15](./15-security.md) §15.5). Se llama en cada conexión y reconexión: devolver siempre el token
  vigente, nunca uno capturado al construir. Puede devolver `string | Promise<string>`: usar
  `tokenVigente()` de `Auth` ([15](./15-security.md) §15.5.3), que espera la renovación en curso. Leer
  el signal de forma síncrona reconecta con un token vencido y da 401 en cada intento.
- Hub de un remote embebido: el token sale del servicio de auth de la librería compartida (singleton en
  `shared`), el mismo que usa el interceptor del shell. Sin librería compartida, de un input
  `obtenerToken` que le pasa el shell ([17](./17-microfrontends.md) §17.8). Con la librería de auth duplicada, el widget
  falla al crearse (`NG0201`) o conecta sin token ([17](./17-microfrontends.md) §17.13).
- **Nunca `?username=` / `?userId=` como identidad.** Cualquiera abre la consola y se conecta como
  otro. Si un hub existente lo hace, no copiarlo en código nuevo y reportarlo.
- El navegador no permite headers en WebSocket: SignalR manda el token en `?access_token=`. El back
  lo lee solo para la ruta del hub, y **ni el gateway ni IIS loguean la query string**.
- **CORS no protege un WebSocket.** El back valida el header `Origin` del handshake (cross-site
  WebSocket hijacking) además de la política CORS del `negotiate`.
- `wss://` siempre (mismo origen HTTPS). Nunca `ws://` fuera de localhost.
- Mensajes con texto de usuario: interpolación `{{ }}`, nunca `[innerHTML]` sin sanitizar
  ([15](./15-security.md) §15.3).
- Revisión Red Team: el socket es una API más (OWASP API Top 10). Profundizar con
  `offensive-api-security` (sección WebSocket: cross-site WebSocket hijacking, origen, inyección de
  mensajes).

### 16.10 WebSocket nativo (backend que no es SignalR)

Solo si el servidor no es SignalR. Usar `webSocket()` de `rxjs/webSocket` dentro del servicio y
llevarlo a signal con `rxResource` (RxJS solo como flujo, regla 2):

```ts
private readonly _settings = inject(AppSettings);
private readonly _http = inject(HttpClient);
private readonly _estado = signal<'conectando' | 'conectado' | 'reconectando'>('conectando');
readonly estado = this._estado.asReadonly(); // el indicador de conexión lee esta signal

private readonly _socket = webSocket<unknown>({
  url: this._settings.cotizacionesWsUrl(),
  // JSON inválido no corta la conexión: llega null y parsearCotizacion lo descarta
  deserializer: ({ data }) => { try { return JSON.parse(data); } catch { return null; } },
  openObserver: { next: () => this._estado.set('conectado') },
  // también corre al desuscribir (destroy, reload): el estado solo se muestra mientras la vista vive
  closeObserver: { next: () => this._estado.set('reconectando') },
});

readonly cotizaciones = rxResource({
  stream: () =>
    // defer: cada (re)conexión vuelve a pedir el snapshot por HTTP (como §16.6) además de abrir el socket.
    // El snapshot pasa por el mismo scan, que deduplica por id lo que el socket ya entregó.
    defer(() =>
      merge(
        this._http.get<unknown[]>(`${this._settings.apiUrl()}cotizaciones`).pipe(mergeMap((l) => l)),
        this._socket,
      ),
    ).pipe(
      map(parsearCotizacion),
      filter((c): c is Cotizacion => c !== null),
      // retry antes de scan: reconectar no vacía la lista. Mismo jitter que §16.3 (esperaReintentoMs).
      retry({ delay: (_, intento) => timer(esperaReintentoMs(intento - 1)), resetOnSuccess: true }),
      // Cierre limpio del server: el subject completa sin error y retry no actúa; repeat reconecta igual
      repeat({ delay: () => timer(esperaReintentoMs(0)) }),
      scan((acc, c) => fusionar(acc, [c], 100), [] as Cotizacion[]),
    ),
  defaultValue: [],
});
```

- Nunca `new WebSocket(...)` en el constructor con URL fija y `onmessage` + `JSON.parse` sin
  validar: sin reconexión, sin validación, sin baja. En un bug de reconexión o de mensajes, pasar a
  `webSocket()` es arreglar la causa raíz (§11.7), no ampliar el alcance. En un pedido que no toca la
  conexión, no migrar por iniciativa propia: agregar lo pedido y proponer la migración en una línea.
- Enviar: `this._socket.next(msg)` con el socket cerrado queda en buffer y sale al reconectar. Solo
  enviar con `_estado()` en `conectado`; lo que el server necesita al conectar (identificarse, unirse a
  grupos) va en `openObserver`, que corre también en cada reconexión.
- Listas que crecen con cada mensaje (chat, feed): id estable al recibir, lista aislada en un hijo y
  ventana acotada solo si el usuario la acepta (§9.9.1).
- `scan` no se vacía al reconectar: si la lista se tiene que vaciar (logout, cambio de usuario),
  `params: () => this._usuario()` en el `rxResource`: si cambia, el stream reinicia y `scan` arranca vacío.

### 16.11 Verificación manual

Sin archivos de test ([08](./08-sin-tests.md)), pero probado. Antes de dar por terminado:

1. DevTools → Network → WS: una sola conexión por hub, también al navegar entre pantallas.
2. Network en *Offline* 40 s y volver: estado "reconectando", reconecta, se reúne a los grupos y
   recarga lo perdido.
3. Apagar el backend: reintenta con backoff sin rendirse; al volver, reconecta solo.
4. Logout: el socket se cierra y no reconecta solo. Login con otro usuario: conexión nueva con la identidad nueva.
5. Dos pestañas y dos usuarios: el evento llega a quien corresponde y a nadie más.
6. Ir a otra página y volver con "atrás" (bfcache): reconecta.
7. Payload inválido desde el back (o mock): se descarta sin romper la vista.

Con WebSocket nativo (§16.10) aplican los pasos 1, 2, 3, 6 y 7, sin grupos ni hub.

Sin navegador (agente sin browser): script de Node con `rxjs` contra un mock del server para los
pasos 2, 3 y 7, y el reporte dice qué pasos quedaron sin probar (§11.3).

### 16.12 Antipatrones

| Antipatrón | En su lugar |
| :--- | :--- |
| Servicio del hub en `providers` de un componente repetido | Singleton (`@Service()` en v22+, `providedIn: 'root'` antes), una conexión por pestaña |
| `withAutomaticReconnect()` default | Política propia sin rendirse, con jitter (§16.3) |
| `hub.on` en cada `start()` | Registrar una vez por instancia de hub |
| Handler de componente sin `off` | `escuchar()` devuelve la baja (§16.8) |
| `Subject` / `effect()` para eventos | `signal.update` en el handler + `computed()` |
| Identidad por `?username=` | Token en `accessTokenFactory`, identidad desde claims en el back |
| URL de hub hardcodeada por entorno | Config en runtime, mismo origen |
| Reconectar sin reunirse a grupos ni recargar | `onreconnected`: grupos + recarga por HTTP fusionada por id (§16.6) |
| Salir de una sala fuera de la cola, o recarga que reemplaza la lista | `_encolar` para unirse / salir; `fusionar` por id |
| `blur` / `focus` para presencia, `unload` para salir | `visibilitychange`, `pagehide` / `pageshow` |
| Comandos con validación por `invoke` | `HttpClient` (interceptores, `ProblemDetails`) |
