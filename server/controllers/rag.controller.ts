import type { Request, Response } from "express";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { ragRetrieveBody } from "../../shared/validation/api";
import { cosineSimilarity, embedQuery, rerank } from "../lib/nvidiaNim";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface KbItem {
  id: string;
  text: string;
  source: string;
  tags: string[];
  embedding: number[];
}

interface KbFile {
  model: string;
  items: KbItem[];
}

let cachedKb: KbFile | null = null;

/**
 * Loads the pre-computed knowledge base embeddings from disk on first call.
 * Path is resolved relative to the compiled JS location.
 */
function loadKb(): KbFile | null {
  if (cachedKb) return cachedKb;

  // In dev (tsx) __dirname is server/controllers; in prod it's dist/.
  const candidates = [
    resolve(__dirname, "..", "data", "knowledge", "embeddings.json"),
    resolve(__dirname, "..", "..", "server", "data", "knowledge", "embeddings.json"),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const raw = readFileSync(p, "utf-8");
        const parsed = JSON.parse(raw) as KbFile;
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          cachedKb = parsed;
          return cachedKb;
        }
      } catch {
        // try next
      }
    }
  }
  return null;
}

/**
 * POST /api/rag/retrieve
 * Body: { query: string, topK?: number }
 *
 * Pipeline:
 *  1) Embed the query (NVIDIA nv-embedqa-e5-v5).
 *  2) Cosine-rank pre-computed KB embeddings; take top 12.
 *  3) Rerank with NVIDIA nv-rerankqa-mistral-4b-v3.
 *  4) Return top topK (default 6).
 *
 * If anything fails (missing keys, KB missing, network), responds 200 with
 * `{ unavailable: true }` so the client falls through gracefully.
 */
export async function postRetrieve(req: Request, res: Response) {
  const parsed = ragRetrieveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { query, topK = 6 } = parsed.data;

  const kb = loadKb();
  if (!kb) {
    res
      .status(200)
      .json({ unavailable: true, reason: "knowledge base not built (run `npm run kb:build`)" });
    return;
  }

  try {
    // 1) Embed
    const queryVec = await embedQuery(query);

    // 2) Coarse rank by cosine similarity
    const scored = kb.items.map((it) => ({
      item: it,
      score: cosineSimilarity(queryVec, it.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    const candidates = scored.slice(0, Math.max(topK * 2, 12));

    // 3) Rerank with cross-encoder for precision
    let order = candidates.map((_, i) => i);
    try {
      const rankings = await rerank({
        query,
        passages: candidates.map((c) => ({ text: c.item.text })),
      });
      order = rankings.map((r) => r.index);
    } catch {
      // Reranker is optional — if it fails keep coarse order.
    }

    // 4) Take topK and shape response
    const snippets = order
      .slice(0, topK)
      .map((idx) => candidates[idx])
      .filter(Boolean)
      .map(({ item, score }) => ({
        id: item.id,
        text: item.text,
        source: item.source,
        score,
      }));

    res.json({ snippets });
  } catch (e) {
    console.error("[rag.controller] retrieve failed", e);
    res.status(200).json({ unavailable: true, reason: "knowledge service unavailable" });
  }
}
