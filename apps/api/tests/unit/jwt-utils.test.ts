import { describe, it, expect } from 'vitest';
import { generateOpaqueToken, hashToken } from '../../src/utils/jwt';

describe('token utilities', () => {
  it('generates a sufficiently long random opaque token', () => {
    const token = generateOpaqueToken();
    expect(token.length).toBeGreaterThanOrEqual(64);
  });

  it('generates different tokens on each call', () => {
    expect(generateOpaqueToken()).not.toBe(generateOpaqueToken());
  });

  it('hashes deterministically (same input -> same hash)', () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('never stores the raw token as its own hash', () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).not.toBe(token);
  });
});
