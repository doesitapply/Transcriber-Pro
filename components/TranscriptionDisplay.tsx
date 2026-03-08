
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CopyIcon, CheckIcon, SparklesIcon, ScaleIcon, PencilIcon, RefreshIcon, PlusIcon, TrashIcon, ExportIcon, CaseIcon, ChatIcon, ChartIcon, ActivityIcon, UserGroupIcon, LightBulbIcon } from './Icons';
import { Loader } from './Loader';
import { ChatPanel } from './ChatPanel';
import { Status, TranscriptionResult, InsightData } from '../types';

interface TranscriptionDisplayProps {
  result: TranscriptionResult;
  onSummarize: () => void;
  onLegalAnalysis: () => void;
  onRefineSegment: (segment: string) => void;
  onCorrectTranscript: (corrections: { find: string; replace: string }[]) => void;
  onSendMessage: (message: string) => void;
  onExtractEntities: () => void;
  onGenerateInsights: () => void;
  onUpdateTranscription: (newText: string) => void;
}
type Tab = 'transcription' | 'chat' | 'summary' | 'analysis' | 'entities' | 'insights';

const CopyButton: React.FC<{ textToCopy: string, label?: string, className?: string }> = ({ textToCopy, label = "Copy", className = "bg-neutral-700 text-neutral-200" }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-neutral-600 transition-colors ${className}`}
            aria-label="Copy text"
        >
            {copied ? <CheckIcon className="w-4 h-4 text-brand-secondary" /> : <CopyIcon className="w-4 h-4" />}
            {copied ? 'Copied' : label}
        </button>
    );
}

const ExportButton: React.FC<{ result: TranscriptionResult }> = ({ result }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: 'txt' | 'md' | 'json') => {
    let content = '';
    let mimeType = '';
    const baseFileName = result.fileName.split('.')[0];
    
    switch (format) {
      case 'txt':
        content = result.transcription.replace(/\*\*/g, '');
        mimeType = 'text/plain';
        break;
      case 'md':
        content = result.transcription; // Markdown uses ** for bold
        mimeType = 'text/markdown';
        break;
      case 'json':
        // Exclude the large blob from the JSON export
        const { mediaBlob, ...exportableResult } = result;
        content = JSON.stringify(exportableResult, null, 2);
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}_${new Date().toISOString()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-neutral-700 text-neutral-100 rounded-lg hover:bg-neutral-600 transition-colors"
      >
        <ExportIcon className="w-5 h-5" />
        Export
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-neutral-600 border border-neutral-500 rounded-lg shadow-xl z-20">
          <button onClick={() => handleExport('txt')} className="w-full text-left px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-500 rounded-t-lg">Plain Text (.txt)</button>
          <button onClick={() => handleExport('md')} className="w-full text-left px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-500">Markdown (.md)</button>
          <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-500 rounded-b-lg">JSON (.json)</button>
        </div>
      )}
    </div>
  );
};


const TabButton: React.FC<{ Icon: React.FC<{className?: string}>; label: string; isActive: boolean; onClick: () => void; }> = ({ Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive 
                ? 'bg-brand-primary/20 text-brand-primary' 
                : 'text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100'
        }`}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </button>
);

const GaugeChart: React.FC<{ value: number, label: string, color: string }> = ({ value, label, color }) => {
    // Simple SVG half-circle gauge
    const radius = 40;
    const circumference = Math.PI * radius;
    const progress = (value / 100) * circumference;
    
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-32 h-20 overflow-hidden">
                <svg className="w-32 h-32 transform -rotate-180 origin-center" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#333" strokeWidth="10" strokeDasharray={`${circumference} ${circumference}`} />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke={color} strokeWidth="10" strokeDasharray={`${progress} ${circumference}`} strokeLinecap="round" />
                </svg>
                <div className="absolute bottom-0 w-full text-center mb-2">
                    <span className="text-2xl font-bold text-white">{value}</span>
                </div>
            </div>
             <span className="text-sm text-neutral-400 mt-1">{label}</span>
        </div>
    );
};

