# AIvan local AI service

Optional local AI service for the Copa 2026 album tracker.

It receives a temporary snapshot from the browser, runs deterministic collection tools, and uses a local Ollama model to answer in natural language. OpenAI is available only as an optional backend provider/fallback. Backend-only web search for recent World Cup updates is available as an explicit opt-in. The frontend works normally without this service.

The service does not calculate strategic numbers with the LLM. The browser snapshot already includes deterministic results such as forecast, trade strategy, and next best action; the tools expose those values so the provider can explain them without inventing quantities or confidence labels.

## Run locally

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal, run the frontend:

```powershell
npm run dev
```

Open `http://127.0.0.1:3001` and go to `AIvan`.

## Ollama

Install Ollama and pull a model before using the chat:

```powershell
ollama pull qwen3:4b
```

You can change `OLLAMA_MODEL` in `.env`.

For Qwen thinking models, keep visible answers fast by disabling thinking mode:

```txt
OLLAMA_THINK=false
```

## Privacy

- No collection data is stored by this service.
- The browser sends only the current in-memory snapshot when you ask AIvan a question.
- The default provider is local Ollama.
- OpenAI is optional and must be configured only in `ai-service/.env`.
- If Ollama fails and `OPENAI_API_KEY` is configured, the service can use OpenAI as a fallback.

## Deterministic Tools

The service currently exposes tools for:

- collection summary, missing stickers, duplicates, and legacy trade suggestions;
- trade strategy and ranked trade candidates;
- next best action;
- WhatsApp messages for missing lists or trade offers;
- forecast explanation;
- optional World Cup 2026 web search through OpenAI Web Search, disabled by default.

When a snapshot does not include a precomputed AI decision field, the related tool returns an explicit unavailable result instead of asking the LLM to estimate it.

## Optional Web Search

Web search is off by default. To let AIvan answer questions about recent World Cup 2026 updates, configure it only in `ai-service/.env`:

```txt
WEB_SEARCH_ENABLED=true
WEB_SEARCH_PROVIDER=openai
OPENAI_WEB_SEARCH_MODEL=gpt-5.4-mini
OPENAI_WEB_SEARCH_CONTEXT_SIZE=low
WEB_SEARCH_ALLOWED_DOMAINS=fifa.com
```

This requires `OPENAI_API_KEY`. The web search call sends the news question to OpenAI Web Search, not the album snapshot.

## Diagnostics

The service logs request id, provider, model, selected tools, response time, response size, and errors in the terminal. It does not log the full collection snapshot by default.

Useful endpoints:

```txt
http://127.0.0.1:8000/health
http://127.0.0.1:8000/health/ollama
```

If the local model is slow, increase the timeout in `.env`:

```txt
AI_PROVIDER_TIMEOUT_SECONDS=240
```
