## 6. Formularios — solo Signal Forms

Índice: [6.1](#61-modelo-mental) Modelo mental · [6.2](#62-patrón-estándar) Patrón estándar ·
[6.3](#63-reglas-del-equipo-para-signal-forms) Reglas del equipo ·
[6.4](#64-formularios-anidados-y-arrays-apply--applyeach) Anidados y arrays (`apply`/`applyEach`) ·
[6.5](#65-validación-cruzada-entre-campos-validatetree) Validación cruzada (`validateTree`) ·
[6.6](#66-validación-asíncrona-validateasync--validatehttp) Validación asíncrona ·
[6.7](#67-errores-accesibles-en-el-template) Errores accesibles · [6.8](#68-reset-y-estado-imperativo) Reset y estado imperativo ·
[6.9](#69-controles-propios-e-integración-con-ng-zorro) Controles propios / NG-ZORRO ·
[6.10](#610-testing-básico-de-signal-forms) Testing básico

> **Regla del equipo: todos los formularios se hacen con Signal Forms
> (`@angular/forms/signals`).** Nada de Reactive Forms (`FormGroup` / `FormControl` /
> `FormBuilder`), nada de template-driven (`ngModel`), nada de `valueChanges` /
> `statusChanges`. Signal Forms es **estable desde Angular 22** y es el stack de formularios oficial
> del equipo.

Los formularios existentes en Reactive Forms se pueden dejar como están, pero **todo formulario nuevo
o refactorizado va en Signal Forms**. Si hay que convivir con controles legacy (un `FormGroup` que no
se puede migrar de una), hay un puente en `@angular/forms/signals/compat`: `compatForm` /
`SignalFormControl` permiten definir las reglas con validadores de Signal Forms (`required`,
`minLength`, etc.) y seguir conectando el control a un `FormGroup`/`FormArray` clásico. Es para
migración incremental (control por control); el objetivo es no necesitarlo en código nuevo.

### 6.1 Modelo mental

1. El **modelo** es un `signal` con la forma de los datos → es la única fuente de verdad.
2. `form(modelo, schema?, options?)` devuelve un **`FieldTree`**: una estructura de signals que
   espeja el modelo. `form` no copia el modelo: lee y escribe directamente sobre el signal que le
   pasás.
3. Cada campo, invocado como función (`miForm.email()`), devuelve su **`FieldState`**: `value`
   (`WritableSignal`), `controlValue` (el valor crudo del control, sin debounce — ver nota abajo),
   `valid()`, `invalid()`, `pending()`, `touched()`, `dirty()`, `disabled()`, `hidden()`,
   `readonly()`, `required()`, `errors()`, `errorSummary()`, y también `min()`/`max()`/`minLength()`/
   `maxLength()`/`pattern()` (las restricciones activas, útiles para bindear atributos nativos o de
   NG-ZORRO — ver §6.9).
4. En el template se ata con **`[formField]`** (y el `<form>` con **`[formRoot]`**).

> **`value` vs. `controlValue`**: `value` es el que sincroniza con el modelo y puede llegar
> debounceado (`debounce(path.campo, ms)` en el schema); `controlValue` refleja el valor crudo tal
> cual lo tipeó el usuario, sin esperar el debounce. Usar `controlValue` para feedback instantáneo en
> UI (ej. contador de caracteres) y `value`/el modelo para todo lo demás.

### 6.2 Patrón estándar

```ts
import { Component, signal } from '@angular/core';
import { form, FormField, FormRoot, email, required, minLength } from '@angular/forms/signals';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
  imports: [FormRoot, FormField],
})
export class Registro {
  private readonly _usuariosHttp = inject(UsuariosHttp);

  // El modelo tiene su propia interface en models/ (nunca declarada en el componente)
  protected readonly modelo = signal<RegistroModel>({ nombre: '', email: '', edad: 18 });

  protected readonly registroForm = form(
    this.modelo,
    (path) => {
      required(path.nombre, { message: 'El nombre es obligatorio' });
      minLength(path.nombre, 3);
      required(path.email, { message: 'El email es obligatorio' });
      email(path.email, { message: 'Ingresá un email válido' });
    },
    {
      submission: {
        action: async (f) => this._guardar(f),
        onInvalid: (f) => this._reportarErrores(f),
        ignoreValidators: 'none',   // 'pending' (default) | 'all' | 'none'
      },
    },
  );

  private async _guardar(f: FieldTree<RegistroModel>): Promise<void> {
    await firstValueFrom(this._usuariosHttp.create(this.modelo()));
    f().reset({ nombre: '', email: '', edad: 18 });   // limpia valores + touched/dirty
  }

  private _reportarErrores(f: FieldTree<RegistroModel>): void {
    const errores = f().errorSummary();
    errores[0]?.fieldTree().focusBoundControl();      // foco en el primer campo inválido
  }
}
```

```html
<section class="registro">
  <form class="registro__form" [formRoot]="registroForm">
    <label class="registro__form-label" for="nombre">Nombre</label>
    <input id="nombre" class="registro__form-input" [formField]="registroForm.nombre" />
    @if (registroForm.nombre().touched() && registroForm.nombre().invalid()) {
      <p class="registro__form-error">{{ registroForm.nombre().errors()[0].message }}</p>
    }

    <label class="registro__form-label" for="email">Email</label>
    <input id="email" type="email" class="registro__form-input" [formField]="registroForm.email" />
    @if (registroForm.email().pending()) {
      <p class="registro__form-hint">Verificando disponibilidad…</p>
    }

    <button class="registro__form-submit" [disabled]="!registroForm().valid()">Registrarse</button>
  </form>
</section>
```

`submission.ignoreValidators` controla qué pasa si se envía el formulario mientras hay validación en
curso: `'pending'` (default) ignora solo los validadores asíncronos pendientes; `'all'` ignora
cualquier validador (síncrono incluido); `'none'` no ignora nada — el submit no corre si hay algo
inválido o pendiente.

### 6.3 Reglas del equipo para Signal Forms

- **`[formRoot]` siempre** en el `<form>`: agrega `novalidate` (mata los tooltips nativos), conecta el
  `action` de `submission` con el evento `submit` y evita mensajes de validación duplicados. Con él
  alcanza un `<button type="submit">` para disparar el submit; no hace falta un `(submit)` manual.
- **Mostrar errores solo tras interacción**: `touched() && invalid()`. Nunca errores en rojo apenas
  se pinta el formulario.
- **Usar `invalid()`, no `!valid()`** cuando hay validación asíncrona: durante `pending()`, `valid()`
  e `invalid()` pueden ser ambos `false`.
- **Habilitar/deshabilitar el submit** con el estado **del form** (`registroForm().valid()`), no
  campo por campo.
- **Condicionales de campo con `disabled` / `readonly` / `hidden` + `when`**, no con lógica suelta en
  el template:
  ```ts
  disabled(path.cupon,  { when: ({ valueOf }) => valueOf(path.total) < 50 });
  readonly(path.usuario);
  hidden(path.direccionEnvio, { when: ({ valueOf }) => !valueOf(path.requiereEnvio) });
  ```
  Los campos `hidden` / `disabled` / `readonly` **no participan de la validación** ni afectan el
  estado del padre.
  > **Campo `hidden` ⇒ sacarlo del DOM con `@if`.** Angular avisa en dev mode (`NG01916`) si un campo
  > marcado `hidden` sigue renderizado. `hidden()` es un signal de estado, no aplica ningún CSS por sí
  > solo — hay que envolver el control en `@if (!registroForm.direccionEnvio().hidden()) { ... }`.
- **Arrays y objetos anidados**: ver §6.4.
- **Validación con esquemas externos** (Zod / Valibot) vía `validateStandardSchema`, incluso dinámica
  (pasando una función que lee signals para alternar de esquema, ej.
  `validateStandardSchema(path, () => z.object({ nombre: z.string().min(minimo()) }))`).
- **Clases CSS de estado**: configurarlas una vez en `app.config.ts` con `provideSignalFormsConfig`
  (o `NG_STATUS_CLASSES` de `@angular/forms/signals/compat` para replicar `ng-valid` / `ng-invalid` /
  `ng-dirty` en controles puenteados), y estilarlas en SCSS. Nada de `[class.error]` repetido en cada
  input.
- **Controles propios y NG-ZORRO**: ver §6.9.
- **Submit manual** (workflows con varias acciones): `submit(this.miForm, { action, onInvalid })` —
  devuelve `Promise<boolean>`. Si `submission.action` ya está definido en `form(...)`, no hace falta
  pasar `action` de nuevo: `submit()` usa esos defaults salvo que se los pisen explícitamente.
- **Reset tras guardar**: `f().reset(valorInicial)` a nivel del form, o `campo().reset(valor?)` a
  nivel de un campo puntual — ambos limpian valor y estado de interacción (§6.8).

```ts
// app.config.ts — clases de estado una sola vez
provideSignalFormsConfig({
  classes: {
    'ng-invalid':  (formField) => formField.state().invalid(),
    'ng-valid':    (formField) => formField.state().valid(),
    'ng-dirty':    (formField) => formField.state().dirty(),
    'ng-pristine': (formField) => !formField.state().dirty(),
    'ng-pending':  (formField) => formField.state().pending(),
  },
}),
```

### 6.4 Formularios anidados y arrays (`apply` / `applyEach`)

Para un **campo objeto anidado** (ej. una dirección dentro de un formulario de usuario), se reutiliza
un schema con `apply()`:

```ts
const direccionSchema = schema<Direccion>((direccion) => {
  required(direccion.calle);
  required(direccion.ciudad);
});

const usuarioForm = form(usuarioModelo, (usuario) => {
  required(usuario.nombre);
  apply(usuario.direccion, direccionSchema);   // aplica el schema al sub-objeto
});
```

Para un **array**, `applyEach()` aplica un schema a cada ítem:

```ts
const itemSchema = schema<{ producto: string; cantidad: number }>((item) => {
  required(item.producto);
  min(item.cantidad, 1);
});

const pedidoForm = form(signal({ items: [{ producto: '', cantidad: 1 }] }), (pedido) => {
  applyEach(pedido.items, itemSchema);
});
```

En el template, se itera el `FieldTree` del array y se **trackea por identidad del field** (el
sistema la mantiene estable entre recargas, no hace falta un `id` propio):

```html
@for (item of pedidoForm.items; track item) {
  <input [formField]="item.producto" />
  <input type="number" [formField]="item.cantidad" />
}
```

Para agregar/quitar ítems, se muta el **modelo** (el array del signal), no el `FieldTree`:

```ts
agregarItem(): void {
  this.modelo.update((m) => ({ ...m, items: [...m.items, { producto: '', cantidad: 1 }] }));
}
quitarItem(i: number): void {
  this.modelo.update((m) => ({ ...m, items: m.items.filter((_, idx) => idx !== i) }));
}
```

### 6.5 Validación cruzada entre campos (`validateTree`)

Cuando la validación depende de **más de un campo** (ej. "confirmar contraseña" o "fecha fin >= fecha
inicio"), no se puede resolver con `required`/`min` sobre un solo path: se usa `validateTree`, que se
declara sobre el **campo padre** (o la raíz) y puede reportar el error en un **campo hijo**:

```ts
const registroForm = form(modelo, (path) => {
  required(path.password);
  required(path.confirmarPassword);

  validateTree(path, ({ value }) => {
    const v = value();
    if (v.password !== v.confirmarPassword) {
      return [{
        kind: 'passwordsNoCoinciden',
        message: 'Las contraseñas no coinciden',
        field: path.confirmarPassword,   // el error se muestra en este campo, no en la raíz
      }];
    }
    return [];
  });
});
```

```html
@if (registroForm.confirmarPassword().touched() && registroForm.confirmarPassword().invalid()) {
  <p class="error">{{ registroForm.confirmarPassword().errors()[0].message }}</p>
}
```

### 6.6 Validación asíncrona (`validateAsync` / `validateHttp`)

- **`validateAsync(path, { params, factory, onSuccess, onError, debounce? })`**: para lógica async
  genérica. `params` arma el input reactivo, `factory` recibe ese `Signal` de params y devuelve un
  `Resource` (típicamente un `resource()` propio, ver [04-resource-api.md](./04-resource-api.md) §4.11),
  `onSuccess`/`onError` mapean el resultado/error del resource a errores de validación. Mientras
  corre, el campo está `pending()`.
- **`validateHttp(path, { request, onSuccess, onError, options?, debounce? })`**: variante pensada
  para pegarle directo a un endpoint HTTP de validación (ej. "¿este email ya existe?"), sin armar el
  `resource()` a mano. `request` devuelve la URL (o un `HttpResourceRequest` con method/body) y
  Angular arma el `httpResource` por debajo.

```ts
required(path.email, { message: 'El email es obligatorio' });
email(path.email, { message: 'Ingresá un email válido' });

validateHttp(path.email, {
  request: ({ value }) =>
    `${environment.API_URL}usuarios/existe?email=${encodeURIComponent(value())}`,
  onSuccess: (existe: boolean) =>
    existe ? [{ kind: 'emailDuplicado', message: 'Ese email ya está registrado' }] : [],
  onError: () => [{ kind: 'emailCheckFailed', message: 'No se pudo verificar el email' }],
});
```

```html
@if (registroForm.email().pending()) {
  <p class="hint">Verificando disponibilidad…</p>
} @else if (registroForm.email().touched() && registroForm.email().invalid()) {
  <p class="error">{{ registroForm.email().errors()[0].message }}</p>
}
```

> La validación async **no** se dispara en cada tecla: usar `debounce(path.email, 300)` en el schema
> antes del validador async para no ametrallar al backend.

### 6.7 Errores accesibles en el template

- **`aria-invalid`** en el control cuando está inválido y tocado, y **`aria-describedby`** apuntando
  al `id` del mensaje de error, para que el lector de pantalla lo anuncie al enfocar el campo:
  ```html
  <input
    id="email"
    type="email"
    [formField]="registroForm.email"
    [attr.aria-invalid]="registroForm.email().touched() && registroForm.email().invalid()"
    [attr.aria-describedby]="registroForm.email().invalid() ? 'email-error' : null"
  />
  @if (registroForm.email().touched() && registroForm.email().invalid()) {
    <p id="email-error" class="error" role="alert">{{ registroForm.email().errors()[0].message }}</p>
  }
  ```
- **`role="alert"`** (o `aria-live="polite"`) en el contenedor del mensaje para que se anuncie cuando
  aparece dinámicamente (al perder foco, al fallar el submit), sin esperar a que el usuario vuelva a
  navegar hacia ahí.
- **Resumen de errores en submit fallido**: `f().errorSummary()` da la lista completa de errores del
  form con su `fieldTree()`, útil para un bloque "revisá estos campos" al principio del formulario
  además de mover el foco (§6.2).
- **`disabledReasons()`**: si un campo está `disabled` por una regla de negocio (no solo por estado
  del form), `disabledReasons()` expone la razón para poder mostrarla ("Disponible solo con compra
  mínima de $50") en vez de dejar el campo gris sin explicación.

### 6.8 Reset y estado imperativo

- **A nivel form**: `f().reset(valorInicial)` — reemplaza el valor del modelo y limpia
  `touched`/`dirty` de todo el árbol.
- **A nivel campo**: `campo().reset(valor?)` — mismo efecto, acotado a ese campo (y sus hijos si es un
  sub-árbol).
- **Marcar estado sin tocar el valor** (útil en tests o flujos guiados): `campo().markAsDirty()`,
  `campo().markAsTouched({ includeChildren?: boolean })`.
- **Forzar re-validación** (ej. tras cambiar una regla de negocio en runtime): `campo().reloadValidation()`.
- **Leer un error puntual** de forma reactiva: `campo().getError('required')` (o el `kind` que
  corresponda) devuelve el error si existe, o `undefined`.

### 6.9 Controles propios e integración con NG-ZORRO

- **Controles propios**: implementar `FormValueControl<T>` (expone `value = model<T>()`) o
  `FormCheckboxControl` (expone `checked`) para que `[formField]` pueda bindearlos. Para Signal Forms
  **no se usa `ControlValueAccessor`**: es el mecanismo de Reactive/Template-driven Forms, no el de
  Signal Forms. Si el control contiene varios inputs nativos, implementar además `focus()` para que
  funcione `focusBoundControl()`; si el control es una directiva que envuelve un elemento host,
  `registerAsBinding()` permite registrarlo sin implementar `FormValueControl` completo.
- **Envolver un control de NG-ZORRO** (ej. `nz-input-number`, que no es un `<input>` nativo) en un
  `FormValueControl` propio para poder usar `[formField]` directamente:
  ```ts
  @Component({
    selector: 'app-cantidad-input',
    imports: [NzInputNumberModule],
    template: `<nz-input-number [ngModel]="value()" (ngModelChange)="value.set($event)" [nzMin]="min()" [nzMax]="max()" />`,
  })
  export class CantidadInput implements FormValueControl<number> {
    readonly value = model.required<number>();
    // FieldState expone min()/max() ya resueltos por los validadores min()/max() del schema:
    readonly min = input<number>();
    readonly max = input<number>();
  }
  ```
  ```html
  <app-cantidad-input [formField]="pedidoForm.items[0].cantidad" [min]="0" [max]="99" />
  ```
- **`transformedValue`**: cuando el control muestra un valor "crudo" distinto al del modelo (ej. un
  input de texto que el usuario escribe como `"20m"` y el modelo guarda `20` en minutos), se usa
  `transformedValue(this.value, { parse, format })` dentro del control propio para separar el valor
  de UI del valor de modelo, reportando errores de parseo al form automáticamente.
- **`SignalFormControl`** (`@angular/forms/signals/compat`) permite escribir las reglas con
  validadores de Signal Forms (`required`, `minLength`, etc.) y seguir usando el control dentro de un
  `FormGroup`/`FormArray` de Reactive Forms — puente para migración incremental, no para código nuevo.

### 6.10 Testing básico de Signal Forms

No hay `formGroup.setValue(...)` ni `valueChanges`: se testea escribiendo el **modelo** (el signal) o
simulando el evento de input, y leyendo el `FieldState`.

```ts
describe('Registro', () => {
  let fixture: ComponentFixture<Registro>;
  let component: Registro;

  beforeEach(() => {
    fixture = TestBed.createComponent(Registro);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('marca el campo nombre como inválido si está vacío y tocado', () => {
    component['registroForm'].nombre().markAsTouched();
    fixture.detectChanges();

    expect(component['registroForm'].nombre().invalid()).toBe(true);
    expect(component['registroForm'].nombre().errors()[0].kind).toBe('required');
  });

  it('actualiza el modelo al tipear en el input (vista → modelo)', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#nombre');
    input.value = 'Ada';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(component['modelo']().nombre).toBe('Ada');
  });

  it('habilita el submit solo cuando el form es válido', () => {
    component['modelo'].set({ nombre: 'Ada', email: 'ada@test.com', edad: 30 });
    fixture.detectChanges();

    expect(component['registroForm']().valid()).toBe(true);
  });
});
```

No testear Signal Forms disparando `submit()` real contra un backend: mockear `_usuariosHttp` (o el
servicio que use `submission.action`) como con cualquier otro servicio inyectado.

---