const SpeakerStatsChart: React.FC<{ transcript: string }> = ({ transcript }) => {
    const speakerCounts = useMemo(() => {
        const counts: { [key: string]: number } = {};
        const lines = transcript.split('\n');
        lines.forEach(line => {
             const match = line.match(/\*\*(.*?):\*\*/);
             if (match) {
                 const speaker = match[1];
                 // Approximate word count
                 const wordCount = line.replace(/\*\*(.*?):\*\*/, '').split(/\s+/).length;
                 counts[speaker] = (counts[speaker] || 0) + wordCount;
             }
        });
        return counts;
    }, [transcript]);

    const maxCount = Math.max(...(Object.values(speakerCounts) as number[]), 1);

    return (
        <div className="space-y-3">
             {(Object.entries(speakerCounts) as [string, number][]).sort(([,a], [,b]) => b - a).map(([speaker, count]) => (
                 <div key={speaker} className="flex items-center gap-3">
                     <div className="w-24 text-right text-sm text-neutral-300 truncate">{speaker}</div>
                     <div className="flex-1 h-2 bg-neutral-700 rounded-full overflow-hidden">
                         <div className="h-full bg-brand-primary" style={{ width: `${(count / maxCount) * 100}%` }}></div>
                     </div>
                     <div className="w-12 text-xs text-neutral-500">{count} words</div>
                 </div>
             ))}
        </div>
    );
}


