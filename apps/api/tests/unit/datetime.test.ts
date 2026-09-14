import { describe, it, expect } from 'vitest';
import { getCurrentDatetimeTool } from '../../src/ai/tools/definitions/datetime';

describe('get_current_datetime tool', () => {
  it('returns the current time in the requested timezone', async () => {
    const result = await getCurrentDatetimeTool.execute(
      { timezone: 'UTC' },
      { userId: 'u1', timezone: 'UTC', isApprovedExecution: false },
    );
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('iso');
    expect(result.data).toHaveProperty('formatted');
  });

  it('falls back to the context timezone when none is given', async () => {
    const result = await getCurrentDatetimeTool.execute(
      {},
      { userId: 'u1', timezone: 'America/New_York', isApprovedExecution: false },
    );
    expect(result.success).toBe(true);
    expect((result.data as { timezone: string }).timezone).toBe('America/New_York');
  });
});
