# Vim Dodge

Browser game for learning vim navigation. Dodge walls using vim keybindings.
No build step, no dependencies.

```
make run    # opens index.html in browser
make test   # runs unit tests with node
```

## Files

- `vim.js` (~400 lines) — pure vim logic, no DOM, CommonJS-exported for Node
- `vim.test.js` (~700 lines) — 105 tests using a custom harness with `assert`
- `index.js` (~900 lines) — game engine: rendering, walls, collision, game loop
- `index.html` — HTML structure, CSS, sidebar commands reference, keyboard display
- `Makefile` — `run` and `test` targets

## vim.js exports

Movement: `moveDown`, `moveUp`, `moveLeft`, `moveRight`, `gotoLine`,
`gotoLineStart`, `gotoLineEnd`, `gotoNextWordStart`, `gotoWordEnd`,
`gotoPrevWordStart`, `gotoParagraphUp`, `gotoParagraphDown`,
`findCharForward`, `findCharBackward`, `tillCharForward`,
`tillCharBackward`, `firstNonBlankCol`

Command processing: `parseCommand`, `isWaitingForChar`, `executeCommand`

## vim.js layout

| Lines     | Section                                        |
|-----------|------------------------------------------------|
| 1-57      | basic movement: `moveDown`, `moveUp`, `gotoLine`, `gotoParagraphUp/Down`, `moveLeft`, `moveRight`, `gotoLineStart`, `gotoLineEnd` |
| 59-96     | word movement: `gotoNextWordStart`, `gotoWordEnd`, `gotoPrevWordStart` |
| 98-138    | character search: `findCharForward/Backward`, `tillCharForward/Backward`, `firstNonBlankCol` |
| 142-248   | `parseCommand` — splits pendingKeys into digits (count) and rest (action), returns `{ complete, action, count, char }` |
| 250-260   | `isWaitingForChar` — checks if last key is `f`, `F`, `t`, `T`, `m`, `'`, or backtick |
| 264-371   | `executeCommand` — big if/else chain dispatching action strings to movement functions |
| 373-396   | CommonJS exports for Node                      |

## index.js layout

| Lines     | Section                                        |
|-----------|------------------------------------------------|
| 1-21      | `TEXT_LINES` content                           |
| 23-58     | grid layout constants, `PARAGRAPH_BREAKS`      |
| 60-81     | `noMash`, `lastKey`, `startingSpawnInterval`, `state` object |
| 83-99     | grid coordinate helpers                        |
| 101-190   | `handleKeyDown`, `recordPosition`              |
| 192-223   | `flashKey` keyboard visual feedback            |
| 225-379   | `render`, `drawText`, `drawCursor`, `drawWalls`, `drawStatusBar` |
| 381-421   | position targeting (aims walls at player)       |
| 423-542   | hint system                                    |
| 544-576   | `createRowWall`, `createColumnWall`            |
| 578-702   | `spawnWall`, `buildPatternList`, `pickPattern` |
| 704-785   | `updateWalls`, `checkCollision`                |
| 787-815   | `gameLoop`                                     |
| 817-868   | `restartGame`, `initSettings`, `startGame`     |

## Adding a new vim command

1. Add the movement function in `vim.js`
2. Wire it into `parseCommand` and `executeCommand` in `vim.js`
3. Add tests in `vim.test.js`, run `make test`
4. Update `handleKeyDown` in `index.js` to include the key in `isVimKey`
5. Update the sidebar commands reference in `index.html`
6. Activate the key on the keyboard display in `index.html` (add `active-key` class)

## Adding a new setting

1. Add an HTML input in the settings panel in `index.html`
2. Add a global variable in `index.js` near `noMash`/`startingSpawnInterval`
3. Read the initial DOM value and attach a listener in `initSettings`

## Things to know

- The sidebar and keyboard display in `index.html` are static HTML/CSS,
  not driven by JavaScript state. Update them manually.
- `index.html` loads `vim.js` before `index.js`. IDE "could not find name"
  warnings for vim.js functions referenced in index.js are false positives.
- Difficulty ramps by decreasing `spawnInterval` as score increases.
  Walls target the player using `positionHistory`.
- The `restartGame` function resets `state` fields but reads settings from
  the global variables, so changed settings persist across restarts.
