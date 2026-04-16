import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken, type AuthPayload } from "../middleware/auth.middleware";

const ROUNDS = 12;

export async function registerUser(
  email: string,
  password: string,
  name?: string,
): Promise<{ token: string; userId: string }> {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    const err = new Error("Email already registered") as Error & { status: number };
    err.status = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name: name?.trim() || null,
      profile: { create: {} },
    },
  });
  const payload: AuthPayload = { sub: user.id, email: user.email };
  return { token: signToken(payload), userId: user.id };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ token: string; userId: string }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    const err = new Error("Invalid credentials") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error("Invalid credentials") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  const payload: AuthPayload = { sub: user.id, email: user.email };
  return { token: signToken(payload), userId: user.id };
}
