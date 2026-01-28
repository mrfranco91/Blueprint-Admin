import React from 'react';

const LoadingStep: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-white">
        <div className="relative w-full h-2 bg-gray-200 mb-4 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-2 bg-brand-secondary rounded-full animate-pulse w-full"></div>
        </div>
      <div className="w-24 h-24 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin mb-8"></div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">One moment please</h2>
      <p className="text-lg" style={{ color: '#374151' }}>Creating Your Maintenance Plan</p>
    </div>
  );
};

export default LoadingStep;
