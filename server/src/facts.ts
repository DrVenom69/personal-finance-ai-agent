/**
 * facts.ts - Direct TypeScript engine ported 1:1 from facts.js
 * 
 * Single source of truth for budget math, 50/30/20 guidelines,
 * savings gap analysis, runway health score, and purchase affordability checks.
 */

export const FREQ: Record<string, number> = {
  Weekly: 52 / 12,
  Monthly: 1,
  Quarterly: 1 / 3,
  Yearly: 1 / 12,
};

export const NEED: Record<string, number> = {
  Housing: 1,
  Utilities: 1,
  Groceries: 1,
  Transport: 1,
  Health: 1,
};

export function pct(a: number, b: number): number {
  return b > 0 ? (a / b) * 100 : 0;
}

export function money(cur: string, n: number): string {
  const r = Math.round(n);
  const s = String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (r < 0 ? '-' : '') + cur + s;
}

export interface BudgetInput {
  currency: string;
  income: number;
  day?: number;
  dim?: number;
  expenses?: Array<{ category: string; amount: number }>;
  bills?: Array<{ name: string; amount: number; frequency: string; category: string }>;
}

export interface ComputedFacts {
  no_income: boolean;
  has_bills: boolean;
  has_expenses: boolean;
  has_subscriptions: boolean;
  has_yearly_bill: boolean;
  income: string;
  spent_so_far: string;
  bills_per_month: string;
  bills_pct_of_income: number;
  bills_within_35pct_guide: boolean;
  left_to_save: string;
  available_to_set_aside: string;
  savings_rate_pct: number;
  meets_20pct_goal: boolean;
  target_20pct: string;
  savings_gap_to_20pct: string;
  top_flexible_category: string;
  top_flexible_amount: string;
  top_flexible_cut_20pct: string;
  subscriptions_per_month: string;
  subscriptions_per_year: string;
  biggest_bill_name: string;
  biggest_bill_per_month: string;
  biggest_bill_pct_of_bills: number;
  yearly_bill_name: string;
  yearly_bill_amount: string;
  yearly_bill_monthly_setaside: string;
  projected_month_end: string;
  over_budget: boolean;
  projected_over_by: string;
  extra_cut_per_remaining_day: string;
  projected_left: string;
  projected_savings_rate_pct: number;
  plan_cut_wants: string;
  plan_has_bill_cut: boolean;
  plan_cut_bills: string;
  plan_has_remaining: boolean;
  plan_remaining: string;
  health_score: number;
  nothing_entered: boolean;
  total_spent_incl_bills: string;
  spending_breakdown: string;
  needs_pct_of_income: number;
  wants_pct_of_income: number;
  emergency_fund_target: string;
  months_to_emergency_fund: string;
}