export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ 
  result, 
  onSummarize, 
  onLegalAnalysis, 
  onRefineSegment, 
  onCorrectTranscript,
  onSendMessage, 
  onExtractEntities,
  onGenerateInsights,
  onUpdateTranscription
}) => {
  const { 
    transcription, mediaSrc, mediaType, refinementStatus, refiningSegment, refinementError,
    correctionStatus, correctionError, insights
  } = result;
  
  const [activeTab, setActiveTab] = useState<Tab>('transcription');
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState('');
  const [corrections, setCorrections] = useState<{ find: string; replace: string }[]>([]);
  const [selection, setSelection] = useState<{ text: string; top: number; left: number } | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-fetch data when a tab is opened for the first time
  useEffect(() => {
    if (activeTab === 'summary' && result.summaryStatus === Status.Idle) {
      onSummarize();
    } else if (activeTab === 'analysis' && result.legalAnalysisStatus === Status.Idle) {
      onLegalAnalysis();
    } else if (activeTab === 'entities' && result.entityStatus === Status.Idle) {
      onExtractEntities();
    } else if (activeTab === 'insights' && result.insightStatus === Status.Idle) {
      onGenerateInsights();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Initialize editable transcript when entering edit mode or when result changes
  useEffect(() => {
      setEditableTranscript(transcription);
  }, [transcription]);

  const detectedSpeakers = useMemo(() => {
    const speakerRegex = /\*\*(.*?):\*\*/g;
    const matches = transcription.match(speakerRegex) || [];
    return [...new Set(matches.map(s => s.replace(/\*|:/g, '').trim()))];
  }, [transcription]);
  
  const handleOpenCorrections = () => {
    const speakerCorrections = detectedSpeakers.map(speaker => ({ find: speaker, replace: speaker }));
    setCorrections(speakerCorrections);
    setIsCorrecting(true);
  };
  
  const handleUpdateCorrection = (index: number, field: 'find' | 'replace', value: string) => {
    const newCorrections = [...corrections];
    newCorrections[index][field] = value;
    setCorrections(newCorrections);
  };

  const handleAddCorrection = () => setCorrections([...corrections, { find: '', replace: '' }]);
  const handleRemoveCorrection = (index: number) => setCorrections(corrections.filter((_, i) => i !== index));
  
  const handleApplyCorrections = () => {
    const validCorrections = corrections.filter(c => c.find.trim() !== '');
    if (validCorrections.length > 0) {
        onCorrectTranscript(validCorrections);
    }
    setIsCorrecting(false);
  };

  const handleSaveEdit = () => {
      onUpdateTranscription(editableTranscript);
      setIsEditing(false);
  };

  const handleCancelEdit = () => {
      setEditableTranscript(transcription);
      setIsEditing(false);
  };

  const handleMouseUp = () => {
    if (!transcriptContainerRef.current || !mediaSrc || isEditing) return;
    const selectionObj = window.getSelection();
    const selectedText = selectionObj?.toString().trim();

    if (selectedText && selectionObj) {
        const range = selectionObj.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = transcriptContainerRef.current.getBoundingClientRect();
        
        setSelection({
            text: selectedText,
            top: rect.top - containerRect.top - 40,
            left: rect.left - containerRect.left + rect.width / 2,
        });
    } else {
        setSelection(null);
    }
  };

  const handleTimestampClick = (time: string) => {
    const mediaEl = audioRef.current || videoRef.current;
    if (!mediaEl) return;
    
    // Clean and parse the timestamp
    const parts: number[] = time.replace(/[\[\]]/g, '').split(':').map((p: string) => {
        const n = parseFloat(p);
        return isNaN(n) ? 0 : n;
    });
    
    let seconds = 0;
    if (parts.length === 3) {
        // HH:MM:SS
        const h = Number(parts[0] || 0);
        const m = Number(parts[1] || 0);
        const s = Number(parts[2] || 0);
        seconds = h * 3600 + m * 60 + s;
    } else if (parts.length === 2) {
        // MM:SS
        const m = Number(parts[0] || 0);
        const s = Number(parts[1] || 0);
        seconds = m * 60 + s;
    }
    mediaEl.currentTime = seconds;
    mediaEl.play();
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
                {timestamp && mediaSrc && (
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

  const renderTabContent = () => {
    switch(activeTab) {
      case 'transcription':
        return (
          <>
            <div ref={transcriptContainerRef} className="relative w-full p-4 bg-neutral-900 rounded-lg border border-neutral-700 h-full overflow-y-auto flex flex-col">
               <div className="flex justify-between items-center mb-4 border-b border-neutral-700 pb-2 sticky top-0 bg-neutral-900 z-10">
                  <h3 className="text-lg font-semibold text-neutral-100">Transcript</h3>
                  <div className="flex gap-2">
                      {isEditing ? (
                          <>
                              <button onClick={handleCancelEdit} className="text-sm px-3 py-1.5 rounded bg-neutral-700 text-neutral-300 hover:bg-neutral-600">Cancel</button>
                              <button onClick={handleSaveEdit} className="text-sm px-3 py-1.5 rounded bg-brand-secondary text-white hover:bg-emerald-600">Save</button>
                          </>
                      ) : (
                          <>
                             <CopyButton textToCopy={transcription} />
                             <button onClick={() => setIsEditing(true)} className="text-sm px-3 py-1.5 rounded bg-neutral-700 text-neutral-300 hover:bg-neutral-600 flex items-center gap-1">
                                <PencilIcon className="w-4 h-4"/> Edit
                             </button>
                          </>
                      )}
                  </div>
               </div>
              
              {correctionStatus === Status.Loading && (
                  <div className="absolute inset-0 bg-neutral-900/80 flex justify-center items-center z-20 rounded-lg">
                      <Loader title="Applying corrections..." />
                  </div>
              )}
              
              {isEditing ? (
                   <textarea 
                        value={editableTranscript}
                        onChange={(e) => setEditableTranscript(e.target.value)}
                        className="w-full h-full bg-neutral-800 text-neutral-200 p-4 rounded border border-neutral-700 focus:ring-2 focus:ring-brand-primary focus:outline-none font-mono text-sm leading-relaxed resize-none"
                   />
              ) : (
                  <>
                    {selection && refinementStatus !== Status.Loading && (
                        <div className="absolute z-10 p-1 bg-neutral-600 rounded-lg shadow-lg transform -translate-x-1/2" style={{ top: `${selection.top}px`, left: `${selection.left}px` }}>
                            <button onClick={() => { onRefineSegment(selection.text); setSelection(null); }} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-brand-primary text-white rounded-md hover:bg-blue-600 transition-colors">
                                <RefreshIcon className="w-4 h-4"/> Refine Selection
                            </button>
                        </div>
                    )}
                    <div className="text-neutral-200 whitespace-pre-wrap select-text space-y-2 flex-grow" onMouseUp={handleMouseUp}>
                        {parseAndRenderTranscription(transcription)}
                    </div>
                  </>
              )}
            </div>
            {refinementError && <p className="text-red-300 text-xs mt-2"><strong>Refinement Error:</strong> {refinementError}</p>}
            {correctionError && <p className="text-red-300 text-xs mt-2"><strong>Correction Error:</strong> {correctionError}</p>}
          </>
        );
      case 'chat':
        return <ChatPanel 
          history={result.chatHistory} 
          status={result.chatStatus} 
          error={result.chatError} 
          onSendMessage={onSendMessage}
        />;
      case 'summary':
        return (
          <div className="w-full h-full p-4 bg-neutral-900 rounded-lg border border-neutral-700 overflow-y-auto">
            <div className="flex justify-between items-center mb-2 sticky top-0 bg-neutral-900 z-10 py-2 border-b border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-100">Summary</h3>
              {result.summaryStatus === Status.Success && result.summary && <CopyButton textToCopy={result.summary} />}
            </div>
            {result.summaryStatus === Status.Loading && <Loader title="Generating summary..." />}
            {result.summaryStatus === Status.Error && <p className="text-brand-danger">{result.summaryError || "Could not generate summary."}</p>}
            {result.summaryStatus === Status.Success && result.summary && <p className="text-neutral-200 whitespace-pre-wrap">{result.summary}</p>}
          </div>
        );
      case 'analysis':
         return (
          <div className="w-full h-full p-4 bg-neutral-900 rounded-lg border border-neutral-700 overflow-y-auto">
            <div className="flex justify-between items-center mb-2 sticky top-0 bg-neutral-900 z-10 py-2 border-b border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-100">Legal Analysis</h3>
              {result.legalAnalysisStatus === Status.Success && result.legalAnalysis && <CopyButton textToCopy={result.legalAnalysis} />}
            </div>
            {result.legalAnalysisStatus === Status.Loading && <Loader title="Generating analysis..." />}
            {result.legalAnalysisStatus === Status.Error && <p className="text-brand-danger">{result.legalAnalysisError || "Could not generate analysis."}</p>}
            {result.legalAnalysisStatus === Status.Success && result.legalAnalysis && <p className="text-neutral-200 whitespace-pre-wrap">{result.legalAnalysis}</p>}
          </div>
        );
      case 'entities':
         return (
          <div className="w-full h-full p-6 bg-neutral-900 rounded-lg border border-neutral-700 overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-neutral-900 z-10 py-2 border-b border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-100">Extracted Entities</h3>
              {result.entityStatus === Status.Success && result.entities.length > 0 && <CopyButton textToCopy={JSON.stringify(result.entities, null, 2)} />}
            </div>
            {result.entityStatus === Status.Loading && <Loader title="Extracting entities..." />}
            {result.entityStatus === Status.Error && <p className="text-brand-danger">{result.entityError || "Could not extract entities."}</p>}
            {result.entityStatus === Status.Success && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.entities.map(entity => (
                  <div key={entity.category} className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-hidden shadow-lg">
                    <div className="bg-neutral-700/50 p-3 border-b border-neutral-700 flex items-center justify-between">
                        <h4 className="font-semibold text-neutral-100">{entity.category}</h4>
                        <span className="text-xs bg-neutral-900 text-neutral-400 px-2 py-0.5 rounded-full">{entity.items.length}</span>
                    </div>
                    <div className="p-4 max-h-60 overflow-y-auto">
                        <ul className="space-y-2">
                            {entity.items.map((item, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm text-neutral-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary/50"></div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
         );
       case 'insights':
            return (
                <div className="w-full h-full p-6 bg-neutral-900 rounded-lg border border-neutral-700 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6 sticky top-0 bg-neutral-900 z-10 py-2 border-b border-neutral-700">
                         <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                             <ChartIcon className="w-5 h-5 text-brand-secondary"/> Insights Dashboard
                         </h3>
                    </div>
                    
                    {result.insightStatus === Status.Loading && <Loader title="Generating insights..." subtitle="Calculating risk, timeline, and speaker stats" />}
                    {result.insightStatus === Status.Error && <p className="text-brand-danger">{result.insightError || "Could not generate insights."}</p>}
                    
                    {result.insightStatus === Status.Success && insights && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Metrics Section */}
                            <section>
                                <h4 className="text-sm uppercase tracking-wider text-neutral-500 mb-4 font-semibold flex items-center gap-2">
                                    <ActivityIcon className="w-4 h-4" /> AI Derived Metrics
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 p-6 bg-neutral-800/30 rounded-2xl border border-neutral-700/50">
                                    <GaugeChart value={insights.metrics.constitutionalRisk} label="Constitutional Risk" color="#EF4444" />
                                    <GaugeChart value={insights.metrics.proceduralIntegrity} label="Procedural Integrity" color="#10B981" />
                                    <GaugeChart value={insights.metrics.tensionLevel} label="Tension Level" color="#F59E0B" />
                                </div>
                            </section>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                 {/* Speaker Stats Section */}
                                <section className="bg-neutral-800/30 rounded-2xl border border-neutral-700/50 p-6">
                                     <h4 className="text-sm uppercase tracking-wider text-neutral-500 mb-4 font-semibold flex items-center gap-2">
                                        <UserGroupIcon className="w-4 h-4" /> Speaking Share
                                     </h4>
                                     <SpeakerStatsChart transcript={transcription} />
                                </section>

                                {/* Timeline Section */}
                                <section className="bg-neutral-800/30 rounded-2xl border border-neutral-700/50 p-6">
                                    <h4 className="text-sm uppercase tracking-wider text-neutral-500 mb-4 font-semibold flex items-center gap-2">
                                        <LightBulbIcon className="w-4 h-4" /> Key Event Timeline
                                     </h4>
                                     <div className="space-y-4 relative">
                                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-neutral-700"></div>
                                        {insights.timeline.map((event, i) => (
                                            <div key={i} className="relative pl-8 flex flex-col gap-1">
                                                <div className={`absolute left-[0.2rem] top-1.5 w-3 h-3 rounded-full border-2 border-neutral-900 ${
                                                    event.type === 'ruling' ? 'bg-red-500' : 
                                                    event.type === 'objection' ? 'bg-orange-500' : 
                                                    'bg-brand-primary'
                                                }`}></div>
                                                <div className="flex justify-between items-baseline">
                                                     <span className="text-xs font-mono text-neutral-500">{event.timestamp}</span>
                                                     <span className="text-xs uppercase font-bold tracking-wider text-neutral-600 border border-neutral-700 px-1.5 rounded">{event.type}</span>
                                                </div>
                                                <p className="text-sm text-neutral-200">{event.description}</p>
                                            </div>
                                        ))}
                                     </div>
                                </section>
                            </div>
                        </div>
                    )}
                </div>
            )
      default: return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center gap-4 animate-fade-in text-left p-0 sm:p-0">
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto">
          {mediaSrc ? (
              mediaType?.startsWith('video/') ? (
                <video ref={videoRef} controls src={mediaSrc} className="w-full rounded-lg bg-neutral-900 max-h-48">
                    Your browser does not support the video element.
                </video>
              ) : (
                <audio ref={audioRef} controls src={mediaSrc} className="w-full h-10 rounded-lg">
                    Your browser does not support the audio element.
                </audio>
              )
          ) : (
              <div className="w-full text-center p-2 bg-neutral-700/50 rounded-lg">
                  <p className="text-neutral-400 text-sm">Media source not available for this session.</p>
              </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
            <ExportButton result={result} />
            <button
              onClick={handleOpenCorrections}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-700 text-neutral-100 rounded-lg hover:bg-neutral-600 transition-colors"
            >
                <PencilIcon className="w-5 h-5" />
                Batch Correct
            </button>
        </div>
      </div>
      
      <div className="w-full border-b border-neutral-700 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto">
              <TabButton Icon={PencilIcon} label="Transcription" isActive={activeTab === 'transcription'} onClick={() => setActiveTab('transcription')} />
              <TabButton Icon={ChartIcon} label="Insights" isActive={activeTab === 'insights'} onClick={() => setActiveTab('insights')} />
              <TabButton Icon={ChatIcon} label="Chat" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
              <TabButton Icon={CaseIcon} label="Entities" isActive={activeTab === 'entities'} onClick={() => setActiveTab('entities')} />
              <TabButton Icon={SparklesIcon} label="Summary" isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
              <TabButton Icon={ScaleIcon} label="Analysis" isActive={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
          </div>
      </div>

      <div className="w-full flex-grow min-h-[400px]">
        {renderTabContent()}
      </div>

      {isCorrecting && (
        <div className="fixed inset-0 bg-neutral-900/80 flex justify-center items-center z-50 p-4" onClick={() => setIsCorrecting(false)}>
            <div className="w-full max-w-lg bg-neutral-800 rounded-lg border border-neutral-700 shadow-2xl p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-neutral-100 mb-4">Correct Transcript</h3>
                <p className="text-sm text-neutral-400 mb-4">Define terms to find and replace. The AI will apply these corrections throughout the entire transcript.</p>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {corrections.map((correction, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input type="text" placeholder="Text to find" value={correction.find} onChange={(e) => handleUpdateCorrection(index, 'find', e.target.value)} className="flex-1 bg-neutral-700 border border-neutral-600 rounded-md px-3 py-1.5 text-neutral-100 focus:ring-2 focus:ring-brand-primary focus:outline-none" />
                        <span className="text-neutral-400">&rarr;</span>
                        <input type="text" placeholder="Replace with" value={correction.replace} onChange={(e) => handleUpdateCorrection(index, 'replace', e.target.value)} className="flex-1 bg-neutral-700 border border-neutral-600 rounded-md px-3 py-1.5 text-neutral-100 focus:ring-2 focus:ring-brand-primary focus:outline-none" />
                        <button onClick={() => handleRemoveCorrection(index)} className="p-1.5 text-neutral-400 hover:text-brand-danger hover:bg-neutral-700 rounded-full" aria-label="Remove correction"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                    ))}
                </div>
                <button onClick={handleAddCorrection} className="mt-3 flex items-center gap-2 text-sm text-brand-primary hover:text-blue-400"><PlusIcon className="w-4 h-4"/> Add Correction</button>
                <div className="flex justify-end mt-4 gap-2 border-t border-neutral-700 pt-4">
                    <button onClick={() => setIsCorrecting(false)} className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors">Cancel</button>
                    <button onClick={handleApplyCorrections} className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-blue-600 transition-colors">Apply Corrections</button>
                </div>
            </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        audio::-webkit-media-controls-panel,
        video::-webkit-media-controls-panel { background-color: #2C2C2C; }
        audio::-webkit-media-controls-play-button,
        audio::-webkit-media-controls-mute-button,
        video::-webkit-media-controls-play-button,
        video::-webkit-media-controls-mute-button { background-color: #4285F4; border-radius: 50%; }
        audio::-webkit-media-controls-current-time-display,
        audio::-webkit-media-controls-time-remaining-display,
        video::-webkit-media-controls-current-time-display,
        video::-webkit-media-controls-time-remaining-display { color: #F5F5F5; }
      `}</style>
    </div>
  );
};
