// Single source of truth for every figure the assistant may quote.
// Used by the web page (browser) and by gen_data.py (node) so training and serving match exactly.
(function (root) {
  var FREQ = { Weekly: 52 / 12, Monthly: 1, Quarterly: 1 / 3, Yearly: 1 / 12 };
  var NEED = { Housing: 1, Utilities: 1, Groceries: 1, Transport: 1, Health: 1 };
  function pct(a, b) { return b > 0 ? a / b * 100 : 0; }
  function computeFacts(b) {
    var cur = b.currency, inc = b.income > 0 ? b.income : 0;
    var day = Math.max(b.day || 1, 1), dim = b.dim || 30;
    function m(n) { var r = Math.round(n), s = String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (r < 0 ? '-' : '') + cur + s; }
    var by = {}, expT = 0, billT = 0, subs = 0, big = null, yearly = null;
    (b.expenses || []).forEach(function (e) { by[e.category] = (by[e.category] || 0) + e.amount; expT += e.amount; });
    var bl = (b.bills || []).map(function (x) { return { n: x.name, a: x.amount, f: x.frequency, c: x.category, m: x.amount * (FREQ[x.frequency] || 1) }; });
    bl.forEach(function (x) {
      billT += x.m; by[x.c] = (by[x.c] || 0) + x.m;
      if (x.c === 'Subscriptions') subs += x.m;
      if (!big || x.m > big.m) big = x;
      if (!yearly && x.f === 'Yearly') yearly = x;
    });
    var out = expT + billT, needs = 0;
    Object.keys(by).forEach(function (k) { if (NEED[k]) needs += by[k]; });
    var wants = out - needs, sav = inc - out, proj = expT / day * dim + billT;
    var top = null;
    Object.keys(by).forEach(function (k) { if (!NEED[k] && by[k] > 0 && (top === null || by[k] > by[top])) top = k; });
    var gap = Math.max(0.2 * inc - sav, 0);
    var w = Math.min(gap * 0.5, wants * 0.2), r = gap - w, bc = Math.min(r, billT * 0.08), rest = r - bc;
    var over = Math.max(proj - inc, 0), left = Math.max(dim - day, 1);
    var score = 0;
    if (inc > 0) {
      var np = pct(needs, inc), wp = pct(wants, inc);
      score = Math.min(Math.max(pct(sav, inc), 0) / 20, 1) * 40 + (np <= 50 ? 20 : Math.max(0, 20 - (np - 50))) +
        (wp <= 30 ? 20 : Math.max(0, 20 - (wp - 30))) + (pct(billT, inc) <= 35 ? 10 : 0) + (proj <= inc ? 10 : 0);
      score = Math.round(Math.max(0, Math.min(100, score)));
    }
    var entries = Object.keys(by).filter(function (k) { return by[k] > 0; }).sort(function (a, c) { return by[c] - by[a]; }).slice(0, 4);
    var breakdown = out > 0 ? entries.map(function (k) { return k + ' ' + m(by[k]) + ' (' + Math.round(by[k] / out * 100) + '%)'; }).join('; ') : 'n/a';
    var NA = 'n/a';
    return {
      no_income: inc <= 0, has_bills: bl.length > 0, has_expenses: (b.expenses || []).length > 0,
      has_subscriptions: subs > 0, has_yearly_bill: !!yearly,
      income: m(inc), spent_so_far: m(expT), bills_per_month: m(billT), bills_pct_of_income: Math.round(pct(billT, inc)),
      bills_within_35pct_guide: pct(billT, inc) <= 35,
      left_to_save: m(sav), available_to_set_aside: m(Math.max(sav, 0)), savings_rate_pct: Math.round(pct(sav, inc)),
      meets_20pct_goal: gap <= 0, target_20pct: m(0.2 * inc), savings_gap_to_20pct: m(gap),
      top_flexible_category: top || NA, top_flexible_amount: top ? m(by[top]) : NA, top_flexible_cut_20pct: top ? m(by[top] * 0.2) : NA,
      subscriptions_per_month: m(subs), subscriptions_per_year: m(subs * 12),
      biggest_bill_name: big ? big.n : NA, biggest_bill_per_month: big ? m(big.m) : NA, biggest_bill_pct_of_bills: big ? Math.round(big.m / billT * 100) : 0,
      yearly_bill_name: yearly ? yearly.n : NA, yearly_bill_amount: yearly ? m(yearly.a) : NA, yearly_bill_monthly_setaside: yearly ? m(yearly.a / 12) : NA,
      projected_month_end: m(proj), over_budget: proj > inc, projected_over_by: m(over), extra_cut_per_remaining_day: m(over / left),
      projected_left: m(inc - proj), projected_savings_rate_pct: Math.round(pct(inc - proj, inc)),
      plan_cut_wants: m(w), plan_has_bill_cut: bc >= 0.5, plan_cut_bills: m(bc), plan_has_remaining: rest >= 0.5, plan_remaining: m(rest),
      health_score: score,
      nothing_entered: (b.expenses || []).length === 0 && bl.length === 0,
      total_spent_incl_bills: m(out), spending_breakdown: breakdown,
      needs_pct_of_income: Math.round(pct(needs, inc)), wants_pct_of_income: Math.round(pct(wants, inc)),
      emergency_fund_target: m(3 * out), months_to_emergency_fund: (sav > 0 && out > 0) ? String(Math.ceil(3 * out / sav)) : NA
    };
  }
  root.computeFacts = computeFacts;
  if (typeof module !== 'undefined') module.exports = computeFacts;
})(typeof window !== 'undefined' ? window : globalThis);
