import { useState, useEffect } from "react"

interface WelcomeProps {
  onStart: (name: string) => void
}

export function Welcome({ onStart }: WelcomeProps) {
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const [logoScale, setLogoScale] = useState(0)

  useEffect(() => {
    // Apparition du logo au démarrage
    setTimeout(() => setLogoScale(1), 100)

    // Progression de la barre
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          setFadeOut(true)
          setTimeout(() => {
            onStart("utilisateur")
          }, 600)
          return 100
        }
        return prev + Math.random() * 3 + 0.5
      })
    }, 30)

    return () => clearInterval(timer)
  }, [onStart])

  return (
    <div className={`min-h-svh bg-zinc-950 flex flex-col items-center justify-center transition-all duration-700 ${fadeOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      
      {/* Logo RT avec animation d'entrée */}
      <div className="mb-12">
        <div 
          className="flex items-center justify-center w-28 h-28 rounded-2xl bg-white mx-auto transition-all duration-700 ease-out"
          style={{
            transform: `scale(${logoScale})`,
            boxShadow: progress > 50 
              ? `0 0 ${20 + progress * 0.6}px rgba(239, 68, 68, ${0.1 + progress * 0.003})` 
              : '0 0 20px rgba(0,0,0,0.3)'
          }}
        >
          <span className="text-zinc-900 font-black text-4xl tracking-tighter">RT</span>
        </div>
      </div>

      {/* Progress Bar animée avec effet shine */}
      <div className="w-64 h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
        <div 
          className="h-full rounded-full"
          style={{ 
            width: `${progress}%`,
            background: "linear-gradient(90deg, #ef4444, #f97316, #ef4444)",
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s linear infinite'
          }}
        />
        
        {/* Effet de brillance */}
        <div 
          className="absolute top-0 h-full bg-white/20 transition-all ease-out duration-100"
          style={{ width: `${Math.min(progress * 1.3, 100)}%`, filter: 'blur(3px)' }}
        />
      </div>

      {/* Texte chargement */}
      <p className="text-zinc-600 text-xs mt-8 tracking-widest uppercase">
        Chargement
      </p>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
