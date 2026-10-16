// Vercel function. Uses your own model if LLM_URL is set, otherwise the Anthropic API.
//   LLM_URL    OpenAI-compatible base URL of your model server, e.g. https://host:8000/v1
//   LLM_MODEL  served model name (default finance-llm), LLM_KEY optional bearer token
//   ANTHROPIC_API_KEY  fallback provider; ANTHROPIC_MODEL optional
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const msgs = req.body && req.body.messages;
  if (!Array.isArray(msgs) || !msgs.length) return res.status(400).json({ error: 'messages required' });
  let clean = msgs.slice(-12).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 12000) }));
  while (clean.length && clean[0].role !== 'user') clean.shift();
  if (!clean.length || clean[clean.length - 1].role !== 'user') return res.status(400).json({ error: 'last message must be from user' });
  try {
    let r, j, text;
    if (process.env.LLM_URL) {
      const h = { 'content-type': 'application/json' };
      if (process.env.LLM_KEY) h.authorization = 'Bearer ' + process.env.LLM_KEY;
      r = await fetch(process.env.LLM_URL.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers: h,
        body: JSON.stringify({ model: process.env.LLM_MODEL || 'finance-llm', messages: clean, max_tokens: 400, temperature: 0.2 }) });
      j = await r.json();
      text = r.ok && j.choices && j.choices[0] ? j.choices[0].message.content : '';
    } else {
      if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'No model configured' });
      r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 700, messages: clean }) });
      j = await r.json();
      text = r.ok ? (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n') : '';
    }
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: 'Upstream error' });
    return res.status(200).json({ text });
  } catch (e) { return res.status(502).json({ error: 'Upstream request failed' }); }
};
