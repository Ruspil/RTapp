import { z } from "zod";

export const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80).optional(),
});

export const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileBody = z.object({
  position: z
    .enum(["GK", "CB", "FB", "WB", "DM", "CM", "AM", "W", "ST"])
    .optional()
    .nullable(),
  dominantFoot: z.enum(["left", "right"]).optional().nullable(),
  weeklyMinutes: z.number().int().min(0).max(1200).optional().nullable(),
  injuryFlags: z.string().max(2000).optional().nullable(),
});

export const workoutLogBody = z.object({
  programWeek: z.number().int().min(1).max(52),
  day: z.number().int().min(1).max(7),
  sessionId: z.string().min(1),
  durationSeconds: z.number().int().min(0),
  percentComplete: z.number().min(0).max(100),
  notes: z.string().max(2000).optional().nullable(),
});

export const feedbackBody = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(500).optional().nullable(),
});

export const generateWorkoutQuery = z.object({
  position: z.enum(["GK", "CB", "FB", "WB", "DM", "CM", "AM", "W", "ST"]),
  minutes: z.coerce.number().int().min(15).max(120).default(45),
});

export const ragRetrieveBody = z.object({
  query: z.string().min(1).max(2000),
  topK: z.number().int().min(1).max(12).optional(),
});

/** Per-message and total content caps to bound LLM cost / abuse. */
const AI_MESSAGE_MAX_CHARS = 4000;
const AI_TOTAL_MAX_CHARS = 24000;

export const aiChatBody = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string().min(1).max(AI_MESSAGE_MAX_CHARS),
        }),
      )
      .min(1)
      .max(30),
    context: z.string().max(8000).optional(),
    /** Optional override for response cap. Server clamps to a safe range. */
    maxTokens: z.number().int().min(64).max(8000).optional(),
    /** Optional sampling temperature override. */
    temperature: z.number().min(0).max(2).optional(),
    /** When true, asks Groq for JSON-only output (response_format json_object). */
    jsonMode: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const total =
      val.messages.reduce((s, m) => s + m.content.length, 0) +
      (val.context?.length ?? 0);
    if (total > AI_TOTAL_MAX_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Conversation trop longue (${total} > ${AI_TOTAL_MAX_CHARS} caractères).`,
        path: ["messages"],
      });
    }
  });
