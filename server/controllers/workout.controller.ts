import type { Request, Response } from "express";
import { profileBody, workoutLogBody, feedbackBody, generateWorkoutQuery } from "../../shared/validation/api";
import * as workoutService from "../services/workout.service";
import { generateMicroSession } from "../services/workoutGenerator.service";

export async function postLog(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = workoutLogBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const row = await workoutService.logWorkout(req.user.sub, parsed.data);
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save workout" });
  }
}

export async function getLogs(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const rows = await workoutService.listWorkouts(req.user.sub);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load workouts" });
  }
}

export async function putProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = profileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const row = await workoutService.upsertProfile(req.user.sub, parsed.data);
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update profile" });
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const row = await workoutService.getProfile(req.user.sub);
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load profile" });
  }
}

export async function postFeedback(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = feedbackBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const row = await workoutService.addFeedback(req.user.sub, parsed.data.rating, parsed.data.body);
    res.status(201).json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save feedback" });
  }
}

export async function getGenerated(req: Request, res: Response) {
  try {
    const parsed = generateWorkoutQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const body = generateMicroSession(parsed.data.position, parsed.data.minutes);
    res.json(body);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate workout" });
  }
}
