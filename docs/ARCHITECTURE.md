# Architecture

[pt-BR](ARCHITECTURE.pt-BR.md)

This project is a local-first web app for tracking a personal World Cup 2026 sticker album collection. The app runs in the browser, does not require a backend, and stores user data locally.

## Technologies

- React: UI composition and application state.
- TypeScript: domain, catalog, and export typing.
- Vite: local development server and production build.
- Dexie/IndexedDB: browser-local database for album progress.
- jsPDF: on-demand PDF report generation.
- Canvas API: PNG report generation.
- flag-icons: SVG flag icons rendered consistently across platforms.
- Native CSS: layout, light/dark theme, and responsiveness.
- Vitest: unit tests for business rules and report data.

## Overview

```txt
src/
  backup/       JSON backup validation, import, and export
  components/   reusable UI components
  pages/        main application screens
  data/         album catalog, groups, and metadata
  db/           Dexie, IndexedDB, and persistence operations
  domain/       small business rules, such as stats and quick entry
  reports/      report data builders and CSV/PDF/PNG exporters
  App.tsx       screen composition and main user flows
```

The sticker catalog is versioned in `src/data/catalog.ts`. User progress is not stored in that file; it is saved in the browser's IndexedDB database.

## Data Model

The catalog is built around these main models:

- `Sticker`: id, display code, section/team, number, title, type, special flag, and album order.
- `StickerSection`: album section, such as `PANINI`, `FWC`, `BRA`, `ARG`.
- `InventoryItem`: local user quantity for each sticker.

Sticker codes are normalized without spaces, for example:

- `BRA 1` becomes `BRA1`
- `FWC 3` becomes `FWC3`

## Persistence

The app uses IndexedDB through Dexie. The local database is named `album-copa-2026` and has two tables:

- `inventory`: sticker quantities.
- `meta`: preferences and dates, such as album nickname and last saved timestamp.

Every quantity change, quick entry action, or pack entry action is saved automatically in the browser.

## Backup

The JSON backup is the portable user data format. It includes:

- app identifier;
- backup version;
- album id;
- export timestamp;
- preferences;
- inventory.

On import, the app validates:

- whether the file belongs to this app;
- whether the version is compatible;
- whether sticker codes exist in the catalog;
- whether quantities are valid;
- whether the file contains duplicated entries.

Supported restore modes:

- Replace: replaces the current inventory with the backup.
- Merge: keeps the highest quantity for each sticker.

## Reports

Reports are generated from the current catalog plus local inventory and can be filtered by:

- all;
- missing;
- owned;
- duplicates;
- special stickers;
- section/team.

Formats:

- CSV: spreadsheet-friendly export.
- PDF: paginated report.
- PNG: shareable image.

## Privacy And Security

The app does not require login, tokens, API keys, or `.env` files to work. User data stays in the local browser and only leaves the computer when the user exports a file.

The project does not include official mascots or official proprietary logos. The visual identity included in the repository is custom to this app; flags are rendered through open-source SVG icons.

Files ignored by Git:

- `node_modules/`
- `dist/`
- logs (`*.log`)
- `.env` files
- local caches
- JSON backups exported by the app
- CSV, PDF, and PNG reports exported by the app

Recommended checks before publishing:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=moderate
```

## Catalog Updates

The `scripts/generate-catalog.mjs` script was used to generate the local catalog from a public source. It validates the expected total count before overwriting `src/data/catalog.ts`.

Because the catalog is versioned, the app does not depend on an internet connection during normal use.
