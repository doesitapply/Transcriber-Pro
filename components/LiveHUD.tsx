
import React, { useRef, useEffect } from 'react';
import { LiveRecordingState, TrackedKeywordHit, CaseMention } from '../types';
import { LiveTranscriptionDisplay } from './LiveTranscriptionDisplay';
import { LiveIntelligencePanel } from './LiveIntelligencePanel';
import { AudioVisualizer } from './AudioVisualizer';
import { StopIcon } from './Icons';

interface LiveHUDProps {
  transcript: string;
  time: number;
  state: LiveRecordingState;
  keywordHits: TrackedKeywordHit[];
  caseMentions: CaseMention[];
  onStop: () => void;
  mediaStream?: MediaStream | null;
}

export const LiveHUD: React.FC<LiveHUDProps> = ({ transcript, time, state, keywordHits, caseMentions, onStop, mediaStream }) => {
  const formattedTime = new Date(time * 1000).toISOString().substr(14, 5);
  const bottomRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

    // Auto-scroll to bottom of page during live session
  useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const getStatusText = () => {
    switch (state) {
      case 'connecting': return 'CONNECTING...';
      case 'requesting_permission': return 'Awaiting Mic/Cam Permission...';
      case 'live': return 'LIVE RECORDING';
      default: return 'STANDBY';
    }
  };

  return (
    <div className="w-full h-full max-w-7xl flex flex-col items-center gap-6 animate-fade-in text-left">
      {/* HUD Header */}
      <div className="w-full flex flex-wrap justify-between items-center p-4 bg-neutral-900/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-black/30 rounded-full border border-white/5">
            <div className="relative w-3 h-3">
              <div className={`absolute inset-0 rounded-full ${state === 'live' ? 'bg-red-500 animate-ping' : 'bg-neutral-500'}`}></div>
              <div className={`relative w-3 h-3 ${state === 'live' ? 'bg-red-500' : 'bg-neutral-500'} rounded-full`}></div>
            </div>
            <span className={`font-bold tracking-wider text-sm ${state === 'live' ? 'text-red-400' : 'text-neutral-400'}`}>
              {getStatusText()}
            </span>
          </div>
          <span className="text-white font-mono text-2xl font-light tracking-widest">{formattedTime}</span>
        </div>
        
        {/* Visualizer and Video Preview in Header */}
        <div className="flex items-center gap-4">
            <div className="hidden md:block w-48 h-12">
                <AudioVisualizer stream={mediaStream || null} isRecording={state === 'live'} />
            </div>
            {mediaStream && state === 'live' && (
                <div className="w-20 h-12 rounded-lg overflow-hidden border border-white/10 bg-black">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover mirror"
                    />
                </div>
            )}
        </div>

        <button
            onClick={onStop}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 font-semibold rounded-lg hover:bg-red-500 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
        >
            <StopIcon className="w-5 h-5"/>
            End Session
        </button>
      </div>

      {/* HUD Body */}
      <div className="w-full flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-hidden">
        <div className="lg:col-span-2 flex flex-col min-h-[400px] lg:min-h-0 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-900/50 pointer-events-none z-10 rounded-2xl"></div>
            <LiveTranscriptionDisplay transcript={transcript} />
        </div>
        <div className="lg:col-span-1 min-h-[300px] lg:min-h-0 flex flex-col gap-6">
          {/* Main Video Feed for Live Session */}
          {mediaStream && state === 'live' && (
              <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl relative group">
                  <video 
                      ref={videoRef} 
                      autoPlay 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover mirror"
                  />
                  <div className="absolute top-4 left-4 px-2 py-1 bg-red-500 text-[10px] font-bold text-white rounded uppercase tracking-widest animate-pulse">
                      Live Feed
                  </div>
              </div>
          )}
          <LiveIntelligencePanel
            keywordHits={keywordHits}
            caseMentions={caseMentions}
          />
        </div>
      </div>
      <div ref={bottomRef} />
      <style>{`
          .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  );
};
