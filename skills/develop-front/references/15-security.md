## 15. Seguridad — Red Team y Blue Team

### Índice

- 15.1 Regla general y modo de trabajo
- 15.2 Revisión Red Team de cada cambio (pensar como atacante)
- 15.3 XSS: sanitización de Angular, `innerHTML` y `DomSanitizer` (15.3.1 Texto que escribe el usuario)
- 15.4 CSP y Trusted Types
- 15.5 Autenticación, tokens y autorización (15.5.1 OIDC en la SPA, 15.5.2 Firma digital en el cliente, 15.5.3 Renovación del token)
- 15.6 CSRF / XSRF
- 15.7 Navegación, redirects y links externos
- 15.8 Datos sensibles y secretos en el front
- 15.9 Cabeceras de seguridad en IIS
- 15.10 Supply chain: dependencias y build
- 15.11 Blue Team: detección, logging y respuesta
- 15.12 Verificación manual de seguridad
- 15.13 Mapa OWASP Top 10 (2025)
- 15.14 Pedido de seguridad (auditoría completa red + blue + network)

### 15.1 Regla general y modo de trabajo

La seguridad es un requisito de **todo** cambio, no una tarea aparte. El agente aplica dos
miradas en cada tarea:

- **Red Team (ofensiva)**: antes de dar por terminado, buscar cómo se abusa del código nuevo
  (§15.2).
- **Blue Team (defensiva)**: el código nace con defensas por defecto, deja rastro de eventos de
  seguridad y no desactiva protecciones del framework (§15.3–§15.11).

Reglas para el agente:

- **Nunca desactivar una protección** (sanitizador, CSP, XSRF, `strictTemplates`, validación del
  backend) para "hacer que funcione". Si parece necesario, frenar y preguntar.
- **Toda vulnerabilidad encontrada se reporta**, aunque esté fuera del alcance de la tarea. Si está
  dentro del alcance, corregirla. Si está fuera, reportarla con archivo, línea, riesgo y
  corrección propuesta, y preguntar antes de tocarla (§11.5).
- **El front nunca es la frontera de seguridad.** Guards, validaciones y botones ocultos son UX. La
  autorización y la validación reales viven en el backend.
- Las pruebas ofensivas se hacen **solo** sobre aplicaciones propias o entornos autorizados.

### 15.2 Revisión Red Team de cada cambio (pensar como atacante)

Antes de entregar, responder cada pregunta sobre el código tocado:

| Superficie | Pregunta del atacante |
| :--- | :--- |
| Entradas (forms, query params, route params, `input()`) | ¿Puedo meter HTML, script, URL o un valor fuera de rango y que llegue sin validar al DOM o al backend? ¿Cada campo de texto tiene `pattern()` o `maxLength()` + `sinCodigo()` (§15.3.1)? |
| Renderizado | ¿Algún dato controlable termina en `[innerHTML]`, `bypassSecurityTrust*`, `nativeElement.innerHTML` o un atributo `href`/`src`? |
| URLs y navegación | ¿Puedo forzar un redirect a un dominio externo (`returnUrl`, `next`)? |
| Tokens y sesión | ¿El token viaja a un origen que no es la API propia? ¿Queda en `localStorage`? |
| Autorización | ¿Si cambio un `id` en la URL o en el body, veo datos de otro usuario? (verificar que el backend lo rechace) |
| Storage y logs | ¿Quedan PII, tokens o datos sensibles en `localStorage`, `console`, source maps o mensajes de error? |
| Mensajería | ¿Un `postMessage`, WebSocket o evento de terceros se procesa sin validar el origen y la forma? ¿Un hub identifica al usuario por query string en vez del token ([16](./16-websocket-signalr.md) §16.9)? ¿Un remote se carga desde una URL que no sale del manifest ([17](./17-microfrontends.md) §17.12)? |
| Dependencias | ¿La librería nueva es mantenida, tiene vulnerabilidades conocidas o pide permisos de más? |
| Regex y parseo | ¿Una regex construida con texto del usuario permite inyección o ReDoS? |

Si alguna respuesta es "sí", corregir antes de entregar.

