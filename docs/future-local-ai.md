# Future Local AI Integration

## The promise

Replace OpenAI with a self-hosted model without touching the mobile app, the tool system, the
memory system, or the orchestration engine. This is not aspirational - `OllamaProvider` is a real,
implemented `AIModelProvider`, and this environment happened to have Ollama installed locally
(with a `qwen3:4b` model already pulled), so it could be pointed at directly.

## How to actually switch to it

```env
# apps/api/.env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b
```

Restart the API. Nothing else changes - the same `/api/agent/message` endpoint, the same tool
registry, the same approval flow, the same mobile app.

## How it works

`OllamaProvider` (`ai/providers/ollama-provider.ts`) POSTs to Ollama's native `/api/chat` with
`stream: false` and the same `tools` array (JSON Schema) every other provider gets, then maps
Ollama's `message.tool_calls` back into the provider-agnostic `AIToolCall[]` shape. Tool-calling
support is entirely dependent on the underlying model: models that support it (Qwen 2.5+/3, Llama
3.1+, Mistral's function-calling variants, and others Ollama documents as tool-capable) will
return `tool_calls`; a model without that support will just answer in prose, and the orchestrator
correctly treats that as a direct answer with no tool calls.

## Other local/self-hosted targets

Because `AIModelProvider` only needs a way to send messages+tools and get back text+tool-calls,
any of the following are additional-provider work, not architecture work:

- **Any OpenAI-compatible local server** (llama.cpp's server, vLLM, LM Studio, text-generation-
  webui's OpenAI-compatible endpoint) - these can *reuse* `OpenAIProvider` almost as-is, since the
  official `openai` SDK accepts a custom `baseURL`. A thin wrapper factory (pass `baseURL:
  OLLAMA_OPENAI_COMPAT_URL` instead of OpenAI's default) is the fastest path if you'd rather not
  write a bespoke provider.
- **A dedicated Qwen/Llama/Mistral provider** with model-specific prompt formatting - only
  needed if you want tighter control than Ollama's own templating already gives you.

## Voice layer: the same pattern applies

The product brief also asks for local speech-to-text/text-to-speech readiness. Today:
- STT is on-device via `expo-speech-recognition` (Android's/iOS's own OS speech recognizer -
  already "local" in the sense of not sending audio to our backend at all).
- TTS is `expo-speech` (also on-device/OS-provided).

A future swap to **Whisper/faster-whisper** (server-side transcription) or **Piper/Kokoro**
(server-side TTS) would follow the same seam pattern used here: define a
`SpeechToTextProvider`/`TextToSpeechProvider` interface, implement it against the chosen engine
behind a new backend endpoint (e.g. `POST /api/voice/transcribe` accepting an audio blob), and
have the mobile app call that instead of the on-device recognizer when configured to. This was
not built in this pass (it's additional backend surface, not a config flip like the LLM
provider), but the existing `AIModelProvider` abstraction is the template to follow for it.

## Honest status

- `MockProvider`: fully implemented and is what the automated test suite runs against.
- `OpenAIProvider`: fully implemented against the official SDK's documented types; not
  live-tested against a real API key in this environment (none was available).
- `OllamaProvider`: fully implemented; this is the one actually reachable in this environment
  (Ollama + `qwen3:4b` were pre-installed) - if you have Ollama running locally, setting
  `AI_PROVIDER=ollama` is a genuine, working local-AI configuration today, not just a documented
  plan.
