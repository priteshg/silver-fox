# Development Rules

These rules govern how future work — by Claude Code or anyone else — gets
done in this repository. They exist to keep a small, clean foundation from
turning into an unmaintainable one as features are added.

## General discipline

- Prefer existing project code over creating duplicate functionality. Check
  `packages/domain`, `packages/types`, `packages/validation`, `packages/ui`,
  and `packages/config` before writing something new.
- Do not add a dependency without first checking whether the requirement can
  be solved with an existing dependency or platform functionality.
- Do not modify unrelated files. A change should touch what the task
  requires and nothing else.
- Do not refactor working code unless the current task requires it.
- Keep components small and focused.
- Keep business logic outside UI components — it belongs in
  `packages/domain`, called from the component.
- Keep domain models independent from infrastructure. `packages/domain` and
  `packages/types` must never import React, React Native, Next.js, or
  Supabase.
- Write tests for meaningful business logic (see `packages/domain`'s
  `src/__tests__` for the pattern). Trivial getters/UI glue don't need unit
  tests; calculations and validation do.

## After making changes

- Run relevant tests: `pnpm test` (or scoped with `--filter`).
- Run TypeScript checks: `pnpm typecheck`.
- Run linting: `pnpm lint`.
- Fix anything you broke before considering a task done.

## Architecture and scope

- Do not silently change architectural decisions (e.g. the package
  boundaries in [architecture.md](./architecture.md), the `.native.tsx`
  pattern in `packages/ui`, or the pinned dependency versions below). If a
  task genuinely requires one, explain the decision briefly before
  implementing it.
- When a task requires a new architectural decision (a new package, a new
  cross-cutting dependency, a new pattern), explain the decision briefly
  before implementing it, rather than deciding silently mid-implementation.
- Do not build future functionality speculatively. For every new feature,
  implement the smallest complete vertical slice first (one entity, one
  screen, one flow, end to end) rather than scaffolding broadly.

## Working efficiently

- Token efficiency matters. Before making changes, inspect the existing
  repository rather than guessing at its shape.
- Do not repeatedly reread files unnecessarily within a single task.
- Do not generate large amounts of code unless the task actually requires
  it — prefer the smallest correct change.
- Do not provide lengthy explanations after completing a task. Report what
  changed, what tests were run, and any issues — nothing more.

## Pinned versions and why

TypeScript is pinned to **6.0.3**, not the newer 7.x line, because
`typescript-eslint` (the linting toolchain used across every package)
currently caps its `typescript` peer dependency below `6.1.0`. Check that
constraint again before upgrading TypeScript.

`pnpm` is configured with `node-linker=hoisted` in `.npmrc`. This is Expo's
documented recommendation for pnpm monorepos, since Metro (React Native's
bundler) does not transform `node_modules` — including pnpm's strict,
symlinked default layout — as reliably as a hoisted, npm-like layout.

Check current stable versions before upgrading any of the above, rather than
assuming these pins are still current — this document will not always be
updated the moment a newer version ships.
