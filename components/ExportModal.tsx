
import React, { useState, useRef, useEffect } from 'react';
import { TranscriptionResult, IntelligenceMemory, LegalEntityProfile } from '../types';
import { CloseIcon, ExportIcon, UserGroupIcon, FileIcon, ZoomInIcon, ZoomOutIcon, FitScreenIcon } from './Icons';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TranscriptionResult;
  memory: IntelligenceMemory;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, result, memory }) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-fit to screen on mount
  useEffect(() => {
    if (isOpen && containerRef.current) {
        handleFitToScreen();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const entities = (Object.values(memory.entities) as LegalEntityProfile[]).filter(e => result.transcription.includes(e.name) || result.summary.includes(e.name));

  const handlePrint = () => {
    window.print();
  };
  
  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 2.0));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.4));
  
  const handleFitToScreen = () => {
     if (containerRef.current) {
         const parentHeight = window.innerHeight - 100; // Account for header/padding
         const parentWidth = window.innerWidth;
         
         // Standard Letter dimensions in pixels (assuming 96DPI approx for screen)
         // 8.5in * 96 = 816px
         // 11in * 96 = 1056px
         const paperHeight = 1056; 
         const paperWidth = 816;

         const scaleHeight = parentHeight / (paperHeight + 80); // 80px margin
         const scaleWidth = (parentWidth - 40) / (paperWidth + 80);
         
         setScale(Math.min(scaleHeight, scaleWidth, 1.0)); // Don't scale up past 1.0 automatically
     }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-900/95 flex flex-col">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #export-content, #export-content * { visibility: visible; }
          #export-content { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            margin: 0; 
            padding: 0; 
            background: white; 
            color: black;
            transform: none !important; 
          }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      {/* Control Bar */}
      <div className="flex-shrink-0 px-6 py-4 bg-brand-dark border-b border-white/10 flex justify-between items-center z-[110] no-print shadow-xl">
        <h2 className="text-white font-bold text-lg flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary"><ExportIcon className="w-4 h-4"/></div>
            Export Preview
        </h2>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2 bg-neutral-800 rounded-lg p-1 border border-neutral-700">
            <button onClick={handleZoomOut} className="p-2 hover:bg-neutral-700 rounded-md text-neutral-400 hover:text-white transition-colors" title="Zoom Out"><ZoomOutIcon className="w-4 h-4"/></button>
            <span className="text-xs font-mono w-12 text-center text-neutral-300">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} className="p-2 hover:bg-neutral-700 rounded-md text-neutral-400 hover:text-white transition-colors" title="Zoom In"><ZoomInIcon className="w-4 h-4"/></button>
            <div className="w-px h-4 bg-neutral-700 mx-1"></div>
            <button onClick={handleFitToScreen} className="p-2 hover:bg-neutral-700 rounded-md text-neutral-400 hover:text-white transition-colors" title="Fit to Screen"><FitScreenIcon className="w-4 h-4"/></button>
        </div>

        <div className="flex gap-3">
             <button onClick={onClose} className="px-4 py-2 text-neutral-400 hover:text-white transition-colors text-sm font-bold">Cancel</button>
             <button onClick={handlePrint} className="px-6 py-2 bg-brand-primary text-white rounded-lg shadow-lg hover:bg-brand-primary/90 transition-all font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <ExportIcon className="w-4 h-4"/> Print / PDF
             </button>
        </div>
      </div>

      {/* Preview Area */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-neutral-900 flex justify-center p-8 relative scroll-smooth">
          <div 
            style={{ 
                transform: `scale(${scale})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-out'
            }}
            className="origin-top"
          >
              <div id="export-content" className="w-[8.5in] min-h-[11in] bg-white text-black p-[1in] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                
                {/* Header */}
                <header className="border-b-4 border-black pb-4 mb-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-serif font-bold uppercase tracking-tight mb-2">Forensic Record Dossier</h1>
                            <p className="text-sm font-mono font-bold text-neutral-600 uppercase tracking-widest">Case ID: {result.id}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Date of Record</p>
                            <p className="text-lg font-serif font-bold">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </header>

                {/* Intelligence Context */}
                <section className="mb-10">
                    <h3 className="text-xs font-sans font-black uppercase tracking-[0.2em] mb-4 border-b border-neutral-300 pb-1 text-neutral-700">Dramatis Personae & Context</h3>
                    {entities.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {entities.map(entity => (
                                <div key={entity.id} className="p-3 border border-neutral-200 rounded bg-neutral-50 break-inside-avoid">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] font-sans font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${entity.role === 'judge' ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-800'}`}>
                                            {entity.role}
                                        </span>
                                        <h4 className="font-serif font-bold text-base">{entity.name}</h4>
                                    </div>
                                    <p className="text-xs font-serif text-neutral-600 italic mb-2">"{entity.notes}"</p>
                                    <div className="flex flex-wrap gap-1">
                                        {entity.behaviorPatterns.map((bp, i) => (
                                            <span key={i} className="text-[8px] font-sans font-bold uppercase border border-neutral-300 px-1 py-0.5 rounded text-neutral-500">{bp}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm font-serif text-neutral-500 italic">No specific intelligence profiles linked to this record.</p>
                    )}
                </section>

                {/* Executive Brief */}
                <section className="mb-10">
                    <h3 className="text-xs font-sans font-black uppercase tracking-[0.2em] mb-3 border-b border-neutral-300 pb-1 text-neutral-700">Executive Strategy Brief</h3>
                    <div className="font-serif text-sm leading-relaxed text-justify whitespace-pre-wrap text-neutral-900">
                        {result.summary || "No summary generated."}
                    </div>
                </section>

                {/* Legal Analysis */}
                <section className="mb-10">
                    <h3 className="text-xs font-sans font-black uppercase tracking-[0.2em] mb-3 border-b border-neutral-300 pb-1 text-neutral-700">Constitutional Error Analysis</h3>
                    <div className="font-serif text-sm leading-relaxed text-justify whitespace-pre-wrap text-neutral-900">
                        {result.legalAnalysis || "No legal analysis generated."}
                    </div>
                </section>

                <div className="print-break"></div>

                {/* Verbatim Record */}
                <section className="mt-8">
                    <h3 className="text-xs font-sans font-black uppercase tracking-[0.2em] mb-6 border-b border-neutral-300 pb-1 text-neutral-700">Official Verbatim Record</h3>
                    <div className="space-y-4">
                        {result.transcription.split('\n').filter(l => l.trim()).map((line, idx) => {
                            const speakerMatch = line.match(/^\*\*([^*]+)\*\*:/);
                            const timeMatch = line.match(/\[(\d{2}:\d{2})\]/);
                            const speaker = speakerMatch ? speakerMatch[1] : null;
                            const content = line.replace(/^\*\*([^*]+)\*\*:/, '').replace(/\[\d{2}:\d{2}\]/, '').trim();
                            const timestamp = timeMatch ? timeMatch[1] : '';

                            return (
                                <div key={idx} className="flex gap-4 break-inside-avoid">
                                    <div className="w-16 flex-shrink-0 text-right pt-0.5">
                                        <p className="text-[10px] font-mono font-bold text-neutral-400">{timestamp}</p>
                                    </div>
                                    <div className="flex-1">
                                        {speaker && <p className="text-[10px] font-sans font-black uppercase tracking-wider mb-0.5 text-neutral-800">{speaker}</p>}
                                        <p className="text-sm font-serif leading-relaxed text-neutral-900">{content}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Footer */}
                <footer className="mt-16 border-t-2 border-neutral-200 pt-4 flex justify-between text-[9px] text-neutral-400 font-mono uppercase">
                    <span>Generated by Appellate AI Forensic Suite</span>
                    <span>Confidential Attorney Work Product</span>
                </footer>

              </div>
          </div>
      </div>
    </div>
  );
};
