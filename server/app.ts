import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";
import { workoutRouter } from "./routes/workout.routes";
import { aiRouter } from "./routes/ai.routes";

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "512kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/workouts", workoutRouter);
  app.use("/api/ai", aiRouter);

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}
