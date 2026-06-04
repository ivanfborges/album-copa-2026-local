# World Cup 2026 Sticker Album Tracker

[pt-BR](README.pt-BR.md)

A local-first web app for managing a personal World Cup 2026 sticker album collection from the desktop.

The app runs in the browser, saves progress automatically with IndexedDB, and exports portable JSON backups plus CSV, PDF, PNG, mobile-friendly PNG, printable A4 checklists, and WhatsApp text reports.

The AI chat is optional and runs through a separate local `ai-service`, so the main tracker remains fast, offline-first, and usable without any LLM dependency.

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
- Overall and per-team statistics, including progress bands for empty, evolving, past-half, almost-complete, and complete teams.
- **AIvan** section for AI-oriented features, including local completion forecasting, trade strategy ranking, next best action, optional web search for World Cup 2026 news, and an optional local chat that uses deterministic collection tools before answering.
- Local collection event history for AI-oriented features, including automatic event tracking and optional historical batch milestones.
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
- Optional AI service: Python, FastAPI, Ollama, and a LangGraph-ready agent layer

See also: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Requirements

- Node.js 22+ or 24+
- npm
- Optional for AIvan chat: Python 3.11+, Ollama, and a local model such as `qwen3:4b`

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
http://127.0.0.1:3001/
```

Use the same origin consistently (`127.0.0.1:3001`), because IndexedDB data is scoped by browser origin.

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

Runs unit and page smoke tests.

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

Backup import validates the app identifier, backup version, album id, sticker codes against the local catalog, and compatible collection history events.

## AIvan

The **AIvan** screen concentrates the AI decision layer of the project:

- local chat about the collection through the optional `ai-service`;
- deterministic trade strategy ranking for repeated stickers to offer and missing stickers to target;
- next best action recommendation for buying, trading, buying plus trading, waiting, or chasing manual targets;
- local completion forecast with estimated date, likely day range, and confidence label;
- optional backend-only web search for recent World Cup 2026 updates;
- collection history metrics used by the forecast;
- historical batch milestones, such as old purchases or large initial loads, recorded without changing the current inventory.

The forecast, trade strategy, and next best action run locally in the browser. The chat sends a temporary collection snapshot to `http://127.0.0.1:8000` only when you ask a question in AIvan. The default provider is local Ollama; OpenAI is optional and must be configured only in `ai-service/.env`. Web search is disabled by default and can be enabled only in the backend.

To run the chat service:

```bash
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## AI Explainability

AIvan separates deterministic decision support from GenAI language generation.

- `src/domain/forecast.ts` is the statistical baseline: it uses acquisition events and current saturation to estimate completion date, likely range, and confidence.
- `src/domain/tradeStrategy.ts` ranks trade candidates with explicit factors such as special stickers, team photos, duplicate liquidity, section completion pressure, and current album progress.
- `src/domain/nextBestAction.ts` combines stats, trade ranking, album stage, duplicate currency, and event volume into an actionable recommendation with reasons, risks, confidence, suggested packs, target stickers, and duplicate stickers to offer.
- `src/ai/albumSnapshot.ts` sends the precomputed forecast, trade strategy, and next best action to the optional backend so the LLM can explain known numbers instead of recalculating or inventing them.

Model limits are intentional and visible. This is not a trained supervised model, OCR pipeline, price oracle, or external prediction service. Trade value is a heuristic based on duplicate volume and album stage, and confidence is lower when collection history is sparse. The GenAI layer is only a natural-language and tool-calling layer over deterministic data.

## Reports

On the **Reports** screen, choose:

- content: all, missing, owned, duplicates, with an optional special-sticker filter;
- section: all sections or one specific team/section;
- format: CSV, PDF, PNG, mobile-friendly PNG (`IMG/CEL`), printable A4 checklist (`A4`), or WhatsApp text (`TXT/WPP`).

The report preview and all export formats use a compact grouped layout by album order. Each section lists only the sticker numbers needed for the selected filter, and duplicate reports include quantities such as `7 (x2)`. The WhatsApp text starts with a short title marker, for example `🏆 Copa 2026`, followed by the selected list category; it keeps teams from the same World Cup group together and only inserts blank lines between album blocks.

The PDF, PNG, and A4 exports share a portrait checklist layout for printing or quick visual checking, with one line per album section/team and one markable box per selected sticker. In these checklist exports, `FWC` stickers and team sticker number `1` are highlighted as shiny/special trade targets, while sticker number `13` is highlighted as the team photo.

## Privacy

The core tracker does not use login, backend services, tokens, or API keys. No personal data is sent to servers during normal use.

The optional AIvan chat uses a local FastAPI service. With the default Ollama provider, the collection snapshot stays on your machine. If the optional OpenAI provider is enabled, the snapshot used by the chat request is sent to OpenAI, so API keys must stay only in `ai-service/.env` and must never be committed. If backend web search is enabled, the news question is sent to OpenAI Web Search; the album snapshot is not sent for that search call.

The root `.env.example` only exposes `VITE_AI_SERVICE_URL`, which points the frontend to the local AI service.

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
- Python virtual environments under `ai-service/`
- exported JSON backups
- exported CSV, PDF, PNG, and WhatsApp text reports

## Notes

This is a personal hobby project for local collection tracking.
