# Ani Games

A PS5-inspired gaming environment for Windows: a full-screen, cinematic dashboard
built with Electron, React, TypeScript and Vite.

## Status

Phase 1 and Phase 2 are complete. The interface, navigation and dashboard
interactions are real; the games shown are sample content until the library
import work in Phase 3.

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

## Layout

```
electron/        main process (window shell, IPC, preload bridge)
src/
  components/    rail, top bar, shelves, tiles, icons
  screens/       dashboard and placeholder views
  data/          sample library data and the dashboard data boundary
  hooks/         dashboard keyboard navigation
  assets/        generated artwork
```

## Keyboard

Arrow keys move between tiles and shelves, `Home`/`End` jump to the ends of a
row, and `Enter` selects the focused game. The navigation model is deliberately
data-driven so a gamepad can drive it in a later phase.

## Known gaps

- Library, Trophies and Settings are placeholders.
- Artwork and play data are sample content.
- The Electron and Vite versions tracked by the template are older than the
  current releases; upgrading is a separate, deliberate change.
