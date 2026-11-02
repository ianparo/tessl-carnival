---
name: review-carnival-house-rules
description: Review a change to a carnival game for house rules 1 to 3 in AGENTS.md, where a game registers on the midway, reports scores through recordScore from src/carnival, and draws with theme and canvasFont. Use as one lens in a code review run on changes under src/games/.
---

# Review lens: Carnival House Rules

Review whether a changed game under `src/games/` keeps the carnival's first three house rules, as written in the root `AGENTS.md`.

## Scope

- **Registration** (house rule 1) A game lives in `src/games/<game-id>/`, and its `game.ts` has its `CarnivalGame` as the default export. `src/games/index.ts` finds it from there, and the folder name and the game's `id` match.
- **Scores** (house rule 2) A game calls `recordScore(game.id, score)`, imported from `src/carnival`, once, when a round ends. It never reads or writes local storage itself, and keeps no high score table of its own.
- **Theme** (house rule 3) A game takes its colours, fonts and sizes from `theme` and `canvasFont` in `src/carnival/theme.ts`, with no hex colours or font strings of its own.

Only code under `src/games/` is in scope. Do not report code outside it: `src/carnival/` defines the theme and the scores module, so it holds the hex colours, font strings and local storage calls the games must not, and `src/midway/palette.ts` has its own scenery colours, built on the theme.

## Method

Read the house rules in the root `AGENTS.md` first, and treat them as the standard. If the rules there have changed, follow the written rules over this lens.

For each changed `game.ts`, check that it has a default export of a `CarnivalGame`, and that its `id` is the name of the folder it sits in.

Trace every path that ends a round, including game over, a timer running out, and the player leaving through the cleanup function `start` returns. Count the `recordScore` calls each path reaches: none means the round's score never reaches the midway, more than one records the same round twice. Check that the call is imported from `src/carnival`, and that the id passed is the game's `id`.

Search the changed game for `localStorage`, `sessionStorage`, `indexedDB` and `document.cookie`, and for a list or record of past scores the game keeps between rounds.

Search the changed game for colour literals (`#rgb`, `#rrggbb`, `rgb(`, `rgba(`, `hsl(`, named CSS colours assigned to `fillStyle`, `strokeStyle` or `shadowColor`) and for font strings (anything assigned to `ctx.font` that is not built by `canvasFont`, or a literal font family).

Know what already breaks on its own, so the reported consequence is accurate:

- A `game.ts` with no default export, or whose `id` differs from its folder name, makes `src/games/index.ts` throw when the midway loads, so the midway fails to load for every player, not only this game. `src/games/index.test.ts` imports the registry, so `npm run check` fails too.
- A missing `recordScore` call breaks nothing that tests catch: the game plays, but its booth card on the midway never shows a best score.
- A hex colour or font string breaks nothing for the player either: the game looks out of place among the other booths, and a later change to the theme skips it.

## Threshold

Report a change that breaks one of house rules 1 to 3 in code under `src/games/`.

Do not report:

- Values derived from the theme, such as a colour built from `theme.colors`, a size computed from `theme.font` or `theme.canvas`, or an alpha applied to a theme colour.
- Test data in `game.test.ts`, such as a fixture score or an id string in an assertion.
- Anything lint, the type-checker or the tests already enforce, such as a missing default export or an `id` that differs from its folder name, which make `src/games/index.test.ts` fail. Report these only when the change also edits or skips that test so it no longer catches them.
- Code outside `src/games/`.

## Reporting

- Name the house rule by number, and quote the line of code that breaks it.
- State the consequence the code actually has, as described under Method: who sees it, and whether anything fails. Do not claim a player-facing break where there is none.
- For a score that is recorded zero times or twice, name the path that ends the round and where the `recordScore` call belongs on it.
- For a colour or font, name the `theme` key or the `canvasFont` call that replaces it. If no theme key fits, say so: the fix is a separate change to `src/carnival/theme.ts`, under house rule 7.
