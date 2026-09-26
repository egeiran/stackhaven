# Stackhaven – notes for Claude Code

A mobile-friendly, turn-based 3D container-stacking puzzle (Three.js + React +
pure TypeScript core). A harbour meta-layer comes later. Eivind owns the plan in
`plan.md`; read it at the start of a session.

## Commands

```sh
pnpm install
pnpm dev            # Vite dev server; add --host to open it on a phone on the same Wi-Fi
pnpm test           # Vitest (all *.test.ts under src/)
pnpm lint           # ESLint (incl. architecture boundaries) + prettier --check
pnpm typecheck      # tsc --noEmit
pnpm format         # prettier --write
pnpm check          # typecheck + lint + test
pnpm build          # production build to dist/
```

`?level=<id>` in the URL opens a level directly (e.g. `/?level=05-night-shift`).

## Architecture (hard rules, enforced by ESLint in `eslint.config.js`)

```
src/core/    Pure TypeScript + zod. No three, React, DOM, Math.random or Date.now.
             Types, rules, applyMove, level schema, undo history, stars, solver stub.
src/render/  Three.js, used imperatively. No React. May import core, and only
             *types* from app (it implements the GameRenderer port).
src/ui/      React. No three, no render. May import core and app.
src/app/     GameController + level registry. No three, no React, no render/ui.
src/levels/  Level JSON files only.
src/main.tsx Composition root: the only place that wires the layers together.
```

- Data flow: input (render/ui) → `GameController` → `applyMove` (core) → new
  state + events → `renderer.playEvents` (animation) → `GameView` → React.
  See `docs/ARCHITECTURE.md`.
- `applyMove` is pure: never mutate state; return a new state and events.
- Game logic never lives in render or ui. The renderer only animates events.
- Taps are never blocked by animations: the controller validates them against
  the logical state and queues the animations (see `GameController`).
- No global mutable state outside `GameController`. Module-level constants
  (shared geometries, `LEVELS`) are fine as long as they are never mutated.
- New mechanics are new `Rule`s (`src/core/rules.ts`), not edits to `applyMove`.
  A new move type or event is a type change in `core/types.ts` plus handling
  in `perform` (engine) and `animate` (renderer).
- Container colours live only in `src/core/palette.ts`; scene colours in
  `src/render/theme.ts`; player-facing text in `src/ui/strings.ts`.

## Conventions

- Code, comments, commit messages and docs: English. Explanations to Eivind: Norwegian.
- TypeScript strict with `noUncheckedIndexedAccess`; prefer `readonly` types.
- Every piece of core logic has tests. App logic is tested with a fake renderer.
- Levels: `src/levels/NN-name.json`, file name = `id`. `solution` must win the
  level in exactly `par` moves (checked by `src/app/levels.test.ts`).
- Ask before adding any dependency.
- Do not reformat `plan.md` (it is excluded from Prettier).

## Working agreement

- Work in small, coherent steps with **one commit per step** and a clear
  commit message (conventional style: `feat(core): …`, `fix: …`).
- After each step, explain briefly **in Norwegian** what was done and why, and
  name **one concept** Eivind should understand (e.g. "why applyMove is pure").
- Eivind does not need a check-in after every step; check in now and then,
  and always before outward-facing actions (creating the GitHub repo, pushing,
  enabling Pages).
- **Never implement the solver** (`src/core/solver.ts`, BFS/A*), not even as a
  throwaway helper. Eivind writes it himself in milestone 2; its spec is the
  skipped suite in `src/core/solver.test.ts`.
- Keep `plan.md` up to date: tick a task's checkbox when it is done, update
  «Status nå» (milestone, next task, date) at the end of each piece of work,
  and add notable decisions to «Beslutningslogg». Do not otherwise restructure
  or reword Eivind's plan.
- If something is unclear or contradictory, ask before building on a guess.
