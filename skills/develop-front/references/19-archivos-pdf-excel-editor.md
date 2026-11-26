## 19. Archivos, PDF, Excel/CSV y editor de texto enriquecido

### Índice

- 19.1 Cuándo aplica
- 19.2 Descargas con `HttpClient`
- 19.3 Subidas: `<input type="file">`, `FormData` y progreso
- 19.4 CSV y Excel
- 19.5 CSV / formula injection
- 19.6 Visor de PDF
- 19.7 Editor de texto enriquecido (TipTap v3)

Ejemplos genéricos: `https://api.example.com`, `mi-app`.

---

### 19.1 Cuándo aplica

**Aplica solo cuando** la pantalla necesita descargar, subir, exportar o visualizar archivos, o el
proyecto **ya tiene** la dependencia (`exceljs`, `pdfjs-dist`, `@tiptap/*`) o el usuario la pide.

**Preferí la plataforma antes que una librería**: `Blob`, `URL.createObjectURL`, `FormData`, CSV a
mano, `<iframe>` para PDF. **Si el proyecto no usa la librería, no la agregues** sin que el usuario
lo pida; evaluá la dependencia como cualquier otra (§15.10) y el costo en bundle ([09](./09-performance-zoneless.md)).

### 19.2 Descargas con `HttpClient`

`file-saver` no hace falta: alcanza con `Blob` + un `<a download>` temporal.

```ts
// shared/services/file-download.ts
@Service()
export class FileDownload {
  private readonly _http = inject(HttpClient);

  private readonly _suscripciones = new Map<string, Subscription>();
  private readonly _enCurso = signal<ReadonlySet<string>>(new Set()); // para deshabilitar el botón
  readonly descargando = this._enCurso.asReadonly();

  download(url: string, fallbackName: string): void {
    if (this._suscripciones.has(url)) return; // doble clic: dos descargas del mismo archivo
    this._marcar(url, true);
    const sub = this._http
      .get(url, { responseType: 'blob', observe: 'response' })
      .pipe(finalize(() => this._marcar(url, false))) // éxito, error y cancelación
      .subscribe((res) => {
        const blob = res.body;
        if (!blob) return;
        const name = this._fileName(res.headers.get('Content-Disposition')) ?? fallbackName;
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(href));   // liberar el Blob; diferido para no cortar la descarga
      });
    this._suscripciones.set(url, sub);
  }

  /** Corta una descarga en curso (el navegador aborta el request). */
  cancelar(url: string): void {
    this._suscripciones.get(url)?.unsubscribe();
  }

  private _marcar(url: string, activa: boolean): void {
    if (!activa) this._suscripciones.delete(url);
    this._enCurso.update((urls) => {
      const siguiente = new Set(urls);
      if (activa) siguiente.add(url);
      else siguiente.delete(url);
      return siguiente;
    });
  }

  private _fileName(header: string | null): string | null {
    if (!header) return null;
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (utf8) return decodeURIComponent(utf8[1]);
    return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? null;
  }
}
```

- El `.subscribe()` manual es una **excepción acotada**: la descarga disparada por un click es una
  acción puntual, como una mutación (§2.9, §4.1). Se guarda la `Subscription` solo para **cancelar** y
  para ignorar el segundo clic; el botón lleva `[disabled]="descarga.descargando().has(url)"` y, si la
  descarga es lenta, un "Cancelar" que llama a `cancelar(url)`. Si falla, el error llega al
  `errorInterceptor` y el `finalize` libera el botón.
- `observe: 'response'` es lo que permite leer `Content-Disposition`. Para que el navegador deje leerlo
  en una request cross-origin, **el backend debe exponerlo**: `Access-Control-Expose-Headers:
  Content-Disposition` (en .NET, `WithExposedHeaders("Content-Disposition")` en la política CORS). Sin
  eso `headers.get(...)` devuelve `null` y se usa `fallbackName`.
- El nombre que viene del servidor es dato externo: usarlo solo en `a.download` (el navegador lo
  sanea); nunca en `innerHTML` ni concatenado en una URL (§15.3).
- Errores: con `responseType: 'blob'`, el cuerpo de un error llega como `Blob`, no JSON. Si el
  `errorInterceptor` ([05](./05-http-interceptors.md) §5.3) muestra el mensaje del backend, leerlo con
  `await error.error.text()` antes de parsear.
- Descarga **abierta en pestaña nueva** (ver un PDF): `window.open(href, '_blank', 'noopener')` con la
  misma URL de `createObjectURL`, y revocarla recién al cerrar la vista, no inmediatamente.

### 19.3 Subidas: `<input type="file">`, `FormData` y progreso

