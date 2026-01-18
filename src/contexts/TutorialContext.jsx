import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage'; // Assuming you have this, or use standard localStorage

const TutorialContext = createContext();

export function TutorialProvider({ children }) {
  // "run" controls if the tour is active
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Check if user has seen tutorial before
  useEffect(() => {
    const hasSeen = localStorage.getItem('fintracker_tutorial_completed');
    if (!hasSeen) {
      // Small delay to ensure elements are rendered
      setTimeout(() => {
        setRun(true);
      }, 1000); 
    }
  }, []);

  const startTutorial = () => {
    setStepIndex(0);
    setRun(true);
  };

  const completeTutorial = () => {
    localStorage.setItem('fintracker_tutorial_completed', 'true');
    setRun(false);
  };

  return (
    <TutorialContext.Provider value={{ run, setRun, stepIndex, setStepIndex, startTutorial, completeTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  return useContext(TutorialContext);
}