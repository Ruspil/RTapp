import type { Request, Response } from "express";
import { registerBody, loginBody } from "../../shared/validation/api";
import * as authService from "../services/auth.service";

function sendErr(res: Response, err: unknown) {
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : 500;
  const message = err instanceof Error ? err.message : "Server error";
  res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
}

export async function register(req: Request, res: Response) {
  const parsed = registerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const out = await authService.registerUser(parsed.data.email, parsed.data.password, parsed.data.name);
    res.status(201).json(out);
  } catch (e) {
    sendErr(res, e);
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const out = await authService.loginUser(parsed.data.email, parsed.data.password);
    res.json(out);
  } catch (e) {
    sendErr(res, e);
  }
}
