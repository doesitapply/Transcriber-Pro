
import React from 'react';
import { MicIcon, StopIcon } from './Icons';

interface RecordButtonProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({ isRecording, onStart, onStop }) => {
  const handleClick = () => {
    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  const buttonClass = isRecording
    ? "bg-brand-danger hover:bg-red-500"
    : "bg-brand-primary hover:bg-blue-600";

  return (
    <button
      onClick={handleClick}
      className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 ${isRecording ? 'focus:ring-red-400' : 'focus:ring-blue-400'} ${buttonClass}`}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isRecording && <div className="absolute inset-0 rounded-full bg-brand-danger animate-ping-slow"></div>}
      <span className="relative z-10">
        {isRecording ? <StopIcon className="w-8 h-8" /> : <MicIcon className="w-8 h-8" />}
      </span>
      <style>{`
        @keyframes ping-slow {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </button>
  );
};