export function computeFacts(b: BudgetInput): ComputedFacts {
  const cur = b.currency || '¥';
  const inc = b.income > 0 ? b.income : 0;
  const day = Math.max(b.day || 1, 1);
  const dim = b.dim || 30;

  function m(n: number): string {
    return money(cur, n);
  }

  const by: Record<string, number> = {};
  let expT = 0;
  let billT = 0;
  let subs = 0;
  let big: { n: string; a: number; f: string; c: string; m: number } | null = null;
  let yearly: { n: string; a: number; f: string; c: string; m: number } | null = null;

  (b.expenses || []).forEach((e) => {
    by[e.category] = (by[e.category] || 0) + e.amount;
    expT += e.amount;
  });

  const bl = (b.bills || []).map((x) => ({
    n: x.name,
    a: x.amount,
    f: x.frequency,
    c: x.category,
    m: x.amount * (FREQ[x.frequency] || 1),
  }));

  bl.forEach((x) => {
    billT += x.m;
    by[x.c] = (by[x.c] || 0) + x.m;
    if (x.c === 'Subscriptions') subs += x.m;
    if (!big || x.m > big.m) big = x;
    if (!yearly && x.f === 'Yearly') yearly = x;
  });

  const out = expT + billT;
  let needs = 0;
  Object.keys(by).forEach((k) => {
    if (NEED[k]) needs += by[k];
  });
  const wants = out - needs;
  const sav = inc - out;
  const proj = (expT / day) * dim + billT;

  let top: string | null = null;
  Object.keys(by).forEach((k) => {
    if (!NEED[k] && by[k] > 0 && (top === null || by[k] > by[top])) top = k;
  });

  const gap = Math.max(0.2 * inc - sav, 0);
  const w = Math.min(gap * 0.5, wants * 0.2);
  const r = gap - w;
  const bc = Math.min(r, billT * 0.08);
  const rest = r - bc;
  const over = Math.max(proj - inc, 0);
  const left = Math.max(dim - day, 1);

  let score = 0;
  if (inc > 0) {
    const np = pct(needs, inc);
    const wp = pct(wants, inc);
    score =
      Math.min(Math.max(pct(sav, inc), 0) / 20, 1) * 40 +
      (np <= 50 ? 20 : Math.max(0, 20 - (np - 50))) +
      (wp <= 30 ? 20 : Math.max(0, 20 - (wp - 30))) +
      (pct(billT, inc) <= 35 ? 10 : 0) +
      (proj <= inc ? 10 : 0);
    score = Math.round(Math.max(0, Math.min(100, score)));
  }

  const entries = Object.keys(by)
    .filter((k) => by[k] > 0)
    .sort((a, c) => by[c] - by[a])
    .slice(0, 4);
  const breakdown =
    out > 0
      ? entries.map((k) => `${k} ${m(by[k])} (${Math.round((by[k] / out) * 100)}%)`).join('; ')
      : 'n/a';
  const NA = 'n/a';

  return {
    no_income: inc <= 0,
    has_bills: bl.length > 0,
    has_expenses: (b.expenses || []).length > 0,
    has_subscriptions: subs > 0,
    has_yearly_bill: !!yearly,
    income: m(inc),
    spent_so_far: m(expT),
    bills_per_month: m(billT),
    bills_pct_of_income: Math.round(pct(billT, inc)),
    bills_within_35pct_guide: pct(billT, inc) <= 35,
    left_to_save: m(sav),
    available_to_set_aside: m(Math.max(sav, 0)),
    savings_rate_pct: Math.round(pct(sav, inc)),
    meets_20pct_goal: gap <= 0,
    target_20pct: m(0.2 * inc),
    savings_gap_to_20pct: m(gap),
    top_flexible_category: top || NA,
    top_flexible_amount: top ? m(by[top]) : NA,
    top_flexible_cut_20pct: top ? m(by[top] * 0.2) : NA,
    subscriptions_per_month: m(subs),
    subscriptions_per_year: m(subs * 12),
    biggest_bill_name: big ? (big as any).n : NA,
    biggest_bill_per_month: big ? m((big as any).m) : NA,
    biggest_bill_pct_of_bills: big ? Math.round(((big as any).m / billT) * 100) : 0,
    yearly_bill_name: yearly ? (yearly as any).n : NA,
    yearly_bill_amount: yearly ? m((yearly as any).a) : NA,
    yearly_bill_monthly_setaside: yearly ? m((yearly as any).a / 12) : NA,
    projected_month_end: m(proj),
    over_budget: proj > inc,
    projected_over_by: m(over),
    extra_cut_per_remaining_day: m(over / left),
    projected_left: m(inc - proj),
    projected_savings_rate_pct: Math.round(pct(inc - proj, inc)),
    plan_cut_wants: m(w),
    plan_has_bill_cut: bc >= 0.5,
    plan_cut_bills: m(bc),
    plan_has_remaining: rest >= 0.5,
    plan_remaining: m(rest),
    health_score: score,
    nothing_entered: (b.expenses || []).length === 0 && bl.length === 0,
    total_spent_incl_bills: m(out),
    spending_breakdown: breakdown,
    needs_pct_of_income: Math.round(pct(needs, inc)),
    wants_pct_of_income: Math.round(pct(wants, inc)),
    emergency_fund_target: m(3 * out),
    months_to_emergency_fund: sav > 0 && out > 0 ? String(Math.ceil((3 * out) / sav)) : NA,
  };
}

