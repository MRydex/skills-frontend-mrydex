# Claude Code Project Guidelines

## Frontend / Angular Stack Conventions
This project enforces the official **Angular 22+ (2026)** standards documented in [`skills/desarrollo-buenas-practicas/SKILL.md`](./skills/desarrollo-buenas-practicas/SKILL.md) (or `~/.claude/skills/desarrollo-buenas-practicas/SKILL.md`):

- **Reactivity**: Strictly **Signals**. Never use `effect()` for state synchronization (use `computed()` or `linkedSignal()`).
- **Data Fetching**: Resource API only (`httpResource`, `rxResource`, `resource`).
- **Forms**: Signal Forms (`@angular/forms/signals`). Never Reactive Forms or `ngModel`.
- **Change Detection**: Zoneless (`provideZonelessChangeDetection()`). `OnPush` is default in v22; do not specify `changeDetection` or `standalone: true`.
- **Templates**: Native control flow (`@if`, `@for`, `@switch`, `@let`), `@defer`, and `NgOptimizedImage`.
- **Styling**: SCSS with BEM methodology. Avoid `::ng-deep`.
- **Architecture**: Vertical slices / feature-based folder structure.
- **Reference Manuals**: For details on each area, inspect `references/*.md` inside the skill directory.

## Agent Efficiency (always on)
See `references/14-agent-efficiency.md`.

- **Caveman mode**: Terse replies, no filler, no tool-call narration. Technical terms, code and errors exact. Normal prose only for security warnings, irreversible actions, code, commits, PRs and docs.
- **Library lookups**: Before researching a library, check for another open agent session (`ListAgents`) that knows it and ask it (`SendMessage`). Then docs MCP, then `node_modules`, then web.
- **Orchestrate**: Main model plans, decides and verifies. Delegate search, large reads, mechanical edits and boilerplate to cheaper subagents (`Agent` with `model: "haiku"` or `"sonnet"`), in parallel when independent.

