import type { Request, Response } from "express";
import { aiChatBody } from "../../shared/validation/api";
import { chatWithFallback, listAvailableProviders } from "../lib/llmProvider";

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

    const providers = listAvailableProviders();
    if (providers.length === 0) {
      res.status(503).json({
        error:
          "No LLM provider configured. Set GROQ_API_KEY, NVIDIA_EMBED_API_KEY, or OPENROUTER_API_KEY in .env.",
      });
      return;
    }

    const { messages, context, maxTokens, temperature, jsonMode } = parsed.data;
    const sys = context ? `${SYSTEM}\n\nContexte:\n${context}` : SYSTEM;
    const apiMessages = [{ role: "system" as const, content: sys }, ...messages];

    const result = await chatWithFallback({
      messages: apiMessages,
      maxTokens,
      temperature,
      jsonMode,
    });

    res.json({
      content: result.content,
      provider: result.provider,
      attempts: result.attempts,
    });
  } catch (e) {
    console.error("[ai.controller] All providers failed", e);
    res.status(502).json({ error: "AI service unavailable. Please try again." });
  }
}
