## 15. Seguridad — Red Team y Blue Team

### Índice

- 15.1 Regla general y modo de trabajo
- 15.2 Revisión Red Team de cada cambio (pensar como atacante)
- 15.3 XSS: sanitización de Angular, `innerHTML` y `DomSanitizer`
- 15.4 CSP y Trusted Types
- 15.5 Autenticación, tokens y autorización
- 15.6 CSRF / XSRF
- 15.7 Navegación, redirects y links externos
- 15.8 Datos sensibles y secretos en el front
- 15.9 Cabeceras de seguridad en IIS
- 15.10 Supply chain: dependencias y build
- 15.11 Blue Team: detección, logging y respuesta
- 15.12 Verificación manual de seguridad
- 15.13 Mapa OWASP Top 10 (2025)

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
| Entradas (forms, query params, route params, `input()`) | ¿Puedo meter HTML, script, URL o un valor fuera de rango y que llegue sin validar al DOM o al backend? |
| Renderizado | ¿Algún dato controlable termina en `[innerHTML]`, `bypassSecurityTrust*`, `nativeElement.innerHTML` o un atributo `href`/`src`? |
| URLs y navegación | ¿Puedo forzar un redirect a un dominio externo (`returnUrl`, `next`)? |
| Tokens y sesión | ¿El token viaja a un origen que no es la API propia? ¿Queda en `localStorage`? |
| Autorización | ¿Si cambio un `id` en la URL o en el body, veo datos de otro usuario? (verificar que el backend lo rechace) |
| Storage y logs | ¿Quedan PII, tokens o datos sensibles en `localStorage`, `console`, source maps o mensajes de error? |
| Mensajería | ¿Un `postMessage`, WebSocket o evento de terceros se procesa sin validar el origen y la forma? |
| Dependencias | ¿La librería nueva es mantenida, tiene vulnerabilidades conocidas o pide permisos de más? |
| Regex y parseo | ¿Una regex construida con texto del usuario permite inyección o ReDoS? |

Si alguna respuesta es "sí", corregir antes de entregar.

### 15.3 XSS: sanitización de Angular, `innerHTML` y `DomSanitizer`

Angular escapa la interpolación (`{{ }}`) y sanitiza `[innerHTML]`, `[href]`, `[src]` y `[style]`.
Esa protección se pierde cuando se esquiva el framework.

- **Siempre interpolación** para texto. `[innerHTML]` solo cuando hace falta marcado, y con datos
  ya escapados.
- **Nunca `bypassSecurityTrustHtml` / `Url` / `ResourceUrl` / `Script` / `Style` con datos del
  usuario o del backend.** Solo con constantes del propio código, con comentario que justifique.
- **Nunca** `ElementRef.nativeElement.innerHTML`, `document.write`, `insertAdjacentHTML`,
  `eval`, `new Function` ni `setTimeout('string')`. Usar `Renderer2` o el template.
- **Nunca construir templates en runtime** con texto del usuario (compilación JIT dinámica).
- Pipes que devuelven HTML (ej. resaltar búsqueda) **escapan primero** el texto y la búsqueda:

```ts
// shared/pipes/highlight-search.ts
const escaparHtml = (texto: string): string =>
  texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const escaparRegex = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Pipe({ name: 'highlightSearch' })
export class HighlightSearch implements PipeTransform {
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

- Si el servidor genera un nonce por request, pasarlo con `ngCspNonce` en el root o con el token
  `CSP_NONCE`. Así los `<style>` de los componentes cumplen la política.
- Cerrar los vectores que el meta tag no cubre desde cabeceras del servidor (§15.9):
  `frame-ancestors`, `object-src`, `base-uri`, `form-action`.
- **Trusted Types**: Angular es compatible. Activarlos en proyectos nuevos:
  `require-trusted-types-for 'script'; trusted-types angular angular#bundler;`
- Toda CSP nueva o endurecida se despliega primero como **`Content-Security-Policy-Report-Only`**,
  se revisan los reportes y después se pasa a modo bloqueo.
- **Nunca** `'unsafe-eval'`. `'unsafe-inline'` en `script-src` tampoco.

### 15.5 Autenticación, tokens y autorización

- **Preferir cookies de sesión `HttpOnly; Secure; SameSite=Strict|Lax`** emitidas por el backend
  (patrón BFF). JavaScript no puede leerlas, así que un XSS no las roba.
- Si se usa bearer token (OIDC/OAuth con PKCE), guardarlo **en memoria** (signal de un servicio),
  nunca en `localStorage`/`sessionStorage`. Refresh token solo en cookie `HttpOnly`.
