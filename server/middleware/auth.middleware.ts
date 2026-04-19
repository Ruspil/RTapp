import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  sub: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET must be set (min 16 chars)");
  }
  return s;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "14d" });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Auth middleware that accepts but does not require a token.
 *
 *  - If a valid Bearer token is present: populates `req.user` (so downstream
 *    rate-limiters and controllers can key off the user id).
 *  - If the token is missing: lets the request through anonymously.
 *  - If the token is present but invalid: still 401s, because that signals a
 *    bug in the client or a tampered token, not "no auth".
 *
 * Useful for routes that are convenient to expose anonymously in development
 * (e.g. AI plan generation while the user hasn't created an account yet) but
 * should be locked down in production. Pair with a feature flag check at the
 * route level: `process.env.AI_REQUIRE_AUTH === "1" ? authMiddleware : optionalAuthMiddleware`.
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    next();
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
