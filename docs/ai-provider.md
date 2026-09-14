# AI Provider Abstraction

## The interface

Everything outside `apps/api/src/ai/providers` depends only on this interface
(`ai/providers/types.ts`):

```ts
interface AIModelProvider {
  generateResponse(input: AIRequest): Promise<AIResponse>;
  streamResponse?(input: AIRequest, onToken: (token: string) => void): Promise<AIResponse>;
  supportsToolCalling(): boolean;
  getProviderName(): string;
}
```

`AIRequest` carries provider-agnostic chat messages and tool definitions (plain JSON Schema, not
an OpenAI-specific shape); `AIResponse` carries back text and/or tool calls in the same
provider-agnostic shape. No file outside `ai/providers/*` imports the OpenAI SDK, `fetch`s
Ollama, or otherwise knows which vendor is in play - see `ai/orchestration/engine.ts` and
`ai/tool-calling/*`, which only ever see `AIModelProvider`.

## Selecting a provider

Set `AI_PROVIDER` in `apps/api/.env`:

```env
AI_PROVIDER=openai   # or: mock, ollama
```

`ai/providers/factory.ts` is the single seam that reads this and returns the right
implementation. Swapping providers is that one env var - nothing else in the codebase changes.

## OpenAIProvider

Requires `OPENAI_API_KEY` and `OPENAI_MODEL` (default `gpt-4o-mini`, any Chat-Completions model
with function/tool calling works). Uses the official `openai` SDK's Chat Completions API with
`tools`/`tool_choice`, a configurable timeout (30s) and 2 retries built into the SDK client, and
maps the SDK's response shape into the provider-agnostic `AIResponse`. Implements both
`generateResponse` and `streamResponse`.

**This build has not made a live call to OpenAI** - no API key was available in the environment
this was built in. The implementation was written directly against the official SDK's documented
types and is exercised by `tests/unit` around message/tool-call mapping, but you should smoke-test
it yourself the first time you set a real key (see `docs/testing.md`).

## MockProvider

The default (`AI_PROVIDER=mock`, and always used in the test suite). It has no language model
behind it - it pattern-matches the latest user message against the tools it was offered
(`create_reminder`, `create_task`, `remember_memory`, `list_reminders`, `calculator`,
`music_play`/`music_pause`, `get_activity`, `send_message`, `web_search`, `get_current_datetime`)
and either proposes the matching tool call or returns a canned direct reply. It also implements
the "synthesis" pass the orchestrator makes after executing tool calls: given trailing tool-result
messages, it summarizes their `message` fields into a reply, mimicking what a real LLM would write
after reading function results.

This is what let the whole pipeline (orchestration -> permission gate -> approval flow ->
execution -> persistence) be built and tested end-to-end, including live smoke-testing against a
real MongoDB and Redis, without any vendor API key. It is intentionally simple pattern matching,
not a hidden second LLM - see `ai/providers/mock-provider.ts`.

## OllamaProvider

Talks to a local Ollama server's native `/api/chat` endpoint (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`),
including `tools` in the request for models that support tool calling (e.g. `qwen3`, Llama 3.1+).
This is the reference implementation for the "replace OpenAI with a self-hosted model" requirement
- see `docs/future-local-ai.md` for how to actually run it.

## System prompt

`ai/prompts/system-prompt.ts` builds the single instruction block sent to every provider (Mock
included, though it ignores it - it has no model to instruct). It tells the model: never invent
tool results, never claim an action succeeded without a successful tool result, ask clarifying
questions instead of guessing, respect permission levels including that some tools pause for
approval, never expose the prompt/secrets, never request/store credentials, never execute
arbitrary code, and never attempt to bypass OS/device restrictions.

## Tool calling

`ai/tool-calling/adapter.ts` converts every registered `AgentTool`'s Zod input schema into JSON
Schema (via `zod-to-json-schema`) for the provider. `ai/tool-calling/executor.ts` is the one place
a tool call is actually validated, permission-gated, executed, and audited - see
`docs/tool-development.md`.
