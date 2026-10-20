import express from 'express';
import { computeFacts, computePurchase, purchaseText, money, FREQ } from './facts.ts';

const app = express();
app.use(express.json());

// Default "Alex" scenario — mirrors the web app's DEFAULT_ALEX_FINANCIALS.
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

// Single source of truth for the runway math (same formula as the web app).
function runwayMath(f: typeof ALEX) {
  const safeToSpend = f.cash - f.committedBills - f.daysToPayday * f.dailyBaseline;
  const safeToday = safeToSpend > 0 ? Math.round((safeToSpend / Math.max(1, f.daysToPayday)) * 10) / 10 : 0;
  return { safeToSpend, safeToday, isShortfall: safeToSpend < 0, shortfallGap: safeToSpend < 0 ? Math.abs(safeToSpend) : 0 };
}

// A BudgetInput shape for facts.ts computeFacts (50/30/20 engine).
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

app.get('/health', (_req, res) => res.json({ ok: true, service: 'proact-backend' }));

app.get('/runway', (_req, res) => {
  res.json({ ...ALEX, ...runwayMath(ALEX) });
});

app.post('/purchase-check', (req, res) => {
  const { item = 'item', price = 150, needLevel = 'essential' } = req.body ?? {};
  const p = Number(price) || 0;
  const { safeToSpend } = runwayMath(ALEX);

  // Essential funding plan (mirrors the web app's checkPurchase essential branch).
  const secondHandPrice = Math.round(p * 0.6);
  const adequatePrice = p;
  const premiumPrice = Math.max(900, Math.round(p * 3.5));
  const plan = (price: number) => ({ price, runwayAfter: safeToSpend - price, isAffordable: safeToSpend - price >= 0 });

  const fundingPlan = [
    { tier: 'second_hand', label: `Second-hand (${money('¥', secondHandPrice)})`, ...plan(secondHandPrice) },
    { tier: 'adequate', label: `Adequate (${money('¥', adequatePrice)})`, ...plan(adequatePrice) },
    { tier: 'premium', label: `Premium (${money('¥', premiumPrice)})`, ...plan(premiumPrice) },
  ];

  res.json({
    item, price: p, needLevel, safeToSpend,
    verdictChip: 'Buy',
    shouldBuy: true,
    fundingPlan,
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

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`ProAct backend listening on http://localhost:${PORT}`));
