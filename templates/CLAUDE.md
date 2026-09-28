# Claude Code Project Guidelines

## Frontend / Angular Stack Conventions
This project enforces the official **Angular 22+ (2026)** standards documented in [`skills/desarrollo-buenas-practicas/SKILL.md`](./skills/desarrollo-buenas-practicas/SKILL.md) (or `~/.claude/skills/desarrollo-buenas-practicas/SKILL.md`):

- **Reactivity**: Strictly **Signals**. Never use `effect()` for state synchronization (use `computed()` or `linkedSignal()`).
- **Data Fetching**: Resource API only (`httpResource`, `rxResource`, `resource`).
- **Forms**: Signal Forms (`@angular/forms/signals`). Never Reactive Forms or `ngModel`.
- **Change Detection**: Zoneless (`provideZonelessChangeDetection()`). Check `@angular/core` in `package.json`: v22+ do not specify `changeDetection` (OnPush is default); below v22 always set `ChangeDetectionStrategy.OnPush`. `standalone: true` only in v18 or lower.
- **Templates**: Native control flow (`@if`, `@for`, `@switch`, `@let`), `@defer`, and `NgOptimizedImage`.
- **Styling**: SCSS with BEM methodology. Avoid `::ng-deep`. `@use` without relative paths (`@use 'notificaciones/notificaciones-header' as notif;`, via `includePaths: ["src/assets/styles"]`); module partials live in `assets/styles/<module>/_<module>-<part>.scss`. When SCSS repeats, extract it to its ITCSS (inverted triangle) layer: token, `@mixin`, `.o-*` object or `.u-*` utility. Never copy it or use `@extend`.
- **Same-route navigation**: To reset state on a link to the current route, recreate the component with `router.routeReuseStrategy.shouldReuseRoute = () => false` (plus `onSameUrlNavigation: 'reload'`) and restore it in `DestroyRef.onDestroy`. Do not reset state by hand.
- **Architecture**: Vertical slices / feature-based folder structure. No filename/class suffixes (`user-list.ts` exports `UserList`).
- **Size**: Max 200 lines per component `.ts` or template `.html`, 250 per service, 150 per `.scss`. Split by responsibility.
- **Subcomponents**: Never a `components/` folder inside a feature. Nest each child inside its parent's folder. Only `shared/components/` is allowed, for components reused across features.
- **No over-engineering**: Do not split into subcomponents unless the file exceeds its size limit, the block is reused, or it has its own logic; small one-off blocks stay in the parent template. Simplest solution that solves today's request. No abstractions, layers, generics, tokens or libraries "just in case"; abstract only when code appears a second time (§11.7.1).
- **No tests**: Never create test files (`*.spec.ts`, `*.test.ts`, `tests/`). Set `skipTests: true` in `angular.json` schematics. Verify with build, lint and manual testing in the app (`references/08-sin-tests.md`).
- **Reuse**: Before creating a component, search for an existing one. Repeated UI (user picker, data table, search box) becomes one reusable component, never adapted copies (`references/01-project-structure.md` §1.5).
- **AI files in `.gitignore`**: Make sure the project `.gitignore` excludes every AI/agent file (`.claude/`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `graphify-out/`, `tasks/todo.md`...). Ask before `git rm --cached` (§10.9).
- **Security (always)**: Every change passes the Red Team review in `references/15-security.md` §15.2. Never disable protections (sanitizer, CSP, XSRF, backend validation), never use `bypassSecurityTrust*` with external data, never store tokens in `localStorage`, never put secrets in the front. Report every vulnerability found, even out of scope.
- **Reference Manuals**: For details on each area, inspect `references/*.md` inside the skill directory.

## Agent Efficiency (always on)
See `references/14-agent-efficiency.md`.

- **Adapt to the agent and models in use**: Model and tool names in the skill (Opus, Haiku, `/compact`, `AskUserQuestion`) are examples. Detect which agent and models are available and use the equivalent. Rules never change, only syntax (§14.7).
- **Caveman mode**: Terse replies, no filler, no tool-call narration. Technical terms, code and errors exact. Normal prose only for security warnings, irreversible actions, code, commits, PRs and docs.
- **Library lookups**: Before researching a library, check for another open agent session (`ListAgents`) that knows it and ask it (`SendMessage`). Then docs MCP, then `node_modules`, then web.
- **Orchestrate (advisor strategy)**: The strongest available model (Opus by default) plans, delegates and always reviews. Cheaper subagents (`Agent` with `model: "haiku"` or `"sonnet"`) execute search, reads, edits and boilerplate, in parallel when independent. Shared context in `tasks/brief-<task>.md`. Executors never guess: when stuck they return `NECESITA_ADVISOR: <question>`.
- **Ask upfront**: Before non-trivial work, ask all questions that change the result in one turn, with options and a recommended one (`AskUserQuestion`). Do not ask what the repo already answers.
- **Auto-compact**: At the end of each phase or before an unrelated task, save state to `tasks/todo.md` and run `/compact` with focus (keep decisions, touched files, pending items). Never mid-change or with a pending question.
- **Graphify startup (mandatory, first action of every session, before searching, reading or editing)**: run `graphify --help`, `graphify hook status` and `graphify update .`. Command not found → `pip install graphifyy && graphify install`. `warning: skill is from graphify X, package is Y` → `pip install --upgrade graphifyy && graphify install`. Hooks not installed → `graphify hook install` + `graphify claude install`. Then the first search on the code is always `graphify query "<question>"`; grep/read to explore without a prior query violates the skill. After a task touching 3+ files or before compacting: `graphify update .`.
