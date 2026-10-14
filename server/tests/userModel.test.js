import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { User } from '../src/models/User.js';

describe('User refresh sessions', () => {
  it('accepts a UUID string as the refresh-session identifier', () => {
    const user = new User({
      name: 'Test Customer',
      email: 'customer@example.com',
      passwordHash: 'hashed-password',
      roles: ['customer'],
      refreshSessions: [{
        _id: crypto.randomUUID(),
        tokenHash: 'token-digest',
        expiresAt: new Date(Date.now() + 60_000),
      }],
    });

    expect(user.validateSync()).toBeUndefined();
    expect(typeof user.refreshSessions[0]._id).toBe('string');
  });
});

