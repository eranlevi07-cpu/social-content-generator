const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const Anthropic = require("@anthropic-ai/sdk");

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

exports.generateContent = onRequest(
  { secrets: [anthropicKey], cors: ["*"] },
  async (req, res) => {
    res.set(corsHeaders);
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Missing prompt" });

      const client = new Anthropic({ apiKey: anthropicKey.value() });
      const message = await client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      });

      return res.json({ content: message.content?.[0]?.text || "", success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message, success: false });
    }
  }
);

exports.analyzeBrand = onRequest(
  { secrets: [anthropicKey], cors: ["*"] },
  async (req, res) => {
    res.set(corsHeaders);
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "Missing url" });

      let siteContent = "";
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const siteRes = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        clearTimeout(timeout);
        const html = await siteRes.text();
        siteContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);
      } catch (e) {
        siteContent = `לא ניתן לגשת לאתר: ${url}`;
      }

      const client = new Anthropic({ apiKey: anthropicKey.value() });
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: `נתח את המותג מ-URL: ${url}\n\nתוכן: ${siteContent}\n\nספק ניתוח קצר בעברית: שם, תחום, קהל יעד, טון, ערכים. 4-6 משפטים בלבד.`
        }],
      });

      return res.json({ insights: message.content?.[0]?.text || "", success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message, success: false });
    }
  }
);
