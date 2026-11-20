# Ani Games

A PS5-inspired gaming environment for Windows: a full-screen, cinematic dashboard
built with Electron, React, TypeScript and Vite.

## Status

Phases 1 to 4 are complete. The dashboard is backed by a real game library that
lives on this PC: you can import games, launch them, track playtime, give each one
its own artwork, collect trophies, and tune the console to your taste.

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

- **Import games** from the Library screen (or the home screen when it is empty)
  and pick one or more `.exe`, `.bat`, `.cmd` or `.lnk` files.
- **Play** launches the game. While it runs the tile shows `Playing`, and the
  time it was open is added to its playtime when it closes.
- **Edit** changes the title, genre, description, accent colour, launch
  arguments, favourite flag and artwork. A launch target can be chosen here too.
- **Remove** takes a game out of the collection, deletes any artwork you
  supplied for it, and removes its trophies.

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

A fresh install starts with a small sample collection of games and trophies.
Remove the samples you do not want, or point them at games on this PC.

## Layout

```
electron/
  main.ts        window shell, lifecycle and the saved fullscreen preference
  library/
    store.ts     persisted document: games, trophies, settings and profile
    launch.ts    process launching and playtime sessions
    ipc.ts       IPC handlers, import dialogs, disk space, app-media:// protocol
    seeds.ts     sample games and trophies used on first run
  preload.ts     the typed bridge exposed to the renderer
src/
  components/    rail, top bar, shelves, tiles, editors, modal, toast, icons
  screens/       home, library, trophies, settings
  data/          artwork resolution, display helpers, trophy helpers, storage
  hooks/         app state and keyboard navigation
  assets/        generated sample artwork
```

## Keyboard

Arrow keys move between tiles and shelves, `Home`/`End` jump to the ends of a
row, and `Enter` selects the focused game. The navigation model is deliberately
data-driven so a gamepad can drive it in a later phase. `Escape` closes an open
editor.

## Known gaps

- Gamepad and phone controls are not implemented.
- Trophies are manual: nothing watches a game's own achievement system.
- There are no accounts or cloud sync; everything is local.
- Playtime for shortcuts and batch files covers only the moment they are handed
  to Windows, so it is not tracked accurately for them.
- The storage card reports the drive holding the user's home folder, not each
  drive on the machine.
- The Electron and Vite versions tracked by the template are older than the
  current releases; upgrading is a separate, deliberate change.
