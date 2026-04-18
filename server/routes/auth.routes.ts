import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { authLimiter } from "../middleware/rateLimit.middleware";

export const authRouter = Router();

authRouter.post("/register", authLimiter, auth.register);
authRouter.post("/login", authLimiter, auth.login);
