import "dotenv/config";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { createApp } from "./app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = createApp();
const port = Number(process.env.PORT) || 4000;

const staticPath =
  process.env.NODE_ENV === "production"
    ? path.resolve(__dirname, "public")
    : path.resolve(__dirname, "..", "dist", "public");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

const server = createServer(app);

server.listen(port, () => {
  console.log(`API + static listening on http://localhost:${port}/`);
});
