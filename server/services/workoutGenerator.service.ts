/**
 * Rule-based micro-session generator (fast, deterministic, testable).
 * AI can *replace* this output later using the same JSON shape — keep the contract stable.
 */

export type GeneratedBlock = {
  id: string;
  name: string;
  durationMinutes: number;
  focus: string;
  exercises: { name: string; detail: string }[];
};

export type FootballPosition =
  | "GK"
  | "CB"
  | "FB"
  | "WB"
  | "DM"
  | "CM"
  | "AM"
  | "W"
  | "ST";

const POSITION_FOCUS: Record<FootballPosition, { label: string; tags: string[] }> = {
  GK: { label: "Réflexes / plongeons / distribution", tags: ["réflexes", "pieds", "saut"] },
  CB: { label: "Duels / vitesse courte / jeu de tête", tags: ["accélération 5–15m", "saut", "stabilité"] },
  FB: { label: "Vitesse linéaire / endurance de répétition", tags: ["sprints 20–40m", "décélération", "mobilité hanche"] },
  WB: { label: "Volume + répétitions haute intensité", tags: ["intervalles", "agilité", "course défensive"] },
  DM: { label: "Puissance / changements de direction", tags: ["COD", "fentes", "core anti-rotation"] },
  CM: { label: "Moteur aérobie + qualité de répétition", tags: ["beep-style", "gainage", "pliométrie légère"] },
  AM: { label: "Agilité / freinage / accélération", tags: ["cones", "appuis", "coordination"] },
  W: { label: "Vitesse max / répétition de sprints", tags: ["RSA courte", "francs", "mobilité cheville"] },
  ST: { label: "Explosivité / finition sous fatigue", tags: ["sprints", "unilatéral", "torso rigide"] },
};

function blocksForPosition(pos: FootballPosition, minutes: number): GeneratedBlock[] {
  const focus = POSITION_FOCUS[pos];
  const third = Math.max(10, Math.round(minutes / 3));

  return [
    {
      id: "warmup",
      name: "Activation",
      durationMinutes: Math.min(15, third),
      focus: "Mobilité + patterns de course",
      exercises: [
        { name: "Marche rapide + skips", detail: "5–8 min, augmenter progressivement" },
        { name: "Mobilité hanche-cheville", detail: "rotations contrôlées, sans douleur" },
      ],
    },
    {
      id: "main",
      name: `Bloc principal — ${focus.label}`,
      durationMinutes: Math.min(50, third * 2),
      focus: focus.tags.join(" · "),
      exercises: drillMix(pos),
    },
    {
      id: "finisher",
      name: "Finisher + retour au calme",
      durationMinutes: Math.min(20, third),
      focus: "Qualité technique fatigué (sans jeu risqué)",
      exercises: [
        { name: "Intervals courts", detail: pos === "GK" ? "réflexes + relances" : "sprints 15–25m contrôlés" },
        { name: "Retour calme", detail: "marche légère 3–5 min" },
      ],
    },
  ];
}

function drillMix(pos: FootballPosition): { name: string; detail: string }[] {
  const base = [
    { name: "Appuis / freinage", detail: "3–4 séries, qualité > vitesse" },
    { name: "Accélération progressive", detail: "10–20m, posture haute" },
  ];
  if (pos === "GK") {
    return [
      { name: "Plongeons latéraux", detail: "3×6, technique bras" },
      { name: "Réflexes courte distance", detail: "6–8 rép, récup complète" },
      ...base,
    ];
  }
  if (pos === "ST" || pos === "W") {
    return [
      { name: "Sprint volonté max", detail: "6×20–30m, récup active" },
      { name: "Unilatéral explosif", detail: "fentes sautées ou step-up" },
      ...base,
    ];
  }
  if (pos === "CB" || pos === "FB") {
    return [
      { name: "Sauts / duel aérien", detail: "3×5, atterrissage souple" },
      { name: "Jeu de jambes défensif", detail: "pas chassés latéraux 3×20s" },
      ...base,
    ];
  }
  return [
    { name: "Agilité en L / slalom", detail: "4–6 rép, freinage net" },
    { name: "Renforcement core", detail: "pallof ou gainage dynamique" },
    ...base,
  ];
}

export function generateMicroSession(position: FootballPosition, minutes: number) {
  const m = Math.min(120, Math.max(15, minutes));
  return {
    position,
    totalMinutes: m,
    blocks: blocksForPosition(position, m),
    coachingCue:
      "Garde 1–2 répétitions en réserve sur les sprints si la qualité technique baisse — la fatigue chronique tue la vitesse.",
  };
}
