import { Router } from "express";
import * as ai from "../controllers/ai.controller";

export const aiRouter = Router();

aiRouter.post("/chat", ai.postChat);
