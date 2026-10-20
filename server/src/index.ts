import express from 'express';
import { randomUUID } from 'node:crypto';
import { computeFacts, money } from './facts.ts';
import { db } from './db.ts';
import { createAuditEntry, verifyChain } from './audit.ts';

const app = express();
app.use(express.json());

// Default "Alex" scenario — used by the unauthenticated demo endpoints.
const ALEX = {
  cash: 600,
  daysToPayday: 9,
  committedBills: 200,
  dailyBaseline: 25,
  savingsPot: 1200,
  savingsGoal: 3000,
  monthlyIncome: 4000,
  spendingStyle: 'Balanced' as const,
};

function runwayMath(f: typeof ALEX) {
  const safeToSpend = f.cash - f.committedBills - f.daysToPayday * f.dailyBaseline;
  const safeToday = safeToSpend > 0 ? Math.round((safeToSpend / Math.max(1, f.daysToPayday)) * 10) / 10 : 0;
  return { safeToSpend, safeToday, isShortfall: safeToSpend < 0, shortfallGap: safeToSpend < 0 ? Math.abs(safeToSpend) : 0 };
}

function toBudgetInput(f: typeof ALEX) {
  const pastDays = Math.max(1, 30 - f.daysToPayday);
  return {
    currency: '¥',
    income: f.monthlyIncome,
    day: pastDays,
    dim: 30,
    expenses: [{ category: 'Groceries', amount: pastDays * f.dailyBaseline }],
    bills: [{ name: 'Committed Bills', amount: f.committedBills, frequency: 'Monthly', category: 'Housing' }],
  };
}

// ---- Auth (simple bearer token; production swaps in WeChat code2Session) ----
function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = token ? (db.prepare('SELECT * FROM users WHERE token = ?').get(token) as any) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  (req as any).user = user;
  next();
}

function findOrCreateUser(provider: string, externalId: string) {
  let user = db.prepare('SELECT * FROM users WHERE auth_provider = ? AND external_id = ?').get(provider, externalId) as any;
  if (!user) {
    const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const token = randomUUID();
    db.prepare('INSERT INTO users (id, auth_provider, external_id, token) VALUES (?, ?, ?, ?)').run(id, provider, externalId, token);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  }
  return user;
}

// ---- Demo endpoints (unauthenticated, Alex defaults) ----
app.get('/health', (_req, res) => res.json({ ok: true, service: 'proact-backend' }));

app.get('/runway', (_req, res) => res.json({ ...ALEX, ...runwayMath(ALEX) }));

app.post('/purchase-check', (req, res) => {
  const { item = 'item', price = 150, needLevel = 'essential' } = req.body ?? {};
  const p = Number(price) || 0;
  const { safeToSpend } = runwayMath(ALEX);
  const make = (price: number) => ({ price, runwayAfter: safeToSpend - price, isAffordable: safeToSpend - price >= 0 });
  const secondHandPrice = Math.round(p * 0.6);
  const adequatePrice = p;
  const premiumPrice = Math.max(900, Math.round(p * 3.5));
  res.json({
    item, price: p, needLevel, safeToSpend, verdictChip: 'Buy', shouldBuy: true,
    fundingPlan: [
      { tier: 'second_hand', label: `Second-hand (${money('¥', secondHandPrice)})`, ...make(secondHandPrice) },
      { tier: 'adequate', label: `Adequate (${money('¥', adequatePrice)})`, ...make(adequatePrice) },
      { tier: 'premium', label: `Premium (${money('¥', premiumPrice)})`, ...make(premiumPrice) },
    ],
  });
});

app.get('/insights', (_req, res) => {
  const facts = computeFacts(toBudgetInput(ALEX) as any);
  const { safeToSpend, safeToday } = runwayMath(ALEX);
  res.json({
    safeToSpend, safeToday,
    income: facts.income,
    billsPerMonth: facts.bills_per_month,
    billsPctOfIncome: facts.bills_pct_of_income,
    savingsRatePct: facts.savings_rate_pct,
    healthScore: facts.health_score,
    breakdown: facts.spending_breakdown,
  });
});

