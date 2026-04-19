import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

/**
 * Builds a rate-limit key. Prefers the authenticated user id (so a logged-in
 * user can't bypass the limit by changing IP), and falls back to the IP for
 * anonymous requests.
 *
 * IMPORTANT: We MUST funnel the IP through `ipKeyGenerator` from
 * express-rate-limit. It normalizes IPv6 addresses (collapses zone identifiers,
 * strips the embedded /64 noise) so a single user can't bypass the limit by
 * cycling through their IPv6 prefix. Using `req.ip` directly triggers the
 * library's built-in `ERR_ERL_KEY_GEN_IPV6` validator and crashes the server
 * on startup.
 */
function userOrIpKey(req: Request): string {
  if (req.user?.sub) return `user:${req.user.sub}`;
  const ip = req.ip ?? "unknown";
  return `ip:${ipKeyGenerator(ip)}`;
}

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
  keyGenerator: userOrIpKey,
  message: { error: "Limite IA atteinte (15/min). Réessaie dans une minute." },
});

/** Default protection for write/expensive endpoints. */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
});
