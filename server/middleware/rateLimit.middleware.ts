import rateLimit from "express-rate-limit";

/**
 * Strict limiter for auth endpoints (credential stuffing / brute force).
 * Skips successful requests so legit users aren't penalized.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Trop de tentatives, réessaie dans quelques minutes." },
});

/**
 * Tight limiter for endpoints that hit paid/limited upstream APIs (LLM, RAG).
 * Keyed by authenticated user when present, otherwise IP.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? "unknown",
  message: { error: "Limite IA atteinte (15/min). Réessaie dans une minute." },
});

/** Default protection for write/expensive endpoints. */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? "unknown",
});
