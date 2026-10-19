// Reads JSON on stdin. A list of bases -> list of facts (used by gen_data.py).
// {mode:'facts',base} -> facts.  {mode:'purchase',base,offer} -> {facts, text}.
const cf = require('./facts.js');
let s = '';
process.stdin.on('data', d => s += d).on('end', () => {
  const j = JSON.parse(s); let out;
  if (Array.isArray(j)) out = j.map(cf);
  else if (j.mode === 'facts') out = cf(j.base);
  else if (j.mode === 'purchase') { const p = cf.computePurchase(j.base, j.offer); out = { facts: p, text: cf.purchaseText(p) }; }
  else throw new Error('unknown mode');
  process.stdout.write(JSON.stringify(out));
});
