# Stackhaven

A turn-based 3D container-stacking puzzle for the web, built mobile first.
Move containers between stacks with a gantry crane and deliver them to the
trucks in the right order, within a limited number of moves. Later, the stars
you earn will rebuild a harbour in a Norwegian coastal town.

**Play it:** https://egeiran.github.io/stackhaven/ (works on phones)

**Status:** milestone 1, a playable stacking puzzle with five levels.

## Tech

TypeScript (strict) · Vite · Three.js (used directly, no React Three Fiber) ·
React for the UI · zod for level validation · Vitest · ESLint + Prettier · pnpm.

## Running it

Requires Node 22.12+ and pnpm.

```sh
pnpm install
pnpm dev            # http://localhost:5173
pnpm dev --host     # also reachable from a phone on the same Wi-Fi
```

Open a level directly with `?level=<id>`, e.g. `http://localhost:5173/?level=03-last-in-first-out`.

Other scripts:

```sh
pnpm test        # unit tests
pnpm lint        # ESLint (incl. architecture boundaries) + Prettier check
pnpm typecheck   # TypeScript
pnpm check       # all three
pnpm build       # production build in dist/
pnpm preview     # serve the production build
```

## How to play

Tap a stack to pick up its top container, then tap another stack to move it
there, or the truck to deliver it. Only the truck at the front of the queue can
be loaded. Finish in few moves for more stars; undo is always free.

## Project layout

```
src/
  core/     rules and game state: pure TypeScript, fully unit tested
  app/      GameController: glue between input, rules, renderer and UI
  render/   Three.js scene, crane/truck animation, touch & mouse picking
  ui/       React HUD, level select, result modal
  editor/   level editor page (editor.html)
  levels/   levels as JSON
docs/
  ARCHITECTURE.md   layers and data flow
  GAME_DESIGN.md    rules, level design notes, ideas
```

## Level editor

`/editor.html` (locally http://localhost:5173/editor.html, or
https://egeiran.github.io/stackhaven/editor.html) is a small 2D editor: build a
yard by clicking, set the orders, playtest to record a solution, check it, and
copy the JSON. **Play in 3D** opens the draft in the real game through a link,
which also works on a phone.

Adding a level: save the JSON as `src/levels/<id>.json` (see
`docs/GAME_DESIGN.md`) and run `pnpm test`, which validates it and replays its
solution.

## Deployment

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, tests and a
build on every push, and deploys `main` to GitHub Pages. In the repository
settings, set **Pages → Source** to **GitHub Actions**. The Vite `base` is
relative (`./`), so the build works at any path.
