## 8. Testing — Vitest

**Contenido:**
- [8.1 Vitest, el runner por defecto](#81-vitest-el-runner-por-defecto)
- [8.2 Qué testear y qué no](#82-qué-testear-y-qué-no)
- [8.3 Estructura de un test: AAA, naming y organización](#83-estructura-de-un-test-aaa-naming-y-organización)
- [8.4 TestBed zoneless: `whenStable()` en vez de `detectChanges()`](#84-testbed-zoneless-whenstable-en-vez-de-detectchanges)
- [8.5 Componentes con `input()` / `model()`](#85-componentes-con-input--model)
- [8.6 Componentes con `output()`](#86-componentes-con-output)
- [8.7 Signals y `computed()`](#87-signals-y-computed)
- [8.8 Servicios con `inject()`](#88-servicios-con-inject)
- [8.9 HTTP: `HttpTestingController` (`HttpClient`, `httpResource`, `rxResource`)](#89-http-httptestingcontroller-httpclient-httpresource-rxresource)
- [8.10 Interceptores funcionales](#810-interceptores-funcionales)
- [8.11 Signal Forms](#811-signal-forms)
- [8.12 Mocks, spies y timers falsos](#812-mocks-spies-y-timers-falsos)
- [8.13 Accesibilidad en tests: queries por rol](#813-accesibilidad-en-tests-queries-por-rol)
- [8.14 Errores comunes](#814-errores-comunes)

### 8.1 Vitest, el runner por defecto

Angular 22 genera proyectos nuevos con **Vitest + jsdom** vía el builder `@angular/build:unit-test`.
Karma y Jasmine-runner quedaron deprecados; `describe`/`it`/`expect` se mantienen (API compatible),
pero mocks y spies pasan a ser de Vitest (§8.12).

```json
// angular.json
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "tsConfig": "tsconfig.spec.json"
  }
}
```

- Correr los tests: `ng test` (watch mode). En CI: `ng test --no-watch --no-progress`.
- Migrar un proyecto que todavía está en Karma: `ng g @schematics/angular:refactor-jasmine-vitest`.
  El schematic convierte automáticamente `spyOn` → `vi.spyOn`, `jasmine.createSpy` → `vi.fn`,
  `jasmine.objectContaining`/`jasmine.any` → `expect.objectContaining`/`expect.any`,
  `fit`/`fdescribe` → `.only`, `xit`/`xdescribe` → `.skip`.

**Providers globales para todos los tests** (evita repetir `provideZonelessChangeDetection()` +
`provideHttpClientTesting()` en cada `beforeEach`): el builder acepta un `providersFile` que exporta
por default un array de providers.

```json
// angular.json
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "providersFile": "src/test-providers.ts"
  }
}
```

```ts
// src/test-providers.ts
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';

export default [provideZonelessChangeDetection(), provideHttpClientTesting()];
```

Con esto, un `TestBed.configureTestingModule({})` vacío ya alcanza para la mayoría de los tests; solo
se agregan providers puntuales (mocks, interceptores) por archivo.

### 8.2 Qué testear y qué no

**Sí testear:**

- Lógica de negocio: `computed()`, mappers puros, servicios, validaciones de Signal Forms.
- El contrato observable de un componente: qué renderiza según sus `input()`, qué `output()` emite
  ante una interacción del usuario.
- Interceptores: el efecto que producen (spinner, notificación de error), no su implementación.

**No testear:**

- Detalles de implementación privados (`private _signal`). Se testea a través de la **API pública**
  (el `readonly` expuesto o el efecto en el DOM), nunca leyendo el signal escribible interno.
- Que Angular "funciona" (que `@if` oculta un nodo, que `[disabled]` deshabilita un botón): eso lo
  garantiza el framework. Sí vale la pena testear la **condición propia** que decide ese `@if`.
- Estilos/SCSS.

Un test verifica **un** comportamiento. Si necesitás dos `expect` no relacionados para "terminar
antes", son dos tests.

### 8.3 Estructura de un test: AAA, naming y organización

- Archivo `x.spec.ts` **junto** al `x.ts` que prueba (sin carpeta `__tests__`, sin barrel files).
- `describe` = nombre de la clase bajo test. `it` = el comportamiento esperado, en tercera persona,
  no el nombre del método invocado.
- **Arrange-Act-Assert**, separado por líneas en blanco (sin comentarios `// arrange` salvo que la
  intención no sea obvia):

```ts
// ❌ MAL — nombre describe la implementación, no el comportamiento
it('llama a increment()', () => { ... });

// ✅ BIEN — describe el comportamiento observable
it('incrementa el contador en uno', () => {
  const comp = TestBed.createComponent(Counter).componentInstance;

  comp.increment();

  expect(comp.count()).toBe(1);
});
```

- Cada `it` corre solo: nada de estado compartido entre tests salvo el que arma `beforeEach`. Si un
  test depende del orden de ejecución, está mal escrito.

### 8.4 TestBed zoneless: `whenStable()` en vez de `detectChanges()`

Con **OnPush por defecto** y **zoneless**, `fixture.detectChanges()` fuerza un chequeo puntual, pero
no espera nada async (microtasks de un `resource`, un `Promise` pendiente). `fixture.whenStable()`
espera a que la aplicación llegue al mismo estado "estable" que en producción — es la forma
recomendada para verificar el DOM tras un cambio de signal o algo async.

```ts
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

describe('Counter', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()], // innecesario si ya está en providersFile (§8.1)
    });
  });

  it('renderiza el valor inicial', async () => {
    const fixture = TestBed.createComponent(Counter);

    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('0');
  });
});
```

- **Nunca** llamar `markForCheck()` desde un test: cambiar el signal y esperar `whenStable()`.
- **`fakeAsync`/`tick()` ya no se recomienda**: dependía del patch de Zone.js sobre `setTimeout`,
  que no existe en Vitest. Reemplazo: test `async` real + timers falsos de Vitest (§8.12), o
  directamente `await fixture.whenStable()` cuando alcanza con esperar la estabilidad.

### 8.5 Componentes con `input()` / `model()`

```ts
it('muestra el nombre recibido por input', async () => {
  const fixture = TestBed.createComponent(UserCard);
  fixture.componentRef.setInput('user', { id: 1, name: 'Ada' });

  await fixture.whenStable();

  const nombre = fixture.nativeElement.querySelector('.user-card__name');
  expect(nombre.textContent).toContain('Ada');
});
```

- `fixture.componentRef.setInput()` es la **única** forma soportada de simular "el padre me pasó este
  input": asignar `component.user = ...` directamente no dispara la reactividad de `input()` (es de
  solo lectura desde afuera del framework) y puede hacer que el test pase sin validar nada real.
- **Inputs `required()`**: setearlos **antes** del primer `whenStable()`/`detectChanges()` — si el
  componente intenta leer un input requerido sin valor, tira error.
- `model()` (two-way binding): el valor inicial se setea igual con `setInput()`; para comprobar la
  escritura hacia afuera se lo trata como un `output()` (§8.6), ya que `model()` expone también un
  evento de cambio.

### 8.6 Componentes con `output()`

```ts
it('emite el usuario seleccionado al hacer click', async () => {
  const fixture = TestBed.createComponent(UserCard);
  fixture.componentRef.setInput('user', mockUser);
  await fixture.whenStable();

  let emitido: User | undefined;
  fixture.componentInstance.userSelected.subscribe((user) => (emitido = user));

  fixture.nativeElement.querySelector('.user-card').click();
  await fixture.whenStable();

  expect(emitido).toEqual(mockUser);
});
```

- `output()` devuelve un `OutputEmitterRef`, que expone `.subscribe()` igual que un `EventEmitter`
  clásico: sirve para capturar la emisión sin pasar por el DOM.
- Preferir disparar el **evento real** (`.click()`, `dispatchEvent(new Event('input'))`) antes que
  invocar el handler `onXxx()` a mano: así el test valida también el binding del template, no solo el
  método.

### 8.7 Signals y `computed()`

No se testea el `private _signal` interno: se testea a través de la API pública (el método mutador +
el `readonly` expuesto) y el efecto observable.

```ts
it('duplica el valor', () => {
  const comp = TestBed.createComponent(Counter).componentInstance;

  comp.increment(); // API pública, no comp['_count'].set(...)

  expect(comp.double()).toBe(2); // computed derivado
});
```

Un `computed()` se recalcula de forma **sincrónica** al leerlo — no hace falta `whenStable()` para
que tenga el valor correcto. `whenStable()` hace falta cuando además se verifica que el **DOM** ya
refleja ese cambio (el binding del template todavía no corrió).

### 8.8 Servicios con `inject()`

```ts
describe('Users', () => {
  let service: Users;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Users);
  });

  it('no tiene usuario seleccionado al arrancar', () => {
    expect(service.selectedUser.hasValue()).toBe(false);
  });
});
```

- Igual que en producción, en los tests **nunca se instancia un servicio con `new`** (perdería sus
  dependencias inyectadas): siempre `TestBed.inject(Servicio)`.
- Para reemplazar una dependencia real por un mock: `providers: [{ provide: Real, useValue: mock }]`
  (o `useClass` / `useFactory`).

### 8.9 HTTP: `HttpTestingController` (`HttpClient`, `httpResource`, `rxResource`)

```ts
import { TestBed } from '@angular/core/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('Users', () => {
  let service: Users;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Users);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify()); // falla el test si quedó un request sin resolver

  it('carga el usuario seleccionado', async () => {
    service.select(1);

    const req = httpMock.expectOne(`${environment.API_URL}users/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);

    // Sin fixture (test de servicio "pelado"): esperar la estabilidad de la app en vez de fixture.whenStable().
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.selectedUser.value()).toEqual(mockUser);
  });
});
```

- `httpResource` / `rxResource` usan `HttpClient` por debajo (ver
  [04-resource-api.md](./04-resource-api.md) §4.1): el mismo `HttpTestingController` los intercepta,
  no hace falta nada especial para mockearlos.
- **Sin `ComponentFixture`** (test de un servicio, no de un componente), usar
  `await TestBed.inject(ApplicationRef).whenStable()` en vez de `fixture.whenStable()` para esperar a
  que el resource termine de resolver tras el `flush()`.
- `httpMock.verify()` en `afterEach` es obligatorio: sin esa línea, un request al que nadie le
  contestó pasa desapercibido y el test queda "verde" sin haber probado nada.
- Errores: `req.flush(mensaje, { status: 404, statusText: 'Not Found' })` simula un error HTTP;
  `req.error(new ProgressEvent('network error'))` simula una falla de red.
- Múltiples requests iguales: `httpMock.match(url)` en vez de `expectOne()`.

### 8.10 Interceptores funcionales

Se testea el **efecto** del interceptor (contador de `SpinnerService`, `ErrorNotifier.handle` llamado
con el status correcto — ver [05-http-interceptors.md](./05-http-interceptors.md) §5.1), nunca su
implementación interna.

```ts
it('prende y apaga el spinner alrededor de una petición', async () => {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([spinnerInterceptor])),
      provideHttpClientTesting(),
    ],
  });

  const spinner = TestBed.inject(SpinnerService);
  const http = TestBed.inject(HttpClient);
  const httpMock = TestBed.inject(HttpTestingController);

  http.get('/api/juicios').subscribe();
  expect(spinner.isVisible()).toBe(true);

  httpMock.expectOne('/api/juicios').flush([]);
  await TestBed.inject(ApplicationRef).whenStable();

  expect(spinner.isVisible()).toBe(false); // el contador volvió a 0
});

it('el interceptor de errores delega el status 404 en ErrorNotifier', () => {
  const notifier = TestBed.inject(ErrorNotifier);
  const spy = vi.spyOn(notifier, 'handle');

  TestBed.inject(HttpClient).get('/api/juicios/99').subscribe({ error: () => {} });
  TestBed.inject(HttpTestingController)
    .expectOne('/api/juicios/99')
    .flush('No encontrado', { status: 404, statusText: 'Not Found' });

  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
});
```

### 8.11 Signal Forms

Signal Forms necesita un **contexto de inyección** para llamar a `form()`: fuera de un componente hay
que pasarlo explícitamente (`injector:`) o envolver la llamada en `TestBed.runInInjectionContext()`.
Llamar `form()` sin ninguno de los dos **lanza** en tiempo de ejecución.

```ts
import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, required } from '@angular/forms/signals';

it('marca nombre como inválido si está vacío', () => {
  const modelo = signal({ nombre: '' });

  const miForm = form(modelo, (path) => required(path.nombre, { message: 'Obligatorio' }), {
    injector: TestBed.inject(Injector),
  });

  expect(miForm.nombre().invalid()).toBe(true);
  expect(miForm.nombre().errors()[0].message).toBe('Obligatorio');
});
```

- **La mayoría de los Signal Forms se testean así, sin renderizar ningún componente**: toda la lógica
  vive en el schema (`required`, `minLength`, `disabled`, validaciones cruzadas), no en el template.
  Es más rápido y no depende del DOM ni de `whenStable()`.
- Testear a través del DOM (`[formField]`, interacción real del usuario) solo cuando el comportamiento
  depende del **control concreto**:

```ts
it('actualiza el modelo cuando el usuario escribe', async () => {
  const fixture = TestBed.createComponent(Registro);
  await fixture.whenStable();

  const input: HTMLInputElement = fixture.nativeElement.querySelector('#nombre');
  input.value = 'Ada';
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();

  expect(fixture.componentInstance.registroForm.nombre().value()).toBe('Ada');
});
```

- Estado a verificar en el `FieldState`: `valid()`, `invalid()`, `disabled()`, `readonly()`,
  `hidden()`, `pending()`, `errors()` (ver [06-signal-forms.md](./06-signal-forms.md) §6.1). No hace
  falta `fixture.detectChanges()` entre medio salvo para comprobar el DOM.

### 8.12 Mocks, spies y timers falsos

- `vi.fn()` reemplaza a `jasmine.createSpy()`: mock standalone.

```ts
const onGuardar = vi.fn();
component.onSubmitFormulario = onGuardar;
```

- `vi.spyOn(objeto, 'metodo')` reemplaza a `spyOn()`: espía o reemplaza un método de un objeto real
  (típicamente un servicio inyectado).

```ts
const spy = vi.spyOn(errorNotifier, 'handle');
expect(spy).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
```

- **Timers falsos**: `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(ms)` /
  `await vi.runAllTimersAsync()`, y `vi.useRealTimers()` en `afterEach` (si queda activo, contamina
  los tests siguientes). Reemplaza a `fakeAsync`/`tick()`.

```ts
afterEach(() => vi.useRealTimers());

it('debounce la búsqueda 300ms', async () => {
  vi.useFakeTimers();
  const comp = TestBed.createComponent(Buscador).componentInstance;

  comp.buscar('angular');
  await vi.advanceTimersByTimeAsync(300);

  expect(comp.resultados.isLoading()).toBe(true);
});
```

- `expect.objectContaining(...)` / `expect.any(...)` reemplazan a `jasmine.objectContaining` /
  `jasmine.any`.

### 8.13 Accesibilidad en tests: queries por rol

Seleccionar por clase CSS (`.btn-primary`) no dice nada sobre si el elemento es accesible. Consultar
por **rol** o atributo ARIA fuerza a que el markup real tenga la semántica que un lector de pantalla
necesita, y el test se rompe si alguien la borra sin querer — a diferencia de una clase, que puede
cambiar libremente sin afectar accesibilidad.

```ts
// ❌ MAL — no verifica nada de accesibilidad, se acopla al nombre de la clase
const btn = fixture.nativeElement.querySelector('.registro__form-submit');

// ✅ BIEN — verifica que el control es un <button> real y su estado accesible
const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
expect(btn.disabled).toBe(true);

// ✅ BIEN — el mensaje de error usa role="alert" para el lector de pantalla
const alerta = fixture.nativeElement.querySelector('[role="alert"]');
expect(alerta?.textContent).toContain('El nombre es obligatorio');
```

Angular no incluye "queries por rol" (`getByRole`) de fábrica: alcanza con `querySelector` sobre
`[role="..."]` / `[aria-label="..."]` / el elemento semántico esperado (`button`, `nav`, `dialog`).
No hace falta sumar una librería extra para esto.

### 8.14 Errores comunes

- Esperar que `fixture.detectChanges()` "refresque" el DOM tras cambiar un signal fuera del template:
  en zoneless conviene usar siempre `whenStable()` (§8.4), no alternar entre las dos APIs.
- Olvidar `httpMock.verify()`: un request sin responder queda colgado y el test no lo detecta.
- Setear un input `required()` **después** del primer render: el componente tira error al intentar
  leerlo sin valor (§8.5).
- Usar `spyOn`/`jasmine.*` en un proyecto ya migrado a Vitest: no existe el global `jasmine` salvo que
  se instale explícitamente el paquete de compatibilidad.
- Dejar `vi.useFakeTimers()` activo entre tests: siempre `vi.useRealTimers()` en `afterEach`.
- Llamar `form()` en un test sin contexto de inyección (§8.11): lanza en tiempo de ejecución, no en
  tiempo de compilación — el error solo aparece al correr el test.
- Testear el `private _signal` interno de un servicio en vez de su `readonly` expuesto: acopla el test
  a un detalle de implementación que puede cambiar de nombre sin que cambie el comportamiento.

---