export interface PurchaseOffer {
  name: string;
  price: number;
  store?: string;
  stores?: number;
  converted?: boolean;
  n_before?: number;
  lowest_before?: number;
}

export interface ComputedPurchase {
  item: string;
  store: string;
  stores: number;
  converted: boolean;
  price: string;
  priceNumber: number;
  pct_of_income: number;
  left_to_save: string;
  left_to_save_num: number;
  after_purchase: string;
  after_purchase_num: number;
  savings_target: string;
  savings_target_num: number;
  verdict: 'ok' | 'stretch' | 'wait' | 'no_income';
  months_to_save: string;
  history: 'lowest' | 'above' | 'first';
  lowest_before: string;
}

export function computePurchase(b: BudgetInput, o: PurchaseOffer): ComputedPurchase {
  const inc = b.income > 0 ? b.income : 0;
  let out = 0;
  const cur = b.currency || '¥';

  (b.expenses || []).forEach((e) => {
    out += e.amount;
  });
  (b.bills || []).forEach((x) => {
    out += x.amount * (FREQ[x.frequency] || 1);
  });

  const sav = inc - out;
  const goal = 0.2 * inc;
  const price = o.price;
  const after = sav - price;
  let verdict: 'ok' | 'stretch' | 'wait' | 'no_income';

  if (inc <= 0) verdict = 'no_income';
  else if (after >= goal) verdict = 'ok';
  else if (after >= 0) verdict = 'stretch';
  else verdict = 'wait';

  const months = sav > 0 ? Math.ceil(price / sav) : null;

  return {
    item: o.name,
    store: o.store || 'Market Store',
    stores: o.stores || 1,
    converted: !!o.converted,
    price: money(cur, price),
    priceNumber: price,
    pct_of_income: inc > 0 ? Math.round((price / inc) * 100) : 0,
    left_to_save: money(cur, sav),
    left_to_save_num: sav,
    after_purchase: money(cur, after),
    after_purchase_num: after,
    savings_target: money(cur, goal),
    savings_target_num: goal,
    verdict,
    months_to_save: months === null ? 'n/a' : String(months),
    history:
      (o.n_before ?? 0) > 0 && o.lowest_before
        ? price <= o.lowest_before + 0.5
          ? 'lowest'
          : 'above'
        : 'first',
    lowest_before: o.lowest_before ? money(cur, o.lowest_before) : 'n/a',
  };
}

export function purchaseText(p: ComputedPurchase): string {
  const L = [
    `I checked ${p.store} just now: ${p.item} costs ${p.price}${
      p.converted ? ' (converted at an approximate exchange rate)' : ''
    }${p.stores > 1 ? `, the lowest of ${p.stores} stores` : ''}.`,
  ];

  if (p.verdict === 'no_income') {
    L.push('Add your monthly income so I can compare the price with your budget.');
  } else {
    L.push(
      `That is ${p.pct_of_income}% of your monthly income, and you have ${p.left_to_save} left to save this month.`
    );
    if (p.verdict === 'ok') {
      L.push(
        `Paying now would leave ${p.after_purchase}, still above your 20% savings target of ${p.savings_target}, so it fits your budget.`
      );
    } else if (p.verdict === 'stretch') {
      L.push(
        `Paying now would leave ${p.after_purchase}, below your 20% savings target of ${p.savings_target}. You can afford it, but it breaks your savings goal this month.`
      );
    } else {
      L.push(
        p.months_to_save === 'n/a'
          ? 'You are not saving anything this month, so this would have to come from money outside your budget. Waiting and saving first is the safer choice.'
          : `That is more than you have left, so at this month's pace it would take about ${p.months_to_save} months to save for it. Waiting and saving first is the safer choice.`
      );
    }
  }

  if (p.history === 'first') {
    L.push('This is the first price I have recorded for it, so I cannot say whether it is a good price.');
  } else if (p.history === 'lowest') {
    L.push('This is the lowest price I have recorded for it.');
  } else {
    L.push(`The lowest price I have recorded is ${p.lowest_before}.`);
  }

  L.push(
    'I only compare the price with your budget and cannot tell if a newer model is coming. This is general information, not financial advice.'
  );

  return L.join('\n');
}
