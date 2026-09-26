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
8. **No monolithic files**: Max 200 lines per component `.ts` or template `.html`, 250 per service, 150 per `.scss`. Split by responsibility.
9. **No `components/` folder for subcomponents**: Nest each child inside its parent's folder (`detail/sub-detail/sub-detail-header/`). Only exception: `shared/components/` for components reused across features.

## Agent Efficiency (always on)
Details in `references/14-agent-efficiency.md`.
1. **Caveman mode**: Terse replies, no filler. Technical terms, code and errors exact. Normal prose for security warnings, irreversible actions, code, commits, PRs and docs.
2. **Ask before researching libraries**: If another agent session is open and knows the library, ask it first. Then docs MCP, then `node_modules`, then web.
3. **Orchestrate with cheap subagents**: Main model plans and verifies; smaller/cheaper subagents run search, reads, mechanical edits and boilerplate.

