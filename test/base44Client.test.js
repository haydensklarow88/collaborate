import { describe, it, expect } from 'vitest';
import { base44 } from '../src/api/base44Client.js';

describe('base44Client', () => {
  it('returns null from auth.me() when no API_BASE configured', async () => {
    const me = await base44.auth.me();
    expect(me).toBeNull();
  });
});
