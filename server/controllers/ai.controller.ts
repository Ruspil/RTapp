import type { Request, Response } from "express";
import { aiChatBody } from "../../shared/validation/api";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM = `Tu es un coach pour footballeurs (terrain + gym). Réponses courtes et actionnables.
Si douleur/blessure: oriente vers un professionnel de santé.
Tu reçois éventuellement un contexte (profil, séance) — respecte-le.`;

export async function postChat(_req: Request, res: Response) {
  try {
    const parsed = aiChatBody.safeParse(_req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "GROQ_API_KEY not configured on server" });
      return;
    }

    const { messages, context } = parsed.data;
    const sys = context ? `${SYSTEM}\n\nContexte:\n${context}` : SYSTEM;

    const apiMessages = [{ role: "system" as const, content: sys }, ...messages];

    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: apiMessages,
        max_tokens: 512,
        temperature: 0.6,
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      res.status(502).json({ error: (err as { error?: { message?: string } }).error?.message ?? r.statusText });
      return;
    }

    const data = (await r.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    res.json({ content: text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI request failed" });
  }
}
