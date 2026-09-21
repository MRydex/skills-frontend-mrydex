## 7. SCSS — Convenciones

### 7.1 Variables globales y tokens

Colores, breakpoints, tipografías y tokens de diseño se importan del archivo global con `@use`:

```scss
@use '../../../../../../assets/styles/variables.scss' as var;
```

- **Nunca** hardcodear colores hex/rgb en componentes. Si falta un token, agregarlo a
  `variables.scss`.

#### Tipografía fluida con `clamp()`

Los tamaños de fuente del sistema se definen como **tokens fluidos** con `clamp(MÍN, IDEAL, MÁX)`:
`MÍN` es el piso, `MÁX` el techo, e `IDEAL` (típicamente `Xrem + Yvw`) escala suave entre
breakpoints. Así un mismo token responde sin media queries.

```scss
// assets/styles/variables.scss
$font-size-medium: clamp(0.8rem, -0.875rem + 8.333vw, 1.125rem);
$font-size-large:  clamp(1.5rem, -0.875rem + 8.333vw, 2.5rem);
```

```scss
.lista__header-title    { font-size: var.$font-size-large; }
.lista__header-subtitle { font-size: var.$font-size-medium; }
```

> El término `IDEAL` con `rem` negativo es normal: sale de interpolar el tamaño entre dos anchos de
> viewport. No tocarlo a mano; generarlo con una calculadora de *fluid type scale* y guardarlo como
> token.

#### Tema claro/oscuro nativo

```scss
:root { color-scheme: light dark; }

h1 { color: light-dark(green, #09f); }   // primer valor = claro, segundo = oscuro
```

### 7.2 Selectores anidados con BEM

- Todo el estilo se escribe con **anidamiento SCSS** siguiendo BEM.
- Estados (`:hover`, `:focus-visible`, `:disabled`, `:focus-within`) y modificadores van **dentro**
  de la misma declaración.
- Nada de selectores sueltos fuera del bloque raíz.
- **Preferir `:focus-visible` sobre `:focus`** para foco accesible sin ruido al click.

```scss
// ✅ BIEN
.editar-evento {
  &__header { ... }

  &__subheader {
    &-circle { ... }
    &-description { ... }

    &:hover { ... }
    &:focus-visible { outline: 2px solid var.$color-focus; }
    &:disabled { ... }
  }

  &__content {
    &-date { ... }

    &-place {
      &--green { ... }
      &--link { ... }
    }
  }
}
```

### 7.3 Encapsulación

- `ViewEncapsulation.Emulated` (default). **No** usar `None` salvo casos muy justificados.
- Para penetrar a hijos, **no** usar `::ng-deep` (deprecado). En su lugar:
  - CSS variables / custom properties expuestas al hijo.
  - `:host-context()` cuando se necesita estilar según un ancestro.
  - Un `input()` en el hijo que aplique la clase.

### 7.4 Responsividad

- Mobile-first. Los media queries usan los breakpoints del archivo de variables:
  ```scss
  @media (min-width: var.$bp-tablet) { ... }
  ```
- Antes de un media query, evaluar si el layout se resuelve solo con **contenedor de tamaño fijo +
  padding lateral fijo + contenido en `%`/`vw`/`vh`** (§16.0), con tokens `clamp()` (§7.1) o con Grid
  `auto-fit`/`minmax` (§16.2). Las media queries son el último recurso, no el primero.

---
