// Vercel serverless function — proxies translation requests to Anthropic API
// Requires ANTHROPIC_API_KEY environment variable set in Vercel dashboard

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { names } = req.body;
  if (!names || !Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ error: 'names array required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const prompt = `You are translating kitchen ingredient names from English to Tamil for a temple free food kitchen in Tamil Nadu.
Translate each ingredient name to its Tamil name as used in everyday Tamil cooking.
Use common simple Tamil terms. If it is a brand name or has no Tamil equivalent, keep the English name.
Return ONLY a valid JSON object mapping each English name to its Tamil translation. No explanation, no markdown, no backticks.

Ingredients:
${names.join('\n')}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const translations = JSON.parse(clean);
    return res.status(200).json({ translations });
  } catch (err) {
    console.error('Translation error:', err);
    return res.status(500).json({ error: 'Translation failed', detail: err.message });
  }
}
