exports.handler = async function(event) {

  // תמיכה ב-CORS preflight
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

  // בדיקת API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY חסר — הגדר ב-Netlify Environment Variables' })
    };
  }

  // קריאה ל-Anthropic
  const body = JSON.parse(event.body);
  const { brandName, brandDesc, tone, weekGoal, topics, startDate } = body;
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim().replace(/[^\x20-\x7E]/g, '');

  const prompt = `You are a social media manager. Return ONLY valid JSON, no other text.
Brand: ${brandName}
Brand Description: ${brandDesc || 'not provided'}
Tone: ${tone || 'professional'}
Goal: ${weekGoal}
Topics: ${topics}
Start Date (Sunday): ${startDate || 'this week'}

Create a 5-day content plan (Sunday through Thursday) in Hebrew.
Each day should have a different platform: אינסטגרם פיד, אינסטגרם ריל, אינסטגרם סטורי, פייסבוק פיד, אינסטגרם פיד.
Return ONLY this JSON structure with exactly 5 items:
{"week_plan":[
{"day":"ראשון","date":"DD/MM","topic":"topic in Hebrew","platform":"אינסטגרם פיד","post_text":"Hebrew post text with emojis and 3 hashtags","shooting_instructions":"Hebrew instructions","ai_prompt":"English prompt for AI image generator","best_time":"09:00","strategy_note":"Hebrew note"},
{"day":"שני","date":"DD/MM","topic":"topic in Hebrew","platform":"אינסטגרם ריל","post_text":"Hebrew post text with emojis and 3 hashtags","shooting_instructions":"Hebrew instructions","ai_prompt":"English prompt for AI image generator","best_time":"12:00","strategy_note":"Hebrew note"},
{"day":"שלישי","date":"DD/MM","topic":"topic in Hebrew","platform":"אינסטגרם סטורי","post_text":"Hebrew post text with emojis and 3 hashtags","shooting_instructions":"Hebrew instructions","ai_prompt":"English prompt for AI image generator","best_time":"18:00","strategy_note":"Hebrew note"},
{"day":"רביעי","date":"DD/MM","topic":"topic in Hebrew","platform":"פייסבוק פיד","post_text":"Hebrew post text with emojis and 3 hashtags","shooting_instructions":"Hebrew instructions","ai_prompt":"English prompt for AI image generator","best_time":"13:00","strategy_note":"Hebrew note"},
{"day":"חמישי","date":"DD/MM","topic":"topic in Hebrew","platform":"אינסטגרם פיד","post_text":"Hebrew post text with emojis and 3 hashtags","shooting_instructions":"Hebrew instructions","ai_prompt":"English prompt for AI image generator","best_time":"09:00","strategy_note":"Hebrew note"}
]}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  console.log('AI response:', text);

  // נקה JSON מ-markdown אם יש
  const clean = text.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch(e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'ה-AI לא החזיר JSON תקין — נסה שוב. אם הבעיה חוזרת, פשט את השאלות.' })
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(parsed)
  };
};
