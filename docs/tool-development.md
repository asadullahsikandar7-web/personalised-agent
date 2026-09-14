# Adding a New Tool

Tools are the only thing the agent can do to the world. Adding one never requires touching the
orchestration engine, a provider, or a route file elsewhere.

## 1. Write the tool

Create `apps/api/src/ai/tools/definitions/my-tool.ts`:

```ts
import { z } from 'zod';
import { defineTool } from '../types';

export const myTool = defineTool({
  name: 'my_tool',
  description: 'One sentence the model uses to decide when to call this.',
  inputSchema: z.object({
    someField: z.string().min(1),
  }),
  permissionLevel: 'normal', // 'safe' | 'normal' | 'approval_required' | 'restricted'
  // Optional: only needed for approval_required/restricted tools - the one-line summary
  // shown on the approval card the user sees before deciding.
  describeAction: (input) => `Do the thing with "${input.someField}"`,
  async execute(input, context) {
    // context: { userId, conversationId?, timezone, isApprovedExecution }
    // Do the work - call a modules/*/service.ts function, not a Mongoose model directly,
    // so REST routes and the agent share one implementation and one audit trail.
    return { success: true, message: 'Done.', data: { ok: true } };
    // On failure: { success: false, message: 'Why it failed', errorCode: 'SOME_CODE' }
    // Never throw for expected failures - throwing is for genuine bugs, and the executor
    // will catch it, log it, and turn it into a generic failure result anyway.
  },
});
```

`defineTool` infers `execute`'s input type directly from `inputSchema` - you get full type safety
without writing out generics by hand.

### Choosing a permission level

- `safe` - read-only or fully reversible (list things, do math, get the time). Always runs.
- `normal` - mutates the user's own data but is low-risk (create a task/note/memory). Always runs.
- `approval_required` - the user must see the exact action and explicitly approve it before it
  runs (sending a message, deleting something, anything touching money or account settings).
- `restricted` - disabled unless the environment explicitly configures it (e.g. `web_search`
  without a configured provider always reports "not configured" rather than faking a result).

A tool named in `config/constants.ts`'s `HARD_APPROVAL_REQUIRED_TOOLS` set is forced through the
approval gate regardless of what permission level it declares - a defense-in-depth backstop for
the handful of actions (like `send_message`) that must never run without explicit consent even if
a future edit to the tool accidentally weakens its declared level.

## 2. Register it

In `apps/api/src/ai/tools/index.ts`:

```ts
import { myTool } from './definitions/my-tool';
// ...
registry.register(myTool);
```

That's it. It now shows up in `GET /api/tools`, is offered to the AI provider on every agent
message, can be called directly via `POST /api/tools/my_tool/execute`, and goes through the same
validation/approval/audit pipeline either way.

## 3. Write tests

- Unit test the tool's `execute()` directly (see `tests/unit/calculator.test.ts` or
  `tests/unit/datetime.test.ts` for the pattern - no HTTP, no DB needed for pure-logic tools).
- If it touches the database, add or extend an integration test that exercises it through
  `POST /api/agent/message` (see `tests/integration/agent.test.ts`) so the whole pipeline -
  including the mock provider's intent matching, if you want the agent to reach it via natural
  language - is covered.

## 4. Teach MockProvider about it (optional)

If you want the example commands in the product brief (or your own test messages) to route to
your new tool without a real LLM, add a pattern match in `ai/providers/mock-provider.ts`'s
`generateResponse`. This step is optional - a real provider (OpenAI/Ollama) decides on its own
which tool to call based on the tool's `description`.
