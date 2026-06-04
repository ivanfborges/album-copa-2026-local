# Architecture

[pt-BR](ARCHITECTURE.pt-BR.md)

This project is a local-first web app for tracking a personal World Cup 2026 sticker album collection. The core app runs in the browser, does not require a backend, and stores user data locally. The AIvan chat is an optional local microservice.

## Technologies

- React: UI composition and application state.
- TypeScript: domain, catalog, and export typing.
- Vite: local development server and production build.
- Dexie/IndexedDB: browser-local database for album progress.
- jsPDF: on-demand PDF report generation.
- Canvas API: PNG report generation.
- flag-icons: SVG flag icons rendered consistently across platforms.
- Native CSS: layout, light/dark theme, and responsiveness.
- Vitest: unit tests for business rules, report data/exporters, and page smoke rendering.
- Optional AI service: Python/FastAPI service with local Ollama provider, OpenAI as an explicit opt-in provider, and a LangGraph-ready agent flow.

## Overview

```txt
src/
  ai/           browser-to-ai-service snapshot builder and client
  backup/       JSON backup validation, import, and export
  components/   reusable UI components
  pages/        main application screens
  data/         album catalog, groups, and metadata
  db/           Dexie, IndexedDB, persistence operations, and collection event history
  domain/       business rules for stats, quick entry, forecasting, trade strategy, and next best action
  reports/      report data builders and CSV/PDF/PNG/mobile/WhatsApp exporters
  App.tsx       screen composition and main user flows

ai-service/
  app/          FastAPI app, providers, deterministic tools, and agent orchestration
  .env.example  local provider configuration example
```

The sticker catalog is versioned in `src/data/catalog.ts`. User progress is not stored in that file; it is saved in the browser's IndexedDB database.

To keep the initial dashboard load light, secondary screens are loaded lazily and report exporters are imported only when the user starts an export.

## Data Model

The catalog is built around these main models:

- `Sticker`: id, display code, section/team, number, title, type, special flag, and album order.
- `StickerSection`: album section, such as `PANINI`, `FWC`, `BRA`, `ARG`.
- `InventoryItem`: local user quantity for each sticker.
- `CollectionEvent`: append-only local history for meaningful collection changes, used as the data foundation for AI-oriented features.

Sticker codes are normalized without spaces, for example:

- `BRA 1` becomes `BRA1`
- `FWC 3` becomes `FWC3`

## Persistence

The app uses IndexedDB through Dexie. The local database is named `album-copa-2026` and has three tables:

- `inventory`: sticker quantities.
- `collectionEvents`: local event log for manual changes, quick entry, pack entry, duplicate cleanup, backup restores, and historical batch milestones.
- `meta`: preferences and dates, such as album nickname and last saved timestamp.

Every quantity change, quick add/remove action, pack entry action, or bulk duplicate cleanup is saved automatically in the browser and registered in the local event log. Quick entry and pack entry also calculate how many valid pasted codes are new to the album and how many will become duplicates before saving. Repeated codes are highlighted inline in the entry field without adding a rich text editor dependency.

Historical batch milestones can be registered from the AIvan screen. These records do not change the current inventory; they preserve older aggregate events, such as large initial loads or older pack purchases, for the local completion forecast.

## AIvan Chat

The AIvan chat is intentionally isolated from the core frontend. The browser first computes deterministic AI decision results in `src/domain`, then builds a temporary `AlbumSnapshot` in `src/ai/albumSnapshot.ts` and sends it to the local FastAPI service only when the user asks a question.

```txt
React / IndexedDB
  -> deterministic domain engines
      -> AIvan snapshot builder
      -> http://127.0.0.1:8000/chat
          -> deterministic album tools
          -> provider: Ollama by default, OpenAI only if configured
```

The service exposes tools such as:

- `get_album_summary`
- `get_missing_stickers`
- `get_duplicates`
- `get_trade_suggestions`
- `get_trade_strategy`
- `rank_trade_candidates`
- `get_next_best_action`
- `search_world_cup_news`
- `generate_whatsapp_trade_message`
- `explain_forecast`
- `generate_whatsapp_text`
- `forecast_completion`

The LLM receives tool results as context and is instructed not to invent collection data, quantities, sticker codes, dates, confidence labels, or news. If Ollama is not running, the service falls back to a deterministic response that still summarizes the tool results.

## AI Decision Layer

