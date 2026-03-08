
import { GoogleGenAI, Type } from "@google/genai";
import { Message, NormalizedEntity, InsightData } from "../types";

// Fixed: Initializing GoogleGenAI directly with process.env.API_KEY as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const KNOWN_ENTITIES = [
    "Cameron Doyle Church",
    "Judge Barry L. Breslow",
    "Aziz Merchant",
    "Galen Carrico",
    "Sydney Hutt",
    "Cooper Brinson",
    "Verness",
    "DeGayner",
    "Mr. McGinnis",
    "Marilyn Church",
    "Zach Yerington",
    "Judge Walker"
];

const getMimeTypeFromFileName = (fileName: string): string | null => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: { [key: string]: string } = {
        'mp3': 'audio/mp3', 'wav': 'audio/wav', 'mp4': 'video/mp4', 'mov': 'video/mov',
        'webm': 'video/webm', 'm4a': 'audio/mp4', 'flac': 'audio/flac'
    };
    return mimeMap[extension || ''] || null;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else reject(new Error("File conversion failed"));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const transcribeAudio = async (
  mediaBlob: Blob,
  fileName: string,
  onProgress: (progress: { value: number; message: string }) => void
): Promise<string> => {
  try {
    onProgress({ value: 10, message: 'Encoding media file...' });
    const mediaData = await blobToBase64(mediaBlob);
    const mimeType = mediaBlob.type || getMimeTypeFromFileName(fileName) || 'audio/webm';
    
    onProgress({ value: 30, message: 'Uploading to Forensic Engine...' });

    // Fixed: Using ai.models.generateContent with model name and prompt directly.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: mediaData } },
          { text: `You are an evidence-grade forensic transcription analyst. Produce a verbatim record of this legal proceeding.
RULES:
1. Verbatim Accuracy: Every word, including filler words.
2. Timestamps: Insert [MM:SS] at the start of every speaker turn.
3. Diarization: identify speakers by role (Judge, Prosecution, Defense, Witness) or Name if known (${KNOWN_ENTITIES.join(', ')}).
4. No Hallucinations: Mark unclear parts as [INAUDIBLE @ timestamp].
5. Format labels as Markdown bold: **Judge:**.` }
        ]
      },
      config: { temperature: 0 }
    });
    
    return response.text || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    throw error;
  }
};

export const generateInsights = async (text: string): Promise<InsightData> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this court transcript and output structured JSON data for a legal dashboard.
Transcript:
${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          metrics: {
            type: Type.OBJECT,
            properties: {
              constitutionalRisk: { type: Type.NUMBER, description: 'Score 0-100' },
              proceduralIntegrity: { type: Type.NUMBER, description: 'Score 0-100' },
              tensionLevel: { type: Type.NUMBER, description: 'Score 0-100' }
            }
          },
          timeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timestamp: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['ruling', 'objection', 'argument', 'procedure'] }
              }
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
}

export const summarizeText = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are an evidence-grade audio transcription analyst. Produce a clean, court-ready record summary.
Instructions:
1. Executive Summary with timestamps.
2. Key Moments Timeline.
3. Decisions, Orders, and Rulings.
4. Copy/Paste Exhibit Blurb (Neutral Tone).
Transcript:
${text}`
  });
  return response.text || "";
}

export const analyzeLegalText = async (text: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `ROLE: Forensic Legal Analyst.
TASK: Reconstruct what actually happened. Identify potential constitutional violations, check for pretext or retaliation, and flag structural problems.
Narratives: Generate two competing narratives (Court's Likely Framing vs Accountability Framing).
Transcript:
${text}`
  });
  return response.text || "";
}

export const chatAboutTranscript = async (transcript: string, history: Message[]): Promise<string> => {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: { systemInstruction: "Answer questions based only on the content of the provided legal transcript." }
  });
  const response = await chat.sendMessage({ message: `Context:\n${transcript}\n\nUser Question: ${history[history.length - 1].text}` });
  return response.text || "";
}

export const extractEntities = async (text: string): Promise<NormalizedEntity[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            items: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    },
    contents: `Extract unique legal entities from this transcript: People, Organizations, Locations, Statutes/Rules, Exhibits.
Transcript:
${text}`
  });
  return JSON.parse(response.text || "[]");
}

export const correctTranscription = async (text: string, corrections: { find: string; replace: string }[]): Promise<string> => {
    const instr = corrections.map(c => `- Replace "${c.find}" with "${c.replace}"`).join('\n');
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Apply these text corrections to the transcript while maintaining all timestamps and formatting:
${instr}

Transcript:
${text}`
    });
    return response.text || text;
}

export const refineTranscriptionSegment = async (blob: Blob, name: string, segment: string, full: string): Promise<string> => {
    const data = await blobToBase64(blob);
    const mime = blob.type || getMimeTypeFromFileName(name) || 'audio/webm';
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            role: 'user',
            parts: [
                { inlineData: { mimeType: mime, data } },
                { text: `Refine this specific segment for verbatim accuracy.
Segment to Refine: "${segment}"
Full context: "${full}"` }
            ]
        }
    });
    return response.text || segment;
}
