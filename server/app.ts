import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { authRouter } from "./routes/auth.routes";
import { workoutRouter } from "./routes/workout.routes";
import { aiRouter } from "./routes/ai.routes";
import { ragRouter } from "./routes/rag.routes";

function getCorsOrigin(): true | string[] {
  // In dev (no explicit allowlist) reflect any origin so Vite proxies work.
  // In production set CORS_ORIGINS as a comma-separated list of allowed URLs.
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) {
    return process.env.NODE_ENV === "production" ? [] : true;
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function createApp() {
  const app = express();

  // Trust proxy so express-rate-limit + req.ip work behind a reverse proxy.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: getCorsOrigin(),
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
  app.use("/api/rag", ragRouter);

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
