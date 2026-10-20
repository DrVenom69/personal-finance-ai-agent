import { createHash } from 'node:crypto';
import { db } from './db.ts';

export const GENESIS_HASH = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function computeEntryHash(prevHash: string, timestamp: string, action: string, tier: string, result: string): string {
  return sha256(`${prevHash}${timestamp}${action}${tier}${result}`);
}

export function createAuditEntry(
  userId: string,
  action: string,
  tier: string,
  ruleUsed: string,
  result: string,
  details?: string
) {
  const last = db.prepare('SELECT hash FROM audit_log WHERE user_id = ? ORDER BY seq DESC LIMIT 1').get(userId) as
    | { hash: string }
    | undefined;
  const prevHash = last ? last.hash : GENESIS_HASH;
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const hash = computeEntryHash(prevHash, timestamp, action, tier, result);
  const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(
    'INSERT INTO audit_log (id, user_id, timestamp, action, tier, rule_used, result, hash, prev_hash, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, userId, timestamp, action, tier, ruleUsed, result, hash, prevHash, details ?? null);
  return { id, timestamp, action, tier, ruleUsed, result, hash, prevHash, details };
}

export function verifyChain(userId: string): { isValid: boolean; brokenAtId?: string } {
  const rows = db.prepare('SELECT * FROM audit_log WHERE user_id = ? ORDER BY seq').all(userId) as any[];
  for (let i = 0; i < rows.length; i++) {
    const expectedPrev = i === 0 ? GENESIS_HASH : rows[i - 1].hash;
    if (rows[i].prev_hash !== expectedPrev) return { isValid: false, brokenAtId: rows[i].id };
    if (rows[i].hash !== computeEntryHash(expectedPrev, rows[i].timestamp, rows[i].action, rows[i].tier, rows[i].result)) {
      return { isValid: false, brokenAtId: rows[i].id };
    }
  }
  return { isValid: true };
}
