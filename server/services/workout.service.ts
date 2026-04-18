import { prisma } from "../lib/prisma";

export async function logWorkout(
  userId: string,
  data: {
    programWeek: number;
    day: number;
    sessionId: string;
    durationSeconds: number;
    percentComplete: number;
    notes?: string | null;
  },
) {
  return prisma.workoutLog.create({
    data: {
      userId,
      programWeek: data.programWeek,
      day: data.day,
      sessionId: data.sessionId,
      durationSeconds: data.durationSeconds,
      percentComplete: data.percentComplete,
      notes: data.notes ?? null,
    },
  });
}

export async function listWorkouts(userId: string, limit = 60) {
  return prisma.workoutLog.findMany({
    where: { userId },
    orderBy: { completedAt: "desc" },
    take: limit,
  });
}

export async function upsertProfile(
  userId: string,
  data: {
    position?: string | null;
    dominantFoot?: string | null;
    weeklyMinutes?: number | null;
    injuryFlags?: string | null;
  },
) {
  return prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      position: data.position ?? null,
      dominantFoot: data.dominantFoot ?? null,
      weeklyMinutes: data.weeklyMinutes ?? null,
      injuryFlags: data.injuryFlags ?? null,
    },
    update: {
      position: data.position === undefined ? undefined : data.position,
      dominantFoot: data.dominantFoot,
      weeklyMinutes: data.weeklyMinutes,
      injuryFlags: data.injuryFlags,
    },
  });
}

export async function getProfile(userId: string) {
  return prisma.userProfile.findUnique({ where: { userId } });
}

export async function addFeedback(userId: string, rating: number, body?: string | null) {
  // Wrap insert + rolling-average + bias upsert in a transaction so concurrent
  // feedback writes can't corrupt difficultyBias.
  return prisma.$transaction(async (tx) => {
    const fb = await tx.sessionFeedback.create({
      data: { userId, rating, body: body ?? null },
    });
    const recent = await tx.sessionFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { rating: true },
    });
    const avg = recent.reduce((s, r) => s + r.rating, 0) / recent.length;
    let delta = 0;
    if (avg <= 2) delta = -0.15;
    else if (avg >= 4) delta = 0.1;
    if (delta !== 0) {
      const profile = await tx.userProfile.findUnique({
        where: { userId },
        select: { difficultyBias: true },
      });
      const next = Math.min(1, Math.max(-1, (profile?.difficultyBias ?? 0) + delta));
      await tx.userProfile.upsert({
        where: { userId },
        create: { userId, difficultyBias: next },
        update: { difficultyBias: next },
      });
    }
    return fb;
  });
}
