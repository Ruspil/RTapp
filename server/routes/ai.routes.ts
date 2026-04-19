import { Router } from "express";
import * as ai from "../controllers/ai.controller";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.middleware";
import { aiLimiter } from "../middleware/rateLimit.middleware";

export const aiRouter = Router();

/**
 * Auth policy:
 *  - Production / when explicitly required → strict auth.
 *  - Development → optional auth, so the plan personaliser can be tested
 *    without first creating an account. Set AI_REQUIRE_AUTH=1 in `.env` to
 *    force strict auth in dev too.
 */
const requireAuth = process.env.AI_REQUIRE_AUTH === "1" || process.env.NODE_ENV === "production";
const aiAuth = requireAuth ? authMiddleware : optionalAuthMiddleware;

aiRouter.post("/chat", aiAuth, aiLimiter, ai.postChat);
