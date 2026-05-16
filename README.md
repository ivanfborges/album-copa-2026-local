# World Cup 2026 Sticker Album Tracker

[pt-BR](README.pt-BR.md)

A local-first web app for managing a personal World Cup 2026 sticker album collection from the desktop.

The app runs in the browser, saves progress automatically with IndexedDB, and exports portable JSON backups plus CSV, PDF, and PNG reports.

## Features

- Catalog with 980 stickers.
- Organization by album sections, national teams, and World Cup groups.
- Quantity tracking per sticker.
- Automatic duplicate detection.
- Filters for all, missing, owned, duplicates, and special stickers.
- Search by sticker code, name, or team.
- Fast entry for pasted sticker codes.
- Pack mode for registering exactly 7 stickers.
- Overall and per-team statistics.
- Team flags rendered as SVG icons.
- JSON backup with replace or merge restore modes.
- CSV, PDF, and PNG report exports.
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

- content: all, missing, owned, duplicates, or special stickers;
- section: all sections or one specific team/section;
- format: CSV, PDF, or PNG.

## Privacy

The app does not use login, backend services, tokens, or API keys. No personal data is sent to servers during normal use.

The `.env.example` file is only a placeholder. The app does not require environment variables.

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
- exported CSV, PDF, and PNG reports

## Notes

This is a personal hobby project for local collection tracking.
