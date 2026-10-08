## 6. Formularios — solo Signal Forms

Índice: [6.1](#61-modelo-mental) Modelo mental · [6.2](#62-patrón-estándar) Patrón estándar ·
[6.3](#63-reglas-del-equipo-para-signal-forms) Reglas del equipo ·
[6.4](#64-formularios-anidados-y-arrays-apply--applyeach) Anidados y arrays (`apply`/`applyEach`) ·
[6.5](#65-validación-cruzada-entre-campos-validatetree) Validación cruzada (`validateTree`) ·
[6.6](#66-validación-asíncrona-validateasync--validatehttp) Validación asíncrona ·
[6.7](#67-errores-accesibles-en-el-template) Errores accesibles · [6.8](#68-reset-y-estado-imperativo) Reset y estado imperativo ·
[6.9](#69-controles-propios-e-integración-con-ng-zorro) Controles propios / NG-ZORRO ·
[6.10](#610-formulario-reutilizable-con-campos-envoltorio-patrón-del-equipo) Formulario reutilizable con campos envoltorio

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
  campo por campo. **Excepción**: si el form puede arrancar inválido sin que el usuario haya tocado
  nada (precarga, filtros guardados en `localStorage`), **no** deshabilitar: el error no se ve
  (falta `touched()`) y el botón queda gris sin explicación. `submit()` marca todo como `touched`
  y `onInvalid` lleva el foco al primer error.
- **Condicionales de campo con `disabled` / `readonly` / `hidden` + `when`**, no con lógica suelta en
  el template:
  ```ts
  disabled(path.cupon,  { when: ({ valueOf }) => valueOf(path.total) < 50 });
  readonly(path.usuario);
  hidden(path.direccionEnvio, { when: ({ valueOf }) => !valueOf(path.requiereEnvio) });
  ```
  Los campos `hidden` / `disabled` / `readonly` **no participan de la validación** ni afectan el
  estado del padre.
  > **Campo `hidden` ⇒ sacarlo del DOM con `@if`.** Angular avisa en dev mode si un campo marcado
  > `hidden` sigue renderizado. `hidden()` es un signal de estado, no aplica ningún CSS por sí
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
- **Marcar estado sin tocar el valor** (útil en flujos guiados): `campo().markAsDirty()`,
  `campo().markAsTouched({ includeChildren?: boolean })`.
- **Forzar re-validación** (ej. tras cambiar una regla de negocio en runtime): `campo().reloadValidation()`.
- **Leer un error puntual** de forma reactiva: `campo().getError('required')` (o el `kind` que
  corresponda) devuelve el error si existe, o `undefined`.

### 6.9 Controles propios e integración con NG-ZORRO

> Qué librería usar (NG-ZORRO → Angular Material → controles propios): ver §6.10.

- **Controles propios**: implementar `FormValueControl<T>` (expone `value = model<T>()`) o
  `FormCheckboxControl` (expone `checked`) para que `[formField]` pueda bindearlos — es el mecanismo
  **preferido** para controles nuevos. `[formField]` también puede bindear directo a un componente que
  provee `ControlValueAccessor` (interop de compatibilidad con Reactive/Template-driven Forms,
  documentado en la propia API de `FormField`), pero es soporte de compatibilidad, no la vía nativa de
  Signal Forms: usarlo solo cuando el control de terceros ya trae CVA y no expone otra API (ver
  ejemplo con `nz-input-number` más abajo). Si el control contiene varios inputs nativos, implementar
  además `focus()` para que funcione `focusBoundControl()`; si el control es una directiva que envuelve
  un elemento host, `registerAsBinding()` permite registrarlo sin implementar `FormValueControl`
  completo.
- **`nz-input-number`** (y cualquier otro control NG-ZORRO que ya provea `ControlValueAccessor`): **no
  hace falta armar un wrapper**. `nz-input-number` registra su propio `NG_VALUE_ACCESSOR`
  (`useExisting: NzInputNumberComponent`), así que `[formField]` lo bindea directo, vía el caso de
  interop CVA de arriba:
  ```html
  <nz-input-number [formField]="pedidoForm.items[0].cantidad" [nzMin]="0" [nzMax]="99" />
  ```
  Nada de `[ngModel]` / `(ngModelChange)` (prohibido por el equipo, ver la intro de este archivo) ni de `FormsModule`: el `ControlValueAccessor` que ya trae el
  componente es lo que `[formField]` usa por debajo para leer y escribir el valor.
- **`transformedValue`**: cuando el control muestra un valor "crudo" distinto al del modelo (ej. un
  input de texto que el usuario escribe como `"20m"` y el modelo guarda `20` en minutos), se usa
  `transformedValue(this.value, { parse, format })` dentro del control propio para separar el valor
  de UI del valor de modelo, reportando errores de parseo al form automáticamente.
- **`SignalFormControl`** (`@angular/forms/signals/compat`) permite escribir las reglas con
  validadores de Signal Forms (`required`, `minLength`, etc.) y seguir usando el control dentro de un
  `FormGroup`/`FormArray` de Reactive Forms — puente para migración incremental, no para código nuevo.

### 6.10 Formulario reutilizable con campos envoltorio (patrón del equipo)

Patrón para formularios que se reutilizan en varias pantallas o dentro de un modal NG-ZORRO
(ejemplo: alta/edición de un contacto). Tres piezas:

1. **Campo envoltorio** (`app-campo`): un solo componente genérico que pone etiqueta, asterisco de
   obligatorio y mensaje de error alrededor de **cualquier** control proyectado (`<input>`,
   `nz-select`, `nz-date-picker`, `nz-input-number`). No hay un envoltorio por tipo de control ni
   una lista de inputs que replican atributos del control (`type`, `placeholder`, `options`,
   `optionLabel`...): esos atributos los pone el padre directo sobre el control.
2. **Formulario hijo**: dueño del modelo, del schema y del payload. Expone solo lo mínimo
   (`contacto`, `permiteEmpresa`, `enviado`, `enviar()`, `limpiar()`). No guarda nada.
3. **Contenedor** (página o modal): decide cuándo enviar y qué hacer con el payload.

**Qué control proyectar, en este orden** (mirar `package.json` antes de elegir):

1. **NG-ZORRO** (`ng-zorro-antd` instalado): `nz-input`, `nz-select`, `nz-date-picker`,
   `nz-range-picker`, `nz-input-number`, `nz-checkbox`. Traen `ControlValueAccessor`, así que
   `[formField]` los ata directo (§6.9).
2. **Angular Material** (sin NG-ZORRO, con `@angular/material`): `matInput`, `mat-select`,
   `mat-datepicker`, `mat-checkbox`. También se atan directo con `[formField]`. Con Material, el
   envoltorio puede ser el propio `mat-form-field` (`mat-label` + `mat-error`); `app-campo` solo
   aporta si se quiere el mismo layout de error en toda la app.
3. **Controles propios** (sin ninguna de las dos): elementos nativos (`<input>`, `<select>`,
   `<input type="date">`) con `[formField]`; si hace falta un control compuesto, un componente con
   `FormValueControl` / `FormCheckboxControl` (§6.9).

Nunca mezclar dos librerías de componentes en el mismo formulario, ni instalar una para un solo
control.

Layout con **BEM + CSS Grid** en el SCSS del formulario. Nada de clases utilitarias tipo
`row` / `col-md-4`, nada de `style="..."` inline.

**Modelo y payload** (en `models/`, nunca en el componente). Los campos solo de UI quedan fuera del
payload con `Omit`:

```ts
// models/contacto-form.model.ts
export interface ContactoFormModel {
  nombre: string;
  idCategoria: number | null;
  fechaAlta: Date | null;
  email: string;
  responsable: string;
  esEmpresa: boolean;            // solo UI: muestra/oculta la razón social
  razonSocial: string;
}

/** Valores listos para persistir (sin campos solo de UI). */
export type ContactoPayload = Omit<ContactoFormModel, 'esEmpresa'>;

export const CONTACTO_FORM_VACIO: ContactoFormModel = {
  nombre: '',
  idCategoria: null,
  fechaAlta: null,
  email: '',
  responsable: '',
  esEmpresa: false,
  razonSocial: '',
};
```

**Campo envoltorio genérico.** Recibe la etiqueta y el `FieldTree` del campo (para leer su estado,
no para atarlo). El asterisco y el error salen del **estado del campo**: si el schema dice
`required`, la etiqueta lo muestra sola; no hay `[required]="true"` duplicado. El `<label>` envuelve
el control proyectado, así la asociación etiqueta-control es implícita y no hace falta pasar ids.

```ts
// shared/components/campo/campo.ts
@Component({
  selector: 'app-campo',
  templateUrl: './campo.html',
  styleUrl: './campo.scss',
  host: { class: 'campo', '[class.campo--error]': 'mostrarError()' },
})
export class Campo {
  readonly etiqueta = input.required<string>();
  readonly control = input.required<FieldTree<unknown>>();

  protected readonly estado = computed(() => this.control()());
  protected readonly mostrarError = computed(
    () => this.estado().touched() && this.estado().invalid(),
  );
  protected readonly mensajeError = computed(() => this.estado().errors()[0]?.message ?? '');
}
```

```html
<!-- campo.html -->
<label class="campo__label">
  <span class="campo__texto">
    {{ etiqueta() }}
    @if (estado().required()) {
      <span class="campo__obligatorio" aria-hidden="true">*</span>
    }
    <ng-content select="[campoAyuda]" />
  </span>
  <ng-content />
</label>
<ng-content select="[campoNota]" />
@if (mostrarError()) {
  <p class="campo__error" role="alert">{{ mensajeError() }}</p>
}
```

```scss
// campo.scss
:host {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
}

.campo {
  // Grid y no flex: los ítems de grid se estiran solos, así nz-select / mat-select / nz-date-picker
  // ocupan todo el ancho sin tocarlos desde acá (nada de ::ng-deep, §7.4).
  &__label {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }

  &__texto {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__obligatorio,
  &__error {
    color: var(--color-error);
  }

  &__error {
    margin: 0;
    font-size: 14px;
  }
}
```

> **Slots opcionales**: `[campoAyuda]` va dentro de la etiqueta (ej. ícono con tooltip) y
> `[campoNota]` debajo del control (ej. una aclaración condicional). Los dos son elementos del
> template del padre, así que los estila el SCSS del padre.
>
> ```html
> <app-campo etiqueta="Usuario" [control]="filtroForm.usuario">
>   <span campoAyuda class="filtro__ayuda" nz-tooltip nzTooltipTitle="..." aria-hidden="true"></span>
>   <nz-select [formField]="filtroForm.usuario">...</nz-select>
>   @if (filtroForm.usuario().value() === USUARIO_EXTERNO) {
>     <small campoNota class="filtro__nota">Solo usuarios externos</small>
>   }
> </app-campo>
> ```

**Formulario hijo.**

```ts
@Component({
  selector: 'app-form-contacto',
  templateUrl: './form-contacto.html',
  styleUrl: './form-contacto.scss',
  imports: [FormRoot, FormField, NzInputModule, NzSelectModule, NzDatePickerModule, NzCheckboxModule, Campo],
})
export class FormContacto {
  private readonly _modalData = inject<ContactoModalData | null>(NZ_MODAL_DATA, { optional: true });
  private readonly _categoriasHttp = inject(CategoriasHttp);

  readonly contacto = input<Partial<ContactoFormModel> | null>(null);
  readonly permiteEmpresa = input(true);
  readonly enviado = output<ContactoPayload>();

  protected readonly categorias = this._categoriasHttp.listarResource();

  // Se recalcula si cambia el input (edición) y sigue siendo editable por el usuario.
  protected readonly modelo = linkedSignal<ContactoFormModel>(() => ({
    ...CONTACTO_FORM_VACIO,
    ...this._modalData?.contacto,
    ...this.contacto(),
  }));

  protected readonly contactoForm = form(this.modelo, (path) => {
    required(path.nombre, { message: '"Nombre" es obligatorio.' });
    required(path.idCategoria, { message: '"Categoría" es obligatoria.' });
    required(path.fechaAlta, { message: '"Fecha de alta" es obligatoria.' });
    required(path.email, { message: '"Email" es obligatorio.' });

    hidden(path.esEmpresa, () => !this.permiteEmpresa());
    hidden(
      path.razonSocial,
      ({ valueOf }) => !this.permiteEmpresa() || !valueOf(path.esEmpresa),
    );
    required(path.razonSocial, { message: 'Ingresá la razón social.' });
  }, {
    // Obligatorio con [formRoot]: un Enter en un input dispara submit(); sin action tira NG01915.
    submission: {
      action: () => Promise.resolve(this.enviado.emit(this._payload())),
      onInvalid: (f) => f().errorSummary()[0]?.fieldTree().focusBoundControl(),
    },
  });

  /** Lo llama el contenedor (ej. botón "Guardar" del footer del modal). Usa la submission de arriba. */
  enviar(): Promise<boolean> {
    return submit(this.contactoForm);
  }

  limpiar(): void {
    this.contactoForm().reset({ ...CONTACTO_FORM_VACIO });
  }

  private _payload(): ContactoPayload {
    const { esEmpresa: _, ...payload } = this.modelo();
    return payload;
  }
}
```

```html
<form class="form-contacto" [formRoot]="contactoForm">
  <app-campo class="form-contacto__campo form-contacto__campo--completo"
    etiqueta="Nombre" [control]="contactoForm.nombre">
    <input nz-input [formField]="contactoForm.nombre" />
  </app-campo>

  <app-campo class="form-contacto__campo" etiqueta="Categoría" [control]="contactoForm.idCategoria">
    <nz-select [formField]="contactoForm.idCategoria" [nzLoading]="categorias.isLoading()">
      @for (categoria of categorias.value() ?? []; track categoria.id) {
        <nz-option [nzValue]="categoria.id" [nzLabel]="categoria.descripcion" />
      }
    </nz-select>
  </app-campo>

  <app-campo class="form-contacto__campo" etiqueta="Fecha de alta" [control]="contactoForm.fechaAlta">
    <nz-date-picker [formField]="contactoForm.fechaAlta" nzFormat="dd/MM/yyyy" />
  </app-campo>

  <app-campo class="form-contacto__campo" etiqueta="Email" [control]="contactoForm.email">
    <input nz-input type="email" [formField]="contactoForm.email" />
  </app-campo>

  @if (!contactoForm.esEmpresa().hidden()) {
    <label class="form-contacto__empresa" nz-checkbox [formField]="contactoForm.esEmpresa">
      Es empresa
    </label>
  }
  @if (!contactoForm.razonSocial().hidden()) {
    <app-campo class="form-contacto__campo form-contacto__campo--completo"
      etiqueta="Razón social" [control]="contactoForm.razonSocial">
      <input nz-input [formField]="contactoForm.razonSocial" />
    </app-campo>
  }
</form>
```

```scss
// form-contacto.scss
.form-contacto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 224px), 1fr));
  gap: 16px 24px;

  &__campo--completo,
  &__empresa {
    grid-column: 1 / -1;
  }
}
```

> `form-contacto__campo` sobre el host de `app-campo` es un **mix BEM**: el padre posiciona al
> hijo en su grilla (elemento del bloque padre) y el hijo maneja su interior (bloque `campo`).
> El hijo nunca sabe en qué columna está.

**Reglas del patrón:**

- **Un envoltorio genérico con `<ng-content>`**, no uno por control (`app-input`, `app-select`,
  `app-datepicker`) que reexpone como inputs los atributos del control. Si el control tiene lógica
  propia (máscara, parseo), es un control con `FormValueControl` (§6.9), no un envoltorio.
- **API mínima del formulario hijo**: inputs de datos, un `output` con el payload y métodos
  públicos `enviar()` / `limpiar()`. Modelo, form y helpers son `protected` o `private`.
- **Layout con BEM + Grid en el SCSS**, nunca clases utilitarias (`row`, `col-md-*`) ni
  `[class]="'...'"` ni `style` inline. Nunca un input llamado `class`.
- **Cero `effect()` en formularios** ([02](./02-typescript-signals.md) §2, regla del equipo). Campos
  dependientes (ej. usuario ↔ rol): cada lista de opciones es un `computed()` filtrado por el otro
  campo, así la UI no permite combinaciones inválidas. Si aun así pueden aparecer (datos guardados,
  opciones que cambian), se marca con `validate()` / `validateTree()` en el schema; nunca un
  `effect` que hace `campo().value.set(...)` para "limpiar".
- **Precarga con `linkedSignal`, no con `effect`.** Un `effect` que hace `modelo.update(...)` corre
  de nuevo cada vez que cambia cualquier signal que lee y pisa lo que el usuario ya tipeó.
- **Condiciones de `hidden` con `valueOf(path.x)`**, no con `this.modelo().x`. En el template se lee
  `campo().hidden()`: nunca se repite la lógica con `@if (modelo().x)`.
- **Un `required` sobre un campo condicional es seguro**: mientras está `hidden`, no valida.
- **Un signal en el template siempre se invoca**: `@if (permiteEmpresa())`, nunca
  `@if (permiteEmpresa)` (la función siempre es truthy).
- **Sin `@if (miForm)` envolviendo el `<form>`**: el `FieldTree` existe desde la construcción.
- **Sin decoradores mezclados**: todo `input()` / `output()`. Inputs que aceptan `null` lo declaran
  (`input<number | null>(null)`).
- **Valor inicial en una constante** compartida entre modelo y reset. `reset(valor)` limpia también
  `touched` / `dirty`; `modelo.set(...)` no.
- **Datos del modal tipados**: `inject<MiModalData | null>(NZ_MODAL_DATA, { optional: true })`.
- **Opciones de selects con Resource API** en el formulario (o su servicio), no con un envoltorio
  que recibe `method="ruta/del/endpoint"` y pide los datos por dentro.
- **Búsqueda de autocomplete** (ej. responsable): `debounce(path.responsable, 300)` en el
  schema y un `httpResource` cuyo request lee el campo y devuelve `undefined` con menos de 3
  caracteres (ver [04-resource-api.md](./04-resource-api.md)). Nada de un signal aparte que copia el
  resultado del resource.

---
