# World Cup 2026 Sticker Album Tracker

[pt-BR](README.pt-BR.md)

A local-first web app for managing a personal World Cup 2026 sticker album collection from the desktop.

The app runs in the browser, saves progress automatically with IndexedDB, and exports portable JSON backups plus CSV, PDF, PNG, mobile-friendly PNG, printable A4 checklists, and WhatsApp text reports.

## Features

- Catalog with 980 stickers.
- Organization by album sections, national teams, and World Cup groups.
- Quantity tracking per sticker.
- Automatic duplicate detection.
- Filters for all, missing, owned, duplicates, and special stickers.
- Search by sticker code, name, or team.
- Fast entry for adding or removing pasted sticker codes, with a preview of new versus duplicate stickers and inline highlighting for repeated codes.
- Bulk duplicate cleanup that removes extra quantities while keeping one copy of each sticker.
- Pack mode for registering exactly 7 stickers, with a preview of new versus duplicate stickers and inline highlighting for repeated codes.
- Overall and per-team statistics, including progress bands for empty, started, evolving, past-half, almost-complete, and complete teams.
- Team flags rendered as SVG icons.
- JSON backup with replace or merge restore modes.
- Compact CSV, PDF, PNG, mobile-friendly PNG, printable A4 checklist, and WhatsApp text report exports grouped by album order.
- Printable checklist exports highlight shiny stickers (`FWC` and team sticker number `1`) and team photo stickers (`13`) for faster trade checks.
- Special-sticker reports can be combined with missing, owned, duplicate, or full lists.
- Light/dark theme.

## Tech Stack

- React
- TypeScript
- Vite
- Dexie/IndexedDB
- jsPDF
- Canvas API
- flag-icons
- Native CSS
- Vitest

See also: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Requirements

- Node.js 22+ or 24+
- npm

Check your local versions:

```bash
node --version
npm --version
```

## Run Locally

Step-by-step installation guide: [docs/INSTALL.md](docs/INSTALL.md)

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Open in your browser:

```txt
http://localhost:5173/
```

Use the same origin consistently (`localhost` or `127.0.0.1`), because IndexedDB data is scoped by browser origin.

To stop the server:

```txt
Ctrl + C
```

## Scripts

```bash
npm run dev
```

Runs the app in development mode.

```bash
npm run build
```

Builds the production version into `dist/`.

```bash
npm run preview
```

Previews the production build locally.

```bash
npm run lint
```

Runs ESLint.

```bash
npm test
```

Runs unit tests.

```bash
npm audit --audit-level=moderate
```

Checks dependencies for known vulnerabilities.

## Data And Backup

User data is stored locally in the browser through IndexedDB.

For portability, use the **Backup** screen:

- **Export JSON backup**: downloads a file with your current progress.
- **Recover data**: imports a backup file.
- **Replace**: replaces current local data with the file.
- **Merge**: combines data while keeping the highest quantity per sticker.

Backup import validates the app identifier, backup version, album id, and sticker codes against the local catalog.

## Reports

On the **Reports** screen, choose:

- content: all, missing, owned, duplicates, with an optional special-sticker filter;
- section: all sections or one specific team/section;
- format: CSV, PDF, PNG, mobile-friendly PNG (`IMG/CEL`), printable A4 checklist (`A4`), or WhatsApp text (`TXT/WPP`).

The report preview and all export formats use a compact grouped layout by album order. Each section lists only the sticker numbers needed for the selected filter, and duplicate reports include quantities such as `7 (x2)`. The WhatsApp text starts with a short title marker, for example `🏆 Copa 2026`, followed by the selected list category.

The PDF, PNG, and A4 exports share a portrait checklist layout for printing or quick visual checking, with one line per album section/team and one markable box per selected sticker. In these checklist exports, `FWC` stickers and team sticker number `1` are highlighted as shiny/special trade targets, while sticker number `13` is highlighted as the team photo.

## Privacy

The app does not use login, backend services, tokens, or API keys. No personal data is sent to servers during normal use.

The `.env.example` file is only a placeholder. The app does not require environment variables.

Optional local images can be placed in `public/brand/` by following [public/brand/README.md](public/brand/README.md). These files are ignored by Git so personal or licensed assets are not published accidentally.

## Legal Notice

This is a personal, unofficial project with no affiliation to FIFA, Panini, or World Cup organizers.

For publication safety, this repository does not include official mascots or official logos as proprietary assets. The included visual identity is custom to this app, and flags are rendered through open-source SVG icons.

## License

Distributed under the MIT license. See [LICENSE](LICENSE).

## Before Publishing

Recommended checks:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=moderate
```

Files that should not be committed are covered by `.gitignore`, including:

- `node_modules/`
- `dist/`
- logs
- `.env`
- local caches
- exported JSON backups
- exported CSV, PDF, PNG, and WhatsApp text reports

## Notes

This is a personal hobby project for local collection tracking.
