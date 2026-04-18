import { apiBase, authHeader } from "@/lib/api"
import { planLengthLabel, type AIPlanInputs } from "./schema"

interface RagSnippet {
  text: string
  source: string
  score: number
}

interface RagResponse {
  snippets?: RagSnippet[]
  error?: string
  unavailable?: boolean
}

/**
 * Builds a focused retrieval query from the questionnaire so the embedder
 * pulls back the most relevant scientific context.
 */
function buildQuery(inputs: AIPlanInputs): string {
  const sport = inputs.sport === "other" ? inputs.sportFreeText ?? "general" : inputs.sport
  const parts = [
    `Goal: ${inputs.primaryGoal}`,
    inputs.secondaryGoals.length ? `Secondary: ${inputs.secondaryGoals.join(", ")}` : "",
    `Sport: ${sport}`,
    inputs.footballPosition ? `Position: ${inputs.footballPosition}` : "",
    `Experience: ${inputs.experience}`,
    `Days per week: ${inputs.daysPerWeek}`,
    `Plan length: ${planLengthLabel(inputs.planLength)}`,
    `Equipment: ${inputs.equipment.join(", ")}`,
    inputs.injuries ? `Injuries: ${inputs.injuries}` : "",
  ]
  return parts.filter(Boolean).join(". ")
}

/**
 * Calls the server's RAG endpoint (NVIDIA embed + rerank). Returns a labeled
 * context block ready to inject into the LLM user message, or empty string
 * if RAG is unavailable / fails / returns nothing useful.
 */
export async function retrieveContext(inputs: AIPlanInputs): Promise<string> {
  const query = buildQuery(inputs)
  try {
    const res = await fetch(`${apiBase()}/api/rag/retrieve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ query, topK: 3 }),
    })
    const data = (await res.json().catch(() => ({}))) as RagResponse
    if (!res.ok || data.unavailable || !data.snippets?.length) return ""
    return formatContext(data.snippets)
  } catch {
    return ""
  }
}

function formatContext(snippets: RagSnippet[]): string {
  const lines = snippets.map((s, i) => `[S${i + 1}] (${s.source}) ${s.text}`)
  return `CONTEXTE SCIENTIFIQUE (cite avec [S1], [S2]... dans citations si pertinent):\n${lines.join("\n")}`
}
