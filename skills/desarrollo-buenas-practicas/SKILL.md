---
name: desarrollo-buenas-practicas
version: 1.0.0
description: >
  Convenciones oficiales del equipo para proyectos Angular 22+ (2026) y Frontend Moderno: standalone components, signals como único modelo de reactividad, zoneless, OnPush por defecto, control flow nativo (@if/@for/@switch/@let), Signal Forms, Resource API (httpResource/rxResource/resource), interceptores funcionales (spinner/errores), TypeScript 6 estricto, HTML5 semántico y accesible (WCAG AA / @angular/aria), BEM, SCSS anidado, layouts fluidos (Flexbox/Grid) y animaciones modernas. Usar siempre que se pida crear, modificar, revisar, depurar o refactorizar código Angular, TypeScript, HTML o SCSS/CSS.
---

# Desarrollo Frontend — Buenas Prácticas del Equipo (Angular 22+)

Este skill codifica las convenciones **obligatorias** del equipo para proyectos **Angular 22+** y desarrollo Frontend de alta calidad: standalone components, **signals como único modelo de reactividad**, **zoneless**, **OnPush por defecto**, control flow nativo, **Signal Forms** (estables en v22), la **Resource API** (`httpResource` / `rxResource` / `resource`), **interceptores funcionales** para concerns transversales (spinner, errores) y las convenciones de naming oficiales (sin sufijos `.component`, `.service`).

> **Regla maestra**: si una API legacy tiene un equivalente moderno (signals, control flow nativo, `inject()`, `input()`, `httpResource`, Signal Forms, `host: {}`, interceptores funcionales), **siempre usar el moderno**. Cualquier uso de la API legacy debe estar justificado por interoperabilidad con código existente y documentado en el PR.

---

### Las 5 reglas que más se violan (leer siempre)

1. **Nunca `effect()`.** Derivar con `computed()` / `linkedSignal()`, cargar con la Resource API, y resolver los concerns transversales con interceptores. Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
2. **Nunca `Observable` / `Subject` / `BehaviorSubject` como estado.** El estado es siempre signals. Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
3. **Nunca Reactive Forms ni `ngModel`.** Solo **Signal Forms** (`@angular/forms/signals`). Ver [06-signal-forms.md](./references/06-signal-forms.md).
4. **Nunca `changeDetection: ChangeDetectionStrategy.OnPush` explícito**: es el **default en v22**. Tampoco `standalone: true`. Ver [02-typescript-signals.md](./references/02-typescript-signals.md).
5. **Nunca `[ngClass]` / `[ngStyle]` / `*ngIf` / `*ngFor` / `*ngSwitch`.** Usar control flow nativo y class/style bindings estándar. Ver [03-html-templates.md](./references/03-html-templates.md).

---

## 0. Stack y supuestos del proyecto

- **Angular 22+** (v22.x). Todo lo marcado como "v21" sigue siendo válido salvo que se indique.
- **Zoneless**: `provideZonelessChangeDetection()` / default en v21+.
  - **Nunca** importar `zone.js` ni usar `provideZoneChangeDetection()`.
- **`OnPush` es la estrategia de detección de cambios por defecto desde v22.** La antigua `Default` se renombró a **`Eager`** y está deprecada. **No declarar `changeDetection` en componentes nuevos.**
- **Standalone first**: sin `NgModule` salvo dependencias legacy de terceros.
- **TypeScript 6** (v22 lo exige; TS 5.9 ya no está soportado). Node 26 soportado, Node 20 no.
- **`HttpClient` usa `FetchBackend` por defecto** en v22 → `withFetch()` es innecesario y está deprecado. Si se necesita progreso de **subida**, hace falta `provideHttpClient(withXhr())` + `reportUploadProgress`; para progreso de bajada alcanza `reportDownloadProgress`.
- **Vitest** como test runner (no Karma/Jasmine).
- **TypeScript estricto** (`strict`, `noImplicitAny`, `strictTemplates`).
- **Incremental Hydration** viene activada por defecto con `provideClientHydration()` (desactivable con `withNoIncrementalHydration()`).
- Imágenes estáticas vía `NgOptimizedImage`.
- Accesibilidad: AXE limpio + WCAG **AA** mínimo. Para primitivas headless accesibles usar **`@angular/aria`** (estable desde v22).
- **NG-ZORRO** como librería de componentes en la mayoría de los proyectos del equipo.

---

## Índice Modular de Referencias (Progressive Disclosure)

Consulta el archivo de referencia correspondiente según la tarea que estés realizando:

