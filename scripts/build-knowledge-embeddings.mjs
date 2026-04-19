/**
 * Builds embeddings for the RAG knowledge base.
 *
 * Reads:  server/data/knowledge/snippets.json
 * Writes: server/data/knowledge/embeddings.json
 *
 * Run with: npm run kb:build
 *
 * Requires NVIDIA_EMBED_API_KEY in .env (loaded via process.env).
 */
import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SNIPPETS_PATH = resolve(__dirname, "..", "server", "data", "knowledge", "snippets.json");
const EMBED_PATH = resolve(__dirname, "..", "server", "data", "knowledge", "embeddings.json");
const NIM_URL = "https://integrate.api.nvidia.com/v1/embeddings";
const MODEL = "nvidia/nv-embedqa-e5-v5";

const apiKey = process.env.NVIDIA_EMBED_API_KEY;
if (!apiKey) {
  console.error("NVIDIA_EMBED_API_KEY not set in .env. Aborting.");
  process.exit(1);
}

if (!existsSync(SNIPPETS_PATH)) {
  console.error(`Snippets file not found: ${SNIPPETS_PATH}`);
  process.exit(1);
}

const snippets = JSON.parse(readFileSync(SNIPPETS_PATH, "utf-8"));
if (!Array.isArray(snippets) || snippets.length === 0) {
  console.error("snippets.json is empty or invalid.");
  process.exit(1);
}

console.log(`Embedding ${snippets.length} snippets via ${MODEL}...`);

/**
 * NVIDIA embed: send small batches (the API typically accepts arrays of strings).
 * Use input_type "passage" since these are documents to be retrieved.
 */
const BATCH_SIZE = 8;
const out = [];

for (let i = 0; i < snippets.length; i += BATCH_SIZE) {
  const batch = snippets.slice(i, i + BATCH_SIZE);
  const inputs = batch.map((s) => s.text);

  const res = await fetch(NIM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: inputs,
      input_type: "passage",
      encoding_format: "float",
      truncate: "END",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`Batch ${i}-${i + batch.length} failed: ${res.status} ${res.statusText}\n${errBody}`);
    process.exit(1);
  }

  const data = await res.json();
  const items = Array.isArray(data?.data) ? data.data : [];
  if (items.length !== batch.length) {
    console.error(`Mismatched response length: expected ${batch.length}, got ${items.length}`);
    process.exit(1);
  }

  for (let j = 0; j < batch.length; j++) {
    const snippet = batch[j];
    const emb = items[j]?.embedding;
    if (!Array.isArray(emb)) {
      console.error(`Missing embedding for snippet id=${snippet.id}`);
      process.exit(1);
    }
    out.push({
      id: snippet.id,
      text: snippet.text,
      source: snippet.source,
      tags: snippet.tags ?? [],
      embedding: emb,
    });
  }

  console.log(`  ${Math.min(i + BATCH_SIZE, snippets.length)} / ${snippets.length}`);
}

mkdirSync(dirname(EMBED_PATH), { recursive: true });
writeFileSync(EMBED_PATH, JSON.stringify({ model: MODEL, items: out }, null, 2));
console.log(`Wrote ${out.length} embeddings to ${EMBED_PATH}`);
