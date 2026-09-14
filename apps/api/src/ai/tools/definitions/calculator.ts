import { z } from 'zod';
import { defineTool } from '../types';

const inputSchema = z.object({
  expression: z.string().trim().min(1).max(200),
});

/** A tiny, safe recursive-descent arithmetic evaluator - never uses eval() or Function(). */
function evaluateExpression(expr: string): number {
  let pos = 0;

  function peek(): string | undefined {
    return expr[pos];
  }
  function consumeWhitespace() {
    while (peek() === ' ') pos++;
  }
  function parseNumber(): number {
    consumeWhitespace();
    const start = pos;
    if (peek() === '-') pos++;
    while (peek() !== undefined && /[0-9.]/.test(peek() as string)) pos++;
    const raw = expr.slice(start, pos);
    if (!raw || Number.isNaN(Number(raw))) throw new Error('Invalid number in expression');
    return Number(raw);
  }
  function parseFactor(): number {
    consumeWhitespace();
    if (peek() === '(') {
      pos++;
      const value = parseExpr();
      consumeWhitespace();
      if (peek() !== ')') throw new Error('Missing closing parenthesis');
      pos++;
      return value;
    }
    return parseNumber();
  }
  function parseTerm(): number {
    let value = parseFactor();
    for (;;) {
      consumeWhitespace();
      const op = peek();
      if (op === '*' || op === '/') {
        pos++;
        const rhs = parseFactor();
        value = op === '*' ? value * rhs : value / rhs;
      } else {
        break;
      }
    }
    return value;
  }
  function parseExpr(): number {
    let value = parseTerm();
    for (;;) {
      consumeWhitespace();
      const op = peek();
      if (op === '+' || op === '-') {
        pos++;
        const rhs = parseTerm();
        value = op === '+' ? value + rhs : value - rhs;
      } else {
        break;
      }
    }
    return value;
  }

  const result = parseExpr();
  consumeWhitespace();
  if (pos !== expr.length) throw new Error('Unexpected characters in expression');
  if (!Number.isFinite(result)) throw new Error('Expression did not evaluate to a finite number');
  return result;
}

export const calculatorTool = defineTool({
  name: 'calculator',
  description: 'Evaluate a basic arithmetic expression using +, -, *, /, and parentheses. Does not support variables or functions.',
  inputSchema,
  permissionLevel: 'safe',
  async execute(input) {
    if (!/^[0-9+\-*/().\s]+$/.test(input.expression)) {
      return { success: false, message: 'Expression contains unsupported characters.', errorCode: 'INVALID_INPUT' };
    }
    try {
      const result = evaluateExpression(input.expression);
      return { success: true, message: `${input.expression} = ${result}`, data: { result } };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? `Could not evaluate expression: ${err.message}` : 'Could not evaluate expression.',
        errorCode: 'INVALID_INPUT',
      };
    }
  },
});
