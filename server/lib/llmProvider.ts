/**
 * LLM provider abstraction with automatic fallback.
 *
 * All supported providers expose an OpenAI-compatible /chat/completions
 * endpoint, so we use a single request shape and rotate through providers
 * if any one is unavailable, rate-limited, or out of credit.
 *
 * Order:
 *  1. The provider listed in `LLM_PROVIDER` (env var), if its key is set.
 *  2. Any remaining providers whose API key is present.
 *
 * Failures considered "should try next":
 *  - 401 / 402 / 429 / 5xx
 *  - Network errors
 *
 * Failures that bubble up immediately (treated as bug or invalid input):
 *  - 400 (bad request shape)
 */

export type LlmProviderName = "groq" | "nvidia" | "openrouter";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmChatOptions {
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export interface LlmChatResult {
  content: string;
  /** Provider that actually answered (useful for logging / UI). */
  provider: LlmProviderName;
  /** Total chain attempts (1 = first try succeeded). */
  attempts: number;
}

interface ProviderConfig {
  name: LlmProviderName;
  url: string;
  model: string;
  /** Reads API key from process.env at call time (so .env reloads work). */
  apiKey: () => string | undefined;
  /** Optional extra headers (e.g. OpenRouter requires Referer/Title). */
  extraHeaders?: () => Record<string, string>;
}

const PROVIDERS: Record<LlmProviderName, ProviderConfig> = {
  groq: {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    apiKey: () => process.env.GROQ_API_KEY,
  },
  nvidia: {
    name: "nvidia",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: "meta/llama-3.3-70b-instruct",
    // NVIDIA RAG embed key works on the LLM endpoint too (same NVIDIA account).
    apiKey: () => process.env.NVIDIA_LLM_API_KEY ?? process.env.NVIDIA_EMBED_API_KEY,
  },
  openrouter: {
    name: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    // Free model on OpenRouter (no credit required as of writing).
    model: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free",
    apiKey: () => process.env.OPENROUTER_API_KEY,
    extraHeaders: () => ({
      // OpenRouter requires (or strongly recommends) these for ranking + abuse handling.
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_SITE_NAME ?? "training-app",
    }),
  },
};

/**
 * Determines the chain of providers to try, in order.
 *  - The provider explicitly named in LLM_PROVIDER comes first (if its key is set).
 *  - Remaining providers with a present key are appended (deduped).
 */
function resolveProviderChain(): ProviderConfig[] {
  const preferredName = (process.env.LLM_PROVIDER ?? "groq").toLowerCase() as LlmProviderName;
  const order: LlmProviderName[] = [preferredName, "groq", "nvidia", "openrouter"];

  const seen = new Set<string>();
  const chain: ProviderConfig[] = [];
  for (const name of order) {
    const cfg = PROVIDERS[name];
    if (!cfg) continue;
    if (seen.has(cfg.name)) continue;
    if (!cfg.apiKey()) continue;
    seen.add(cfg.name);
    chain.push(cfg);
  }
  return chain;
}

interface ProviderError {
  provider: LlmProviderName;
  status?: number;
  message: string;
}

function shouldTryNext(status: number | undefined): boolean {
  if (status == null) return true; // network/parse error
  if (status === 400) return false; // our payload is bad — no point retrying elsewhere
  // Retry on auth/quota/rate-limit/availability problems. 403 is included
  // because some providers return it for revoked keys or geo blocks — the
  // next provider in the chain may still work.
  return (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 408 ||
    status === 429 ||
    status >= 500
  );
}

async function callProvider(cfg: ProviderConfig, opts: LlmChatOptions): Promise<string> {
  const apiKey = cfg.apiKey();
  if (!apiKey) {
    const err: ProviderError = { provider: cfg.name, message: "API key missing" };
    throw err;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (cfg.extraHeaders) Object.assign(headers, cfg.extraHeaders());

  const body = {
    model: cfg.model,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? 512,
    temperature: opts.temperature ?? 0.6,
    ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  let res: Response;
  try {
    res = await fetch(cfg.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    const err: ProviderError = {
      provider: cfg.name,
      message: e instanceof Error ? e.message : String(e),
    };
    throw err;
  }

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const message =
      (errJson as { error?: { message?: string } }).error?.message ??
      (errJson as { detail?: string }).detail ??
      res.statusText;
    const err: ProviderError = {
      provider: cfg.name,
      status: res.status,
      message: typeof message === "string" ? message : JSON.stringify(message),
    };
    throw err;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Sends `opts` through the provider chain. Returns the first successful
 * response. If all providers fail, throws an aggregated error.
 */
export async function chatWithFallback(opts: LlmChatOptions): Promise<LlmChatResult> {
  const chain = resolveProviderChain();
  if (chain.length === 0) {
    throw new Error(
      "No LLM provider configured. Set GROQ_API_KEY, NVIDIA_EMBED_API_KEY (or NVIDIA_LLM_API_KEY), or OPENROUTER_API_KEY in .env.",
    );
  }

  const failures: ProviderError[] = [];

  for (let i = 0; i < chain.length; i++) {
    const cfg = chain[i];
    try {
      const content = await callProvider(cfg, opts);
      return { content, provider: cfg.name, attempts: i + 1 };
    } catch (raw) {
      const err = raw as ProviderError;
      failures.push(err);
      // If this is a 400 we surface immediately (our payload is the problem).
      if (!shouldTryNext(err.status)) {
        const aggregate = new Error(`Provider ${err.provider} rejected request (${err.status}): ${err.message}`);
        (aggregate as Error & { failures: ProviderError[] }).failures = failures;
        throw aggregate;
      }
      // Otherwise log and try next provider in the chain.
      console.warn(
        `[llmProvider] ${cfg.name} failed (status=${err.status ?? "n/a"}): ${err.message}. Trying next…`,
      );
    }
  }

  // All providers exhausted.
  const detail = failures
    .map((f) => `${f.provider}: ${f.status ?? "ERR"} ${f.message}`)
    .join(" | ");
  const aggregate = new Error(`All LLM providers failed. ${detail}`);
  (aggregate as Error & { failures: ProviderError[] }).failures = failures;
  throw aggregate;
}

/** Returns which providers currently have credentials present. */
export function listAvailableProviders(): LlmProviderName[] {
  return resolveProviderChain().map((p) => p.name);
}