```html
<label for="adjunto">Adjunto (PDF, máx. 5 MB)</label>
<input id="adjunto" type="file" accept="application/pdf" (change)="onFileSelected($event)" />
@if (fileError()) {
  <p class="upload__error" role="alert">{{ fileError() }}</p>
}
```

```ts
protected readonly fileError = signal<string | null>(null);
private readonly _maxBytes = 5 * 1024 * 1024;
protected readonly subidas = inject(Subidas);

protected onFileSelected(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.item(0);
  if (!file) return;
  if (file.type !== 'application/pdf' || file.size > this._maxBytes) {
    this.fileError.set('El archivo debe ser un PDF de hasta 5 MB.');
    return;
  }
  this.fileError.set(null);
  this.subidas.encolar(file);
}
```

- `<input type="file">` **nativo** y con `<label for>`: es accesible por teclado y lector de pantalla
  ([12](./12-html5-semantics-seo.md)). Si se oculta para usar un botón propio, el botón dispara
  `input.click()` y conserva el nombre accesible. Zona de drag & drop: siempre con alternativa por
  teclado (el mismo input).
- La validación de tipo y tamaño en el cliente es **solo UX** (`file.type` lo declara el navegador, no
  garantiza el contenido). **El backend valida** extensión, tipo real, tamaño y contenido, y renombra el
  archivo (§15.1). Nunca asumir que lo que llegó es seguro.
- Con `FormData`, **no** setear `Content-Type`: el navegador agrega el `boundary`. Los interceptores que
  tocan el body deben saltar `FormData` ([05](./05-http-interceptors.md) §5.10).
- **Progreso de subida**: `reportProgress: true` + `observe: 'events'`. Requiere `withXhr()` porque
  `fetch` no emite progreso de subida (§5.9; si el proyecto no lo tiene, no lo agregues solo por esto
  sin avisar):

```ts
// shared/services/subidas.ts — una cola con tope; cada archivo tiene su propio progreso
type EstadoSubida = 'en-cola' | 'subiendo' | 'listo' | 'error' | 'cancelada';
interface Subida { id: number; nombre: string; progreso: number; estado: EstadoSubida }

const SUBIDAS_EN_PARALELO = 3; // HTTP/1.1 limita ~6 conexiones por origen: no ocuparlas todas
// Sin overlay global (tapa la barra de progreso) y el error se muestra por archivo, no en un modal por cada uno (§5.4)
const CONTEXTO = new HttpContext().set(SKIP_SPINNER, true).set(SKIP_ERROR_HANDLER, true);

@Service()
export class Subidas {
  private readonly _http = inject(HttpClient);
  private readonly _subidas = signal<Subida[]>([]);
  readonly subidas = this._subidas.asReadonly();
  private readonly _activas = new Map<number, Subscription>();
  private _pendientes: { id: number; file: File }[] = [];
  private _siguienteId = 0;

  encolar(file: File): void {
    const id = ++this._siguienteId;
    this._subidas.update((lista) => [...lista, { id, nombre: file.name, progreso: 0, estado: 'en-cola' }]);
    this._pendientes.push({ id, file });
    this._avanzar();
  }

  /** En cola: sale de la cola. En curso: el navegador aborta el request (el backend descarta lo incompleto). */
  cancelar(id: number): void {
    this._pendientes = this._pendientes.filter((p) => p.id !== id);
    this._cambiar(id, { estado: 'cancelada' });
    this._activas.get(id)?.unsubscribe();
  }

  private _avanzar(): void {
    while (this._activas.size < SUBIDAS_EN_PARALELO && this._pendientes.length > 0) {
      const { id, file } = this._pendientes.shift()!;
      const body = new FormData();
      body.append('file', file, file.name);
      this._cambiar(id, { estado: 'subiendo' });
      const sub = this._http
        .post(`${environment.API_URL}adjuntos`, body, { reportProgress: true, observe: 'events', context: CONTEXTO })
        .pipe(finalize(() => { this._activas.delete(id); this._avanzar(); })) // libera el cupo siempre
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              this._cambiar(id, { progreso: Math.round((100 * event.loaded) / event.total) });
            } else if (event.type === HttpEventType.Response) {
              this._cambiar(id, { progreso: 100, estado: 'listo' });
            }
          },
          error: () => this._cambiar(id, { estado: 'error' }),
        });
      this._activas.set(id, sub);
    }
  }

  private _cambiar(id: number, cambios: Partial<Subida>): void {
    this._subidas.update((lista) => lista.map((s) => (s.id === id ? { ...s, ...cambios } : s)));
  }
}
```

