import { Exercise } from '@/lib/trainingData';
import { ExternalLink } from 'lucide-react';

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  isCompleted: boolean;
  onToggle: () => void;
}

export default function ExerciseCard({
  exercise,
  index,
  isCompleted,
  onToggle,
}: ExerciseCardProps) {
  return (
    <div
      onClick={onToggle}
      className="group relative p-2 md:p-4 rounded-lg md:rounded-xl border border-border/40 transition-all duration-300 cursor-pointer select-none overflow-hidden"
      style={{
        background: isCompleted 
          ? 'linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(0, 212, 255, 0.05))'
          : 'rgba(42, 63, 95, 0.3)',
        animation: `slideInUp 0.6s ease-out ${index * 50}ms both`
      }}
    >
      {/* Animated background gradient on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35]/5 via-transparent to-[#00D4FF]/5"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-start justify-between gap-2 md:gap-4">
        {/* Checkbox Circle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex-shrink-0 mt-0.5 md:mt-1 transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-all duration-300"
          >
            {/* Outer circle with gradient */}
            <defs>
              <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF6B35" />
                <stop offset="100%" stopColor="#FFD60A" />
              </linearGradient>
            </defs>

            {/* Background circle */}
            <circle
              cx="14"
              cy="14"
              r="13"
              fill={isCompleted ? `url(#gradient-${index})` : 'rgba(42, 63, 95, 0.4)'}
              stroke={isCompleted ? 'url(#gradient-${index})' : 'rgba(0, 212, 255, 0.4)'}
              strokeWidth="1.5"
              className="transition-all duration-300"
            />

            {/* Checkmark with animation */}
            {isCompleted && (
              <g className="animate-scale-in">
                <path
                  d="M8 14L12 18L20 8"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  className="animate-pulse"
                />
              </g>
            )}
          </svg>
        </button>

        {/* Exercise Info */}
        <div className="flex-1 min-w-0">
          <h4
            className={`font-semibold text-sm md:text-base transition-all duration-300 ${
              isCompleted 
                ? 'line-through text-muted-foreground' 
                : 'text-foreground group-hover:text-[#FF6B35]'
            }`}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {exercise.name}
          </h4>

          {/* Sets Badge */}
          <div className="flex items-center gap-2 mt-1 md:mt-2">
            <span className={`inline-flex items-center px-2 md:px-3 py-0.5 md:py-1 rounded-lg text-xs font-bold transition-all duration-300 ${
              isCompleted
                ? 'bg-gradient-to-r from-[#FF6B35]/30 to-[#FFD60A]/30 text-[#FFD60A]'
                : 'bg-gradient-to-r from-[#0F4C75]/40 to-[#00D4FF]/20 text-[#00D4FF]'
            }`}>
              {exercise.sets}
            </span>
          </div>

          {/* Notes */}
          {exercise.notes && (
            <p className={`text-xs md:text-sm mt-1 md:mt-2 leading-relaxed transition-colors duration-300 line-clamp-2 md:line-clamp-none ${
              isCompleted 
                ? 'text-muted-foreground/60' 
                : 'text-muted-foreground group-hover:text-muted-foreground'
            }`}>
              {exercise.notes}
            </p>
          )}

          {/* Video Link */}
          {exercise.video && (
            <div className="mt-2 md:mt-3">
              <a
                href={exercise.video}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 md:gap-2 text-xs font-semibold text-[#00D4FF] hover:text-[#FF6B35] transition-all duration-300 group/link"
              >
                <svg 
                  width="12" 
                  height="12" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="transition-transform duration-300 group-hover/link:translate-x-1"
                >
                  <path 
                    d="M23 12a11 11 0 1 1-22 0 11 11 0 0 1 22 0z" 
                    stroke="currentColor" 
                    strokeWidth="1.5"
                  />
                  <path 
                    d="M9.5 8.5l7 4-7 4v-8z" 
                    fill="currentColor"
                  />
                </svg>
                <span className="hidden md:inline">Voir la vidéo</span>
                <span className="md:hidden">Vidéo</span>
                <ExternalLink className="w-2 h-2 md:w-3 md:h-3 opacity-0 group-hover/link:opacity-100 transition-opacity duration-300" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Completion indicator line */}
      {isCompleted && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-gradient-to-r from-[#FF6B35] to-[#FFD60A] animate-pulse"></div>
      )}
    </div>
  );
}
