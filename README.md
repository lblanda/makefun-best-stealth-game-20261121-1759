# Night Vault

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/lblanda/makefun-best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/lblanda/makefun-best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Night Vault is a top-down stealth game: slip through a sleeping museum after dark, steal all three archive cores, and reach the green exit unseen. Four wardens walk patrols with sweeping vision cones, two security cameras sweep the halls, hedges hide you, crates block sight, and a tossed coin buys you a distraction. Run and you are loud; sneak and you are slow. Get spotted and the chase is on — break line of sight, wait out the search, and try again.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network: the game is static files under `game/`.

## Play

- **WASD / arrows** — move
- **Shift** — run (fast, loud)
- **C** — sneak (slow, hard to see)
- **E** — take a core
- **Click** — toss a coin to distract a guard
- **P** — pause · **M** — mute

Win by stealing all three cores and reaching the exit. Finish without ever being spotted for a GHOST rating.

## How it is built

Plain HTML, CSS and canvas JavaScript under `game/src/`, one file per job: the floor and line-of-sight (`level.js`), guard patrol / suspicion / chase AI (`guard.js`), vision cones (`vision.js`), the player (`player.js`), synthesized WebAudio sound (`audio.js`), rendering and HUD (`render.js`), and the game state machine (`game.js`). `main.ts` hands the game in to make.fun.

---

<sub>Entered on [make.fun](https://make.fun/?ref=3zwarjv0&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