**Metodología ofensiva por superficie (skills `offensive-*` de [SnailSploit/claude-red](https://github.com/SnailSploit/claude-red)).**
Solo para endurecer el código propio contra esos ataques, nunca contra sistemas de terceros. Invocarlas
en cambios de riesgo alto (§11.3) o en la auditoría de §15.14, según la superficie que toca el cambio:

| Superficie del cambio | Skill `offensive-*` |
| :--- | :--- |
| Entradas que llegan a SQL/ORM | `offensive-sqli` |
| Dato controlable en el DOM | `offensive-xss` |
| Backend que pide una URL (`returnUrl`, webhook, proxy) | `offensive-ssrf` |
| Plantillas server-side | `offensive-ssti` |
| `id` en URL/body, acceso a datos de otro usuario | `offensive-idor` |
| Parseo de XML | `offensive-xxe` |
| Deserialización de datos del cliente | `offensive-deserialization` |
| Subida de archivos | `offensive-file-upload` |
| Flujo de negocio (cupones, pagos, pasos saltables) | `offensive-business-logic` |
| Redirect a dominio externo | `offensive-open-redirect` |
| Parámetros duplicados | `offensive-parameter-pollution` |
| Operaciones concurrentes (doble submit, saldo) | `offensive-race-condition` |
| Proxy / cabeceras `Content-Length` / `Transfer-Encoding` | `offensive-request-smuggling` |
| API GraphQL | `offensive-graphql` |
| API REST/gRPC/WebSocket (OWASP API Top 10) | `offensive-api-security` |
| JWT (`alg`, firma, expiración) | `offensive-jwt` |
| OAuth2 / OIDC (scopes, redirect_uri, PKCE) | `offensive-oauth` |
| Nombres de paquetes internos vs públicos | `offensive-dependency-confusion` |
| Cadena de build y dependencias | `offensive-supply-chain` |
| Escribir el hallazgo | `offensive-reporting` |

Estas complementan el escaneo del plugin `claude-security` (código propio) y las skills de AppSec de
`cloudflare/security-audit-skill` y `mukul975/Anthropic-Cybersecurity-Skills`. Qué herramienta
profundiza cada área: tabla de §15.14.

### 15.3 XSS: sanitización de Angular, `innerHTML` y `DomSanitizer`

Angular escapa la interpolación (`{{ }}`) y sanitiza `[innerHTML]`, `[href]`, `[src]` y `[style]`.
Esa protección se pierde cuando se esquiva el framework.

- **Siempre interpolación** para texto. `[innerHTML]` solo cuando hace falta marcado, y con datos
  ya escapados.
- **Nunca `bypassSecurityTrustHtml` / `Url` / `ResourceUrl` / `Script` / `Style` con datos del
  usuario o del backend.** Solo con constantes del propio código o una URL `blob:` que la app creó con
  `URL.createObjectURL` (§19.6), con comentario que justifique.
- **Nunca** `ElementRef.nativeElement.innerHTML`, `document.write`, `insertAdjacentHTML`,
  `eval`, `new Function` ni `setTimeout('string')`. Usar `Renderer2` o el template.
- **Nunca construir templates en runtime** con texto del usuario (compilación JIT dinámica).
- **i18n**: ningún `i18n-on*`, y `i18n-href` / `i18n-src` nunca sobre un valor no confiable: la traducción
  reemplazaba el handler por código arbitrario (CVE-2026-69151) y el atributo traducido salteaba el
  sanitizador (CVE-2026-32635). Los `.xlf` los revisa el equipo en el PR; ningún tercero los edita.
  Trusted Types (§15.4) queda como defensa en profundidad.

  ```html
  <!-- ❌ una traducción reemplaza el handler -->
  <img src="a.jpg" onerror="void 0" i18n-onerror>
  <!-- ❌ i18n-href saltea el sanitizador -->
  <a [href]="urlDelUsuario" i18n-href>Ver</a>
  ```
- **Nunca** `[attr.href]` ni `[attr.xlink:href]` sobre un `<script>` SVG (CVE-2026-22610).
- Pipes que devuelven HTML (ej. resaltar búsqueda) **escapan primero** el texto y la búsqueda:

```ts
// shared/pipes/highlight-search-pipe.ts
const escaparHtml = (texto: string): string =>
  texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const escaparRegex = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Pipe({ name: 'highlightSearch' })
export class HighlightSearchPipe implements PipeTransform {
  transform(texto: string | null | undefined, busqueda: string): string {
    const seguro = escaparHtml(texto ?? '');
    if (!busqueda) return seguro;
    const patron = new RegExp(escaparRegex(escaparHtml(busqueda)), 'gi');
    return seguro.replace(patron, (m) => `<mark>${m}</mark>`);
  }
}
```

```ts
// ❌ MAL — XSS directo: el backend o el usuario controlan el HTML
this.html = this._sanitizer.bypassSecurityTrustHtml(respuesta.descripcion);
```

#### 15.3.1 Texto que escribe el usuario (`<input>`, `<textarea>`, filtros)

Ningún campo de texto acepta etiquetas ni código. Son tres defensas y van en este orden de importancia:

1. **Mostrar el dato con interpolación** (`{{ }}`). Es la que de verdad frena el ataque: un
   `<script>` guardado se ve como texto y no corre.
2. **El backend valida de nuevo con la misma regla** (`SinCodigo()` de FluentValidation, mismo
   patrón: si cambia en un lado, cambia en el otro) y guarda con parámetros. El validador del front
   se salta con una llamada directa a la API: solo no protege nada.
3. **El front rechaza al escribir o pegar**, con un validador del schema. Avisa al usuario en el campo
   y corta el intento antes de que salga.

Reglas:

- **Campo con formato conocido** (nombre, documento, teléfono, código): `pattern()` con la lista de
  caracteres **permitidos**. Lo que no está en la lista no entra.
- **Campo de texto libre** (observaciones, descripción, comentario, búsqueda): `maxLength()` +
  `sinCodigo()`. Siempre los dos.
- **Rechazar, nunca limpiar.** Borrar `<script>` en silencio deja armar `<scr<script>ipt>` y cambia
  el dato sin que el usuario lo sepa. El campo queda inválido con su mensaje y el submit no sale.
- **No escapar antes de enviar** (`&lt;` en la base): el dato queda roto y se escapa dos veces. Se
  guarda el texto tal cual y se escapa al mostrarlo (punto 1).
- Lo mismo para texto que llega por **query params o route params** y termina en un filtro o en la
  pantalla: `tieneCodigo(valor)` antes de usarlo; si da `true`, se descarta.
- Un campo que **necesita** marcado (editor enriquecido) no usa `sinCodigo`: va por [19](./19-archivos-pdf-excel-editor.md)
  §19.7. Texto que se exporta a CSV: además §19.5.

```ts
// shared/validators/sin-codigo.ts
import { SchemaPath, validate } from '@angular/forms/signals';

// Atributos que ejecutan o cargan algo. `on` + 3 letras o más: el evento más corto es `oncut`, y deja pasar "ONG =".
const ATRIBUTO = 'on[a-z]{3,}|style|src|srcset|srcdoc|href|xlink:href|formaction|action|background|poster';
// Entidades que, decodificadas dos veces, vuelven a ser `<`, `"`, `:` y compañía.
const ENTIDAD = 'lt|gt|quot|amp|apos|colon|tab|newline|lpar|rpar|equals|sol|bsol|grave|num|semi|nbsp';

// 1) etiqueta: `<` o `</` + letra, `<!`, `<?`. `\u3008` (〈): SQL Server lo guarda como `<` en una columna `varchar`.
// 2) atributo suelto que rompe otro atributo: `" onerror=`, `' style=`, ` src=`.
// 3) entidad HTML: `&#60;`, `&lt;`, `&colon;`.
const MARCADO = new RegExp(
  `[<\\u3008]/?[\\p{L}\\u{10000}-\\u{10FFFF}]|[<\\u3008][!?]` +
    `|(?:^|[ \\t\\n\\r\\f"'\`/])(?:${ATRIBUTO})[ \\t\\n\\r\\f]*=` +
    `|&(?:#[0-9x]|(?:${ENTIDAD});)`,
  'iu',
);
// URL que ejecuta, al inicio del texto o de un valor. Se busca sin TAB ni saltos: el navegador los ignora en `java\nscript:`.
const ESQUEMA = /(?:^|["'`=(]) *(?:(?:javascript|vbscript) *:|data *: *(?:text|image|application)\/)/i;
// Caracteres de control (menos TAB, LF y CR), los que invierten el sentido del texto y Unicode inválido.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069\uFFFE\uFFFF\p{Cs}]/u;
// 30 marcas combinantes seguidas: nadie lo escribe, y normalizarlas cuesta tiempo cuadrático (12 s con 200.000).
const APILADO = /[\p{M}\u{10000}-\u{10FFFF}]{30,}/u;

export function tieneCodigo(texto: string): boolean {
  if (CONTROL.test(texto) || APILADO.test(texto)) return true;
  // NFKC: `＜script＞` (ancho completo) pasa a `<script>` antes de comparar
  const plano = texto.normalize('NFKC');
  return MARCADO.test(plano) || ESQUEMA.test(plano.replace(/[\t\n\r]/g, ''));
}

export function sinCodigo(path: SchemaPath<string>): void {
  validate(path, ({ value }) =>
    tieneCodigo(value())
      ? { kind: 'sinCodigo', message: 'El texto no puede incluir etiquetas HTML ni código (por ejemplo <b> u onclick=)' }
      : null,
  );
}
```

```ts
// uso en el schema del form
maxLength(path.nombre, 80);
pattern(path.nombre, /^[\p{L}\p{M}' .-]+$/u, { message: 'Solo letras, espacios, apóstrofe y guion' });
maxLength(path.observaciones, 2000);
sinCodigo(path.observaciones);
```

Qué pasa y qué no (probado contra 100 ataques y 68 textos normales, con la misma respuesta en el
front y en el backend):

- Pasan: `a < b`, `precio <= 100`, `me gusta <3`, `Tom & Jerry`, `ONG = organización`,
  `Curso de JavaScript: avanzado`, URLs con `?a=1&b=2`, emojis, acentos y saltos de línea.
- Se rechazan aunque no sean un ataque: `a <b` y `<sin datos>` (`<` pegado a una letra: el navegador
  lo lee como etiqueta), `online=si` al inicio o después de un espacio, `precio&nbsp;final` pegado
  desde una web, y texto con marcas de dirección (hebreo o árabe pegado con U+202A a U+202E).
- No lo cubre, a propósito: texto codificado (`%3Cscript%3E`, `\u003cscript\u003e`), que es inerte salvo que
  otra capa lo decodifique dos veces.
- Un campo donde el usuario escribe código a propósito (un snippet, una fórmula) no lleva
  `sinCodigo`: lleva `maxLength()` y se muestra solo con interpolación.
- **No editar el patrón a mano en un solo lado.** Un cambio se prueba con los mismos casos en el
  front y en el backend; un patrón "más simple" suele reabrir una evasión (`java\nscript:`,
  `" style=`, `&colon;`) o volver cuadrático el tiempo de validación.

### 15.4 CSP y Trusted Types

- Activar **`autoCsp`** en `angular.json` (build de producción). Angular genera una CSP con hashes
  para sus scripts inline:

```json
"configurations": {
  "production": {
    "security": { "autoCsp": true }
  }
}
```

- `autoCsp` **no funciona con SSR** y **cubre solo scripts**: no restringe `style-src`. Con
  SSR, la CSP de scripts la arma el servidor con nonce.
- Si el servidor genera un nonce por request, pasarlo con `ngCspNonce` en el root o con el token
  `CSP_NONCE`. Así los `<style>` de los componentes cumplen la política. Con inlining de CSS crítico
  activo, `CSP_NONCE` no sirve: usar `ngCspNonce` en el root.
- Cerrar los vectores que el meta tag no cubre desde cabeceras del servidor (§15.9):
  `frame-ancestors`, `object-src`, `base-uri`, `form-action`.
- **Trusted Types**: Angular es compatible. Activarlos en proyectos nuevos:
  `require-trusted-types-for 'script'; trusted-types angular angular#bundler;`
  (`angular#bundler` lo necesitan los chunks lazy). Si el código usa algún `bypassSecurityTrust*`
  (solo con constantes, §15.3), sumar `angular#unsafe-bypass`; sin esa política, el bypass falla.
- **SSR** (solo si la app renderiza en servidor): limitar los hosts aceptados para evitar SSRF por
  la cabecera `Host`. Un host fuera de la lista recibe `400`. Nunca `*`.

  ```json
  "security": { "allowedHosts": ["app.example.com"] }
  ```

  También en `new AngularNodeAppEngine({ allowedHosts: [...] })` o con `NG_ALLOWED_HOSTS`.
  `trustProxyHeaders` (`NG_TRUST_PROXY_HEADERS`) solo detrás de un proxy propio y confiable.
- **SSR, resto del borde** (solo si la app renderiza en servidor). El arreglo real de estos avisos es subir
  al piso de versiones de §15.10; lo de abajo vale igual con la versión parcheada:
  - Texto de usuario al DOM del servidor: interpolación, no `[innerHTML]` (GHSA-f67j).
  - Nunca `document.createProcessingInstruction()` con datos no confiables dentro de `<noscript>`,
    `<iframe>`, `<noembed>` o `<noframes>` (GHSA-j3r3).
  - HTML con datos del usuario: `Cache-Control: private` o `no-store`; un CDN no cachea HTML personalizado
    (GHSA-p297, GHSA-jhpw). Endpoint sensible: `transferCache: false` o
    `withHttpTransferCacheOptions({ filter })` ([09](./09-performance-zoneless.md) §9.7).
  - Un interceptor que adjunta credenciales del servidor nunca lo hace sobre una URL derivada de input: el
    chequeo `new URL(x, base).origin` no alcanzaba con espacios Unicode al inicio (GHSA-f6mr).
  - Evitar `defaultQueryParamsHandling: 'merge' | 'preserve'` en links renderizados por SSR (GHSA-57xq).
  - Ningún `id` del DOM sale tal cual de un dato del usuario o de un CMS: puede pisar el elemento `ng-state`
    de la hidratación (GHSA-rgjc). Si hace falta un id dinámico, lleva un prefijo fijo. Sin poder subir de
    versión, un `APP_ID` propio cambia el id de ese elemento:
    `{ provide: APP_ID, useValue: 'mi-app' }`.
  - Contención mientras no se sube de versión, en el proxy o en el server:

    ```ts
    // server.ts, ANTES del handler de Angular SSR. Mitiga GHSA-w739, 62vg, ff3f y 57xq
    app.use((req, res, next) => {
      const i = req.url.indexOf('?');
      if (i !== -1 && req.url.length - i > 2048) return res.status(414).send('URI Too Long');
      let ruta: string;
      try {
        ruta = decodeURI(i === -1 ? req.url : req.url.slice(0, i));
      } catch {
        return res.status(400).send('Bad Request');
      }
      if (/\/\.\/\/|\/\.\.\/\/|\/\.;\//.test(ruta)) return res.status(400).send('Bad Request');
      // Solo si la app NO usa matrix params ni outlets nombrados en las URLs:
      if (/[;()]/.test(ruta)) return res.status(400).send('Bad Request');
      next();
    });
    ```

    Con outlets nombrados no se bloquean los paréntesis: se rechazan solo las secuencias de outlet vacío
    (`:/(`, `(//(`, `///(`).
- Toda CSP nueva o endurecida se despliega primero como **`Content-Security-Policy-Report-Only`**,
  se revisan los reportes y después se pasa a modo bloqueo.
- **Nunca** `'unsafe-eval'`. `'unsafe-inline'` en `script-src` tampoco.
- **Política propia de Trusted Types**: nunca de paso directo (`createHTML: (valor) => valor` anula la
  protección), y su nombre va en la directiva `trusted-types` de la CSP. Trusted Types es Baseline recién desde
  feb 2026 (Firefox 148): en un navegador anterior no protege, así que no reemplaza al sanitizador.
- **Reportes de CSP**: `report-to` solo funciona si el servidor manda también
  `Reporting-Endpoints: default="https://<api>/csp"`. `'report-sample'` en `script-src` suma al reporte el
  inicio del script bloqueado. El reporte sigue activo con la CSP ya aplicada, no solo en Report-Only.

### 15.5 Autenticación, tokens y autorización

- **Preferir cookies de sesión `HttpOnly; Secure; SameSite=Strict|Lax`** emitidas por el backend
  (patrón BFF). JavaScript no puede leerlas, así que un XSS no las roba. Nombre con prefijo `__Host-`
  (`__Host-sesion`): el navegador solo la acepta con `Secure`, `Path=/` y sin `Domain`, así un subdominio no
  puede pisarla. Es también el orden de la RFC 10017 (OAuth 2.0 for Browser-Based Applications, ago 2026),
  que lista las arquitecturas de más a menos seguras: BFF, backend que media el token, cliente OAuth en el
  navegador. Con frontend y API en el mismo dominio, la RFC admite no usar OAuth en el navegador. Antes de
  decidir dónde guardar un token, leer su sección de almacenamiento en el navegador.
- **Sesión solo por cookie (sin token en JS)**: tras recargar, el front no sabe si hay sesión hasta preguntarle
  al backend. `Auth` guarda el usuario en un signal y expone `restaurar()`: con el signal vacío llama una vez a
  `GET auth/me`; `401` devuelve `false`, cualquier otro error se propaga. El guard lo espera y, si no pudo
  confirmar la sesión, no deja pasar:

```ts
export const authGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const haySesion = await inject(Auth).restaurar().catch(() => false);
  return haySesion || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
```

  Un `401` de la API propia cierra la sesión local con recarga a `/login?returnUrl=<router.url>` (el
  `_cerrarLocal` de abajo, con `returnUrl` además de `motivo`), salvo en `auth/login`, `auth/me` y `auth/logout`:
  ese `401` lo resuelve quien llama. El login valida `returnUrl` antes de navegar (§15.7). No hay
  `authInterceptor` que agregue header ni renovación (§15.5.3). Probado en navegador con Angular 22.3.0.
- Si se usa bearer token (OIDC/OAuth con PKCE), guardarlo **en memoria** (signal de un servicio),
  nunca en `localStorage`/`sessionStorage`. Refresh token solo en cookie `HttpOnly`.
- El `authInterceptor` agrega el header **solo** si la request va al origen de la API propia.
  Comparar orígenes con `URL`, nunca con `startsWith` (`https://api.example.com.attacker.example` pasaría):

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(Auth).accessToken();
  const apiOrigin = new URL(environment.API_URL).origin;
  const destino = new URL(req.url, location.origin).origin;

  if (!token || destino !== apiOrigin) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

  Esta es la base. Con bearer token que vence (casi siempre), el interceptor también renueva y reintenta
  ante el 401: versión completa en §15.5.3.

- Guards (`canMatch`, `canActivate`) ocultan rutas; **no protegen datos**. Cada endpoint valida
  permisos en el backend. Preferir `canMatch` para no descargar el chunk de una ruta sin permiso.
- **Permisos en la UI por flag del backend** (`puedeEliminar`), expuesto en un solo `computed`;
  nunca listas de `idUsuario` o `idArea` en el template ni en el `.ts`: son fáciles de leer en el
  bundle, se desactualizan con cada alta y no protegen nada ([02](./02-typescript-signals.md) §2.17).
- En logout: **recargar la página** hacia el login (`location.assign`), no `router.navigate`. La recarga
  descarta de una vez los signals, los stores, los resources vivos y las requests en vuelo: una respuesta tardía del
  usuario anterior no cae en un store que ya es del siguiente. Con `navigate`, la SPA sigue viva y hay que
  vaciar y cancelar a mano cada pieza. Además, limpiar cualquier storage propio. El endpoint
  de logout del backend responde además `Clear-Site-Data: "cookies", "storage", "cache"`, que borra en el
  navegador lo que el código pudo dejar.
- **Logout en todas las pestañas**: con el token en memoria no hay evento `storage` que avise a las
  otras pestañas; usar `BroadcastChannel` (mismo origen) desde el servicio de auth, **sin `effect()`**: el
  método que cierra la sesión también avisa, y `onmessage` escribe el signal. El mensaje es un evento
  (`'logout'`), **nunca el token ni datos del usuario**; comparar el payload antes de actuar (el canal
  es de mismo origen: no hay `event.origin` que validar). Singleton de root: el canal vive lo que la
  app, no hace falta `close()`. Microfrontends: [17](./17-microfrontends.md) §17.8.

```ts
@Service()
export class Auth {
  private readonly _http = inject(HttpClient);
  private readonly _canal = new BroadcastChannel('auth');
  private readonly _token = signal<string | null>(null); // en memoria, nunca en storage
  private _cerrada = false;
  readonly accessToken = this._token.asReadonly();
  readonly usuario = signal<Usuario | null>(null);

  constructor() {
    this._escucharOtrasPestanas();
  }

  logout(motivo?: 'expirada') {
    const cerrar = () => {
      this._cerrarLocal(motivo);
      this._canal.postMessage('logout');
    };
    if (motivo === 'expirada') return cerrar(); // el backend ya no tiene sesión que revocar
    // El backend revoca la sesión y borra la cookie. Sin esta llamada la cookie sigue válida: tras recargar,
    // el primer 401 renueva el token (§15.5.3) y la sesión revive sola.
    this._http
      .post(`${environment.API_URL}auth/logout`, null, {
        withCredentials: true,
        context: new HttpContext().set(SKIP_AUTH, true).set(SKIP_ERROR_HANDLER, true),
      })
      .pipe(timeout(5_000), finalize(cerrar)) // con o sin respuesta, la sesión local se cierra
      .subscribe({ error: () => undefined }); // sin red no hay a quién avisar: la cookie vence sola
  }

  // otra pestaña cerró sesión: esta también
  private _escucharOtrasPestanas() {
    this._canal.onmessage = (e: MessageEvent<unknown>) => {
      if (e.data === 'logout') this._cerrarLocal();
    };
  }

  // Idempotente: N requests con 401 a la vez llaman acá N veces y la sesión se cierra una sola.
  private _cerrarLocal(motivo?: 'expirada') {
    if (this._cerrada) return;
    this._cerrada = true;
    this._token.set(null);
    this.usuario.set(null);
    const login = new URL('login', document.baseURI); // respeta <base href>
    if (motivo) login.searchParams.set('motivo', motivo); // la pantalla de login explica "Sesión expirada"
    location.assign(login);
  }
}
```

- 401 → renovar el token una vez (§15.5.3); si no se puede, login. 403 → sin permiso: mostrar mensaje.
  Nunca reintentar automáticamente con otras credenciales.

#### 15.5.1 Auth OIDC en la SPA

**Aplica solo si** el proyecto ya usa `angular-oauth2-oidc`, `angular-auth-oidc-client` o MSAL
(`@azure/msal-angular`). **Si no lo usa, no lo agregues**: la autenticación se acuerda con el backend
(§15.5, cookie `HttpOnly` / BFF). Esto endurece lo que ya existe; no cambia de librería.

- **Authorization Code + PKCE**, nunca flujo implícito ni `password` (grant ROPC). Si la config
  existente usa implícito, reportarlo (§15.1) y proponer el cambio; no migrarlo en silencio.
- **Inicialización** en `provideAppInitializer`, con **timeout** y **ruta de error** si el IdP no
  responde: una SPA que queda en blanco esperando al IdP es un incidente de disponibilidad.

```ts
provideAppInitializer(async () => {
  const auth = inject(AuthBootstrap);
  const router = inject(Router);
  const ok = await Promise.race([
    auth.init().catch(() => false),                     // discovery + procesar el callback
    new Promise<false>((r) => setTimeout(() => r(false), 10_000)),
  ]);
  if (!ok) await router.navigateByUrl('/error/auth');   // pantalla estática, sin llamar a la API
}),
```

- **`returnUrl`**: guardarlo antes de ir al IdP y, al volver, **validar que sea una ruta relativa del
  mismo origen** con `esRutaInterna` (§15.7). Open redirect clásico del callback.
- **Roles en el guard = UX.** `canMatch` oculta rutas; el backend autoriza cada endpoint (§15.5).
- **El access token va solo a la API propia**: configurar `allowedUrls` (angular-auth-oidc-client:
  `secureRoutes`; angular-oauth2-oidc: `sendAccessToken` + `allowedUrls`; MSAL: `protectedResourceMap`)
  con orígenes exactos. Nunca a APIs de terceros ni con wildcards amplios.
- **Storage del token**: memoria primero (§15.5). Si la librería ya guarda en `sessionStorage` o
  `localStorage` (varias lo hacen por defecto), **avisar** que un XSS lo lee; no cambiar el storage
  en silencio, que puede romper el login. Proponer la alternativa y que el usuario decida.
- **MSAL**: `MsalInterceptor` es un interceptor **de clase**. Mantenerlo con
  `provideHttpClient(withInterceptorsFromDi())` y registrar los funcionales con `withInterceptors`
  en el mismo `provideHttpClient`; no reescribirlo (§5.8). Verificá el orden resultante.
- **Decodificar el JWT en el cliente** (`@auth0/angular-jwt`, `jwt-decode`) sirve para mostrar el
  nombre o saber cuándo vence: es **UX**. No verifica la firma ni autoriza nada; todo valor del
  token que decida acceso se vuelve a validar en el backend.
- Logout: cerrar sesión en el IdP (`end_session_endpoint`) además de limpiar signals y storage (§15.5).

#### 15.5.2 Firma digital en el cliente

**Aplica solo si** el proyecto ya firma en el navegador o con un firmador local (token USB, agente
de escritorio). Si no, no agregues firma en el front.

- **Criptografía con WebCrypto** (`crypto.subtle`), no con librerías JS. **`crypto-js` está
  discontinuado: no lo agregues**; si el proyecto ya lo usa, reportarlo y proponer WebCrypto.
- **El PIN o la contraseña del certificado nunca se guarda, loguea ni persiste** (ni `localStorage`, ni
  `console`, ni signal de larga vida, ni query string). Se lee en un campo `type="password"`, se usa y
  se **limpia del signal** apenas termina la operación (`this._pin.set('')`), también en el error.
- Parseo de certificados con `@peculiar/x509` o `pkijs` **solo si ya están** en el proyecto.
- **La validación de la firma es del backend**: cadena de confianza, vigencia, revocación y que el
  documento firmado sea el esperado. Que el front "verifique" es solo información para el usuario.
- La clave privada no sale del dispositivo ni del firmador; el front envía el documento (o su hash)
  y recibe la firma.

#### 15.5.3 Renovación del token (bearer en memoria)

**Aplica solo si** el proyecto usa bearer token de vida corta en memoria y refresh token en cookie `HttpOnly`
(§15.5), sin librería OIDC. Con cookie de sesión (BFF) no hay nada que renovar: el 401 va al login.

- **Con librería OIDC, la renueva ella: no armar esto.** `angular-auth-oidc-client`: `silentRenew: true` +
  `useRefreshToken: true` (y `renewTimeBeforeTokenExpiresInSeconds`); `angular-oauth2-oidc`:
  `setupAutomaticSilentRefresh()`; MSAL: `acquireTokenSilent` dentro de `MsalInterceptor`. Se configura y se
  verifica en las DevTools (una sola llamada de renovación aunque haya N requests); no se escribe un segundo
  mecanismo encima.
- **Contrato con el backend** (skill de backend): el refresh token **rota en cada uso** y el backend acepta el
  anterior durante una **ventana corta de gracia**, para dos pestañas que renuevan a la vez. Fuera de esa
  ventana, reusar un refresh token revoca la sesión: por eso la renovación es **única**, nunca una por request.
- **Una renovación en curso para todos** (una promesa compartida): N requests con 401 a la vez producen **una**
  llamada de renovación. El request original se **reintenta una sola vez** con el token nuevo. Si la renovación
  falla con 401/403 se cierra sesión una vez (`_cerrarLocal` es idempotente). Un fallo de red al renovar **no**
  cierra sesión: la sesión puede seguir viva. En ese caso el 401 original llega a quien llamó **sin modal**
  (`errorInterceptor` lo ignora, §5.3): la pantalla muestra su estado de error con reintentar. Lo mismo el 401
  del login (`SKIP_AUTH`): lo atiende el formulario.
- **Entre pestañas**: `navigator.locks.request` hace que renueve una por vez. La cookie `HttpOnly` es compartida,
  así que la que espera el lock renueva a su vez con la cookie ya rotada y obtiene **su propio** access token.
  El token **no** se pasa entre pestañas (ni `BroadcastChannel` ni storage): sigue solo en memoria.
- `tokenVigente()` es el método para quien necesita el token fuera de `HttpClient` (por ejemplo,
  `accessTokenFactory` de SignalR, [16](./16-websocket-signalr.md)): espera la renovación en curso o renueva si venció.
- Login, renovación y logout llevan `SKIP_AUTH` (§5.4): sin él, un 401 de credenciales malas dispararía una renovación.
- **CSRF de `auth/refresh` y `auth/logout`**: se autentican solo con la cookie. La cookie del refresh token va
  `HttpOnly; Secure; SameSite=Strict` y el backend valida el header `Origin` en esos dos endpoints: otro sitio
  no lee la respuesta, pero sin esa validación puede forzar rotaciones o cerrar la sesión.

```ts
// shared/services/auth.ts (amplía §15.5; el access token de la respuesta vence en `expiresIn` segundos)
@Service()
export class Auth {
  private readonly _http = inject(HttpClient);
  private readonly _canal = new BroadcastChannel('auth');
  private readonly _token = signal<string | null>(null);
  private _venceEn = 0;
  private _renovacion: Promise<string | null> | null = null;
  private _cerrada = false;
  readonly accessToken = this._token.asReadonly();
  readonly usuario = signal<Usuario | null>(null);

  // Token listo para usar: espera la renovación en curso o renueva si no hay o venció (margen de 30 s).
  tokenVigente(): Promise<string | null> {
    if (this._renovacion) return this._renovacion;
    const token = this._token();
    return token && Date.now() < this._venceEn - 30_000 ? Promise.resolve(token) : this.renovar();
  }

  // El 401 llegó con `rechazado`: si otro request ya renovó, se usa ese token y no se renueva de nuevo.
  renovarTrasRechazo(rechazado: string | null): Promise<string | null> {
    const actual = this._token();
    return actual && actual !== rechazado ? Promise.resolve(actual) : this.renovar();
  }

  renovar(): Promise<string | null> {
    if (this._cerrada) return Promise.resolve(null); // sesión ya cerrada: renovar no sirve
    return (this._renovacion ??= this._renovarUnaVez().finally(() => (this._renovacion = null)));
  }

  guardarToken(r: { accessToken: string; expiresIn: number }): void { // lo llama también el login
    this._token.set(r.accessToken);
    this._venceEn = Date.now() + r.expiresIn * 1000;
  }

  private _renovarUnaVez(): Promise<string | null> {
    const pedir = async (): Promise<string | null> => {
      try {
        const r = await firstValueFrom(
          this._http.post<{ accessToken: string; expiresIn: number }>(`${environment.API_URL}auth/refresh`, null, {
            withCredentials: true, // la cookie HttpOnly con el refresh token
            context: new HttpContext().set(SKIP_AUTH, true).set(SKIP_ERROR_HANDLER, true).set(SKIP_SPINNER, true),
          }).pipe(timeout(10_000)), // sin tope, una red colgada deja trabados la promesa compartida y el lock de las otras pestañas
        );
        if (this._cerrada) return null; // cerraron sesión mientras renovaba: no reponer el token
        this.guardarToken(r);
        return r.accessToken;
      } catch (e) {
        if (e instanceof HttpErrorResponse && (e.status === 401 || e.status === 403)) this.logout('expirada');
        return null;
      }
    };
    // una pestaña por vez; sin Web Locks (navegador viejo) corre igual y la ventana de gracia del backend cubre el cruce
    return 'locks' in navigator ? navigator.locks.request('auth-refresh', pedir) : pedir();
  }
  // logout(), _cerrarLocal() y _escucharOtrasPestanas(): igual que en §15.5
}
```

```ts
// interceptors/auth-interceptor.ts (reemplaza al de §15.5)
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const apiOrigin = new URL(environment.API_URL).origin;
  const destino = new URL(req.url, location.origin).origin;
  if (req.context.get(SKIP_AUTH) || destino !== apiOrigin) return next(req);

  const conToken = (token: string) => req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  const enviado = auth.accessToken();   // sin token (recién recargada la página): sale así y el 401 dispara la renovación

  return next(enviado ? conToken(enviado) : req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) return throwError(() => error);
      return from(auth.renovarTrasRechazo(enviado)).pipe(
        switchMap((nuevo) =>
          nuevo
            ? next(conToken(nuevo)).pipe(   // reintento único: si vuelve 401, la sesión no sirve
                catchError((e: unknown) => {
                  if (e instanceof HttpErrorResponse && e.status === 401) auth.logout('expirada');
                  return throwError(() => e);
                }),
              )
            : throwError(() => error),
        ),
      );
    }),
  );
};
```

- El reintento reenvía el mismo body: vale para JSON. Un body de un solo uso (stream) no se puede reenviar.
- El token nunca va a `localStorage` ni `BroadcastChannel` (§15.5). La renovación tampoco guarda el refresh
  token en JS: viaja solo en la cookie.

### 15.6 CSRF / XSRF

- Con sesión por cookie, activar la protección de `HttpClient`. Adjunta el header solo en métodos
  que mutan y en URLs relativas o del mismo origen:

```ts
provideHttpClient(
  withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
  withInterceptors([...]),
);
```

- **Versión mínima** (GHSA-jfgx-762w-99vr, oct 2026; arreglo incompleto de CVE-2025-66035): el
  interceptor decidía "URL relativa" con una regex y el navegador resuelve distinto (`/\evil.example`,
  `/\t/evil.example` van a otro origen), así que el token salía a un dominio ajeno. `@angular/common`
  **>= 20.3.34** o **>= 21.0.3**; 22.x no está afectada; <= 19 no tiene parche. Nunca armar la URL de
  un request con un valor del usuario sin validar. El piso general por major, con el resto de los avisos
  de 2026, está en §15.10.
- El backend .NET valida el token (antiforgery) y usa `SameSite` en la cookie de sesión.
- **Nunca** mutar estado con `GET`.

### 15.7 Navegación, redirects y links externos

- **Open redirect**: `returnUrl` / `next` se aceptan solo si son rutas internas.

```ts
// Se resuelve como el navegador (WHATWG), no con regex ni prefijos: `/\evil.example` y
// `/\t/evil.example` empiezan con una sola `/` y van a otro origen
const esRutaInterna = (url: string): boolean =>
  url.startsWith('/') && URL.parse(url, location.origin)?.origin === location.origin;

const destino = esRutaInterna(returnUrl) ? returnUrl : '/inicio';
this._router.navigateByUrl(destino);
```

- **Nunca** `window.location.href = valorDelUsuario`.
- Links externos: `target="_blank" rel="noopener noreferrer"`.
- URLs dinámicas en `[href]`: validar esquema `https:` (o `mailto:`/`tel:` si aplica). Angular
  marca `javascript:` como `unsafe:`, pero no validar el dominio.
- **Host binding sensible** (`host: { '[attr.href]': ... }`, `[attr.src]`) con un valor no confiable: validar
  el esquema antes, aunque la versión esté parcheada. Angular decidía el contexto de seguridad por el
  selector de quien declara la directiva, no por el elemento real, y el valor llegaba al DOM sin sanitizar
  con `hostDirectives`, herencia, `createComponent` con `hostElement` propio y SVG / MathML (GHSA-hh8m).

  ```ts
  // ❌ url() llega sin sanitizar en esos casos
  @Directive({ selector: '[appLink]', host: { '[attr.href]': 'url()' } })

  // ✅ el binding lee un valor ya validado
  const urlSegura = (u: string): string | null => (/^https?:\/\//i.test(u) ? u : null);
  ```
- `postMessage`: validar siempre `event.origin` contra una lista blanca y la forma del `data`. Rechazar antes
  `event.origin === 'null'` (los iframes `sandbox` y las URLs `data:` comparten ese valor) y comparar con
  `new URL(origen).origin`, nunca con `startsWith` / `includes`. Al enviar, `targetOrigin` explícito, nunca `'*'`.

### 15.8 Datos sensibles y secretos en el front

- **Todo lo que está en el bundle es público**: `environment.ts`, `appsettings.json` (§10.4),
  constantes, source maps. **Nunca** claves de API privadas, connection strings ni secretos. Si una
  integración necesita secreto, pasa por el backend.
- Source maps desactivados en producción (`"sourceMap": false`, default) o subidos solo a la
  herramienta de monitoreo, nunca públicos.
- **Nunca** PII, tokens ni respuestas completas en `console.*`. El build de producción no debe
  dejar `console.log` de depuración.
- `localStorage` solo para preferencias no sensibles (tema, tamaño de página). No vence solo: si el
  dato caduca, guardar `{ valor, venceEn: Date.now() + ttlMs }`, y al leer descartar y borrar lo
  vencido o lo que no tenga esa forma (`JSON.parse` en `try/catch`: el storage lo edita cualquiera).
  Un vencimiento en el cliente no es control de seguridad.
- Mensajes de error al usuario: genéricos. Nunca stack traces, SQL ni detalles internos del
  `ProblemDetails` (§10.3).
- Descargas: `URL.revokeObjectURL()` después de usar un blob. Nombres de archivo del backend
  sanitizados antes de usarlos.
- Uploads: validar tipo y tamaño en el front (UX) **y** en el backend (seguridad). Nunca renderizar
  un SVG subido por el usuario con `[innerHTML]`.
- Exportar a CSV (o fórmulas XLSX con datos del usuario): sanear celdas que empiezan con `=`, `+`, `-`, `@` (CSV injection), en
  [19](./19-archivos-pdf-excel-editor.md) §19.5.
- **El agente no lee secretos.** En Claude Code el instalador suma a `permissions.deny`, sin quitar las
  reglas del usuario: `~/.ssh/**`, `~/.aws/credentials`, `.env`, `.env.*`, `*.pem`,
  `*.key`, `*.pfx` y `secrets/**`. Bloquea Read/Edit/Write, no `cat` por Bash: nunca leer esos
  archivos por otra vía. Si una tarea necesita un valor, pedírselo al usuario o usar un placeholder.
- **WebMCP** (experimental en v22): expone la app y sus Signal Forms como herramientas para agentes del
  navegador. No se activa sin una revisión de seguridad de qué acciones y datos quedan expuestos.

### 15.9 Cabeceras de seguridad en IIS

Sumar al `web.config` de §10.2, dentro de `<system.webServer>`:

```xml
<httpProtocol>
  <customHeaders>
    <remove name="X-Powered-By" />
    <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
    <add name="X-Content-Type-Options" value="nosniff" />
    <add name="X-Frame-Options" value="DENY" />
    <add name="Cross-Origin-Opener-Policy" value="same-origin-allow-popups" />
    <add name="Cross-Origin-Resource-Policy" value="same-origin" />
    <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
    <add name="Permissions-Policy" value="camera=(), microphone=(), geolocation=()" />
    <!-- script-src lo define autoCsp (§15.4); acá solo lo que el meta tag no cubre -->
    <add name="Content-Security-Policy" value="object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" />
  </customHeaders>
</httpProtocol>
<security>
  <requestFiltering removeServerHeader="true" />
</security>
```

- HSTS solo con HTTPS funcionando en todo el dominio (y subdominios si se incluye
  `includeSubDomains`).
- Ajustar `Permissions-Policy` a lo que la app usa de verdad.
- Verificar el resultado con las DevTools (pestaña Network → Headers) después del deploy.
- `X-Frame-Options: DENY` acompaña a `frame-ancestors 'none'` para navegadores viejos. Si la app se embebe
  desde otro origen permitido, se quita (no sabe expresar listas) y manda `frame-ancestors`.
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` aísla la ventana de quien la abrió y deja funcionar
  el popup de login OIDC. `Cross-Origin-Resource-Policy: same-origin` impide que otro sitio cargue estos
  archivos: si otro origen los consume (un remote de microfrontends, [17](./17-microfrontends.md)), va
  `same-site` o `cross-origin`.
- HSTS nuevo en un dominio: empezar con `max-age` corto (300) y subirlo al confirmar que todo responde por
  HTTPS. Un `max-age` largo mal puesto deja el sitio inaccesible hasta que vence.

### 15.10 Supply chain: dependencias y build

- Instalar en CI con **`npm ci`** (respeta el `package-lock.json`). El lockfile siempre se commitea.
- **`npm audit --omit=dev`** en CI. Vulnerabilidad `high`/`critical` en dependencias de runtime
  bloquea el merge.
- Antes de sumar una dependencia: mantenimiento activo, descargas, licencia, vulnerabilidades
  conocidas y si la funcionalidad se resuelve con el framework. Menos dependencias, menos superficie.
- **El nombre de un paquete no se escribe de memoria.** Antes de `npm install <paquete>` propuesto por el
  agente: `npm view <paquete> name version repository.url` y confirmar que es el paquete buscado (repo y
  autor esperados). Un nombre inventado por el modelo puede no existir o estar registrado por un atacante.
  Lo mismo vale para versiones y flags: se leen de `package.json`, `node_modules` o la doc, no se suponen.
- Mantener Angular al día con `ng update` (los parches de seguridad salen para las versiones con
  soporte). `ng build` después de cada upgrade: un renombre en una librería interna no lo avisa
  `npm install`.
- **Nunca un `postinstall` que edite `node_modules`** para que compile (`scripts/patch-<lib>.js`):
  esconde la incompatibilidad, se pierde con cada `npm ci` y es código que corre en toda máquina que
  instala. Fijar la versión compatible, esperar el fix o, si no hay otra salida, `patch-package` con el
  `.patch` versionado y el motivo en el PR.
- Paquetes internos de la empresa (`@empresa/*`) con **versión exacta** en `package.json`, sin `^`:
  su semver no es confiable y un minor puede renombrar exports.
- Scripts externos (CDN) solo con **Subresource Integrity** (`integrity` + `crossorigin`): hash `sha384-` del
  archivo conocido, URL con versión fija (nunca `latest`), `crossorigin="anonymous"` (sin él el recurso se
  bloquea) y `referrerpolicy="no-referrer"`. Un script que su dueño cambia en el lugar no admite `integrity`: se
  limita con CSP.
- **Cooldown de versiones nuevas** en `.npmrc` (npm ≥ 11.10; por defecto no hay): npm ignora lo publicado
  hace menos de N días, que es la ventana en la que se detecta un paquete comprometido. El valor lo decide
  el equipo; 3 es un punto de partida, no una medición. En pnpm la opción es `minimumReleaseAge`
  (confirmar el default en `pnpm.io`).

  ```ini
  # .npmrc
  min-release-age=3
  # npm 12+: excepciones por nombre
  min-release-age-exclude[]=@empresa/*
  ```

  El cooldown y `npm audit fix` chocan: si bloquea el fix, npm deja la versión vulnerable, avisa y sale con
  código distinto de 0. Para un parche urgente: `npm install <paquete>@<versión> --min-release-age=0`,
  después del `npm view` de arriba. Ese flujo se deja escrito en `tasks/lessons.md` o en el `CLAUDE.md` del
  repo.
- **Scripts de instalación de dependencias** (`preinstall`, `install`, `postinstall`, y el `node-gyp rebuild`
  implícito): npm 12 no los corre sin aprobación; npm ≥ 11.16 ya avisa. `npm approve-scripts
  --allow-scripts-pending` lista los pendientes, `npm approve-scripts <paquete>` aprueba solo los confiables
  y deja el allowlist en `package.json` (se commitea), `npm deny-scripts` para el resto. Nunca aprobar en
  bloque para que el install pase.
- **Sin dependencias `github:` ni por URL**: npm 12 no las resuelve por defecto (`--allow-git` y
  `--allow-remote` pasan a `none`). El código interno va por el registry privado
  ([10](./10-environment-tooling.md) §10.1).
- El pipeline que publica la librería interna corre con permisos mínimos y sin secretos accesibles desde
  PRs de forks: con los tokens de larga vida revocados, los atacantes toman el CI y publican por trusted
  publishing (Databricks, nov 2026).
- **Campaña ChainDrop** (ago 2026): gusano que agrega un hook `preinstall`, sube el patch y republica; más
  de 400 paquetes, entre ellos `keyv`, `flat-cache`, `file-entry-cache` y `cache-manager`. Los dos del medio
  suelen venir con ESLint: en la auditoría se revisa el lockfile contra el aviso CSA AD-2026-009 y que el
  dominio `npm-cache[.]com` no aparezca en el repo ni en logs de CI. Cooldown, scripts bloqueados y
  lockfile son la defensa; bloquear los scripts solo cubre cerca de la mitad del malware observado.
- **Compromiso de axios** (31/03/2026): `axios@1.14.1` y `axios@0.30.4` traían `plain-crypto-js@4.2.1`, con un
  `postinstall` que instalaba un RAT; estuvieron publicadas unas 3 horas. Seguras: `1.14.0` y `0.30.3`. Si
  alguna de las tres aparece en el lockfile o en `node_modules`, la máquina o el runner se trata como
  comprometido y se rotan las credenciales. Los releases maliciosos no traían la atestación de provenance
  que sí tenían los legítimos: **un release nuevo sin la provenance que tenían los anteriores frena la
  actualización** hasta revisarlo a mano (`npm view <paquete>@<versión> dist.attestations`,
  `npm audit signatures`).
- **Extensión Angular Language Service de VS Code ≥ 21.2.4** (CVE-2026-49241, GHSA-ccq4-xmxr-8hcq, CVSS 4.0
  8.7): las versiones anteriores leen `typescript.tsdk` y `js/ts.tsdk.path` del `.vscode/settings.json` sin
  consultar Workspace Trust y cargan el `tsserverlibrary.js` de esa ruta: abrir un repo clonado ejecuta
  código. Un repo ajeno se abre en Restricted Mode, y en un `.vscode/settings.json` propio esas dos claves
  nunca apuntan a una carpeta que no sea `node_modules/typescript/lib`.
- Dependabot / Renovate activos en el repo.

#### Versiones mínimas con parche: `@angular/*` y Node

Repasado el 26/11/2026 (`FUENTES.md`). Antes de citarlo en un reporte, mirar si hay avisos más nuevos en
`github.com/angular/angular/security/advisories`.

- **Piso de `@angular/*`: 22.x ≥ 22.2.1, 21.x ≥ 21.2.25, 20.x ≥ 20.3.34.** Mejor la última de la major
  (22.2.3 endurece la codificación de params contra prototype pollution). 19.x y anteriores no tienen
  parche para los avisos de jul a oct 2026: migrar ([20](./20-migracion-angular.md)) o dejar el riesgo
  aceptado por escrito. Se sube con el paso 1 de "Auditoría de dependencias", sin cambiar de major sin
  pedido.
- **Node de build, CI y SSR: 22.23.5, 24.22.3 o 26.13.1 como mínimo** (release de seguridad del 11/11/2026:
  16 CVE, 7 altos, HTTP/2 y TLS). El tag de Docker lleva el parche y se revisa en cada release de seguridad
  de Node ([10](./10-environment-tooling.md) §10.13). Angular 22 no soporta Node 20.
- No hay major de Angular hasta v23 (~jun 2027); v22 tiene soporte activo hasta 2027-06 y LTS hasta 2028-06.
  Hasta entonces, mantenerse en la última 22.x. **v20 pierde el LTS el 2026-11-28** y v21 en 2027-06
  (`angular.dev/reference/releases`): después de esa fecha no reciben parches de seguridad. Un proyecto en
  `^20` necesita plan de migración ([20](./20-migracion-angular.md)) o el riesgo aceptado por escrito.

"SSR" = afecta solo a apps con render en servidor. Las columnas dan la primera versión con parche.

| Aviso (`GHSA-…` · CVE) | Tema | Aplica | 22.x | 21.x | 20.x |
| :--- | :--- | :--- | :--- | :--- | :--- |
| jrmj-c5cx-3cw6 · CVE-2026-22610 | XSS: `href` / `xlink:href` de `<script>` SVG sin sanitizar | SPA y SSR | 22.0.0 | 21.0.7 | 20.3.16 |
| g93w-mfhg-p222 · CVE-2026-32635 | XSS: `i18n-<atributo>` saltea el sanitizador | SPA y SSR | 22.0.0 | 21.2.4 | 20.3.18 |
| f3m7-gqxr-g87x · CVE-2026-50557 | XSS: bypass por namespaces (SVG / MathML) | SPA y SSR | 22.0.0 | 21.2.15 | 20.3.22 |
| rgjc-h3x7-9mwg · CVE-2026-54267 | DOM clobbering de `ng-state` en la hidratación y caché de respuestas envenenada | SSR | 22.0.1 | 21.2.17 | 20.3.25 |
| jj27-h5hq-8x99 · CVE-2026-69151 | XSS: `i18n-on*` en el compilador | SPA y SSR | 22.0.1 | 21.2.19 | 20.3.27 |
| jhpw-976m-542j · CVE-2026-68945 | `HttpTransferCache`: claves ambiguas, respuesta equivocada | SSR | 22.0.2 | 21.2.19 | 20.3.27 |
| hh8m-fm6v-7cvg · CVE-2026-88057 | Sanitización salteada en host bindings | SPA y SSR | 22.1.0 | 21.2.20 | 20.3.28 |
| p297-fm68-3q8c · CVE-2026-88059 | Fuga por `HttpTransferCache` con `withRequestsMadeViaParent` | SSR | 22.1.1 | 21.2.20 | 20.3.28 |
| f6mr-pjwc-34m4 · CVE-2026-88056 | SSRF y fuga de credenciales (URL con espacio Unicode inicial) | SSR | 22.1.4 | 21.2.22 | 20.3.30 |
| j3r3-mxqp-r2p4 · CVE-2026-88058 | XSS por processing instruction en `<noscript>` e iframes | SSR | 22.1.4 | 21.2.22 | 20.3.30 |
| f67j-2jqw-jpq7 · CVE-2026-101895 | DoS: bucle infinito con `<!DOCTYPE html ` | SSR | 22.1.6 | 21.2.23 | 20.3.31 |
| ff3f-86qr-9cv3 · CVE-2026-101896 | DoS: matrix params numéricos (heap de V8) | SSR | 22.2.0 | 21.2.24 | 20.3.32 |
| w739-gvwx-grc3 · CVE-2026-111754 | Open redirect (`/.//evil.test`, `/.;/(//evil.test)`) | SSR | 22.2.1 | 21.2.25 | 20.3.33 |
| 57xq-rjx2-v5xh · CVE-2026-111751 | DoS: `RouterLink` retiene `UrlTree` con query merge / preserve | SSR | 22.2.1 | 21.2.25 | no afectada |
| 62vg-58rm-qff7 · CVE-2026-111752 | DoS: outlets vacíos no configurados | SSR | 22.2.1 | 21.2.25 | 20.3.33 |

El piso de 20.x es 20.3.34 por el aviso de XSRF de §15.6 (GHSA-jfgx-762w-99vr).

#### Auditoría de dependencias: siempre, no solo en CI

El agente corre `npm audit` por su cuenta. No espera al CI ni a que se lo pidan.

**Cuándo:**
- Al empezar a trabajar en un proyecto.
- Después de cualquier cambio en `package.json` o `package-lock.json`: `npm install`, `npm update`, `ng update` o una dependencia nueva.
- Sin cambios de dependencias no se repite antes de entregar: el lockfile es el mismo y el CI lo vuelve a
  correr con la base de vulnerabilidades del día.

**Cómo:**
```bash
npm audit --omit=dev   # runtime: lo que llega al navegador del usuario
npm audit              # completo: incluye el tooling de build (dev)
```

**Qué hacer con el resultado:**
- **Reportar todo hallazgo**, también los del chequeo inicial aunque la tarea no toque dependencias. Una línea por hallazgo: severidad, paquete, de qué dependencia viene y si hay fix.
- **`high` / `critical` en runtime**: avisar antes de entregar. Si los trajo el cambio, bloquean la entrega igual que en CI; si ya estaban, se reportan y decide el usuario.
- **Corregir siempre que haya vulnerabilidades**, con el árbol de git limpio y en este orden:
  1. **Actualizar Angular dentro de su major actual** (patch y minor): `ng update @angular/core@<major> @angular/cli@<major>`, más los `@angular/*` que use el proyecto (`cdk`, `material`, `ssr`) en esa misma major. Muchas vulnerabilidades del framework y de sus dependencias se van con eso. Sin `--force`; un conflicto de peer deps se resuelve como en §20 (tabla de problemas).
  2. **`npm audit fix`** para lo que quede.
  3. **`overrides` en `package.json`** para lo que `npm audit fix` no resuelve (dependencia transitiva con el padre fijado a una versión vulnerable): fijar el paquete a la versión mínima corregida que indica `npm audit`, anidado bajo el padre si solo ese lo trae (`"overrides": { "padre": { "paquete": "^x.y.z" } }`). Después, `npm install` para regenerar el lockfile.
  4. **Verificar**: `npm ci`, build, prueba manual de lo que usa el paquete y `npm audit` de nuevo. Si el build o la app se rompen, revertir ese paso y reportarlo.
- **Se pregunta antes**: `npm audit fix --force`, subir Angular de major (es una migración, §20) y un `override` que salta de major respecto de lo que pide el padre. Instalan cambios que rompen.
- **Sin fix ni override posible** (no hay versión corregida): reportarlo y proponer reemplazar la dependencia o sacarla si se resuelve con el framework, sin aplicarlo sin aprobación.
- Cada `override` se anota en el reporte con el motivo (CVE o aviso) y se revisa en el próximo `ng update`: si el padre ya trae la versión corregida, se borra.
- Vulnerabilidades solo en `dev`: reportar con menor prioridad. No llegan al usuario, pero sí corren en las máquinas de build.

**Lo que `npm audit` no ve: Zero Wire (Cloudflare Radar).** Feed público y gratis de avisos sobre vulnerabilidades
críticas en software expuesto a internet. Las de paquetes npm ya las marca `npm audit`; el feed suma **Node** (build
y SSR), **IIS** y **Angular SSR**. Son pocos avisos y la mayoría no toca un front: no reemplaza a `npm audit`.

- **Cuándo:** solo en la auditoría de seguridad (§15.14 paso 3), una lectura por pedido. Nunca en un hook ni en una
  tarea programada.
- **Cómo:** leer solo título, link y resumen de cada aviso (unos 3 KB). El feed entero pesa unos 68 KB: no leerlo
  completo. Abrir el `<link>` solo del aviso que coincide.
  ```bash
  node -e "fetch('https://radar.cloudflare.com/zero-wire/rss').then(r=>r.text()).then(x=>{for(const i of x.split('<item>').slice(1))console.log(['title','link','description'].map(t=>(i.match(new RegExp('<'+t+'>([^]*?)</'+t+'>'))||[])[1]).join(' | '))})"
  ```
  Solo se descarga el feed: no mandar afuera la lista de paquetes ni el nombre del proyecto.
- **Contra qué cruzarlo:** versión de Node (`engines`, `.nvmrc`, pipeline), `@angular/ssr` si el proyecto lo usa, e
  IIS (§15.9).
- **Resultado:** solo las coincidencias, una línea cada una: aviso, componente afectado (`archivo:línea`), versión
  con fix y link. Una coincidencia se trata como `high` / `critical`. Sin coincidencias, una línea: "Zero Wire: sin
  avisos que apliquen (leído el <fecha>)". Lo que el repo no declara (versión de IIS o de Node en el servidor) se
  anota como "no verificable desde el repo".
- Si el feed no responde, decirlo con el error exacto y seguir. Nunca darlo por leído.

### 15.11 Blue Team: detección, logging y respuesta

- El `errorInterceptor` (§5.3) y el `authInterceptor` (§15.5.3, que es quien ve el 401) reportan al backend los eventos de seguridad: 401 y 403 repetidos,
  errores de CSP, fallos de validación de token. **Sin** datos sensibles en el payload.
- CSP con `report-to` / `report-uri` hacia un endpoint del backend para detectar intentos de XSS y
  scripts inyectados.
- Monitoreo de errores del front (con PII filtrada) para ver picos anómalos.
- Ante una vulnerabilidad confirmada: contener (feature flag o rollback), corregir, rotar lo
  expuesto (tokens, claves), revisar los logs y documentar la lección en `tasks/lessons.md` (§11.8).

### 15.12 Verificación manual de seguridad

Sin archivos de test (§8). Antes de entregar, probar a mano en la app:

- Todo componente o pipe que renderiza datos externos: cargar `<img src=x onerror="alert(1)">` como
  dato. Debe verse como texto, sin `<img>` en el DOM (DevTools → Elements) y sin alerta.
- `authInterceptor`: en DevTools → Network, el header `Authorization` **no** viaja a orígenes externos.
- Validador de `returnUrl`: `//attacker.example`, `/\attacker.example`, `https://attacker.example` y `javascript:alert(1)`
  terminan en la ruta por defecto.

### 15.13 Mapa OWASP Top 10 (2025)

| OWASP | Dónde se cubre |
| :--- | :--- |
| A01 Broken Access Control | §15.5 (autorización en backend, guards como UX), §15.2 (IDOR) |
| A02 Security Misconfiguration | §15.4, §15.9 |
| A03 Software Supply Chain Failures | §15.10 |
| A04 Cryptographic Failures | §15.5 (HTTPS, cookies `Secure`), §15.9 (HSTS) |
| A05 Injection (XSS) | §15.3, §15.4 |
| A06 Insecure Design | §15.2 |
| A07 Authentication Failures | §15.5 |
| A08 Software or Data Integrity Failures | §15.10 (lockfile, SRI) |
| A09 Logging & Alerting Failures | §15.11 |
| A10 Mishandling of Exceptional Conditions | §15.8 (errores genéricos), §15.5 (401/403) |

### 15.14 Pedido de seguridad (auditoría completa red + blue + network)

§15.1–15.2 cubren **cada cambio**. Esta auditoría corre con todo pedido de auditoría a secas
("auditá", "auditá la app"), junto con la pasada de calidad de §11.9, y sola cuando el pedido es solo
de seguridad ("auditá la seguridad", "¿es segura la app?", "pentest", "hardening"). El alcance es **todo el código tocado o el que se indique**, no solo el
último diff. Para el equipo la seguridad es prioridad: se revisan **todas las áreas**, ninguna se
saltea en silencio, y la profundidad de cada una la decide el agente según lo que encuentra.

1. **Delimitar el alcance.** Sin alcance en el pedido, todo el repo, sin preguntar; si no, lo indicado: el diff actual, una feature, un
   módulo o todo el repo.
2. **Orientar con `grep -rl`** (`graphify query` solo sin nombre conocido) para ubicar entradas, interceptores, render de datos
   externos, auth, uploads, llamadas a terceros y límites de confianza. Una sola pasada alimenta a
   todas las herramientas. Alcance feature o repo: modelo de amenazas primero
   (`performing-threat-modeling-with-owasp-threat-dragon`) para ordenar qué se ataca. En una pregunta
   o un pedido de solo lectura, STRIDE inline (`security-and-hardening`; una línea por amenaza: dónde, control o hueco), sin Threat Dragon (genera archivos). Pregunta sobre una parte (por ejemplo, el manejo de errores): sin modelo de amenazas. Alcance sin superficie
   (sin entradas, HTTP ni auth): sin modelo de amenazas.
3. **Revisión base de todas las áreas.** Recorrer la tabla de abajo completa. Las áreas ausentes del
   alcance (sin uploads, sin WebSocket, sin SSR) se cierran juntas como N/A con un `grep` o `graphify query`
   `grep` que lo pruebe. Cada área termina en
   uno de tres estados: **OK** (con la evidencia, `archivo:línea`), **hallazgo** o **N/A** (con el
   motivo: "no hay uploads en el alcance"). Incluye la tabla de §15.2 (Red Team), las defensas de
   §15.3–15.11 (Blue Team), `npm audit --omit=dev` + `npm audit` y el feed Zero Wire (§15.10; en .NET,
   `dotnet list package --vulnerable`).
4. **Profundizar donde haga falta.** Por cada área, invocar su herramienta profunda (tabla) cuando se
   da **cualquiera** de estas condiciones:
   - la revisión base encontró un hallazgo o una señal dudosa;
   - el área es sensible: auth, tokens, pagos, datos personales, uploads, permisos por usuario;
   - el alcance es una feature completa o todo el repo (en solo lectura, solo las áreas sensibles o con hallazgo).

   Un área N/A no se profundiza. Solo sobre el código propio o entornos autorizados (§15.1).
5. **Auditoría general** (auditoría pedida de una feature o del repo; una pregunta como "¿es seguro X?"
   usa `security-audit` en modo guía, sin este paso): correr además la skill `security-audit`
   (Cloudflare), que busca lo que la tabla no anticipa y verifica cada hallazgo antes de reportarlo.
   El plugin `claude-security` (Anthropic, escaneo multiagente que gasta muchos tokens) solo con pedido explícito o si el usuario acepta su costo cuando se le ofrece en una línea; si no, se anota en la cobertura. En solo lectura, además, que acepte que escriba su reporte fuera del repo. En un diff chico no: alcanza con los pasos 3–4.
6. **Priorizar** por riesgo (crítico → bajo), mapeado a OWASP (§15.13). Una línea por hallazgo:
   archivo, línea, riesgo, fix propuesto. Triage de hallazgos dudosos o de scanners:
   `performing-web-application-vulnerability-triage`. Redacción: `offensive-reporting`.
7. **Corregir.** Si el pedido es una pregunta o de solo lectura ("¿es seguro?", "solo revisá"), se
   reporta con el fix propuesto, sin editar (§11.1). Si no, lo que está dentro del alcance se corrige; `high`/`critical` bloquean la entrega. Lo
   que queda fuera del alcance se reporta y se pregunta antes de tocarlo (§15.1). Nunca desactivar una
   protección para "arreglar".
8. **Reverificar.** Tras cada fix, build + prueba manual (§15.12). Documentar la lección en
   `tasks/lessons.md` (§11.8).
9. **Reporte de cobertura.** Además de los hallazgos, una tabla con cada área, su estado
   (OK / hallazgo / N/A) y la herramienta usada. Así se ve qué se revisó y qué no aplicaba.

| Área | Revisión base | Herramienta profunda |
| :--- | :--- | :--- |
| XSS y render de datos | §15.2, §15.3 | `offensive-xss`, `testing-for-xss-vulnerabilities` |
| Campos de texto (`<input>`, `<textarea>`, filtros, query y route params) | §15.3.1. Listar **cada** campo (`grep -rn -e '<textarea' -e '<input' --include='*.html'`, más los campos de texto de la librería de UI; sin contar `checkbox`, `radio`, `number`, `date` ni `file`) y ver en su schema `pattern()` o `maxLength()` + `sinCodigo()`. Texto de query o route params: `tieneCodigo()` antes de usarlo. El dato se muestra con interpolación y el backend valida lo mismo. Un campo sin validador es un hallazgo; si falta `shared/validators/sin-codigo.ts`, también (en forms reactivos, un `ValidatorFn` que llama a `tieneCodigo()`) | `offensive-xss`, `testing-for-xss-vulnerabilities` |
| Prototype pollution (merge/clone de JSON externo) | §15.2 | `exploiting-prototype-pollution-in-javascript` |
| CSP y Trusted Types | §15.4 | `security-audit` |
| Auth, tokens y JWT | §15.5 | `offensive-jwt`, `testing-for-json-web-token-vulnerabilities`, `implementing-jwt-signing-and-verification` |
| OAuth2 / OIDC | §15.5 | `offensive-oauth`, `configuring-oauth2-authorization-flow`, `performing-oauth-scope-minimization-review` |
| Autorización / IDOR | §15.2, §15.5 | `offensive-idor`, `offensive-business-logic` |
| CSRF / XSRF | §15.6 | `performing-csrf-attack-simulation` |
| CORS | §15.9 | `testing-cors-misconfiguration` |
| Redirects y navegación | §15.7 | `offensive-open-redirect` |
| Secretos y PII | §15.8 | `implementing-secret-scanning-with-gitleaks` |
| Cabeceras (IIS) | §15.9 | `performing-security-headers-audit`, `security-audit` |
| Clickjacking | §15.9 | `performing-clickjacking-attack-test` |
| Host header y cache | §15.9 | `testing-for-host-header-injection`, `performing-web-cache-poisoning-attack` |
| TLS y certificados (network) | §15.9 (HSTS, solo TLS 1.2/1.3, sin cifrados débiles, certificado válido y con renovación) | `performing-ssl-tls-security-assessment`, `configuring-tls-1-3-for-secure-communications`, `offensive-tls-attacks` |
| Superficie expuesta (network) | Qué responde el host además de la app: `*.map` en producción, `web.config` o directorios listables, puertos y sitios extra en IIS, ambientes de prueba públicos | `scanning-network-with-nmap-advanced`, `offensive-network-attacks` |
| Tiempo real (network) | §16: `wss://`, origen validado, token en la conexión | `testing-websocket-api-security`, `exploiting-websocket-vulnerabilities` |
| Salidas a terceros (network) | §15.4: CSP `connect-src` limitada a orígenes propios, terceros listados, SRI | `security-audit` |
| API (REST, GraphQL, WebSocket) | §15.2 | `offensive-api-security`, `testing-api-security-with-owasp-top-10`, `offensive-graphql` |
| Inyección en backend (SQL, SSRF, SSTI, XXE, deserialización) | §15.2 | `offensive-sqli`, `offensive-ssrf`, `offensive-ssti`, `offensive-xxe`, `offensive-deserialization` |
| Uploads | §15.2 | `offensive-file-upload` |
| Concurrencia y parámetros | §15.2 | `offensive-race-condition`, `offensive-parameter-pollution`, `offensive-request-smuggling` |
| SSR (solo si existe) | §15.4: `allowedHosts`, borde que rechaza `/.//`, `/.;/` y query de más de 2.048 bytes, `transferCache` y `Cache-Control` en HTML con datos del usuario, interceptores de servidor sin credenciales hacia URLs derivadas de input | `offensive-ssrf`, `offensive-open-redirect`, `performing-web-cache-poisoning-attack` |
| Dependencias y supply chain | §15.10, con el piso de versiones de `@angular/*` y de Node (`npm ls @angular/core @angular/common @angular/router @angular/compiler @angular/platform-server`, `node -v` en pipeline, Docker y servidor), cooldown, scripts aprobados y lockfile contra las campañas activas | `detecting-malicious-npm-packages`, `detecting-typosquatting-packages-in-npm-pypi`, `offensive-dependency-confusion`, `offensive-supply-chain`, `generating-and-analyzing-sboms` |
| Logging y respuesta (Blue Team) | §15.11 | `analyzing-web-server-logs-for-intrusion`, `security-audit` |

**Pruebas en vivo (network).** Escaneo de puertos, evaluación TLS y cabeceras contra un host real son
acciones hacia afuera. Solo contra hosts propios y autorizados. Es lo único que la auditoría
pregunta (el alcance no): host y ambiente, una sola vez y al empezar; producción solo con OK
explícito. Mientras no hay respuesta, se avanza con la revisión de
código. Sin URL disponible, revisar la
configuración (`web.config`, bindings de IIS) y marcar el área como "sin prueba en vivo" en la
cobertura.

**Eficiencia sin perder cobertura:** la revisión base de todas las áreas es obligatoria; lo que se
dosifica es la profundidad. No releer lo mismo para cada skill: pasarles los `archivo:línea` que ya
ubicó graphify. Delegar el barrido por área a subagentes en paralelo cuando cumple la regla de §14.3.4
(3+ archivos a leer, lo leído 3x o más que lo necesario);
la priorización, la corrección y la decisión final quedan en el modelo principal. Si falta una skill
de la tabla, instalar solo esa skill (`npx -y skills add <owner/repo> --global --yes --skill <nombre>`: las `offensive-*` vienen de `SnailSploit/claude-red`, las de AppSec de `mukul975/Anthropic-Cybersecurity-Skills`, `security-audit` de `cloudflare/security-audit-skill`) y avisar en una línea (solo lectura: solo avisar); si no se puede, hacer
esa área con la revisión base y decirlo en el reporte de cobertura.

---
