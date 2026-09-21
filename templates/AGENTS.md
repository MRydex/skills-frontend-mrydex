# Agent Guidelines (AGENTS.md)

This project strictly follows the **Angular 22+ & Modern Frontend Best Practices** defined in the project skills:

👉 **Skill Entrypoint**: [`skills/desarrollo-buenas-practicas/SKILL.md`](./skills/desarrollo-buenas-practicas/SKILL.md) (or [`.agents/skills/desarrollo-buenas-practicas/SKILL.md`](./.agents/skills/desarrollo-buenas-practicas/SKILL.md))

## Golden Rules
1. **Never use `effect()`**: Derive with `computed()` / `linkedSignal()`, fetch with Resource API (`httpResource`/`rxResource`).
2. **Never use `Observable`/`Subject` as state**: All state must be Angular Signals.
3. **Never use Reactive Forms or `ngModel`**: Always use **Signal Forms** (`@angular/forms/signals`).
4. **Never declare `standalone: true` or `changeDetection: OnPush`**: They are the default in Angular 22.
5. **Never use `*ngIf`, `*ngFor`, `*ngSwitch`, `[ngClass]`, `[ngStyle]`**: Use native control flow (`@if`, `@for`, `@switch`, `@let`) and standard class/style bindings.
6. **No suffixes in filenames/classes**: `user-profile.ts` exporting `UserProfile` (not `UserProfileComponent`).
7. **Semantic HTML & WCAG AA**: Clean AXE audits, BEM naming, nested SCSS.

