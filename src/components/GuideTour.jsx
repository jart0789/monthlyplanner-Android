import React from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useTutorial } from '../contexts/TutorialContext';
import { useFinance } from '../contexts/FinanceContext';

export default function GuideTour() {
  const { run, setRun, stepIndex, setStepIndex, completeTutorial } = useTutorial();
  const { theme } = useFinance(); // To match your dark/light mode

  // Define your Coach Marks here
  const steps = [
    {
      target: 'body',
      content: 'Welcome to FinTracker! Let us show you around quickly.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.tour-free-cash',
      content: 'This is your financial pulse. It shows how much of your income is actually "free" after bills.',
    },
    {
      target: '.tour-summary-cards',
      content: 'Tap these cards to jump directly to your Income, Expenses, or Debt details.',
    },
    {
      target: '.tour-budget-chart',
      content: 'This 3D chart visualizes where your money is going every month based on your recurring expenses.',
    },
    {
      target: '.tour-ai-button',
      content: 'Need advice? Tap here to chat with your AI Financial Advisor.',
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status, type, index } = data;
    
    // Sync internal step state
    if (type === 'step:after') {
      setStepIndex(index + 1);
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      completeTutorial();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#4f46e5', // Indigo-600 to match your app
          textColor: theme === 'dark' ? '#fff' : '#333',
          backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
          arrowColor: theme === 'dark' ? '#1e293b' : '#fff',
        }
      }}
    />
  );
}