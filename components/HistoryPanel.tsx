
import React from 'react';
import { TranscriptionResult, Status } from '../types';
import { PlusIcon, MicIcon, FileIcon } from './Icons';

interface HistoryPanelProps {
  results: TranscriptionResult[];
  currentResultId: string | null;
  onSelectResult: (id: string) => void;
  onNewSession: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ results, currentResultId, onSelectResult, onNewSession }) => {
  return (
    <aside className="w-72 bg-neutral-900/60 backdrop-blur-xl border-r border-white/5 flex-col flex-shrink-0 hidden md:flex z-20">
      <div className="p-6">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 text-white font-medium rounded-xl hover:bg-white/10 border border-white/5 transition-all duration-200 shadow-sm"
        >
          <PlusIcon className="w-5 h-5 text-brand-secondary" />
          <span>New Session</span>
        </button>
      </div>
      
      <div className="flex-grow overflow-y-auto px-4 pb-4">
        <h2 className="text-xs font-semibold text-neutral-500 px-2 mb-3 uppercase tracking-widest">Recent Activity</h2>
        {results.length === 0 ? (
           <div className="p-4 text-center rounded-xl bg-white/5 border border-dashed border-white/10">
               <p className="text-sm text-neutral-500">No sessions yet.</p>
           </div>
        ) : (
            <ul className="space-y-2">
                {results.map(result => {
                    const isActive = result.id === currentResultId;
                    const isLive = result.fileName.startsWith('Live');
                    return (
                        <li key={result.id}>
                            <button
                                onClick={() => onSelectResult(result.id)}
                                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 group border ${
                                    isActive 
                                        ? 'bg-brand-primary/10 text-white border-brand-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                                        : 'text-neutral-400 hover:bg-white/5 hover:text-white border-transparent'
                                }`}
                            >
                                <div className={`flex-shrink-0 p-2 rounded-lg ${isActive ? 'bg-brand-primary/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                                    {isLive ? <MicIcon className="w-4 h-4" /> : <FileIcon className="w-4 h-4" />}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="font-medium text-sm truncate">{result.fileName}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            result.status === Status.Loading ? 'bg-brand-secondary animate-pulse' :
                                            result.status === Status.Error ? 'bg-red-500' : 'bg-neutral-600'
                                        }`}></div>
                                        <p className="text-xs text-neutral-500 truncate">
                                            {result.status === Status.Loading ? 'Processing' : 
                                             result.status === Status.Error ? 'Failed' : 'Ready'}
                                        </p>
                                    </div>
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
