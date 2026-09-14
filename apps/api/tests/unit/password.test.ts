import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/utils/password';

describe('password hashing', () => {
  it('hashes a password to something other than the plaintext', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toBe('correct horse battery staple');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('my-secret-password');
    await expect(verifyPassword('my-secret-password', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('my-secret-password');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('produces a different hash for the same password each time (salted)', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
  });
});
