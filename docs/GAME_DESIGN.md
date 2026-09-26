# Game design

## Concept

Stackhaven has two layers that feed each other (the Gardenscapes model):

1. **Shifts (puzzle layer).** Short, turn-based, hand-made levels in a container
   terminal. With a crane you move containers between stacks and deliver them
   to trucks in the right order, within a move limit. Good play earns stars.
2. **The harbour (meta layer).** A harbour in a Norwegian coastal town that you
   rebuild and decorate with your stars. No stress, no timers. Upgrades here
   unlock new puzzle mechanics.

Milestone 1 is only the puzzle layer, with simple but tidy graphics.

## Rules (version 1)

- The yard has `N` stacks, each at most `maxHeight` containers tall.
- Every container has an `id` and a `color` (its shipping line).
- An **order queue** lists the colours to deliver, in order. Only the first
  order can be fulfilled; its truck waits at the bay.
- Moves (each costs one move):
  - `move(from, to)`: move the top container of one stack onto another stack
    that is not full.
  - `deliver(from)`: deliver the top container of a stack to the truck, if its
    colour matches the first order.
- **Won** when the order queue is empty. **Lost** when the move limit is used up
  without winning. Winning on the last allowed move counts as a win.
- **Stars:** 3 at ≤ `par` moves, 2 at ≤ `par + 2`, otherwise 1.
- **Undo** is always available and unlimited, also after losing. Undo restores
  the move counter too, so it costs nothing.

### Controls

Tap a stack to pick up its top container (the crane rolls over and the stack
is highlighted). Tap another stack to move the container there, or tap the
truck to deliver it. Tap the selected stack again to cancel. Mouse and touch
work the same; nothing depends on hover.

## Level format

```json
{
  "id": "02-make-room",
  "name": "Make Room",
  "stacks": [["red", "blue"], ["green"], []],
  "maxHeight": 3,
  "orders": ["red", "green", "blue"],
  "moveLimit": 8,
  "par": 4,
  "solution": [
    { "type": "move", "from": 0, "to": 2 },
    { "type": "deliver", "from": 0 },
    { "type": "deliver", "from": 1 },
    { "type": "deliver", "from": 2 }
  ]
}
```

- `stacks` list colours **bottom first**; stack indices start at 0.
- Colours are the keys of `src/core/palette.ts`.
- `solution` must win in exactly `par` moves. `src/app/levels.test.ts` replays
  it. That proves the level is solvable and that `par` is achievable, but not
  that `par` is optimal; the solver in milestone 2 will check that.

## Making a level with the editor

1. Open `/editor.html` and load an existing level or start blank.
2. Pick a colour and click stacks to build the yard; add orders.
3. **Playtest** and win; **Save as solution** stores your moves and sets par.
4. **Play in 3D** to try it in the real game (on your phone too).
5. When the solver exists, **Solve** shows the optimal par and how many states
   it explored (a first measure of difficulty).
6. **Copy** the JSON into `src/levels/<id>.json` and run `pnpm test`.

## Designing levels: a lower bound on moves

Each order needs one `deliver`. A container must be moved at least once if it
sits above a container that has to be delivered before it. So:

> **minimum moves ≥ number of orders + number of containers that must be moved**

If your `solution` reaches that bound, `par` is optimal. If a container can
only be put somewhere it will block again, it has to move twice, which raises
the bound. This is also a good starting heuristic for A*.

### The five M1 levels

| #   | Name               | Par | Idea                                                                                                                                                                                                                                                                                               |
| --- | ------------------ | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | First Shift        | 4   | Only deliveries: learn "tap stack, tap truck" and the order queue.                                                                                                                                                                                                                                 |
| 2   | Make Room          | 4   | One container blocks the first order. Moving it onto green instead of the empty stack costs 2 extra moves.                                                                                                                                                                                         |
| 3   | Last In, First Out | 6   | Two blockers go into the empty stack, and must go in the right order (the one needed first on top).                                                                                                                                                                                                |
| 4   | Tight Quay         | 10  | No empty stack. Every place a blocker can go blocks something else, so green and purple both move twice: 6 orders + 4 moves.                                                                                                                                                                       |
| 5   | Night Shift        | 12  | The first order is under purple, the second under orange, and the only safe place for both is on top of the lone white container. Orange must go there first, then purple on top. Starting with the obvious move (purple first) leaves orange nowhere safe: at least 13 moves. 9 orders + 3 moves. |

## Ideas for later mechanics

Each of these should be possible as a new `Rule` (plus new events and
animations) without rewriting the core:

- **Reefer containers:** must be plugged into a powered stack (limited sockets)
  or on a truck within N moves.
- **Locked stacks:** a stack is locked until a key container is delivered or
  a harbour upgrade is bought.
- **Trains:** a rail track takes several containers at once, in a fixed order.
- **Storm:** after N moves a stack is closed, or the maximum height drops.
- **Two-order containers:** one container fulfils two orders in a row.
- **Ships:** a vessel bay with its own stacking plan (the reverse puzzle:
  load in the right order).
- **Heavy containers:** can only be stacked at the bottom, or the crane is
  slower (costs 2 moves).
- **Hazardous cargo:** must not be stacked next to or on top of certain colours.
- **Colour-blind mode:** symbols or patterns on containers and order chips.
- **Tides** (from the plan's parking lot): change which quays can be used.
- **Daily challenges** generated and verified by the solver.
