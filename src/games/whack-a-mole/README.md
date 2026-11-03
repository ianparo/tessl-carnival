# Whack-a-Mole

Moles pop up from a grid of nine holes. Whack as many as you can before the
clock runs out.

## How to play

- Click a mole while it's up to whack it.
- Each mole stays up for a moment, then drops back down.
- As the round goes on, moles pop up more often and stay up for less time:
  from one every 1 second, up for 1.2 seconds, at the start, to one every 0.35
  seconds, up for 0.55 seconds, at the end.
- A round lasts 30 seconds. Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Clicking an empty hole costs nothing.

Your final score is saved to the carnival's score board when the round ends.
If you go back to the midway part way through a round, the points you have
so far are saved instead, once.

## Files

- `game.ts`: the game logic (`createState`, `step`, `popUp`, `whack`,
  `spawnInterval`, `upTime`, `reportScore`) and the `whackAMole` entry, the default export the
  midway finds.
- `game.test.ts`: tests for the game logic.
