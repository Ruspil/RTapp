import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import * as workout from "../controllers/workout.controller";

export const workoutRouter = Router();

workoutRouter.post("/log", authMiddleware, workout.postLog);
workoutRouter.get("/logs", authMiddleware, workout.getLogs);
workoutRouter.get("/profile", authMiddleware, workout.getProfile);
workoutRouter.put("/profile", authMiddleware, workout.putProfile);
workoutRouter.post("/feedback", authMiddleware, workout.postFeedback);
workoutRouter.get("/generate", workout.getGenerated);
