/**
 * Thin wrappers around NVIDIA NIM REST endpoints used for RAG.
 *  - Embeddings:  POST https://integrate.api.nvidia.com/v1/embeddings
 *  - Reranking:   POST https://integrate.api.nvidia.com/v1/ranking
 *
 * Keys are server-side only (NVIDIA_EMBED_API_KEY, NVIDIA_RERANK_API_KEY).
 */

const EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings";
const EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";

const RERANK_URL = "https://ai.api.nvidia.com/v1/retrieval/nvidia/reranking";
const RERANK_MODEL = "nvidia/rerank-qa-mistral-4b";

export interface EmbedResult {
  embedding: number[];
}

export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.NVIDIA_EMBED_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_EMBED_API_KEY not configured");

  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: [text],
      input_type: "query",
      encoding_format: "float",
      truncate: "END",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`NVIDIA embed failed: ${res.status} ${errBody}`);
  }
  const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  const emb = data.data?.[0]?.embedding;
  if (!Array.isArray(emb)) throw new Error("NVIDIA embed returned no embedding");
  return emb;
}

export interface RerankInput {
  query: string;
  passages: Array<{ text: string }>;
}

export interface RerankRanking {
  index: number;
  logit: number;
}

/**
 * Reranks `passages` against `query`. Returns indices into the original
 * `passages` array sorted by relevance (highest first).
 */
export async function rerank(input: RerankInput): Promise<RerankRanking[]> {
  const apiKey = process.env.NVIDIA_RERANK_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_RERANK_API_KEY not configured");

  const res = await fetch(RERANK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: RERANK_MODEL,
      query: { text: input.query },
      passages: input.passages.map((p) => ({ text: p.text })),
      truncate: "END",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`NVIDIA rerank failed: ${res.status} ${errBody}`);
  }
  const data = (await res.json()) as { rankings?: RerankRanking[] };
  if (!Array.isArray(data.rankings)) {
    throw new Error("NVIDIA rerank returned no rankings");
  }
  // API returns rankings sorted descending by logit, but enforce just in case.
  return [...data.rankings].sort((a, b) => b.logit - a.logit);
}

/** Cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
