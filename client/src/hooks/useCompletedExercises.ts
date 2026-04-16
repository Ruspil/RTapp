import { useState, useEffect } from 'react';

interface CompletedExercises {
  [key: string]: boolean;
}

export function useCompletedExercises() {
  const [completed, setCompleted] = useState<CompletedExercises>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger les données du localStorage au montage
  useEffect(() => {
    const stored = localStorage.getItem('completedExercises');
    if (stored) {
      try {
        setCompleted(JSON.parse(stored));
      } catch (e) {
        console.error('Erreur lors du chargement des exercices complétés:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Sauvegarder les données dans localStorage à chaque changement
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('completedExercises', JSON.stringify(completed));
    }
  }, [completed, isLoaded]);

  const toggleExercise = (key: string) => {
    setCompleted((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isCompleted = (key: string) => completed[key] || false;

  const clearAll = () => {
    setCompleted({});
  };

  const getCompletionStats = (dayKey: string, totalExercises: number) => {
    const dayExercises = Object.keys(completed).filter((key) =>
      key.startsWith(`${dayKey}-`)
    );
    const completedCount = dayExercises.filter((key) => completed[key]).length;
    return { completedCount, totalExercises };
  };

  return {
    completed,
    toggleExercise,
    isCompleted,
    clearAll,
    getCompletionStats,
    isLoaded,
  };
}
