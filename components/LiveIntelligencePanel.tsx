import React from 'react';
import { TrackedKeywordHit, CaseMention } from '../types';
import { CaseIcon, CheckIcon } from './Icons'; // Assuming CheckIcon can be repurposed or a new one added

const IntelligenceItem: React.FC<{ icon: React.ReactNode; title: string; time: number; }> = ({ icon, title, time }) => (
  <div className="flex items-center gap-3 animate-slide-in-right" style={{ animationFillMode: 'backwards' }}>
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
      {icon}
    </div>
    <div className="flex-grow">
      <p className="font-medium text-neutral-100">{title}</p>
    </div>
    <span className="font-mono text-sm text-neutral-400">{new Date(time * 1000).toISOString().substr(14, 5)}</span>
  </div>
);

interface LiveIntelligencePanelProps {
  keywordHits: TrackedKeywordHit[];
  caseMentions: CaseMention[];
}

export const LiveIntelligencePanel: React.FC<LiveIntelligencePanelProps> = ({ keywordHits, caseMentions }) => {
  return (
    <div className="w-full h-full flex flex-col gap-4 bg-neutral-900/50 p-4 rounded-2xl border border-neutral-700">
      <h2 className="text-lg font-bold text-neutral-100 border-b border-neutral-700 pb-2">Live Intelligence</h2>
      <div className="flex-grow overflow-y-auto space-y-4 pr-2">
        
        {keywordHits.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">Tracked Keywords</h3>
            <div className="space-y-3">
              {keywordHits.map((hit, index) => (
                <IntelligenceItem
                  key={`key-${index}`}
                  icon={<CheckIcon className="w-5 h-5 text-brand-accent" />}
                  title={hit.keyword}
                  time={hit.timestamp}
                />
              ))}
            </div>
          </div>
        )}

        {caseMentions.length > 0 && (
           <div className={keywordHits.length > 0 ? 'pt-4 border-t border-neutral-700' : ''}>
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">Case Mentions</h3>
            <div className="space-y-3">
              {caseMentions.map((mention, index) => (
                <IntelligenceItem
                  key={`case-${index}`}
                  icon={<CaseIcon className="w-5 h-5 text-brand-secondary" />}
                  title={mention.citation}
                  time={mention.timestamp}
                />
              ))}
            </div>
          </div>
        )}

        {keywordHits.length === 0 && caseMentions.length === 0 && (
          <div className="text-center h-full flex items-center justify-center">
            <p className="text-neutral-500">Real-time insights will appear here...</p>
          </div>
        )}
      </div>
    </div>
  );
};