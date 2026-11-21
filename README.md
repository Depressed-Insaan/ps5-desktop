# Ani Games

A PS5-inspired gaming environment for Windows: a full-screen, cinematic dashboard
built with Electron, React, TypeScript and Vite.

## Status

Phases 1 to 5 are complete. The dashboard is backed by a real game library that
lives on this PC: you can import games as files or whole folders, launch them
through a single launch core, track playtime accurately, give each one its own
artwork, collect trophies, and tune the console to your taste.

## Requirements

- Windows 10 or 11
- Node.js 20 or newer

## Commands

```bash
npm install      # install dependencies
npm run dev      # run the app with hot reload
npm run build    # type-check, bundle and build the Windows installer
```

The installer is written to `release/<version>/`. `npm run build` also runs
`electron-builder`, which downloads packaging tools the first time it runs;
use `npx vite build` if you only want to check the bundle.

## Using the library

- **Import games** from the Library screen (or the home screen when it is empty).
  Choose files — `.exe`, `.bat`, `.cmd`, `.lnk`, `.html` — or a whole game
  folder. A folder with a single obvious entry imports in one click; anything
  ambiguous is shown first with its entry point, working folder and the exact
  command it would run.
- **Play** starts the game through the launch core. While it runs the tile shows
  `Playing` and a `Stop` button appears; playtime is banked every minute and
  again when the session ends.
- **Edit** changes the title, genre, description, accent colour, favourite flag
  and artwork, plus how the game starts: entry point, working folder,
  arguments, session tracking and trust.
- **Remove** takes a game out of the collection, deletes any artwork you
  supplied for it, and removes its trophies.

### How games start

Every game stores a launch descriptor: a runtime, an entry point, a working
folder, an argument array, optional environment values and a session tracker.
Only two runtimes exist so far.

| Runtime | Starts | Tracked by |
| --- | --- | --- |
| `native` | `.exe`, `.bat`, `.cmd`, `.ps1`, `.lnk`, `.url` | process, process tree, or until you press Stop |
| `html` | `index.html` or a single `.html` file | the game window |

HTML games run in their own sandboxed window on a per-game `ani-game://` origin
with their own storage. They get no preload, no Node, no `window.api`, no
popups, no navigation away from their own origin and no permissions.

Scripts and shortcuts (`.bat`, `.cmd`, `.ps1`, `.lnk`, `.url`) require an
explicit trust decision before they can run, and that trust is cleared whenever
the entry point, arguments, runtime or tracker changes. Nothing is ever
installed, elevated or executed during import.

## Trophies

Each game keeps its own trophy set with Bronze, Silver, Gold and Platinum tiers.
Add a trophy from the Trophies screen, give it a progress target, raise its
progress or unlock it by hand. The screen shows totals per tier, recently
unlocked trophies and a completion percentage for every game.

## Settings

Settings apply immediately and are remembered across restarts:

- **Appearance**: three themes (Midnight, Aurora, Ember) and an accent colour
  that recolours buttons, highlights, progress bars and the sidebar.
- **Startup**: open on Home or Library, and start in fullscreen.
- **Notifications**: in-app notices for trophy unlocks and play sessions.
- **Profile**: name and initials, shown in the top bar and greeting.

The console storage card reads the real free and used space of the drive that
holds your files.

## Where the data lives

`%APPDATA%\ani-games\library.json` holds the library, trophies, settings and
profile. Custom artwork is copied into `%APPDATA%\ani-games\media\` and served
through a dedicated `app-media://` scheme.

The document is version 3. A version 2 library is upgraded in place on first
launch: every existing launch target becomes a launch descriptor with the same
entry, arguments and working folder, and every game stays playable without
being re-imported.

A fresh install starts with a small sample collection of games and trophies.
Remove the samples you do not want, or point them at games on this PC.

## Layout

```
electron/
  main.ts        window shell, lifecycle and the saved fullscreen preference
  launch/
    args.ts      argument parsing and shell-safe escaping, environment hygiene
    config.ts    launch descriptor normalisation, edits and the trust rule
    runtimes.ts  runtime registry: native and HTML adapters, entry detection
    inspect.ts   folder and file inspection behind opaque import tokens
    session.ts   the single spawner, the four session watchers, checkpoints
    html.ts      isolated HTML game windows and the ani-game:// origin
    paths.ts     real-path containment checks
  library/
    store.ts     persisted document: games, trophies, settings and profile
    ipc.ts       IPC handlers, import dialogs, disk space, protocols
    seeds.ts     sample games and trophies used on first run
  preload.ts     the typed bridge exposed to the renderer
src/
  components/    rail, top bar, shelves, tiles, editors, import sheet, toast
  screens/       home, library, trophies, settings
  data/          artwork resolution, display helpers, trophy helpers, storage
  hooks/         app state and keyboard navigation
  assets/        generated sample artwork
```

## Keyboard

Arrow keys move between tiles and shelves, `Home`/`End` jump to the ends of a
row, and `Enter` selects the focused game. The navigation model is deliberately
data-driven so a gamepad can drive it in a later phase. `Escape` closes an open
editor or the import sheet. Inside an HTML game, `F11` toggles fullscreen.

## Known gaps

- Only the `native` and `html` runtimes exist. Python, Node, Java, Lua, LÖVE
  and engine-specific launches are the next milestone; until then those files
  import as "not supported yet" rather than being guessed at.
- Nothing is compiled or built. C/C++, Rust, C# and TypeScript projects need a
  toolchain and a build step, which is not part of Play.
- Gamepad and phone controls are not implemented.
- Trophies are manual: nothing watches a game's own achievement system.
- There are no accounts or cloud sync; everything is local.
- Games that need administrator rights fail unless Ani Games itself is elevated,
  which it never does on its own.
- Process-tree tracking polls every three seconds, so a session can end a few
  seconds late. Games that hand off to an unobservable process need the manual
  tracker.
- The storage card reports the drive holding the user's home folder, not each
  drive on the machine.
- The Electron and Vite versions tracked by the template are older than the
  current releases; upgrading is a separate, deliberate change.
