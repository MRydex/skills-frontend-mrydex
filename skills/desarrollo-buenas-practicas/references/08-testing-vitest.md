## 8. Testing — Vitest

Angular 22 usa **Vitest** por defecto (Karma quedó obsoleto).

- Archivos: `*.spec.ts` junto al archivo que prueban.
- **TestBed zoneless**: `await fixture.whenStable()` en lugar de `fixture.detectChanges()` cuando se
  prueban actualizaciones tras un cambio de signal o algo async.
- Con `OnPush` (que ahora es el default) y signals, **no** llamar a `markForCheck()` desde el test:
  cambiar el signal y esperar `whenStable()`.
- Mockear HTTP con `provideHttpClient()` + `provideHttpClientTesting()` y `HttpTestingController`.
- Para servicios con `httpResource` / `rxResource`, sirve el mismo `HttpTestingController` (usan
  `HttpClient` por debajo).
- Interceptores: probarlos con `provideHttpClient(withInterceptors([...]))` +
  `provideHttpClientTesting()`, verificando el efecto (que el contador de `SpinnerService` vuelva a
  0, que `ErrorNotifier.handle` se llamó con el status correcto).
- Signal Forms: setear `modelo.set(...)` o `form.campo().value.set(...)` y leer los signals de
  estado; no hace falta `fixture.detectChanges()` entre medio salvo para verificar el DOM.

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('Users', () => {
  let service: Users;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Users);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista usuarios', () => {
    // ...
  });
});
```

---
