import { useState } from 'react';
import { Menu, Settings, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCompletedExercises } from '@/hooks/useCompletedExercises';
import { soloFootExercises, duoFootExercises, clubExercises } from '@/lib/trainingData';

type Section = 'solo' | 'duo' | 'club';

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>('solo');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const { completed, toggleExercise, isCompleted, clearAll, isLoaded } = useCompletedExercises();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getCurrentData = () => {
    switch (activeSection) {
      case 'solo':
        return soloFootExercises;
      case 'duo':
        return duoFootExercises;
      case 'club':
        return clubExercises;
      default:
        return soloFootExercises;
    }
  };

  const data = getCurrentData();
  const totalExercises = data.reduce((sum, day) => sum + day.exercises.length, 0);
  const completedExercises = Object.values(completed).filter(Boolean).length;
  const progressPercent = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'solo':
        return 'Solo Foot';
      case 'duo':
        return 'Duo Foot';
      case 'club':
        return 'Club Training';
      default:
        return 'Training';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-700">
        <div className="px-4 py-4 flex items-center justify-between">
          {/* Settings Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-slate-900 border-slate-700">
              <div className="space-y-4 mt-8">
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-500 border-red-500 hover:bg-red-500/10"
                  onClick={clearAll}
                >
                  Clear All Progress
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Title */}
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold text-white">{getSectionTitle()}</h1>
            <p className="text-sm text-slate-400 mt-1">{progressPercent}% Complete</p>
          </div>

          {/* Chat Icon */}
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <MessageCircle className="w-6 h-6" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-500 to-orange-500 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="sticky top-24 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          <Button
            onClick={() => setActiveSection('solo')}
            className={`px-6 py-2 rounded-full font-semibold whitespace-nowrap transition-all ${
              activeSection === 'solo'
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Solo Foot
          </Button>
          <Button
            onClick={() => setActiveSection('duo')}
            className={`px-6 py-2 rounded-full font-semibold whitespace-nowrap transition-all ${
              activeSection === 'duo'
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Duo Foot
          </Button>
          <Button
            onClick={() => setActiveSection('club')}
            className={`px-6 py-2 rounded-full font-semibold whitespace-nowrap transition-all ${
              activeSection === 'club'
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Club Training
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-20 space-y-4">
        {data.map((day, dayIndex) => (
          <div key={dayIndex} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
            {/* Day Header */}
            <Button
              onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
              variant="ghost"
              className="w-full h-auto px-6 py-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors rounded-none justify-start"
            >
              <div className="text-left">
                <h3 className="text-lg font-bold text-white">{day.day}</h3>
                <p className="text-sm text-slate-400">{day.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">{day.exercises.length} exercises</p>
              </div>
            </Button>

            {/* Exercises */}
            {expandedDay === day.day && (
              <div className="border-t border-slate-700 divide-y divide-slate-700">
                {day.exercises.map((exercise, exIndex) => {
                  const exerciseKey = `${day.day}-${exIndex}`;
                  const isChecked = isCompleted(exerciseKey);

                  return (
                    <div
                      key={exIndex}
                      className="px-6 py-4 flex items-start gap-4 hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => toggleExercise(exerciseKey)}
                    >
                      {/* Checkbox Circle */}
                      <div className="flex-shrink-0 mt-1">
                        <div
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-gradient-to-r from-red-500 to-orange-500 border-orange-500'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          {isChecked && (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Exercise Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold transition-all ${isChecked ? 'text-slate-400 line-through' : 'text-white'}`}>
                          {exercise.name}
                        </h4>
                        <p className="text-sm text-slate-400 mt-1">{exercise.sets}</p>
                        {exercise.notes && <p className="text-xs text-slate-500 mt-2">{exercise.notes}</p>}
                      </div>

                      {/* Video Link */}
                      {exercise.video && (
                        <a
                          href={exercise.video}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full transition-colors"
                        >
                          Video
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
