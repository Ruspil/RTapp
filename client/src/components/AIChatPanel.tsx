import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Trash2, Bot, User, Loader2, X, Dumbbell } from 'lucide-react'
import { useAIChat } from '@/hooks/useAIChat'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AIChatPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context?: string
}

const QUICK_QUESTIONS = [
  'Comment récupérer après l\'entraînement?',
  'Meilleur exercice pour le dos?',
  'Conseils nutrition post-workout?',
  'Comment éviter les blessures?',
]

export function AIChatPanel({ open, onOpenChange, context }: AIChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { messages, isLoading, error, sendMessage, clearMessages } = useAIChat({ context })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const msg = input.trim()
    setInput('')
    await sendMessage(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-zinc-950 border-zinc-800 p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0">
                <Dumbbell className="size-4 text-white" />
              </div>
              <div>
                <SheetTitle className="text-white text-sm font-black leading-tight">
                  AI Fitness Coach
                </SheetTitle>
                <p className="text-[10px] text-zinc-500">Propulsé par Llama 3.3 · Groq</p>
              </div>
            </div>
            <Button
              onClick={clearMessages}
              variant="ghost"
              size="icon"
              className="size-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2.5',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  msg.role === 'user'
                    ? 'bg-zinc-700'
                    : 'bg-gradient-to-br from-red-500 to-orange-500'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="size-3.5 text-zinc-300" />
                ) : (
                  <Bot className="size-3.5 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm'
                    : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-sm'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-2.5">
              <div className="size-7 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="size-3.5 text-white" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="size-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="size-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="size-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-950/40 border border-red-900 rounded-xl px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions (only if only welcome message) */}
        {messages.length === 1 && !isLoading && (
          <div className="px-4 pb-3 shrink-0">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">
              Questions fréquentes
            </p>
            <div className="space-y-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900 shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pose ta question..."
              disabled={isLoading}
              className="flex-1 bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                'size-10 p-0 rounded-xl shrink-0',
                input.trim() && !isLoading
                  ? 'bg-gradient-to-br from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white'
                  : 'bg-zinc-800 text-zinc-600'
              )}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
