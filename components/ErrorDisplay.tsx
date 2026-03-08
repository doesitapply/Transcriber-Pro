import React from 'react';
import { RefreshIcon } from './Icons';

interface ErrorDisplayProps {
  title: string;
  message: string;
  onRetry: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ title, message, onRetry }) => {
  return (
    <div className="w-full max-w-lg flex flex-col items-center justify-center gap-4 text-center p-8 bg-neutral-900/50 rounded-2xl border border-brand-danger/50 animate-fade-in">
      <div className="w-14 h-14 rounded-full bg-brand-danger/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-brand-danger" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-neutral-100">{title}</h2>
      <div className="w-full p-3 bg-neutral-800 rounded-lg border border-neutral-700 text-left">
        <p className="text-neutral-300 text-sm break-words">
          <strong>Reason:</strong> {message}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="mt-4 flex items-center justify-center gap-2 px-6 py-2.5 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors"
      >
        <RefreshIcon className="w-5 h-5" />
        Try Again
      </button>
       <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};