The AIvan screen includes a local deterministic decision layer. The browser computes these results before any LLM request, and the same results are rendered in AIvan cards and included in the chat snapshot.

- `src/domain/forecast.ts`: statistical baseline for completion date, likely day range, and confidence.
- `src/domain/tradeStrategy.ts`: explainable ranking for repeated stickers to offer and missing stickers to target.
- `src/domain/nextBestAction.ts`: final action recommendation built from stats, trade ranking, album stage, duplicate currency, and event volume.
- `src/ai/albumSnapshot.ts`: snapshot contract containing `forecast`, `trade_strategy`, and `next_best_action` for backend tools.

The forecast baseline uses acquisition events only: historical batch milestones, bulk additions from quick entry, pack entries, and positive manual quantity changes. It intentionally ignores backup restores, duplicate cleanup, and removal events so operational maintenance does not distort the collection pace.

The trade strategy score uses explicit factors: special/FWC stickers, team badges, team photos, duplicate liquidity, section completion pressure, and the current album stage. Each ranked item carries a short list of reasons and a priority label.

The next best action engine turns those signals into one of `buy_packs`, `trade_first`, `buy_and_trade`, `wait`, or `manual_targets`. The response includes the recommendation, confidence, reasons, risks, suggested pack count, trade targets, and duplicate codes to offer.

## Evaluation And Limits

The AI decision layer is intentionally small, testable, and explainable. The TypeScript domain modules have unit tests for forecast, trade strategy, next best action, snapshots, backups, and page smoke rendering. The Python `ai-service` has unittest coverage for deterministic tools and routing.

Current model limits:

- It is not a trained supervised model and does not learn across users.
- It does not implement OCR, photo recognition, price lookup, or market data.
- Web search is backend-only, disabled by default, and currently uses OpenAI Web Search only when explicitly enabled in `ai-service/.env`.
- The next best action is a deterministic heuristic, not a trained optimizer or marketplace model.
- Trade opportunity is derived from duplicate volume and priority gaps, not a social marketplace signal.
- Confidence is deliberately lower when the collection has little event history.
- GenAI providers can explain tool results and produce text, but deterministic TypeScript/Python code remains the source of truth for numbers.

## Backup

The JSON backup is the portable user data format. It includes:

- app identifier;
- backup version;
- album id;
- export timestamp;
- preferences;
- inventory;
- collection event history, when available.

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

The special-sticker filter is additive, so it can be combined with missing, owned, duplicate, or full lists.

Formats:

- CSV: compact spreadsheet-friendly export grouped by album section.
- PDF: portrait checklist report for printing or quick visual checking, with one line per section/team and one markable box per selected sticker.
- A4 checklist: portrait PDF checklist for printing, using the same compact layout as the standard PDF export.
- PNG: portrait checklist image using the same compact visual layout as the PDF/A4 exports.
- Mobile PNG: vertical, compact image optimized for phone viewing during trades.
- WhatsApp text: compact grouped text for sharing missing or duplicate lists in chat. It is ordered by album section, starts with a trophy title plus a category marker, keeps teams from the same World Cup group together, and inserts blank lines only between album blocks.

The reports screen preview uses the same grouped structure as the exports, keeping the visual check close to the files the user will share.

In printable checklist exports, `FWC` stickers and team sticker number `1` are highlighted as shiny/special trade targets, while sticker number `13` is highlighted as the team photo. These markers are intentionally subtle so the sheet remains clean for printing and manual checking.

## Privacy And Security

The core app does not require login, tokens, API keys, or `.env` files to work. User data stays in the local browser and only leaves the computer when the user exports a file.

The optional AIvan chat uses a separate local service. With Ollama, the snapshot stays on the same machine. If the optional OpenAI provider is enabled, the current chat snapshot is sent to OpenAI for that request, so `OPENAI_API_KEY` must live only in `ai-service/.env`. If backend web search is enabled, only the news question is sent to OpenAI Web Search; the album snapshot is not sent for that search call.

The project does not include official mascots or official proprietary logos. The visual identity included in the repository is custom to this app; flags are rendered through open-source SVG icons.

Optional local images in `public/brand/` can customize the UI during personal use. These files are ignored by Git by default.

Files ignored by Git:

- `node_modules/`
- `dist/`
- logs (`*.log`)
- `.env` files
- local caches
- Python virtual environments and caches under `ai-service/`
- JSON backups exported by the app
- CSV, PDF, PNG, and WhatsApp text reports exported by the app

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
