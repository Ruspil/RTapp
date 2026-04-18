import { useState, useCallback, useRef } from "react"
import { apiBase, authHeader } from "@/lib/api"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

interface UseAIChatOptions {
  context?: string
}

export function useAIChat({ context }: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Salut! Je suis ton coach IA. Pose-moi une question sur l’entraînement — le modèle tourne côté serveur (clé API non exposée au navigateur).",
      timestamp: Date.now(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isLoadingRef = useRef(false)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isLoadingRef.current) return

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage.trim(),
        timestamp: Date.now(),
      }

      isLoadingRef.current = true
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)
      setError(null)

      const historyForApi = [...messagesRef.current.filter((m) => m.id !== "welcome"), userMsg]
        .slice(-8)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))

      try {
        const res = await fetch(`${apiBase()}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({
            messages: historyForApi,
            context,
          }),
        })

        const data = (await res.json()) as { content?: string; error?: string }
        if (!res.ok) {
          throw new Error(data.error ?? `Erreur ${res.status}`)
        }

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.content ?? "Pas de réponse.",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur de connexion"
        setError(msg)
      } finally {
        isLoadingRef.current = false
        setIsLoading(false)
      }
    },
    [context],
  )

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Salut! Je suis ton coach IA. Pose-moi une question sur l’entraînement — le modèle tourne côté serveur (clé API non exposée au navigateur).",
        timestamp: Date.now(),
      },
    ])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  }
}
