# TwinMind — Live Suggestions

A 3-column web app that captures live mic audio, transcribes it with Groq Whisper, and surfaces contextual AI suggestions every 30 seconds during a conversation.

## Setup

```bash
npm install
npm run dev        # Vite on :5173, Express on :3001
```

Open the app, click ⚙ Settings, paste your Groq API key, and click Save.

## Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Express + TypeScript (API routes + serves Vite build in production)
- **Transcription**: Groq Whisper Large V3
- **Suggestions / Chat**: Groq (model configurable, default `moonshotai/kimi-k1.5-32b-preview`)
- **Deployment**: Single server — Express serves the built client

## Production build + deploy (Render / Railway)

```bash
npm run build    # builds client/dist + server/dist
npm start        # node server/dist/index.js — serves everything
```

Set build command: `npm run build`, start command: `npm start`. No environment variables needed — the API key travels per-request from the browser.

## Architecture

```
browser
  └─ /api/transcribe  →  Groq Whisper (multipart audio → text)
  └─ /api/suggestions →  Groq LLM (recent transcript → 3 JSON suggestions)
  └─ /api/chat        →  Groq LLM streaming SSE (messages + full transcript → tokens)
```

Audio is captured with `MediaRecorder` at a 30-second timeslice. Each chunk is sent as a `multipart/form-data` upload; the response text is appended to the transcript panel. The API key is never stored server-side — it's passed via `x-groq-key` header on every request.

## Prompt strategy

**Suggestion types and when they fire:**

| Type | Trigger |
|------|---------|
| `ANSWER` | A question appears in the last 3 transcript turns |
| `FACT_CHECK` | A specific factual claim or number was stated |
| `TALKING_POINT` | A topic with a useful unconsidered angle |
| `QUESTION_TO_ASK` | A probing question that would deepen the conversation |

Key decisions:
- **ANSWER-first**: If a question was just asked, an ANSWER card always leads.
- **Standalone previews**: The preview card text contains the actual answer/fact — not a teaser. Users get value without clicking.
- **Previous batch deduplication**: The last batch's previews are sent to the LLM so it generates genuinely different suggestions each round.
- **Separate context windows**: Suggestions use the last N lines (configurable, default 20); chat answers use the full transcript so earlier context is never lost.
- **Detail prompt isolation**: Clicking a suggestion fires a separate prompt with its own framing — it does not pollute the continuous chat history.

## Settings (all editable in-app)

| Setting | Default |
|---------|---------|
| Groq API key | (required) |
| Model ID | `moonshotai/kimi-k1.5-32b-preview` |
| Suggestion context lines | 20 |
| Auto-refresh interval | 30s |
| Live suggestion prompt | see `DEFAULT_SUGGESTION_PROMPT` in `types.ts` |
| Detailed answer prompt | see `DEFAULT_DETAIL_PROMPT` |
| Chat prompt | see `DEFAULT_CHAT_PROMPT` |

## Export

Click **↓ Export** to download a JSON file containing the full transcript, every suggestion batch with timestamps, and the complete chat history. This is the canonical session record.

## Tradeoffs

- **No streaming on suggestions**: The suggestion call returns JSON so it can't stream tokens. Latency is ~1–2s on Groq. Chat responses stream token-by-token.
- **Client-side API key**: Simpler architecture (no server-side secret management) at the cost of the key being visible in network requests. Acceptable for this use case.
- **30s audio chunks**: Larger chunks give Whisper more context for accuracy; smaller chunks would feel more real-time. 30s matches the suggestion refresh cadence well.
