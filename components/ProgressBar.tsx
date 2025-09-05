import React from 'react';

interface ProgressBarProps {
  progress: number;
  message: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, message }) => {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="w-full max-w-md flex flex-col items-center justify-center gap-4 text-center">
      <p className="text-neutral-300 text-lg">
        {message}
      </p>
      <div className="w-full bg-neutral-700 rounded-full h-2.5">
        <div 
          className="bg-brand-primary h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${safeProgress}%` }}
        ></div>
      </div>
      <p className="text-neutral-400 text-sm">{Math.round(safeProgress)}%</p>
    </div>
  );
};