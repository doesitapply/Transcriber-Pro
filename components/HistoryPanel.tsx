import React from 'react';
import { TranscriptionResult, Status } from '../types';
import { PlusIcon, MicIcon, FileIcon } from './Icons';

interface HistoryPanelProps {
  results: TranscriptionResult[];
  currentResultId: string | null;
  onSelectResult: (id: string) => void;
  onNewTranscription: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ results, currentResultId, onSelectResult, onNewTranscription }) => {
  return (
    <aside className="w-64 bg-neutral-800 border-r border-neutral-700 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-neutral-700">
        <button
          onClick={onNewTranscription}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          New Transcription
        </button>
      </div>
      <div className="flex-grow overflow-y-auto p-2">
        <h2 className="text-sm font-semibold text-neutral-400 px-2 mb-2 uppercase tracking-wider">History</h2>
        {results.length === 0 ? (
           <p className="text-sm text-neutral-500 px-2 text-center">Your transcriptions will appear here.</p>
        ) : (
            <ul className="space-y-1">
                {results.map(result => {
                    const isActive = result.id === currentResultId;
                    const isRecording = result.fileName.startsWith('Recording');
                    return (
                        <li key={result.id}>
                            <button
                                onClick={() => onSelectResult(result.id)}
                                className={`w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors ${isActive ? 'bg-brand-primary/20 text-brand-primary' : 'text-neutral-300 hover:bg-neutral-700'}`}
                            >
                                <div className="flex-shrink-0">
                                    {isRecording ? <MicIcon className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
                                </div>
                                <div className="flex-grow truncate">
                                    <p className="font-medium text-sm truncate">{result.fileName}</p>
                                    {result.status === Status.Loading && <p className="text-xs text-neutral-400 animate-pulse">Processing...</p>}
                                    {result.status === Status.Error && <p className="text-xs text-brand-danger">Failed</p>}
                                </div>
                            </button>
                        </li>
                    )
                })}
            </ul>
        )}
      </div>
    </aside>
  );
};
