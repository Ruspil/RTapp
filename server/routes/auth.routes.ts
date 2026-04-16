import { Router } from "express";
import * as auth from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/register", auth.register);
authRouter.post("/login", auth.login);
