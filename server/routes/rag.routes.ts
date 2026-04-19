import { Router } from "express";
import * as rag from "../controllers/rag.controller";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.middleware";
import { aiLimiter } from "../middleware/rateLimit.middleware";

export const ragRouter = Router();

// Same policy as /api/ai (RAG is part of the same plan-generation flow):
// optional auth in dev, strict auth in production or when AI_REQUIRE_AUTH=1.
const requireAuth = process.env.AI_REQUIRE_AUTH === "1" || process.env.NODE_ENV === "production";
const ragAuth = requireAuth ? authMiddleware : optionalAuthMiddleware;

ragRouter.post("/retrieve", ragAuth, aiLimiter, rag.postRetrieve);
