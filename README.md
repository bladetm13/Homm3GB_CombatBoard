# Heroes III — Combat Board

A browser tool for laying out battles from the *Heroes of Might & Magic III* board game.

**→ [bladetm13.github.io/Homm3GB_CombatBoard](https://bladetm13.github.io/Homm3GB_CombatBoard/)**

Nothing is uploaded anywhere. The whole thing runs in the page, and a layout leaves
your machine only if you export it yourself.

## What it's for

Custom campaigns almost never touch the battlefield itself — you get objectives, army
limits and map gimmicks, but the combat setup is left to the default rules. This is a
tool for that space:

- **Design the key fights of a scenario.** Lay the units out, export the picture, drop
  it into the scenario document. Say which of the player's units join the fight and
  where they have to stand — ambushes, forced bad positions, scripted set-pieces. Deck
  backs are in the picker too, so a stack can sit face down until it is revealed.
- **Try an idea without unpacking the box.** Play a battle through online first. Damage
  and effects are still counted by hand, the same as at the table, but you find out
  whether an idea is any fun in five minutes rather than forty.

## What's in it

- The 4×5 grid printed on the board, over the board art, with pan and zoom.
- **278 cards** — all ten towns, neutrals of every tier, creature banks, summoned
  creatures, war machines, walls and gates, and one back per deck.
- **31 tokens** — field effects (firewall, quicksand, land mine, force field, clone) and
  stack markers (damage, defence, paralysis, attack/weakness, stack stats, time). Up to
  four to a cell.
- Every card opens full size, so its stats and abilities can actually be read.
- Cards drag between cells; a cell that holds a card will not take another.
- A −1 / 0 / +1 die, for whatever the table needs one for.
- **Your own pictures** for homebrew units and tokens, dropped in from disk.
- Export as PNG or JSON, print, or read a saved layout back — the pictures you added
  travel inside the JSON, so one file is the whole board.

## Running it

Yarn 4, through the `packageManager` field — [Corepack](https://nodejs.org/api/corepack.html)
picks up the right version on its own.

```sh
corepack enable
yarn install
yarn dev        # http://localhost:5173/Homm3GB_CombatBoard/
yarn test       # vitest, once
yarn test:watch
yarn build      # -> dist/
yarn preview
```

The dev server answers on `/Homm3GB_CombatBoard/` rather than `/` because that is where
the deployed site lives, and `base` is one value shared by dev, preview and production.
Forking this under another repository name means changing `base` in
[`vite.config.js`](vite.config.js) to match — the router reads it from there.

## Deploying

Pushing to `main` builds and publishes the site: see
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The tests run first, so a
failing build never reaches the site. In the repository, Settings → Pages → Source must
be set to **GitHub Actions**.

## Layout

```
assets/           card and token artwork, globbed at build time
src/components/
  CombatBoard     the board: pan, zoom, the artwork underneath
  BoardField/     the 4×5 grid, the pieces on it, and the pickers
  BoardTools      save as picture, print, export, import
  BoardDice       the die
tests/            vitest, one spec per module
```

## Licence

The source code is MIT — see [LICENSE](LICENSE). **The artwork is not**, and none of it
is this repository's to license:

- **Unit cards** — some drawn by zetyrion@gmail.com, the rest scanned by the author of
  this repository. Rights stay with their authors.
- **Tokens** — some come from [Heegu-sama/Homm3BG](https://github.com/Heegu-sama/Homm3BG),
  a project this repository's author contributes to, under
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/); several have been
  adapted here (redrawn or renumbered) and those adaptations carry the same licence. The
  rest are the author's own.

Heroes of Might and Magic III and everything the cards depict belong to Ubisoft
Entertainment. This is an unofficial, non-commercial fan tool made so people can get to
know the game — not affiliated with, endorsed by, or sponsored by Ubisoft.

If you fork this, bring artwork of your own or ask the authors first.
