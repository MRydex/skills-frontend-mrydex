# Claude Code Project Guidelines

## Frontend / Angular Stack Conventions
This project enforces the official **Angular 22+ (2026)** standards documented in [`skills/desarrollo-buenas-practicas/SKILL.md`](./skills/desarrollo-buenas-practicas/SKILL.md) (or `~/.claude/skills/desarrollo-buenas-practicas/SKILL.md`):

- **Reactivity**: Strictly **Signals**. Never use `effect()` for state synchronization (use `computed()` or `linkedSignal()`).
- **Data Fetching**: Resource API only (`httpResource`, `rxResource`, `resource`).
- **Forms**: Signal Forms (`@angular/forms/signals`). Never Reactive Forms or `ngModel`.
- **Change Detection**: Zoneless (`provideZonelessChangeDetection()`). `OnPush` is default in v22; do not specify `changeDetection` or `standalone: true`.
- **Templates**: Native control flow (`@if`, `@for`, `@switch`, `@let`), `@defer`, and `NgOptimizedImage`.
- **Styling**: SCSS with BEM methodology. Avoid `::ng-deep`.
- **Architecture**: Vertical slices / feature-based folder structure. No filename/class suffixes (`user-list.ts` exports `UserList`).
- **Size**: Max 200 lines per component `.ts` or template `.html`, 250 per service, 150 per `.scss`. Split by responsibility.
- **Subcomponents**: Never a `components/` folder inside a feature. Nest each child inside its parent's folder. Only `shared/components/` is allowed, for components reused across features.
- **Reference Manuals**: For details on each area, inspect `references/*.md` inside the skill directory.

## Agent Efficiency (always on)
See `references/14-agent-efficiency.md`.

- **Adapt to the agent and models in use**: Model and tool names in the skill (Opus, Haiku, `/compact`, `AskUserQuestion`) are examples. Detect which agent and models are available and use the equivalent. Rules never change, only syntax (§14.7).
- **Caveman mode**: Terse replies, no filler, no tool-call narration. Technical terms, code and errors exact. Normal prose only for security warnings, irreversible actions, code, commits, PRs and docs.
- **Library lookups**: Before researching a library, check for another open agent session (`ListAgents`) that knows it and ask it (`SendMessage`). Then docs MCP, then `node_modules`, then web.
- **Orchestrate (advisor strategy)**: The strongest available model (Opus by default) plans, delegates and always reviews. Cheaper subagents (`Agent` with `model: "haiku"` or `"sonnet"`) execute search, reads, edits and boilerplate, in parallel when independent. Shared context in `tasks/brief-<task>.md`. Executors never guess: when stuck they return `NECESITA_ADVISOR: <question>`.
- **Ask upfront**: Before non-trivial work, ask all questions that change the result in one turn, with options and a recommended one (`AskUserQuestion`). Do not ask what the repo already answers.
- **Auto-compact**: At the end of each phase or before an unrelated task, save state to `tasks/todo.md` and run `/compact` with focus (keep decisions, touched files, pending items). Never mid-change or with a pending question.
- **Graphify first**: If missing, install it (`pip install graphifyy && graphify install`), then `graphify hook install` + `graphify claude install` in the repo. Query `graphify query "<question>"` before grep or reading files. After a task touching 3+ files or before compacting: `graphify update .`.
