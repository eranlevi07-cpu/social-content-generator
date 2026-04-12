exports.handler = async function(event) {

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY חסר — הגדר ב-Netlify Environment Variables' })
    };
  }

  const body = JSON.parse(event.body);
  const { brandName, brandDesc, audience, toneChips, websiteUrl, competitors, freeText, filesText } = body;
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim().replace(/[^\x20-\x7E]/g, '');

  const prompt = `You are a brand strategist. Analyze the following brand information and return ONLY valid JSON.

Brand Name: ${brandName}
Description: ${brandDesc || '(not provided)'}
Target Audience: ${audience || '(not provided)'}
Tone preference: ${toneChips || '(not provided)'}
${websiteUrl ? `Website: ${websiteUrl}` : ''}
${competitors ? `Competitors/References:\n${competitors}` : ''}
${freeText ? `Additional Info:\n${freeText}` : ''}
${filesText ? `Uploaded Files Content:\n${filesText}` : ''}

Return ONLY this JSON (all values in Hebrew):
{
  "summary": "2-3 sentence brand summary",
  "audience": "precise target audience description",
  "values": "3-4 core brand values separated by commas",
  "tone": "recommended tone description",
  "topics": ["topic 1", "topic 2", "topic 3", "topic 4", "topic 5"]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  console.log('analyze-brand response:', text);

  const clean = text.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch(e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'שגיאה בניתוח — נסה שוב', raw: text })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(parsed)
  };
};
