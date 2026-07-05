import React from 'react';

const LoadingStep: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-card">
      <div className="w-24 h-24 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-8"></div>
      <h2 className="text-2xl font-bold text-foreground mb-2">One moment please</h2>
      <p className="text-lg text-muted-foreground">Creating Your Maintenance Plan</p>
    </div>
  );
};

export default LoadingStep;
