
import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordingState } from '../types';

export const useAudioRecorder = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.Idle);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    setRecordingState(RecordingState.RequestingPermission);
    setAudioBlob(null);
    setPermissionError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingState(RecordingState.Recording);

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setRecordingState(RecordingState.Stopped);
        stream.getTracks().forEach(track => track.stop()); // Stop microphone
      };

      mediaRecorder.start();
      
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
          setRecordingTime(prevTime => prevTime + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setPermissionError(true);
      setRecordingState(RecordingState.Idle);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if(timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    return () => {
        if(timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
    }
  }, []);

  return { recordingState, startRecording, stopRecording, audioBlob, recordingTime, permissionError };
};
