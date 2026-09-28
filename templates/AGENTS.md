# Agent Guidelines (AGENTS.md)

This project strictly follows the **Angular 22+ & Modern Frontend Best Practices** defined in the project skills:

👉 **Skill Entrypoint**: [`skills/desarrollo-buenas-practicas/SKILL.md`](./skills/desarrollo-buenas-practicas/SKILL.md) (or [`.agents/skills/desarrollo-buenas-practicas/SKILL.md`](./.agents/skills/desarrollo-buenas-practicas/SKILL.md))

**How to load it (any agent):** at the start of every coding session, read `SKILL.md` fully. Then read only the `references/*.md` file (and section) that matches the current task, as listed in its reference index. Do not load all references at once.

## Golden Rules
1. **Never use `effect()`**: Derive with `computed()` / `linkedSignal()`, fetch with Resource API (`httpResource`/`rxResource`).
2. **Never use `Observable`/`Subject` as state**: All state must be Angular Signals.
3. **Never use Reactive Forms or `ngModel`**: Always use **Signal Forms** (`@angular/forms/signals`).
4. **`changeDetection` by Angular version** (read `@angular/core` in `package.json`): v22+ never declare it (OnPush is the default); below v22 always set `ChangeDetectionStrategy.OnPush`. `standalone: true` only in v18 or lower.
5. **Never use `*ngIf`, `*ngFor`, `*ngSwitch`, `[ngClass]`, `[ngStyle]`**: Use native control flow (`@if`, `@for`, `@switch`, `@let`) and standard class/style bindings.
6. **No suffixes in filenames/classes**: `user-profile.ts` exporting `UserProfile` (not `UserProfileComponent`).
7. **Semantic HTML & WCAG AA**: Clean AXE audits, BEM naming, nested SCSS. Repeated SCSS goes to its ITCSS (inverted triangle) layer (token, `@mixin`, `.o-*`, `.u-*`), never copied or `@extend`ed.
8. **No monolithic files**: Max 200 lines per component `.ts` or template `.html`, 250 per service, 150 per `.scss`. Split by responsibility.
9. **No `components/` folder for subcomponents**: Nest each child inside its parent's folder (`detail/sub-detail/sub-detail-header/`). Only exception: `shared/components/` for components reused across features.
10. **Security always (Red Team + Blue Team)**: Every change passes the Red Team review in `references/15-security.md` §15.2. Never disable protections (sanitizer, CSP, XSRF, backend validation), never `bypassSecurityTrust*` with external data, never tokens in `localStorage`, never secrets in the front. Report every vulnerability found, even out of scope.
11. **Reuse**: Before creating a component, search for an existing one. Repeated UI (user picker, data table, search box) becomes one reusable component, never adapted copies (§1.5).
12. **AI files in `.gitignore`**: The project `.gitignore` excludes every AI/agent file (`.claude/`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `graphify-out/`, `tasks/todo.md`...). Ask before `git rm --cached` (§10.9).
13. **No tests**: Never create test files (`*.spec.ts`, `*.test.ts`, `tests/`). Set `skipTests: true` in `angular.json` schematics. Verify with build, lint and manual testing in the app (`references/08-sin-tests.md`).

## Agent Efficiency (always on)
Details in `references/14-agent-efficiency.md`.
0. **Adapt to the agent and models in use**: This file applies to any agent (Codex, Antigravity, Copilot, Cursor, Gemini CLI, Claude Code...). Model and tool names in the skill are examples: detect which agent and models you have and use the equivalent. Rules never change, only syntax (§14.7).
1. **Caveman mode**: Terse replies, no filler. Technical terms, code and errors exact. Normal prose for security warnings, irreversible actions, code, commits, PRs and docs.
2. **Ask before researching libraries**: If another agent session is open and knows the library, ask it first. Then docs MCP, then `node_modules`, then web.
3. **Orchestrate with cheap subagents (advisor strategy)**: The strongest available model (e.g. Opus, GPT with high reasoning effort, Gemini Pro) plans, delegates and always reviews. Cheaper models (e.g. Sonnet/Haiku, mini, Flash) execute as subagents, in parallel when independent. If the agent cannot spawn subagents with another model, switch models per phase: strong plans, cheap executes, strong reviews. Executors never guess: when stuck they return `NECESITA_ADVISOR: <question>`.
4. **Ask upfront**: Before non-trivial work, ask all questions that change the result in one turn, with a recommended option.
5. **Auto-compact**: At the end of each phase, save state to `tasks/todo.md` and compact or summarize the context.
6. **Graphify startup (mandatory, first action of every session, before searching, reading or editing)**: run `graphify --help`, `graphify hook status` and `graphify update .`. Command not found → `pip install graphifyy && graphify install` --platform <agent>. `warning: skill is from graphify X, package is Y` → `pip install --upgrade graphifyy && graphify install` --platform <agent>. Hooks not installed → `graphify hook install` + `graphify <agent> install`. Then the first search on the code is always `graphify query "<question>"`; grep/read to explore without a prior query violates the skill. After a task touching 3+ files: `graphify update .`.
