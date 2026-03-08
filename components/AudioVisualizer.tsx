
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current || !isRecording) return;

    // Initialize Audio Context and Analyser
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    analyserRef.current = ctx.createAnalyser();
    analyserRef.current.fftSize = 256;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Create source from stream
    sourceRef.current = ctx.createMediaStreamSource(stream);
    sourceRef.current.connect(analyserRef.current);

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const draw = () => {
      if (!analyserRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.5; // Scale down slightly

        // Gradient color based on frequency/height
        const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#4F46E5'); // Indigo
        gradient.addColorStop(0.5, '#10B981'); // Emerald
        gradient.addColorStop(1, '#F59E0B'); // Amber

        canvasCtx.fillStyle = gradient;
        
        // Rounded caps for bars
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, 5);
        canvasCtx.fill();

        x += barWidth + 2;
      }
    };

    draw();

    return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (sourceRef.current) sourceRef.current.disconnect();
        // Do not close AudioContext here as it might be expensive to recreate rapidly, 
        // or close it if we want full cleanup.
    };
  }, [stream, isRecording]);

  return (
    <canvas 
        ref={canvasRef} 
        width={300} 
        height={100} 
        className="w-full h-24 rounded-lg bg-black/20 backdrop-blur-sm"
    />
  );
};
