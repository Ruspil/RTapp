import { Router } from "express";
import * as rag from "../controllers/rag.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { aiLimiter } from "../middleware/rateLimit.middleware";

export const ragRouter = Router();

ragRouter.post("/retrieve", authMiddleware, aiLimiter, rag.postRetrieve);
