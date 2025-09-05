import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CopyIcon, CheckIcon, DownloadIcon, SparklesIcon, ScaleIcon, PencilIcon, RefreshIcon, PlusIcon, TrashIcon } from './Icons';
import { Loader } from './Loader';
import { Status, TranscriptionResult } from '../types';

interface TranscriptionDisplayProps {
  result: TranscriptionResult;
  onSummarize: () => void;
  onLegalAnalysis: () => void;
  onUpdateTranscription: (newTranscription: string) => void;
  onRefineSegment: (segment: string) => void;
  onCorrectTranscript: (corrections: { find: string; replace: string }[]) => void;
}

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 text-neutral-200 text-sm rounded-md hover:bg-neutral-600 transition-colors"
            aria-label="Copy text"
        >
            {copied ? <CheckIcon className="w-4 h-4 text-brand-secondary" /> : <CopyIcon className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}


export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ result, onSummarize, onLegalAnalysis, onUpdateTranscription, onRefineSegment, onCorrectTranscript }) => {
  const { 
    transcription, 
    summary, summaryStatus, summaryError,
    legalAnalysis, legalAnalysisStatus, legalAnalysisError,
    audioSrc, 
    refinementStatus, refiningSegment, refinementError,
    correctionStatus, correctionError,
  } = result;
  
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [corrections, setCorrections] = useState<{ find: string; replace: string }[]>([]);
  const [selection, setSelection] = useState<{ text: string; top: number; left: number } | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Close selection popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (transcriptContainerRef.current && !transcriptContainerRef.current.contains(event.target as Node)) {
        setSelection(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const detectedSpeakers = useMemo(() => {
    const speakerRegex = /\*\*(.*?):\*\*/g;
    const matches = transcription.match(speakerRegex) || [];
    return [...new Set(matches.map(s => s.replace(/\*|:/g, '').trim()))];
  }, [transcription]);
  
  const handleOpenCorrections = () => {
    // Pre-populate corrections with detected speakers for easy editing
    const speakerCorrections = detectedSpeakers.map(speaker => ({
      find: speaker,
      replace: speaker
    }));
    setCorrections(speakerCorrections);
    setIsCorrecting(true);
  };
  
  const handleUpdateCorrection = (index: number, field: 'find' | 'replace', value: string) => {
    const newCorrections = [...corrections];
    newCorrections[index][field] = value;
    setCorrections(newCorrections);
  };

  const handleAddCorrection = () => {
    setCorrections([...corrections, { find: '', replace: '' }]);
  };

  const handleRemoveCorrection = (index: number) => {
    setCorrections(corrections.filter((_, i) => i !== index));
  };
  
  const handleApplyCorrections = () => {
    const validCorrections = corrections.filter(c => c.find.trim() !== '');
    if (validCorrections.length > 0) {
        onCorrectTranscript(validCorrections);
    }
    setIsCorrecting(false);
  };

  const handleMouseUp = () => {
    if (!transcriptContainerRef.current || !audioSrc) return; // Disable refine if no audio
    const selectionObj = window.getSelection();
    const selectedText = selectionObj?.toString().trim();

    if (selectedText && selectionObj) {
        const range = selectionObj.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = transcriptContainerRef.current.getBoundingClientRect();
        
        setSelection({
            text: selectedText,
            top: rect.top - containerRect.top - 40, // Position above selection
            left: rect.left - containerRect.left + rect.width / 2, // Center on selection
        });
    } else {
        setSelection(null);
    }
  };

  const handleTimestampClick = (time: string) => {
    if (!audioRef.current) return;
    // Format is [HH:MM:SS] or [MM:SS]
    const parts = time.replace(/[\[\]]/g, '').split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) { // HH:MM:SS
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) { // MM:SS
        seconds = parts[0] * 60 + parts[1];
    }
    audioRef.current.currentTime = seconds;
    audioRef.current.play();
  }

  const parseAndRenderTranscription = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
        const timestampMatch = line.match(/^(\[\d{2,}:\d{2}(?::\d{2})?\])/);
        const timestamp = timestampMatch ? timestampMatch[0] : null;
        let lineContent = timestamp ? line.substring(timestamp.length).trim() : line;
        
        let processedContent = lineContent.replace(/\*\*(.*?):\*\*/g, '<strong class="text-neutral-100 font-semibold">$1:</strong>');
        
        if (refinementStatus === Status.Loading && refiningSegment && lineContent.includes(refiningSegment)) {
             const escapedSegment = refiningSegment.replace(/</g, "&lt;").replace(/>/g, "&gt;");
             processedContent = processedContent.replace(escapedSegment, `<span class="bg-brand-primary/20 rounded animate-pulse">${escapedSegment}</span>`);
        }

        return (
            <div key={index} className="flex items-start gap-2 group">
                {timestamp && audioSrc && (
                    <button 
                        onClick={() => handleTimestampClick(timestamp)}
                        className="text-neutral-500 text-sm font-mono mt-0.5 hover:text-brand-primary transition-colors"
                        aria-label={`Jump to ${timestamp}`}
                    >
                        {timestamp}
                    </button>
                )}
                <p className="flex-1" dangerouslySetInnerHTML={{ __html: processedContent }}></p>
            </div>
        )
    });
  }

  const canSummarize = summaryStatus !== Status.Loading && summaryStatus !== Status.Success;
  const canAnalyze = legalAnalysisStatus !== Status.Loading && legalAnalysisStatus !== Status.Success;
  
  const handleDownload = () => {
    if (!transcription) return;
    const cleanText = transcription.replace(/\*\*/g, '');
    const blob = new Blob([cleanText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.fileName.split('.')[0]}_transcription.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 animate-fade-in text-left">
      <h2 className="text-xl font-semibold text-neutral-100 self-center">Transcription Result</h2>
      
      <div className="w-full">
        {audioSrc ? (
            <audio ref={audioRef} controls src={audioSrc} className="w-full h-10 rounded-lg">
                Your browser does not support the audio element.
            </audio>
        ) : (
            <div className="w-full text-center p-2 bg-neutral-700/50 rounded-lg">
                <p className="text-neutral-400 text-sm">Audio source not available for this session.</p>
            </div>
        )}
      </div>


      <div ref={transcriptContainerRef} className="relative w-full p-4 bg-neutral-900 rounded-lg border border-neutral-700 max-h-60 overflow-y-auto">
        {correctionStatus === Status.Loading && (
            <div className="absolute inset-0 bg-neutral-900/80 flex justify-center items-center z-20 rounded-lg">
                <Loader title="Applying corrections..." />
            </div>
        )}
        {selection && refinementStatus !== Status.Loading && (
            <div 
                className="absolute z-10 p-1 bg-neutral-600 rounded-lg shadow-lg transform -translate-x-1/2" 
                style={{ top: `${selection.top}px`, left: `${selection.left}px` }}
            >
                <button 
                    onClick={() => {
                        onRefineSegment(selection.text);
                        setSelection(null);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-brand-primary text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                    <RefreshIcon className="w-4 h-4"/>
                    Refine Selection
                </button>
            </div>
        )}
        <div className="text-neutral-200 whitespace-pre-wrap select-text space-y-2" onMouseUp={handleMouseUp}>
            {parseAndRenderTranscription(transcription)}
        </div>
      </div>
      {refinementError && (
        <div className="w-full text-center px-4 py-2 bg-brand-danger/20 border border-brand-danger/50 rounded-lg">
            <p className="text-red-300 text-xs"><strong>Refinement Error:</strong> {refinementError}</p>
        </div>
      )}
       {correctionError && (
        <div className="w-full text-center px-4 py-2 bg-brand-danger/20 border border-brand-danger/50 rounded-lg">
            <p className="text-red-300 text-xs"><strong>Correction Error:</strong> {correctionError}</p>
        </div>
      )}
      <div className="w-full text-center px-4 py-2 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
        <p className="text-yellow-300 text-xs">
            <strong>Disclaimer:</strong> This AI-generated transcript is for informational purposes only and is not a certified legal document. Please review carefully for accuracy.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <CopyButton textToCopy={transcription.replace(/\*\*/g, '')} />
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-700 text-neutral-100 rounded-lg hover:bg-neutral-600 transition-colors"
        >
          <DownloadIcon className="w-5 h-5" />
          Download .txt
        </button>
        <button
          onClick={handleOpenCorrections}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-700 text-neutral-100 rounded-lg hover:bg-neutral-600 transition-colors"
        >
            <PencilIcon className="w-5 h-5" />
            Correct Transcript
        </button>
        <button
          onClick={onSummarize}
          disabled={!canSummarize}
          className="flex items-center gap-2 px-4 py-2 bg-brand-accent/20 text-brand-accent rounded-lg hover:bg-brand-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SparklesIcon className="w-5 h-5" />
          Summarize
        </button>
        <button
          onClick={onLegalAnalysis}
          disabled={!canAnalyze}
          className="flex items-center gap-2 px-4 py-2 bg-brand-secondary/20 text-brand-secondary rounded-lg hover:bg-brand-secondary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ScaleIcon className="w-5 h-5" />
          Legal Analysis
        </button>
      </div>
      
      {isCorrecting && (
        <div className="w-full mt-4 p-4 bg-neutral-900 rounded-lg border border-neutral-700 animate-fade-in">
          <h3 className="text-lg font-semibold text-neutral-100 mb-4">Correct Transcript</h3>
          <p className="text-sm text-neutral-400 mb-4">Define terms to find and replace. The AI will apply these corrections throughout the entire transcript.</p>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
            {corrections.map((correction, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Text to find"
                  value={correction.find}
                  onChange={(e) => handleUpdateCorrection(index, 'find', e.target.value)}
                  className="flex-1 bg-neutral-700 border border-neutral-600 rounded-md px-3 py-1.5 text-neutral-100 focus:ring-2 focus:ring-brand-primary focus:outline-none"
                />
                 <span className="text-neutral-400">&rarr;</span>
                <input
                  type="text"
                  placeholder="Replace with"
                  value={correction.replace}
                  onChange={(e) => handleUpdateCorrection(index, 'replace', e.target.value)}
                  className="flex-1 bg-neutral-700 border border-neutral-600 rounded-md px-3 py-1.5 text-neutral-100 focus:ring-2 focus:ring-brand-primary focus:outline-none"
                />
                <button
                    onClick={() => handleRemoveCorrection(index)}
                    className="p-1.5 text-neutral-400 hover:text-brand-danger hover:bg-neutral-700 rounded-full"
                    aria-label="Remove correction"
                >
                    <TrashIcon className="w-5 h-5"/>
                </button>
              </div>
            ))}
          </div>
           <button
                onClick={handleAddCorrection}
                className="mt-3 flex items-center gap-2 text-sm text-brand-primary hover:text-blue-400"
            >
                <PlusIcon className="w-4 h-4"/> Add Correction
            </button>
          <div className="flex justify-end mt-4 gap-2 border-t border-neutral-700 pt-4">
            <button
              onClick={() => setIsCorrecting(false)}
              className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCorrections}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Apply Corrections
            </button>
          </div>
        </div>
      )}

      {summaryStatus !== Status.Idle && (
          <div className="w-full mt-4 p-4 bg-neutral-900 rounded-lg border border-neutral-700">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-neutral-100">Summary</h3>
              {summaryStatus === Status.Success && summary && <CopyButton textToCopy={summary} />}
            </div>
            {summaryStatus === Status.Loading && <Loader title="Generating summary..." />}
            {summaryStatus === Status.Error && <p className="text-brand-danger">{summaryError || "Could not generate summary."}</p>}
            {summaryStatus === Status.Success && summary && (
                <p className="text-neutral-200 whitespace-pre-wrap">{summary}</p>
            )}
          </div>
      )}

      {legalAnalysisStatus !== Status.Idle && (
          <div className="w-full mt-4 p-4 bg-neutral-900 rounded-lg border border-neutral-700">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-neutral-100">Legal Analysis</h3>
              {legalAnalysisStatus === Status.Success && legalAnalysis && <CopyButton textToCopy={legalAnalysis} />}
            </div>
            {legalAnalysisStatus === Status.Loading && <Loader title="Generating analysis..." />}
            {legalAnalysisStatus === Status.Error && <p className="text-brand-danger">{legalAnalysisError || "Could not generate analysis."}</p>}
            {legalAnalysisStatus === Status.Success && legalAnalysis && (
                <>
                    <p className="text-neutral-200 whitespace-pre-wrap">{legalAnalysis}</p>
                    <p className="mt-4 text-xs text-neutral-500 border-t border-neutral-700 pt-2">
                        <strong>Disclaimer:</strong> This analysis is AI-generated and for informational purposes only. It is not a substitute for professional legal advice.
                    </p>
                </>
            )}
          </div>
      )}

      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
        }
        audio::-webkit-media-controls-panel {
            background-color: #2C2C2C;
        }
        audio::-webkit-media-controls-play-button,
        audio::-webkit-media-controls-mute-button {
            background-color: #4285F4;
            border-radius: 50%;
        }
        audio::-webkit-media-controls-current-time-display,
        audio::-webkit-media-controls-time-remaining-display {
            color: #F5F5F5;
        }
      `}</style>
    </div>
  );
};
