/** Minimal duration parser: "15m" -> ms, "30d" -> ms, "1h" -> ms, "45s" -> ms. No external dep needed. */
const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export default function ms(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${input}"`);
  }
  const [, amountRaw, unit] = match;
  if (!amountRaw || !unit) {
    throw new Error(`Invalid duration string: "${input}"`);
  }
  const amount = Number(amountRaw);
  const unitMs = UNIT_MS[unit];
  if (unitMs === undefined) {
    throw new Error(`Invalid duration unit: "${unit}"`);
  }
  return amount * unitMs;
}
