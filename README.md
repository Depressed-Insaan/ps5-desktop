# Ani Games

A PS5-inspired gaming environment for Windows: a full-screen, cinematic dashboard
built with Electron, React, TypeScript and Vite.

## Status

Phases 1 to 3 are complete. The dashboard is backed by a real game library that
lives on this PC: you can import games, launch them, track playtime and give each
one its own artwork, name and description.

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
- **Remove** takes a game out of the collection and deletes any artwork you
  supplied for it.

The library is stored as JSON in the app's data directory
(`%APPDATA%\ani-games\library.json`) with custom artwork copied into
`%APPDATA%\ani-games\media\`. A fresh install starts with a small sample
collection; point each sample at a game on this PC, or remove the ones you do
not want.

## Layout

```
electron/
  main.ts        window shell and lifecycle
  library/
    store.ts     persisted library document and its edits
    launch.ts    process launching and playtime sessions
    ipc.ts       IPC handlers, import dialogs, app-media:// artwork protocol
    seeds.ts     sample collection used on first run
  preload.ts     the typed bridge exposed to the renderer
src/
  components/    rail, top bar, shelves, tiles, game editor, toast, icons
  screens/       home, library, placeholder views
  data/          artwork resolution, display helpers, local profile
  hooks/         library state and keyboard navigation
  assets/        generated sample artwork
```

## Keyboard

Arrow keys move between tiles and shelves, `Home`/`End` jump to the ends of a
row, and `Enter` selects the focused game. The navigation model is deliberately
data-driven so a gamepad can drive it in a later phase. `Escape` closes the game
editor.

## Known gaps

- Trophies and Settings are placeholders.
- The storage card shows a fixed figure rather than reading the disk.
- Playtime for shortcuts and batch files covers only the moment they are handed
  to Windows, so it is not tracked accurately for them.
- The Electron and Vite versions tracked by the template are older than the
  current releases; upgrading is a separate, deliberate change.
