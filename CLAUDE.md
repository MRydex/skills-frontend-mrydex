# Claude Code Project Guidelines

## Frontend / Angular Stack Conventions
This project enforces the official **Angular 22+ (2026)** standards documented in [`skills/angular-buenas-practicas/SKILL.md`](./skills/angular-buenas-practicas/SKILL.md) (or `~/.claude/skills/angular-buenas-practicas/SKILL.md`):

- **Reactivity**: Strictly **Signals**. Never use `effect()` for state synchronization (use `computed()` or `linkedSignal()`).
- **Data Fetching**: Resource API only (`httpResource`, `rxResource`, `resource`).
- **Forms**: Signal Forms (`@angular/forms/signals`). Never Reactive Forms or `ngModel`.
- **Change Detection**: Zoneless (`provideZonelessChangeDetection()`). `OnPush` is default in v22; do not specify `changeDetection` or `standalone: true`.
- **Templates**: Native control flow (`@if`, `@for`, `@switch`, `@let`), `@defer`, and `NgOptimizedImage`.
- **Styling**: SCSS with BEM methodology. Avoid `::ng-deep`.
- **Architecture**: Vertical slices / feature-based folder structure.
- **Reference Manuals**: For details on each area, inspect `references/*.md` inside the skill directory.