```html
@for (subida of subidas.subidas(); track subida.id) {
  <li>
    {{ subida.nombre }}
    <progress [value]="subida.progreso" max="100" [attr.aria-label]="'Progreso de ' + subida.nombre"></progress>
    @if (subida.estado === 'error') {
      <span role="alert">No se pudo subir {{ subida.nombre }}.</span>
    }
    @if (subida.estado === 'en-cola' || subida.estado === 'subiendo') {
      <button type="button" (click)="subidas.cancelar(subida.id)">Cancelar</button>
    }
  </li>
}
```

- Un `progress` **por archivo**: uno compartido se pisa con dos subidas a la vez. Con `multiple` en el
  input, un `encolar` por archivo.
- La cola limita las subidas en paralelo; el resto espera `en-cola`. `cancelar` sirve en cola y en curso,
  y el `finalize` libera el cupo también al fallar o cancelar. Una subida cancelada o fallida no se reintenta
  sola: el usuario la vuelve a elegir.

### 19.4 CSV y Excel

| Necesidad | Solución |
| :--- | :--- |
| Tabla simple, sin formato | **CSV** a mano + descarga con `Blob` (`text/csv;charset=utf-8`, con BOM `﻿` si abre en Excel; separador `;` si la app es en español, porque Excel con ese locale no separa por `,`; celdas que empiezan con `=`, `+`, `-` o `@` llevan `'` adelante). Pidieron "Excel" y el proyecto no tiene `exceljs`: CSV, avisándolo como supuesto |
| Formato, varias hojas, estilos | `exceljs`, **solo** si el proyecto ya lo usa o el usuario lo pide |
| Muchos datos (decenas de miles de filas) | **Generarlo en el backend** y descargarlo (§19.2) |

`exceljs` pesa cientos de KB: **nunca** import estático. Se carga con import dinámico dentro del
handler del click, así queda fuera del bundle inicial y se baja solo cuando se exporta:

```ts
protected async onExport(): Promise<void> {
  const { Workbook } = await import('exceljs');
  const wb = new Workbook();
  const ws = wb.addWorksheet('Pedidos');
  ws.columns = [{ header: 'Número', key: 'id' }, { header: 'Cliente', key: 'cliente' }];
  this.rows().forEach((r) => ws.addRow({ id: r.id, cliente: r.cliente }));

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  // descargar como en §19.2 (createObjectURL + <a download> + revoke)
}
```

- Exportar lo que el usuario **ya ve** (filtros aplicados) y el tamaño que el navegador aguanta; si el
  dataset es grande, backend. Un export de 100 000 filas en el hilo principal congela la pestaña.
- Leer un Excel subido por el usuario es parsear un archivo no confiable: preferí que lo procese el
  backend; en el cliente, solo para previsualizar y con límite de tamaño (§19.3).

### 19.5 CSV / formula injection

Una celda que empieza con `=`, `+`, `-` o `@` (o con TAB / CR) la interpreta Excel como **fórmula**: un
dato del usuario como `=HYPERLINK(...)` se ejecuta al abrir el export. Todo valor de texto que va a un
CSV se sanea (en Excel con `exceljs`, un string se escribe como texto, no como fórmula: **no se
sanea**, el apóstrofe corrompería el dato; solo sanear en XLSX si se escribe `{ formula }` con datos del usuario):

```ts
// shared/utils/sanitize-cell.ts
const FORMULA_START = /^[=+\-@\t\r]/;

export function sanitizeCell(value: string): string {
  return FORMULA_START.test(value) ? `'${value}` : value;   // apóstrofe fuerza texto
}
```

- En CSV, además, escapar comillas (`"` → `""`) y encerrar el campo entre comillas si tiene coma,
  salto de línea o comilla.
- Números reales (`typeof === 'number'`) no se prefijan: el `-` de un negativo es válido.
- Mismo criterio si el export lo genera el backend: pedírselo (skill `develop-back`).

### 19.6 Visor de PDF

**Si solo hay que mostrar el PDF**, probá primero la plataforma: un `<iframe>` (o `<object>`) con una
URL de Blob alcanza, sin dependencias. Para sanearla, `DomSanitizer` solo para URLs `blob:` creadas por
la propia app (nunca una URL externa):

```html
<iframe [src]="pdfUrl()" title="Vista previa del documento" class="visor__frame"></iframe>
```

Con la CSP de §15.4, un `<iframe>` con URL `blob:` necesita `frame-src 'self' blob:` (solo si se usa este visor).

`pdfjs-dist` solo si hace falta control (paginado propio, zoom, búsqueda, resaltado) o el proyecto ya
lo usa. Reglas:

- **Versión**: `pdfjs-dist` **>= 4.2.67** (CVE-2024-4367, ejecución de JS vía fuentes) y, desde 5.6.83,
  **>= 6.2.108** (GHSA-hq66-cqwq-w95j, ejecución de JS al abrir un PDF malicioso). Hasta 5.6.x, siempre
  `getDocument({ data, isEvalSupported: false })`; desde 5.7 la opción ya no está en el build y se quita.
  Si el proyecto tiene una versión menor, reportarlo (§15.10).
