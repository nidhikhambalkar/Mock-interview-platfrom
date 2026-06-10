import React from 'react';

export const AudioVisualizer: React.FC = () => {
  return (
    <div className="flex items-center gap-1.5 h-6 px-2">
      <div className="w-1 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s', height: '14px' }}></div>
      <div className="w-1 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s', height: '20px' }}></div>
      <div className="w-1 bg-brand-300 rounded-full animate-bounce" style={{ animationDelay: '0.5s', height: '8px' }}></div>
      <div className="w-1 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s', height: '24px' }}></div>
      <div className="w-1 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s', height: '16px' }}></div>
      <div className="w-1 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.6s', height: '12px' }}></div>
    </div>
  );
};
export default AudioVisualizer;