| Módulo / Archivo de Referencia | Temas Cubiertos | Cuándo Consultar |
| :--- | :--- | :--- |
| **[01-project-structure.md](./references/01-project-structure.md)** | Estructura de carpetas híbrida (core, shared, features), vertical slices, convenciones de nombres sin sufijos (`app.ts`, `auth.ts`), barrel files `index.ts`. | Al crear carpetas, componentes, servicios o definir la arquitectura de una feature. |
| **[02-typescript-signals.md](./references/02-typescript-signals.md)** | TypeScript 6, signals (`signal`, `computed`, `linkedSignal`), `input()`, `output()`, `model()`, `inject()`, `host: {}`, `injectAsync`, tipado estricto, anti-patrones. | Al escribir o refactorizar lógica de componentes, servicios, estados o tipos TS. |
| **[03-html-templates.md](./references/03-html-templates.md)** | Control flow nativo (`@if`, `@for`, `@switch`, `@let`), `@defer`, imágenes con `NgOptimizedImage`, accesibilidad ARIA, bindings de clases y estilos. | Al diseñar o modificar plantillas HTML de componentes. |
| **[04-resource-api.md](./references/04-resource-api.md)** | `httpResource`, `rxResource`, `resource`, manejo de parámetros reactivos, recargas (`reload()`), mutaciones optimistas, cancelación. | Al realizar llamadas HTTP de lectura o integrar datos asíncronos en componentes. |
| **[05-http-interceptors.md](./references/05-http-interceptors.md)** | Interceptores funcionales (`HttpInterceptorFn`), spinner global, manejo transversal de errores, `HttpContextToken` (`SKIP_SPINNER`, etc.), retries. | Al configurar infraestructura HTTP, headers de autenticación, spinners o manejo de errores. |
| **[06-signal-forms.md](./references/06-signal-forms.md)** | Signal Forms (`@angular/forms/signals`), `formGroup`, validaciones síncronas/asíncronas, estado reactivo (`valid`, `dirty`, `touched`), submits. | Al crear o modificar formularios de captura o edición de datos. |
| **[07-styles-scss.md](./references/07-styles-scss.md)** | SCSS moderno, anidación segura, metodología BEM, variables CSS y diseño atómico, evitar `::ng-deep` mediante ViewEncapsulation o clases globales. | Al escribir estilos CSS/SCSS o maquetar componentes visuales. |
| **[08-testing-vitest.md](./references/08-testing-vitest.md)** | Configuración de Vitest, pruebas unitarias con Signals, mocks de `httpResource` y servicios con `inject()`, validación de templates. | Al escribir pruebas unitarias o de integración en Angular. |
| **[09-performance-zoneless.md](./references/09-performance-zoneless.md)** | Detección de cambios zoneless, OnPush por defecto, optimización de renderizado, evitar triggers innecesarios de CD. | Al diagnosticar problemas de rendimiento o ciclos de refresco. |
| **[10-environment-tooling.md](./references/10-environment-tooling.md)** | Schematics del equipo, configuración de IIS (`web.config` con rewrite rules), backend .NET (CORS, URLs relativas/absolutas), variables de entorno. | Al desplegar en producción, configurar IIS o integrar con backend .NET. |
| **[11-workflow-orchestration.md](./references/11-workflow-orchestration.md)** | Modo plan obligatorio para cambios no triviales, orquestación de subagentes, loop de auto-mejora, principios senior (Simplicity First, No Laziness). | Para guiar el comportamiento y razonamiento del agente al ejecutar tareas complejas. |
| **[12-html5-semantics-seo.md](./references/12-html5-semantics-seo.md)** | Fundamentos de HTML5: etiquetas semánticas (`<main>`, `<header>`, etc.), accesibilidad ARIA, SEO y meta tags, formularios nativos. | Al trabajar en estructura base HTML, auditorías de accesibilidad o SEO. |
| **[13-css3-layouts-animations.md](./references/13-css3-layouts-animations.md)** | Fundamentos CSS3: modelo de caja, especificidad, Flexbox, CSS Grid, animaciones scroll-driven, `@starting-style`, `interpolate-size`, `<dialog>`. | Al diseñar layouts complejos, maquetación responsiva o microinteracciones. |
| **[checklists.md](./references/checklists.md)** | Checklist completo de Angular y Checklist de HTML5/CSS3 para verificación y code reviews. | Antes de entregar cualquier código o al revisar un Pull Request. |

---

## Verificación Rápida (Do & Don't)

```typescript
// ❌ INCORRECTO (Legacy / Prohibido)
@Component({
  selector: 'app-user-profile',
  standalone: true, // Innecesario en v22
  changeDetection: ChangeDetectionStrategy.OnPush, // Innecesario: OnPush es default
  template: `
    <div *ngIf="user$ | async as user" [ngClass]="{'active': isActive}">
      <span *ngFor="let item of items">{{ item }}</span>
    </div>
  `
})
export class UserProfileComponent {
  @Input() userId!: string;
  @Output() updated = new EventEmitter<void>();
  user$ = this.http.get<User>(`/api/users/${this.userId}`);
  constructor(private http: HttpClient) {}
}

// ✅ CORRECTO (Angular 22+)
@Component({
  selector: 'app-user-profile',
  template: `
    @if (userResource.value(); as user) {
      <div class="user-profile" [class.user-profile--active]="isActive()">
        @for (item of items(); track item.id) {
          <span class="user-profile__item">{{ item.name }}</span>
        }
      </div>
    }
  `
})
export class UserProfile {
  readonly userId = input.required<string>();
  readonly updated = output<void>();
  readonly isActive = signal(false);
  readonly items = signal<Item[]>([]);

  readonly userResource = httpResource<User>(() => `/api/users/${this.userId()}`);
}
```

