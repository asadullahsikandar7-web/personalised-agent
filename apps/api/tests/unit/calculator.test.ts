import { describe, it, expect } from 'vitest';
import { calculatorTool } from '../../src/ai/tools/definitions/calculator';

const ctx = { userId: 'u1', timezone: 'UTC', isApprovedExecution: false };

describe('calculator tool', () => {
  it('evaluates basic addition', async () => {
    const result = await calculatorTool.execute({ expression: '2 + 3' }, ctx);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ result: 5 });
  });

  it('respects operator precedence and parentheses', async () => {
    const result = await calculatorTool.execute({ expression: '(2 + 3) * 4' }, ctx);
    expect(result.data).toEqual({ result: 20 });
  });

  it('handles division and decimals', async () => {
    const result = await calculatorTool.execute({ expression: '7 / 2' }, ctx);
    expect(result.data).toEqual({ result: 3.5 });
  });

  it('rejects expressions with disallowed characters instead of using eval', async () => {
    const result = await calculatorTool.execute({ expression: '2 + require("fs")' }, ctx);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INVALID_INPUT');
  });

  it('rejects malformed expressions gracefully', async () => {
    const result = await calculatorTool.execute({ expression: '2 + * 3' }, ctx);
    expect(result.success).toBe(false);
  });

  it('is registered as a safe (no-approval) tool', () => {
    expect(calculatorTool.permissionLevel).toBe('safe');
  });
});
