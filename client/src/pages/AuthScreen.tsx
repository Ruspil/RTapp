import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { loginBody, registerBody } from "@shared/validation/api"
import { apiBase, setAuthToken } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type LoginValues = z.infer<typeof loginBody>
type RegisterValues = z.infer<typeof registerBody>

export function AuthScreen({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [formError, setFormError] = useState<string | null>(null)

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginBody) })
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerBody) })

  async function submitLogin(values: LoginValues) {
    setFormError(null)
    const res = await fetch(`${apiBase()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    const data = (await res.json()) as { token?: string; error?: string }
    if (!res.ok) throw new Error(data.error ?? "Login failed")
    if (data.token) setAuthToken(data.token)
    onDone()
  }

  async function submitRegister(values: RegisterValues) {
    setFormError(null)
    const res = await fetch(`${apiBase()}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    const data = (await res.json()) as { token?: string; error?: string }
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Register failed")
    if (data.token) setAuthToken(data.token)
    onDone()
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-zinc-950 text-white p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest text-zinc-500">TrainHard</p>
          <h1 className="text-2xl font-bold">{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
        </div>

        {mode === "login" ? (
          <form
            className="space-y-3"
            onSubmit={loginForm.handleSubmit(async (v) => {
              try {
                await submitLogin(v)
              } catch (e) {
                setFormError(e instanceof Error ? e.message : "Erreur")
              }
            })}
          >
            <Input
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
              placeholder="Email"
              type="email"
              {...loginForm.register("email")}
            />
            <Input
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
              placeholder="Mot de passe"
              type="password"
              {...loginForm.register("password")}
            />
            <Button type="submit" className="w-full rounded-lg bg-white text-zinc-950 py-2 text-sm font-semibold hover:bg-white/90">
              Se connecter
            </Button>
          </form>
        ) : (
          <form
            className="space-y-3"
            onSubmit={registerForm.handleSubmit(async (v) => {
              try {
                await submitRegister(v)
              } catch (e) {
                setFormError(e instanceof Error ? e.message : "Erreur")
              }
            })}
          >
            <Input
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
              placeholder="Prénom (optionnel)"
              {...registerForm.register("name")}
            />
            <Input
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
              placeholder="Email"
              type="email"
              {...registerForm.register("email")}
            />
            <Input
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
              placeholder="Mot de passe (8+)"
              type="password"
              {...registerForm.register("password")}
            />
            <Button type="submit" className="w-full rounded-lg bg-white text-zinc-950 py-2 text-sm font-semibold hover:bg-white/90">
              S&apos;inscrire
            </Button>
          </form>
        )}

        {formError && <p className="text-sm text-red-400 text-center">{formError}</p>}

        <Button
          type="button"
          variant="ghost"
          className="w-full text-sm text-zinc-400 hover:text-white hover:bg-transparent"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login")
            setFormError(null)
          }}
        >
          {mode === "login" ? "Pas encore de compte ?" : "Déjà un compte ?"}
        </Button>

        <p className="text-[11px] text-zinc-600 text-center">
          Démarre l&apos;API avec <code className="text-zinc-400">npm run server:dev</code> et le front avec{" "}
          <code className="text-zinc-400">npm run dev</code> (proxy <code className="text-zinc-400">/api</code>).
        </p>
      </div>
    </div>
  )
}