// ---- Auth ----
app.post('/auth/device', (req, res) => {
  const deviceId = (req.body?.deviceId as string) || `dev-${Math.random().toString(36).slice(2, 8)}`;
  const user = findOrCreateUser('device', deviceId);
  res.json({ userId: user.id, token: user.token });
});

app.post('/auth/wechat', (req, res) => {
  // Production: exchange `code` for an openid via code2Session (WECHAT_APPID/SECRET).
  // Stub for now: derive a mock openid from the code.
  const code = (req.body?.code as string) || 'mock-code';
  const user = findOrCreateUser('wechat', `wechat_${code}`);
  res.json({ userId: user.id, token: user.token });
});

// ---- Import (SMS/CSV ingestion with confidence + duplicate merge) ----
app.post('/import', auth, (req, res) => {
  const user = (req as any).user;
  const { source = 'SMS', rawText = '', date } = req.body ?? {};

  const amountMatch = (String(rawText).match(/\d+(\.\d{1,2})?/) || [])[0];
  const amount = amountMatch ? parseFloat(amountMatch) : null;
  const t = String(rawText).toLowerCase();
  const merchant = t.includes('coffee') ? 'Manner Coffee'
    : t.includes('supermarket') || t.includes('mart') ? 'Metro Hypermarket'
    : t.includes('bento') || t.includes('cafeteria') ? 'Campus Cafeteria Bento'
    : 'Unknown Merchant';
  const txDate = date || new Date().toISOString().slice(0, 10);
  const confidence = amount != null && merchant !== 'Unknown Merchant' ? 'High'
    : amount != null ? 'Medium' : 'Low';

  // Duplicate merge: same merchant + amount + same day.
  const existing = db.prepare(
    'SELECT id FROM transactions WHERE user_id = ? AND merchant = ? AND amount = ? AND date = ? LIMIT 1'
  ).get(user.id, merchant, amount, txDate) as { id: string } | undefined;

  const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(
    'INSERT INTO transactions (id, user_id, date, merchant, amount, category, source, confidence, merged_with, needs_review, raw_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, user.id, txDate, merchant, amount, 'Daily', source, confidence, existing?.id ?? null, confidence === 'Low' ? 1 : 0, rawText);

  createAuditEntry(user.id, `Import transaction from ${source}`, 'T1', 'R-IMPORT', 'approved', `${merchant} ${amount ?? ''}`.trim());

  res.json({
    success: true,
    transaction: { id, date: txDate, merchant, amount, confidence, source, mergedWith: existing?.id ?? null },
    duplicateMerge: !!existing,
  });
});

// ---- Audit log (hash chain) ----
app.get('/audit', auth, (req, res) => {
  const user = (req as any).user;
  const entries = db.prepare('SELECT * FROM audit_log WHERE user_id = ? ORDER BY seq').all(user.id);
  res.json({ ...verifyChain(user.id), entries });
});

// ---- Profile (income, bills, goals, style) ----
app.put('/profile', auth, (req, res) => {
  const user = (req as any).user;
  const { currency, monthlyIncome, spendingStyle, savingsGoal, savingsPot, bills } = req.body ?? {};

  db.prepare(
    'UPDATE users SET currency = COALESCE(?, currency), monthly_income = COALESCE(?, monthly_income), spending_style = COALESCE(?, spending_style), savings_goal = COALESCE(?, savings_goal), savings_pot = COALESCE(?, savings_pot) WHERE id = ?'
  ).run(currency ?? null, monthlyIncome ?? null, spendingStyle ?? null, savingsGoal ?? null, savingsPot ?? null, user.id);

  if (Array.isArray(bills)) {
    db.prepare('DELETE FROM bills WHERE user_id = ?').run(user.id);
    const ins = db.prepare('INSERT INTO bills (user_id, name, amount, frequency, due_day, category, is_protected) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const b of bills) ins.run(user.id, b.name, b.amount, b.frequency || 'Monthly', b.dueDay || 1, b.category || 'Other', b.isProtected ? 1 : 0);
  }

  createAuditEntry(user.id, 'Update profile', 'T2', 'R-PROFILE', 'approved', 'Updated budget settings');
  res.json({ user: db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`ProAct backend listening on http://localhost:${PORT}`));