- El `authInterceptor` agrega el header **solo** si la request va al origen de la API propia.
  Comparar orígenes con `URL`, nunca con `startsWith` (`https://api.x.com.evil.com` pasaría):

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthStore).accessToken();
  const apiOrigin = new URL(inject(ConfigService).apiUrl()).origin;
  const destino = new URL(req.url, location.origin).origin;

  if (!token || destino !== apiOrigin) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

- Guards (`canMatch`, `canActivate`) ocultan rutas; **no protegen datos**. Cada endpoint valida
  permisos en el backend. Preferir `canMatch` para no descargar el chunk de una ruta sin permiso.
- En logout: limpiar signals de sesión, stores con datos del usuario y cualquier storage propio.
- 401 → sesión vencida: redirigir a login. 403 → sin permiso: mostrar mensaje. Nunca reintentar
  automáticamente con otras credenciales.

### 15.6 CSRF / XSRF

- Con sesión por cookie, activar la protección de `HttpClient`. Adjunta el header solo en métodos
  que mutan y en URLs relativas o del mismo origen:

```ts
provideHttpClient(
  withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
  withInterceptors([...]),
);
```

- El backend .NET valida el token (antiforgery) y usa `SameSite` en la cookie de sesión.
- **Nunca** mutar estado con `GET`.

### 15.7 Navegación, redirects y links externos

- **Open redirect**: `returnUrl` / `next` se aceptan solo si son rutas internas.

```ts
const esRutaInterna = (url: string): boolean =>
  url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\');

const destino = esRutaInterna(returnUrl) ? returnUrl : '/inicio';
this._router.navigateByUrl(destino);
```

- **Nunca** `window.location.href = valorDelUsuario`.
- Links externos: `target="_blank" rel="noopener noreferrer"`.
- URLs dinámicas en `[href]`: validar esquema `https:` (o `mailto:`/`tel:` si aplica). Angular
  marca `javascript:` como `unsafe:`, pero no validar el dominio.
- `postMessage`: validar siempre `event.origin` contra una lista blanca y la forma del `data`.

### 15.8 Datos sensibles y secretos en el front

- **Todo lo que está en el bundle es público**: `environment.ts`, `config.json` (§10.4),
  constantes, source maps. **Nunca** claves de API privadas, connection strings ni secretos. Si una
  integración necesita secreto, pasa por el backend.
- Source maps desactivados en producción (`"sourceMap": false`, default) o subidos solo a la
  herramienta de monitoreo, nunca públicos.
- **Nunca** PII, tokens ni respuestas completas en `console.*`. El build de producción no debe
  dejar `console.log` de depuración.
- `localStorage` solo para preferencias no sensibles (tema, tamaño de página).
- Mensajes de error al usuario: genéricos. Nunca stack traces, SQL ni detalles internos del
  `ProblemDetails` (§10.3).
- Descargas: `URL.revokeObjectURL()` después de usar un blob. Nombres de archivo del backend
  sanitizados antes de usarlos.
- Uploads: validar tipo y tamaño en el front (UX) **y** en el backend (seguridad). Nunca renderizar
  un SVG subido por el usuario con `[innerHTML]`.

### 15.9 Cabeceras de seguridad en IIS

Sumar al `web.config` de §10.2, dentro de `<system.webServer>`:

```xml
<httpProtocol>
  <customHeaders>
    <remove name="X-Powered-By" />
    <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
    <add name="X-Content-Type-Options" value="nosniff" />
    <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
    <add name="Permissions-Policy" value="camera=(), microphone=(), geolocation=()" />
    <!-- script-src/style-src los define autoCsp (§15.4); acá solo lo que el meta tag no cubre -->
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

### 15.10 Supply chain: dependencias y build

- Instalar en CI con **`npm ci`** (respeta el `package-lock.json`). El lockfile siempre se commitea.
- **`npm audit --omit=dev`** en CI. Vulnerabilidad `high`/`critical` en dependencias de runtime
  bloquea el merge.
- Antes de sumar una dependencia: mantenimiento activo, descargas, licencia, vulnerabilidades
  conocidas y si la funcionalidad se resuelve con el framework. Menos dependencias, menos superficie.
- Mantener Angular al día con `ng update` (los parches de seguridad salen para las versiones con
  soporte).
- Scripts externos (CDN) solo con **Subresource Integrity** (`integrity` + `crossorigin`).
- Dependabot / Renovate activos en el repo.

### 15.11 Blue Team: detección, logging y respuesta

- El `errorInterceptor` (§5.3) reporta al backend los eventos de seguridad: 401 y 403 repetidos,
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
- Validador de `returnUrl`: `//evil.com`, `/\evil.com`, `https://evil.com` y `javascript:alert(1)`
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

---
