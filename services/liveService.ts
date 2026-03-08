
import { GoogleGenAI, Blob, Modality } from "@google/genai";

// From Gemini docs: https://ai.google.dev/gemini-api/docs/live
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to the range of a 16-bit signed integer
    int16[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

let sessionPromise: Promise<any> | null = null;

export const startSession = (callbacks: {
    onMessage: (text: string, isFinal: boolean) => void;
    onError: (error: ErrorEvent) => void;
    onClose: (event: CloseEvent) => void;
}) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => {
                console.log('Live session opened.');
            },
            onmessage: (message: any) => {
                if (message.serverContent?.inputTranscription) {
                    const { text, isFinal } = message.serverContent.inputTranscription;
                    if (text) {
                        callbacks.onMessage(text, isFinal);
                    }
                }
            },
            onerror: (e) => {
                console.error('Live session error:', e);
                callbacks.onError(e);
                sessionPromise = null;
            },
            onclose: (e) => {
                console.log('Live session closed.');
                callbacks.onClose(e);
                sessionPromise = null;
            },
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
        },
    });
    return sessionPromise;
};

export const sendAudio = (audioData: Float32Array) => {
    if (!sessionPromise) {
        return;
    }
    const pcmBlob = createBlob(audioData);
    // CRITICAL: Must use the sessionPromise to avoid race conditions
    sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
    }).catch(err => {
        console.error("Failed to send audio, session might have closed.", err);
    });
};

export const sendVideoFrame = (base64Data: string) => {
    if (!sessionPromise) {
        return;
    }
    sessionPromise.then((session) => {
        session.sendRealtimeInput({ 
            media: { 
                data: base64Data, 
                mimeType: 'image/jpeg' 
            } 
        });
    }).catch(err => {
        console.error("Failed to send video frame.", err);
    });
};

export const closeSession = () => {
    if (sessionPromise) {
        sessionPromise.then(session => {
            session.close();
        }).catch(err => {
            console.error("Error closing session:", err);
        });
        sessionPromise = null;
    }
};
