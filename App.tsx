
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLiveRecorder } from './hooks/useLiveRecorder';
import * as apiService from './services/apiService';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { LiveHUD } from './components/LiveHUD';
import { FileUpload } from './components/FileUpload';
import { HistoryPanel } from './components/HistoryPanel';
import { ProgressBar } from './components/ProgressBar';
import { ErrorDisplay } from './components/ErrorDisplay';
import { SettingsModal } from './components/SettingsModal';
import { SessionSetupModal } from './components/SessionSetupModal';
import { Status, TranscriptionResult, Message, ApiSettings, AppState, TrackedKeywordHit, CaseMention } from './types';
import { GithubIcon, SettingsIcon, UploadIcon, MicIcon } from './components/Icons';

const HISTORY_STORAGE_KEY = 'gemini-transcriber-history';
const SETTINGS_STORAGE_KEY = 'gemini-transcriber-settings';

const App: React.FC = () => {
  const [results, setResults] = useState<TranscriptionResult[]>(() => {
    try {
      const savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        return JSON.parse(savedHistory);
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
    }
    return [];
  });
  
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.Idle);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // State for live session intelligence
  const [sessionKeywords, setSessionKeywords] = useState<string[]>([]);
  const [liveKeywordHits, setLiveKeywordHits] = useState<TrackedKeywordHit[]>([]);
  const [liveCaseMentions, setLiveCaseMentions] = useState<CaseMention[]>([]);
  const processedTranscriptRef = useRef('');


  const [apiSettings, setApiSettings] = useState<ApiSettings>(() => {
    try {
        const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
    } catch (error) {
        console.error("Failed to load settings from localStorage", error);
    }
    return { provider: 'gemini' };
  });

  const {
    liveState,
    startRecording,
    stopRecording,
    liveTranscript,
    recordingTime,
    permissionError,
    mediaStream,
    recordedBlob
  } = useLiveRecorder();

  useEffect(() => {
    if (recordedBlob && currentResultId) {
        const result = results.find(r => r.id === currentResultId);
        if (result && !result.mediaBlob) {
            updateResult(currentResultId, { 
                mediaBlob: recordedBlob, 
                mediaSrc: URL.createObjectURL(recordedBlob),
                mediaType: recordedBlob.type
            });
        }
    }
  }, [recordedBlob, currentResultId, results]);

  useEffect(() => {
    try {
      // Do not save mediaSrc or mediaBlob to localStorage as Blob URLs expire and Blobs are too large
      const serializableResults = results.map(({ mediaBlob, mediaSrc, ...rest }) => rest);
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(serializableResults));
    } catch (error) {
      console.error("Failed to save history to localStorage", error);
    }
  }, [results]);

  useEffect(() => {
    return () => {
      results.forEach(result => {
        if (result.mediaSrc) {
          URL.revokeObjectURL(result.mediaSrc);
        }
      });
    };
  }, [results]);
  
  const handleSaveSettings = (settings: ApiSettings) => {
    setApiSettings(settings);
    try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save settings to localStorage", error);
    }
  };

  const updateResult = (id: string, updates: Partial<TranscriptionResult>) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };
  
  const handleNewSession = () => {
    setCurrentResultId(null);
    setGlobalError(null);
    setAppState(AppState.Idle);
    if (liveState !== 'idle' && liveState !== 'stopped' && liveState !== 'error') {
      stopRecording();
    }
  };

  const handleStartLiveSession = (sessionName: string, keywords: string[]) => {
    setSessionKeywords(keywords);
    setLiveKeywordHits([]);
    setLiveCaseMentions([]);
    processedTranscriptRef.current = '';
    startRecording();
    setAppState(AppState.Live);
  };

  const handleBatchTranscription = useCallback(async (mediaSource: Blob, fileName: string) => {
    if (apiSettings.provider !== 'gemini') {
        setGlobalError("Audio transcription is only available with the Google Gemini provider. Please change your provider in Settings.");
        return;
    }

    const newId = `result-${Date.now()}`;
    const newResult: TranscriptionResult = {
      id: newId,
      fileName,
      mediaSrc: URL.createObjectURL(mediaSource),
      mediaBlob: mediaSource,
      mediaType: mediaSource.type,
      transcription: '', summary: '', legalAnalysis: '', entities: [], chatHistory: [],
      keywordHits: [], caseMentions: [], keywords: [],
      status: Status.Loading, summaryStatus: Status.Idle, legalAnalysisStatus: Status.Idle,
      refinementStatus: Status.Idle, correctionStatus: Status.Idle, chatStatus: Status.Idle,
      entityStatus: Status.Idle, insightStatus: Status.Idle, refiningSegment: null, progress: 0, progressMessage: 'Initializing...',
    };
    
    setResults(prev => [newResult, ...prev]);
    setCurrentResultId(newId);
    setAppState(AppState.Analysis);
    setGlobalError(null);
    
    try {
      const transcribedText = await apiService.transcribeAudio(mediaSource, fileName, (progressUpdate) => {
        updateResult(newId, { progress: progressUpdate.value, progressMessage: progressUpdate.message });
      });
      updateResult(newId, { 
        transcription: transcribedText, status: Status.Success, progress: 100, progressMessage: 'Complete!' 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      updateResult(newId, { 
        status: Status.Error, transcription: '',
        transcriptionError: `Transcription failed: ${errorMessage}`,
        progress: 100, progressMessage: 'Failed'
      });
      console.error(err);
    }
  }, [apiSettings.provider]);

  const handleStopRecording = useCallback(async () => {
    const finalTranscript = await stopRecording();
    setAppState(AppState.Analysis);

    if (!finalTranscript || finalTranscript.trim() === '') {
        console.log("Empty transcript, not saving.");
        handleNewSession();
        return;
    };

    // Perform a final pass of intelligence extraction on the latest text delta
    // to ensure we capture keywords in the final utterance.
    const newText = finalTranscript.substring(processedTranscriptRef.current.length);
    let finalHits = [...liveKeywordHits];
    let finalMentions = [...liveCaseMentions];

    if (newText) {
        if (sessionKeywords.length > 0) {
            const keywordRegex = new RegExp(`\\b(${sessionKeywords.join('|')})\\b`, 'gi');
            const matches = newText.matchAll(keywordRegex);
            for (const match of matches) {
                finalHits.push({ keyword: match[0], timestamp: recordingTime });
            }
        }
        const caseMentionRegex = /(\d+)\s+(F\.\d+|U\.S\.)\s+(\d+)/g;
        const caseMatches = newText.matchAll(caseMentionRegex);
        for (const match of caseMatches) {
            finalMentions.push({ citation: match[0], timestamp: recordingTime });
        }
    }

    const newId = `result-${Date.now()}`;
    const fileName = `Live Session - ${new Date().toLocaleString()}`;

    const newResult: TranscriptionResult = {
      id: newId, fileName, transcription: finalTranscript,
      summary: '', legalAnalysis: '', entities: [], chatHistory: [],
      keywords: sessionKeywords,
      keywordHits: finalHits,
      caseMentions: finalMentions,
      status: Status.Success, summaryStatus: Status.Idle, legalAnalysisStatus: Status.Idle,
      refinementStatus: Status.Idle, correctionStatus: Status.Idle, chatStatus: Status.Idle,
      entityStatus: Status.Idle, insightStatus: Status.Idle, refiningSegment: null, progress: 100, progressMessage: 'Complete!',
    };

    setResults(prev => [newResult, ...prev]);
    setCurrentResultId(newId);
  }, [stopRecording, sessionKeywords, liveKeywordHits, liveCaseMentions, recordingTime]);
  
  // Real-time Intelligence Processing
  useEffect(() => {
    const newText = liveTranscript.substring(processedTranscriptRef.current.length);
    if (!newText || appState !== AppState.Live) return;

    // 1. Keyword tracking
    if (sessionKeywords.length > 0) {
        const keywordRegex = new RegExp(`\\b(${sessionKeywords.join('|')})\\b`, 'gi');
        const matches = newText.matchAll(keywordRegex);
        const newHits: TrackedKeywordHit[] = [];
        for (const match of matches) {
            newHits.push({ keyword: match[0], timestamp: recordingTime });
        }
        if (newHits.length > 0) {
            setLiveKeywordHits(prev => [...prev, ...newHits]);
        }
    }
    
    // 2. Case mention tracking (simple regex)
    const caseMentionRegex = /(\d+)\s+(F\.\d+|U\.S\.)\s+(\d+)/g;
    const caseMatches = newText.matchAll(caseMentionRegex);
    const newMentions: CaseMention[] = [];
    for (const match of caseMatches) {
        newMentions.push({ citation: match[0], timestamp: recordingTime });
    }
    if (newMentions.length > 0) {
        setLiveCaseMentions(prev => [...prev, ...newMentions]);
    }

    processedTranscriptRef.current = liveTranscript;
  }, [liveTranscript, sessionKeywords, recordingTime, appState]);


  const handleSummarize = useCallback(async (resultId: string) => {
    const result = results.find(r => r.id === resultId);
    if (!result || !result.transcription) return;
    updateResult(resultId, { summaryStatus: Status.Loading, summaryError: undefined });
    try {
        const summaryText = await apiService.summarizeText(result.transcription, apiSettings);
        updateResult(resultId, { summary: summaryText, summaryStatus: Status.Success });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        updateResult(resultId, { summaryStatus: Status.Error, summaryError: errorMessage });
    }
  }, [results, apiSettings]);

  const handleLegalAnalysis = useCallback(async (resultId: string) => {
    const result = results.find(r => r.id === resultId);
    if (!result || !result.transcription) return;
    updateResult(resultId, { legalAnalysisStatus: Status.Loading, legalAnalysisError: undefined });
    try {
        const analysisText = await apiService.analyzeLegalText(result.transcription, apiSettings);
        updateResult(resultId, { legalAnalysis: analysisText, legalAnalysisStatus: Status.Success });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        updateResult(resultId, { legalAnalysisStatus: Status.Error, legalAnalysisError: errorMessage });
    }
  }, [results, apiSettings]);

  const handleRefineSegment = useCallback(async (resultId: string, segment: string) => {
    if (apiSettings.provider !== 'gemini') {
        updateResult(resultId, {
            refinementStatus: Status.Error, refinementError: "Segment refinement is only available with Google Gemini.",
        });
        return;
    }
    const result = results.find(r => r.id === resultId);
    if (!result || !result.mediaBlob) {
       updateResult(resultId, { refinementStatus: Status.Error, refinementError: "Media source not available." });
       return;
    }
    updateResult(resultId, { refinementStatus: Status.Loading, refiningSegment: segment, refinementError: undefined });
    try {
      const refinedSegment = await apiService.refineTranscriptionSegment(result.mediaBlob, result.fileName, segment, result.transcription);
      const newTranscription = result.transcription.replace(segment, refinedSegment);
      updateResult(resultId, { transcription: newTranscription, refinementStatus: Status.Success, refiningSegment: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      updateResult(resultId, { refinementStatus: Status.Error, refinementError: `Refinement failed: ${errorMessage}`, refiningSegment: null });
    }
  }, [results, apiSettings]);
  
  const handleCorrectTranscript = useCallback(async (resultId: string, corrections: { find: string; replace: string }[]) => {
    const result = results.find(r => r.id === resultId);
    if (!result) return;
    updateResult(resultId, { correctionStatus: Status.Loading, correctionError: undefined });
    try {
      const correctedText = await apiService.correctTranscription(result.transcription, corrections, apiSettings);
      updateResult(resultId, { transcription: correctedText, correctionStatus: Status.Success });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      updateResult(resultId, { correctionStatus: Status.Error, correctionError: `Correction failed: ${errorMessage}` });
    }
  }, [results, apiSettings]);

  const handleManualTranscriptionUpdate = useCallback((resultId: string, newText: string) => {
    updateResult(resultId, { transcription: newText });
  }, []);

  const handleSendMessage = useCallback(async (resultId: string, message: string) => {
    if (apiSettings.provider !== 'gemini') {
      const newHistory: Message[] = [...results.find(r => r.id === resultId)!.chatHistory, { role: 'user', text: message }];
      updateResult(resultId, { chatStatus: Status.Error, chatHistory: newHistory, chatError: `Chat is only available with Google Gemini.` });
      return;
    }
    const result = results.find(r => r.id === resultId);
    if (!result) return;
    const newHistory: Message[] = [...result.chatHistory, { role: 'user', text: message }];
    updateResult(resultId, { chatStatus: Status.Loading, chatHistory: newHistory, chatError: undefined });
    try {
      const responseText = await apiService.chatAboutTranscript(result.transcription, newHistory);
      const finalHistory: Message[] = [...newHistory, { role: 'model', text: responseText }];
      updateResult(resultId, { chatHistory: finalHistory, chatStatus: Status.Success });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      updateResult(resultId, { chatStatus: Status.Error, chatError: `Chat failed: ${errorMessage}` });
    }
  }, [results, apiSettings]);

  const handleExtractEntities = useCallback(async (resultId: string) => {
    if (apiSettings.provider !== 'gemini') {
        updateResult(resultId, { entityStatus: Status.Error, entityError: "Entity extraction is only available with Google Gemini." });
        return;
    }
    const result = results.find(r => r.id === resultId);
    if (!result) return;
    updateResult(resultId, { entityStatus: Status.Loading, entityError: undefined });
    try {
        const entities = await apiService.extractEntities(result.transcription);
        updateResult(resultId, { entities, entityStatus: Status.Success });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        updateResult(resultId, { entityStatus: Status.Error, entityError: errorMessage });
    }
  }, [results, apiSettings]);

  const handleGenerateInsights = useCallback(async (resultId: string) => {
     if (apiSettings.provider !== 'gemini') {
        updateResult(resultId, { insightStatus: Status.Error, insightError: "Insights are only available with Google Gemini." });
        return;
    }
    const result = results.find(r => r.id === resultId);
    if (!result) return;
    updateResult(resultId, { insightStatus: Status.Loading, insightError: undefined });
    try {
        const insights = await apiService.generateInsights(result.transcription);
        updateResult(resultId, { insights, insightStatus: Status.Success });
    } catch (err) {
         const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
         updateResult(resultId, { insightStatus: Status.Error, insightError: errorMessage });
    }
  }, [results, apiSettings]);

  useEffect(() => {
    if(permissionError) {
        setGlobalError('Microphone permission was denied. Please allow microphone access in your browser settings and try again.');
        setAppState(AppState.Idle);
    }
  }, [permissionError]);

  const currentResult = useMemo(() => results.find(r => r.id === currentResultId), [results, currentResultId]);

  const renderContent = () => {
    if (appState === AppState.Live) {
      return (
        <LiveHUD
          transcript={liveTranscript}
          time={recordingTime}
          state={liveState}
          keywordHits={liveKeywordHits}
          caseMentions={liveCaseMentions}
          onStop={handleStopRecording}
          mediaStream={mediaStream}
        />
      );
    }
  
    if (appState === AppState.Analysis && currentResult) {
      if (currentResult.status === Status.Loading) {
        return <ProgressBar progress={currentResult.progress} message={currentResult.progressMessage || 'Processing...'} />;
      }
      if (currentResult.status === Status.Error) {
        return <ErrorDisplay title="Transcription Failed" message={currentResult.transcriptionError || 'An unknown error occurred.'} onRetry={handleNewSession} />;
      }
      return <TranscriptionDisplay 
        result={currentResult}
        onSummarize={() => handleSummarize(currentResult.id)}
        onLegalAnalysis={() => handleLegalAnalysis(currentResult.id)}
        onRefineSegment={(segment) => handleRefineSegment(currentResult.id, segment)}
        onCorrectTranscript={(corrections) => handleCorrectTranscript(currentResult.id, corrections)}
        onSendMessage={(message) => handleSendMessage(currentResult.id, message)}
        onExtractEntities={() => handleExtractEntities(currentResult.id)}
        onGenerateInsights={() => handleGenerateInsights(currentResult.id)}
        onUpdateTranscription={(newText) => handleManualTranscriptionUpdate(currentResult.id, newText)}
      />;
    }

    // AppState.Idle or default view
    return (
        <div className="w-full max-w-4xl text-center animate-fade-in flex flex-col items-center">
            <h2 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-emerald-300 mb-4 tracking-tight pb-2">
                Legal Intelligence Copilot
            </h2>
            <p className="text-lg text-neutral-400 mb-12 max-w-2xl leading-relaxed">
                Transcribe proceedings, analyze constitutional implications, and uncover legal insights in real-time using advanced AI.
            </p>
            {globalError && <p className="text-red-400 mb-6 text-center max-w-md mx-auto p-4 bg-red-500/10 rounded-xl border border-red-500/30 backdrop-blur-sm">{globalError}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-4 sm:px-0">
                <div className="group relative bg-neutral-900/40 backdrop-blur-md p-8 rounded-2xl border border-white/5 hover:border-brand-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col items-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-6 border border-brand-primary/20 group-hover:scale-110 transition-transform duration-300">
                        <MicIcon className="w-8 h-8 text-brand-primary"/>
                    </div>
                    <h3 className="relative text-2xl font-semibold mb-3 text-white">Live Session</h3>
                    <p className="relative text-neutral-400 mb-8 flex-grow text-center text-sm leading-relaxed">
                        Start a real-time transcription session with active keyword monitoring and legal entity extraction.
                    </p>
                    <button onClick={() => setAppState(AppState.Setup)} className="relative w-full px-6 py-3 bg-brand-primary hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25">
                        Start Monitoring
                    </button>
                </div>

                 <div className="group relative bg-neutral-900/40 backdrop-blur-md p-8 rounded-2xl border border-white/5 hover:border-brand-secondary/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col items-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-brand-secondary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative w-16 h-16 rounded-2xl bg-brand-secondary/10 flex items-center justify-center mb-6 border border-brand-secondary/20 group-hover:scale-110 transition-transform duration-300">
                        <UploadIcon className="w-8 h-8 text-brand-secondary"/>
                    </div>
                    <h3 className="relative text-2xl font-semibold mb-3 text-white">Upload Media</h3>
                    <p className="relative text-neutral-400 mb-8 flex-grow text-center text-sm leading-relaxed">
                         Process existing audio/video files for forensic transcription, summarization, and legal analysis.
                    </p>
                    <div className="relative w-full">
                         <FileUpload onFileSelect={(file) => handleBatchTranscription(file, file.name)} disabled={false} />
                    </div>
                </div>
            </div>
        </div>
    );
}

  return (
    <div className="h-full w-full flex flex-col relative z-0">
        {/* Decorative background elements */}
       <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none z-[-1]"></div>
       
       <header className="flex-shrink-0 p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="font-bold text-white text-lg">G</span>
              </div>
              <h1 className="text-xl font-semibold text-white tracking-tight">
                  Gemini <span className="text-neutral-500 font-normal">Legal Copilot</span>
              </h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" aria-label="Settings">
              <SettingsIcon className="w-5 h-5" />
            </button>
            <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <GithubIcon className="w-5 h-5" />
            </a>
          </div>
      </header>
      
      <div className="flex flex-grow overflow-hidden relative">
        <HistoryPanel
          results={results}
          currentResultId={currentResultId}
          onSelectResult={(id) => { setCurrentResultId(id); setAppState(AppState.Analysis);}}
          onNewSession={handleNewSession}
        />
        <main className="flex-grow flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 overflow-y-auto w-full relative">
             {/* Main content Area */}
            {renderContent()}
        </main>
      </div>
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={apiSettings}
        onSave={handleSaveSettings}
      />
      <SessionSetupModal
        isOpen={appState === AppState.Setup}
        onClose={() => setAppState(AppState.Idle)}
        onStart={handleStartLiveSession}
      />
    </div>
  );
};

export default App;
