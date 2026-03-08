
import { useState, useRef, useCallback, useEffect } from 'react';
import { LiveRecordingState } from '../types';
import * as liveService from '../services/liveService';

export const useLiveRecorder = () => {
  const [liveState, setLiveState] = useState<LiveRecordingState>(LiveRecordingState.Idle);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const transcriptPartsRef = useRef<string[]>([]);
  const currentUtteranceRef = useRef<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanup = useCallback(() => {
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }
    if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
    }
    liveService.closeSession();
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setMediaStream(null);
    }
  }, []);

  const startRecording = useCallback(async () => {
    cleanup();
    setLiveState(LiveRecordingState.RequestingPermission);
    setLiveTranscript('');
    setFinalTranscript('');
    setRecordedBlob(null);
    transcriptPartsRef.current = [];
    currentUtteranceRef.current = '';
    chunksRef.current = [];
    setPermissionError(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: { width: 640, height: 480, frameRate: 15 } 
      });
      streamRef.current = stream;
      setMediaStream(stream);
      setLiveState(LiveRecordingState.Connecting);

      // Setup MediaRecorder for saving the session
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          setRecordedBlob(blob);
      };
      mediaRecorder.start();

      // Setup video frame capture for AI
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.play();

      if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      videoIntervalRef.current = window.setInterval(() => {
          if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
              canvas.width = 320; // Downscale for API
              canvas.height = 240;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
              liveService.sendVideoFrame(base64);
          }
      }, 1000); // Send 1 frame per second

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        liveService.sendAudio(inputData);
      };

      sourceRef.current.connect(processorRef.current);

      await liveService.startSession({
        onMessage: (text, isFinal) => {
            if (isFinal) {
                // A final part (utterance) arrives. Append it to our stable list and clear the current utterance ref.
                transcriptPartsRef.current.push(text);
                currentUtteranceRef.current = '';
                setLiveTranscript(transcriptPartsRef.current.join(' '));
            } else {
                // A non-final, partial result for the current utterance.
                currentUtteranceRef.current = text;
                const stableTranscript = transcriptPartsRef.current.join(' ');
                setLiveTranscript(stableTranscript ? stableTranscript + ' ' + currentUtteranceRef.current : currentUtteranceRef.current);
            }
        },
        onError: (e) => {
            setLiveState(LiveRecordingState.Error);
            setPermissionError(true);
            cleanup();
        },
        onClose: (e) => {
            // Handle unexpected close
        }
      });
      
      setLiveState(LiveRecordingState.Live);

      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);

    } catch (err) {
      console.error("Error starting live recording:", err);
      setPermissionError(true);
      setLiveState(LiveRecordingState.Error);
      cleanup();
    }
  }, [cleanup]);

  const stopRecording = useCallback(async (): Promise<string> => {
    if (liveState !== LiveRecordingState.Live && liveState !== LiveRecordingState.Connecting) {
        cleanup();
        setLiveState(LiveRecordingState.Stopped);
        return '';
    }
    
    // If the recording is stopped mid-utterance, add the last partial result.
    if (currentUtteranceRef.current) {
        transcriptPartsRef.current.push(currentUtteranceRef.current);
        currentUtteranceRef.current = '';
    }
    
    const final = transcriptPartsRef.current.join(' ');
    setLiveTranscript(final);
    setFinalTranscript(final);
    
    // Stop media recorder and wait for the blob
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
    }

    cleanup();
    setLiveState(LiveRecordingState.Stopped);
    return final;
  }, [liveState, cleanup]);
  
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { 
    liveState, 
    startRecording, 
    stopRecording, 
    liveTranscript, 
    finalTranscript,
    recordingTime, 
    permissionError,
    mediaStream,
    recordedBlob 
  };
};
