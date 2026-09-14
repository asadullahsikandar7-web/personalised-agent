import { describe, it, expect } from 'vitest';
import ms from '../../src/utils/ms';

describe('ms duration parser', () => {
  it('parses minutes', () => expect(ms('15m')).toBe(15 * 60_000));
  it('parses days', () => expect(ms('30d')).toBe(30 * 86_400_000));
  it('parses hours', () => expect(ms('2h')).toBe(2 * 3_600_000));
  it('parses seconds', () => expect(ms('45s')).toBe(45_000));
  it('throws on an invalid string', () => expect(() => ms('not-a-duration')).toThrow());
  it('throws on a missing unit', () => expect(() => ms('15')).toThrow());
});
