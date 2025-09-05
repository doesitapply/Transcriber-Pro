import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { transcribeAudio, summarizeText, analyzeLegalText, refineTranscriptionSegment, correctTranscription } from './services/geminiService';
import { RecordButton } from './components/RecordButton';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { FileUpload } from './components/FileUpload';
import { HistoryPanel } from './components/HistoryPanel';
import { ProgressBar } from './components/ProgressBar';
import { Status, RecordingState, TranscriptionResult } from './types';
import { GithubIcon } from './components/Icons';

type Mode = 'record' | 'upload';

const HISTORY_STORAGE_KEY = 'gemini-transcriber-history';

const App: React.FC = () => {
  const [results, setResults] = useState<TranscriptionResult[]>(() => {
    try {
      const savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        // We don't persist audioBlob, so it will be undefined on load.
        // audioSrc will be an old revoked URL, so features requiring audio will be disabled.
        return JSON.parse(savedHistory);
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
    }
    return [];
  });
  
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('record');
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    recordingState,
    startRecording,
    stopRecording,
    audioBlob,
    recordingTime,
    permissionError
  } = useAudioRecorder();

  // Save to localStorage whenever results change
  useEffect(() => {
    try {
      // Create a serializable version of results by omitting the audioBlob
      const serializableResults = results.map(({ audioBlob, ...rest }) => rest);
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(serializableResults));
    } catch (error) {
      console.error("Failed to save history to localStorage", error);
    }
  }, [results]);


  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      results.forEach(result => {
        if (result.audioSrc) {
          URL.revokeObjectURL(result.audioSrc);
        }
      });
    };
  }, [results]);

  const updateResult = (id: string, updates: Partial<TranscriptionResult>) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };
  
  const handleNewTranscription = () => {
    setCurrentResultId(null);
    setGlobalError(null);
  };

  const handleTranscription = useCallback(async (audioSource: Blob, fileName: string) => {
    const newId = `result-${Date.now()}`;
    const newResult: TranscriptionResult = {
      id: newId,
      fileName,
      audioSrc: URL.createObjectURL(audioSource),
      audioBlob: audioSource, // Store the blob for refinement
      transcription: '',
      summary: '',
      legalAnalysis: '',
      status: Status.Loading,
      summaryStatus: Status.Idle,
      legalAnalysisStatus: Status.Idle,
      refinementStatus: Status.Idle,
      correctionStatus: Status.Idle,
      refiningSegment: null,
      progress: 0,
      progressMessage: 'Initializing...',
    };
    
    setResults(prev => [newResult, ...prev]);
    setCurrentResultId(newId);
    setGlobalError(null);
    
    try {
      const transcribedText = await transcribeAudio(audioSource, (progressUpdate) => {
        updateResult(newId, { progress: progressUpdate.value, progressMessage: progressUpdate.message });
      });
      updateResult(newId, { 
        transcription: transcribedText, 
        status: Status.Success, 
        progress: 100, 
        progressMessage: 'Complete!' 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      updateResult(newId, { 
        status: Status.Error, 
        transcription: '', // Keep transcription empty on error
        transcriptionError: `Transcription failed: ${errorMessage}`,
        progress: 100, // Set to 100 to hide progress bar
        progressMessage: 'Failed'
      });
      console.error(err);
    }
  }, []);
  
  const handleSummarize = useCallback(async (resultId: string) => {
    const result = results.find(r => r.id === resultId);
    if (!result || !result.transcription) return;

    updateResult(resultId, { summaryStatus: Status.Loading, summaryError: undefined });

    try {
        const summaryText = await summarizeText(result.transcription);
        updateResult(resultId, { summary: summaryText, summaryStatus: Status.Success });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        updateResult(resultId, { summaryStatus: Status.Error, summaryError: errorMessage });
        console.error(err);
    }
  }, [results]);

  const handleLegalAnalysis = useCallback(async (resultId: string) => {
    const result = results.find(r => r.id === resultId);
    if (!result || !result.transcription) return;

    updateResult(resultId, { legalAnalysisStatus: Status.Loading, legalAnalysisError: undefined });

    try {
        const analysisText = await analyzeLegalText(result.transcription);
        updateResult(resultId, { legalAnalysis: analysisText, legalAnalysisStatus: Status.Success });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        updateResult(resultId, { legalAnalysisStatus: Status.Error, legalAnalysisError: errorMessage });
        console.error(err);
    }
  }, [results]);

  const handleRefineSegment = useCallback(async (resultId: string, segment: string) => {
    const result = results.find(r => r.id === resultId);
    if (!result || !result.audioBlob || !result.transcription) {
       updateResult(resultId, {
        refinementStatus: Status.Error,
        refinementError: "Audio source not available in this session. Cannot refine.",
        refiningSegment: null
      });
      return;
    }

    updateResult(resultId, { refinementStatus: Status.Loading, refiningSegment: segment, refinementError: undefined });

    try {
      const refinedSegment = await refineTranscriptionSegment(result.audioBlob, segment, result.transcription);
      
      const newTranscription = result.transcription.replace(segment, refinedSegment);
      
      updateResult(resultId, {
        transcription: newTranscription,
        refinementStatus: Status.Success,
        refiningSegment: null
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      updateResult(resultId, {
        refinementStatus: Status.Error,
        refinementError: `Refinement failed: ${errorMessage}`,
        refiningSegment: null
      });
      console.error(err);
    }
  }, [results]);
  
  const handleCorrectTranscript = useCallback(async (resultId: string, corrections: { find: string; replace: string }[]) => {
    const result = results.find(r => r.id === resultId);
    if (!result || !result.transcription) return;

    updateResult(resultId, { correctionStatus: Status.Loading, correctionError: undefined });

    try {
      const correctedText = await correctTranscription(result.transcription, corrections);
      updateResult(resultId, { 
        transcription: correctedText, 
        correctionStatus: Status.Success 
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      updateResult(resultId, {
        correctionStatus: Status.Error,
        correctionError: `Correction failed: ${errorMessage}`,
      });
      console.error(err);
    }
  }, [results]);


  const handleUpdateTranscription = (resultId: string, newTranscription: string) => {
    updateResult(resultId, { transcription: newTranscription });
  };

  const handleFileSelect = (file: File) => {
    handleTranscription(file, file.name);
  };
  
  useEffect(() => {
    if (audioBlob) {
      const fileName = `Recording - ${new Date().toLocaleString()}`;
      handleTranscription(audioBlob, fileName);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);
  
  useEffect(() => {
    if(permissionError) {
        setGlobalError('Microphone permission was denied. Please allow microphone access in your browser settings.');
    }
  }, [permissionError]);

  const currentResult = useMemo(() => results.find(r => r.id === currentResultId), [results, currentResultId]);

  const isRecording = recordingState === RecordingState.Recording;

  const renderContent = () => {
    if (currentResult) {
      if (currentResult.status === Status.Loading) {
        return <ProgressBar 
            progress={currentResult.progress} 
            message={currentResult.progressMessage || 'Processing...'}
          />;
      }
      if (currentResult.status === Status.Error) {
        return (
          <div className="flex flex-col items-center gap-4 text-center w-full">
            <p className="text-brand-danger text-lg font-semibold">Transcription Failed</p>
            <div className="w-full p-3 bg-neutral-900 rounded-lg border border-neutral-700 text-left">
              <p className="text-neutral-300">
                <strong>Reason:</strong> {currentResult.transcriptionError || 'An unknown error occurred.'}
              </p>
            </div>
          </div>
        );
      }
      if (currentResult.status === Status.Success) {
        return <TranscriptionDisplay 
          result={currentResult}
          onSummarize={() => handleSummarize(currentResult.id)}
          onLegalAnalysis={() => handleLegalAnalysis(currentResult.id)}
          onUpdateTranscription={(newText) => handleUpdateTranscription(currentResult.id, newText)}
          onRefineSegment={(segment) => handleRefineSegment(currentResult.id, segment)}
          onCorrectTranscript={(corrections) => handleCorrectTranscript(currentResult.id, corrections)}
        />;
      }
    }

    // Initial State
    return (
        <>
            <div className="flex bg-neutral-900 p-1 rounded-full mb-8 border border-neutral-700">
                <button onClick={() => setMode('record')} className={`px-6 py-2 rounded-full transition-colors ${mode === 'record' ? 'bg-brand-primary text-white' : 'text-neutral-300 hover:bg-neutral-700'}`}>
                    Record Audio
                </button>
                <button onClick={() => setMode('upload')} className={`px-6 py-2 rounded-full transition-colors ${mode === 'upload' ? 'bg-brand-primary text-white' : 'text-neutral-300 hover:bg-neutral-700'}`}>
                    Upload File
                </button>
            </div>
            {globalError && <p className="text-brand-danger mb-4">{globalError}</p>}
            {mode === 'record' && (
                <div className="flex flex-col items-center justify-center gap-6">
                    <p className="text-lg text-neutral-300">
                      {isRecording 
                        ? <span className="text-brand-danger animate-pulse">Recording... {new Date(recordingTime * 1000).toISOString().substr(14, 5)}</span>
                        : 'Press the button to start recording'
                      }
                    </p>
                    <RecordButton
                        isRecording={isRecording}
                        onStart={startRecording}
                        onStop={stopRecording}
                    />
                    <p className="text-sm text-neutral-500 max-w-sm">Your audio is processed securely and is not stored after transcription.</p>
                </div>
            )}
            {mode === 'upload' && (
                <FileUpload onFileSelect={handleFileSelect} disabled={isRecording}/>
            )}
        </>
    );
}

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-900">
       <header className="flex-shrink-0 p-4 flex justify-between items-center border-b border-neutral-800">
          <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-100 tracking-tight">
                  Gemini Court Audio Transcriber
              </h1>
          </div>
          <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white transition-colors">
              <GithubIcon className="w-6 h-6" />
          </a>
      </header>
      <div className="flex flex-grow overflow-hidden">
        <HistoryPanel
          results={results}
          currentResultId={currentResultId}
          onSelectResult={setCurrentResultId}
          onNewTranscription={handleNewTranscription}
        />
        <main className="flex-grow flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="w-full max-w-2xl p-8 bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-700 min-h-[400px] flex flex-col justify-center items-center transition-all duration-300 text-center">
            {renderContent()}
          </div>
          <footer className="w-full text-center p-4 mt-4 flex-shrink-0">
            <p className="text-neutral-500 text-sm">Powered by Google Gemini</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default App;
