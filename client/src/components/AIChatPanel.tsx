import { useState, useRef, useEffect } from "react"
import { Send, Trash2, Loader2, Sparkles } from "lucide-react"
import { useAIChat } from "@/hooks/useAIChat"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { BrandLogo } from "@/components/app/BrandLogo"
import { cn } from "@/lib/utils"

interface AIChatPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context?: string
}

const QUICK_QUESTIONS = [
  "How to recover after training?",
  "Best exercise for the back?",
  "Post-workout nutrition tips?",
  "How to avoid injuries?",
]

export function AIChatPanel({
  open,
  onOpenChange,
  context,
}: AIChatPanelProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { messages, isLoading, error, sendMessage, clearMessages } = useAIChat({
    context,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const msg = input.trim()
    setInput("")
    await sendMessage(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = input.trim().length > 0 && !isLoading

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-[#0a0a0a] border-white/10 p-0 flex flex-col text-white"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo />
              <div className="min-w-0">
                <span className="nk-eyebrow text-white/40">AI Coach</span>
                <SheetTitle className="text-white text-lg font-black tracking-tight uppercase leading-none mt-1">
                  Ask Anything
                </SheetTitle>
              </div>
            </div>
            <button
              type="button"
              onClick={clearMessages}
              className="nk-icon-btn shrink-0"
              aria-label="Clear chat"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1.5",
                msg.role === "user" ? "items-end" : "items-start",
              )}
            >
              <span
                className={cn(
                  "nk-eyebrow",
                  msg.role === "user" ? "text-white/40" : "text-white/40",
                )}
              >
                {msg.role === "user" ? "You" : "Coach"}
              </span>
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-white text-black rounded-tr-sm"
                    : "bg-white/5 border border-white/10 text-white/90 rounded-tl-sm",
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex flex-col items-start gap-1.5">
              <span className="nk-eyebrow text-white/40">Coach</span>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3.5">
                <div className="flex gap-1.5 items-center">
                  <span
                    className="size-1.5 rounded-full bg-white/60 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="size-1.5 rounded-full bg-white/60 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="size-1.5 rounded-full bg-white/60 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2.5 text-xs text-red-300 leading-relaxed">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions (only if only welcome message) */}
        {messages.length === 1 && !isLoading && (
          <div className="px-5 pb-3 shrink-0">
            <p className="nk-eyebrow text-white/40 mb-2.5">Quick Questions</p>
            <div className="space-y-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="nk-tile w-full text-sm font-medium text-white/85 px-4 py-3"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-4 border-t border-white/10 shrink-0">
          <div className="flex gap-2 items-stretch">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your question…"
                disabled={isLoading}
                className="w-full h-12 bg-white/5 border border-white/15 text-white placeholder:text-white/30 rounded-full pl-5 pr-12 text-sm font-medium outline-none focus:border-white/35 transition-colors disabled:opacity-50"
              />
              <Sparkles className="size-3.5 text-white/30 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "size-12 rounded-full shrink-0 flex items-center justify-center transition-all",
                canSend
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-white/10 text-white/30 cursor-not-allowed",
              )}
              style={
                canSend
                  ? { boxShadow: "0 4px 16px rgba(255,255,255,0.15)" }
                  : undefined
              }
              aria-label="Send"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
