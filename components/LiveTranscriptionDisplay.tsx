
import React from 'react';

interface LiveTranscriptionDisplayProps {
  transcript: string;
}

export const LiveTranscriptionDisplay: React.FC<LiveTranscriptionDisplayProps> = ({ transcript }) => {
  return (
    <div className="w-full h-full p-4 sm:p-6 bg-neutral-900/50 rounded-2xl border border-neutral-700 overflow-y-auto flex-grow">
      <div className="text-neutral-200 whitespace-pre-wrap font-mono text-lg leading-relaxed">
          {transcript || <span className="text-neutral-500">Listening...</span>}
      </div>
    </div>
  );
};