## 6. Formularios — solo Signal Forms

> **Regla del equipo: todos los formularios se hacen con Signal Forms
> (`@angular/forms/signals`).** Nada de Reactive Forms (`FormGroup` / `FormControl` /
> `FormBuilder`), nada de template-driven (`ngModel`), nada de `valueChanges` /
> `statusChanges`. Signal Forms es **estable desde Angular 22** y es el stack de formularios oficial
> del equipo.

Los formularios existentes en Reactive Forms se pueden dejar como están, pero **todo formulario nuevo
o refactorizado va en Signal Forms**. Si hay que convivir con controles legacy hay un puente
(`compatForm` / `SignalFormControl` en `@angular/forms/signals/compat`), pero el objetivo es no
necesitarlo.

### 6.1 Modelo mental

1. El **modelo** es un `signal` con la forma de los datos → es la única fuente de verdad.
2. `form(modelo, schema?)` devuelve un **FieldTree**: una estructura de signals que espeja el modelo.
3. Cada campo, invocado como función (`miForm.email()`), devuelve su **FieldState**: `value()`,
   `valid()`, `invalid()`, `errors()`, `pending()`, `touched()`, `dirty()`, `disabled()`,
   `hidden()`, `readonly()`.
4. En el template se ata con **`[formField]`** (y el `<form>` con **`[formRoot]`**).

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
        ignoreValidators: 'none',
        onInvalid: (f) => this._reportarErrores(f),
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

### 6.3 Reglas del equipo para Signal Forms

- **`[formRoot]` siempre** en el `<form>`: pone `novalidate` (mata los tooltips nativos), conecta el
  `action` del `submission` con el evento `submit` y evita mensajes de validación duplicados. Con él
  alcanza un `<button>` sin `type` para disparar el submit.
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
- **Arrays**: `applyEach(path.items, (item) => { ... })` para el esquema por ítem y, en el template,
  `@for (field of form.items; track field)` — **track por identidad del field**, que el sistema
  mantiene estable.
- **Validación con esquemas externos** (Zod / Valibot) vía `validateStandardSchema`, incluso dinámica
  (pasando una lambda que lee signals para alternar esquemas).
- **Clases CSS de estado**: configurarlas una vez en `app.config.ts` con `provideSignalFormsConfig`
  (o `NG_STATUS_CLASSES` de `@angular/forms/signals/compat` para replicar `ng-valid` / `ng-invalid` /
  `ng-dirty`), y estilarlas en SCSS. Nada de `[class.error]` repetido en cada input.
- **Controles propios**: implementar `FormValueControl<T>` (expone `value = model<T>()`) o
  `FormCheckboxControl` (expone `checked`). **`ControlValueAccessor` quedó obsoleto.** Si el control
  contiene varios inputs nativos, implementar además `focus()` para que funcione
  `focusBoundControl()`.
- **Submit manual** (workflows con varias acciones): `submit(this.miForm, { action, onInvalid })`.
- **Reset tras guardar**: `f().reset(valorInicial)` — limpia valores y estado de interacción.

```ts
// app.config.ts — clases de estado una sola vez
provideSignalFormsConfig({
  classes: {
    'ng-invalid':  (field) => field.state().invalid(),
    'ng-valid':    (field) => field.state().valid(),
    'ng-dirty':    (field) => field.state().dirty(),
    'ng-pristine': (field) => !field.state().dirty(),
    'ng-pending':  (field) => field.state().pending(),
  },
}),
```

---