- **Worker**: PDF.js corre en un Web Worker. Copiar el archivo con un `assets` glob de `angular.json`
  y apuntar `workerSrc` a esa ruta (nada de CDN de terceros: viola la CSP, §15.4):

```json
// angular.json → architect.build.options.assets
{ "glob": "pdf.worker.min.mjs", "input": "node_modules/pdfjs-dist/build", "output": "/assets/pdfjs" }
```

```ts
const pdfjs = await import('pdfjs-dist');
pdfjs.GlobalWorkerOptions.workerSrc = 'assets/pdfjs/pdf.worker.min.mjs';   // relativa: anda bajo IIS (§10.2)
```

- Verificá el nombre real del archivo del worker en `node_modules/pdfjs-dist/build/` de la versión
  instalada; cambia entre majors.
- **Lazy**: el import es dinámico y el componente del visor va en `@defer` ([03](./03-html-templates.md))
  o en una ruta lazy: PDF.js no entra al bundle inicial.
- **Liberar recursos**: destruir el documento al salir, con `DestroyRef`:

```ts
private readonly _destroyRef = inject(DestroyRef);

private async _open(data: ArrayBuffer): Promise<void> {
  const pdfjs = await import('pdfjs-dist');
  const task = pdfjs.getDocument({ data, isEvalSupported: false });
  this._destroyRef.onDestroy(() => task.destroy());   // cancela carga y libera el worker
  const doc = await task.promise;
  // render de páginas en <canvas> ...
}
```

- Un PDF de un tercero o subido por un usuario es contenido no confiable: no habilitar scripting
  del PDF ni abrirlo con la sesión del usuario en otro origen sin necesidad.

### 19.7 Editor de texto enriquecido (TipTap v3)

**Aplica solo** si el proyecto ya usa TipTap (`@tiptap/*`) o el usuario lo pide. Si no, un `<textarea>`
alcanza; no agregues un editor por un campo de observaciones.

**Versión**: `@tiptap/*` **>= 3.30.5**, todos los paquetes en el mismo número (GHSA-cp6q-959q-f8rh,
`mergeAttributes()` con `__proto__`; GHSA-j95f-988m-3j2f, ReDoS al parsear atributos de Markdown).

- Crear el editor en **`afterNextRender`** (necesita el DOM) y destruirlo con **`DestroyRef`**. Nunca
  en el constructor ni en `ngOnInit`.
- Integrarlo a Signal Forms como **control propio** `FormValueControl<string>` ([06](./06-signal-forms.md)
  §6.9): el valor es el HTML (o JSON) del documento.

```ts
@Component({
  selector: 'app-rich-text',
  template: `<div #host class="rich-text"></div>`,
})
export class RichText implements FormValueControl<string> {
  readonly value = model<string>('');
  private readonly _host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly _destroyRef = inject(DestroyRef);
  private _editor?: Editor;

  constructor() {
    this._crearEditor();
    this._sincronizarModeloAlEditor();
  }

  private _crearEditor(): void {
    afterNextRender(() => {
      this._editor = new Editor({
        element: this._host().nativeElement,
        extensions: [StarterKit],
        content: this.value(),
        onUpdate: ({ editor }) => this.value.set(editor.getHTML()),
      });
      this._destroyRef.onDestroy(() => this._editor?.destroy());
    });
  }

  // modelo → editor (reset del form): sincronización con el DOM, no con effect() (§2.7)
  private _sincronizarModeloAlEditor(): void {
    afterRenderEffect(() => {
      const next = this.value();
      if (this._editor && next !== this._editor.getHTML()) {
        this._editor.commands.setContent(next, { emitUpdate: false });
      }
    });
  }
}
```

- Verificá las opciones exactas de `setContent` / `Editor` en la versión instalada
  (`node_modules/@tiptap/core` o la doc del paquete): cambiaron entre v2 y v3.
- **El HTML del editor es no confiable**: el usuario (o un script malicioso) puede meter lo que quiera.
  **Nunca `bypassSecurityTrustHtml`** para mostrarlo. Renderizar con `[innerHTML]` (Angular lo sanea) y,
  sobre todo, **el backend sanea** el HTML antes de guardarlo (lista blanca de etiquetas y atributos).
  Ver [15](./15-security.md) §15.3.
- Ofrecer solo las extensiones que el negocio necesita (no pegar imágenes ni HTML arbitrario si no hace
  falta) y botones de la barra con `aria-label` y `aria-pressed`.
