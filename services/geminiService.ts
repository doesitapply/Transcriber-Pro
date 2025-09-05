import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // remove the data url prefix
      resolve(base64data.substring(base64data.indexOf(',') + 1));
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
};

const handleApiError = (error: unknown, context: string): never => {
    console.error(`Error during Gemini API call while ${context}:`, error);
    if (error instanceof Error) {
        if(error.message.includes('SAFETY')) {
            throw new Error(`The request was blocked due to safety settings. The provided content may not be appropriate.`);
        }
        throw new Error(error.message || `An unknown API error occurred while ${context}.`);
    }
    throw new Error(`An unexpected non-API error occurred during ${context}.`);
}

export const correctTranscription = async (
  originalTranscript: string,
  corrections: { find: string; replace: string }[]
): Promise<string> => {
  try {
    const correctionInstructions = corrections
      .map(c => `- Find all instances of "${c.find}" and replace them with "${c.replace}".`)
      .join('\n');

    const textPart = {
      text: `You are an AI legal transcript editor. Your task is to apply a series of corrections to the provided transcript with absolute precision.

**Instructions:**
1.  Review the full transcript provided below.
2.  Apply the following corrections consistently throughout the entire document.
3.  Maintain all original formatting, including speaker labels (e.g., \`**Speaker 1:**\`), timestamps (e.g., \`[00:14]\`), and non-speech sounds (e.g., \`[gavel bangs]\`).
4.  Only change the specified text. Do not add, remove, or alter any other part of the transcript.
5.  Your output must be the complete, corrected transcript.

**Corrections to Apply:**
${correctionInstructions}

---
**ORIGINAL TRANSCRIPT:**
---
${originalTranscript}
---

Now, provide the full transcript with the corrections applied.
`,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart] },
      config: {
        temperature: 0.0, // Set to 0 for maximum determinism and precision
      },
    });

    const correctedTranscript = response.text;
    if (!correctedTranscript) {
        throw new Error("The model did not return a corrected transcript.");
    }

    return correctedTranscript;
  } catch(error) {
    handleApiError(error, 'correcting transcript');
  }
};


export const refineTranscriptionSegment = async (
  audioBlob: Blob,
  segmentToRefine: string,
  fullTranscript: string
): Promise<string> => {
  try {
    const audioData = await blobToBase64(audioBlob);

    const audioPart = {
      inlineData: {
        mimeType: audioBlob.type,
        data: audioData,
      },
    };
    
    const textPart = {
      text: `You are an AI transcription refinement expert. Your task is to correct a specific segment of a transcript using the provided audio.
        
You will receive:
1. The full audio file.
2. The full existing transcript for context (speaker roles, topic, etc.).
3. The specific, potentially incorrect text segment that needs to be refined.

Your instructions are:
- Listen carefully to the part of the audio that corresponds to the provided text segment.
- Re-transcribe ONLY that segment with the highest possible accuracy.
- Maintain the original speaker labeling format if present (e.g., "**Speaker 1:**").
- Do not change any part of the transcript outside of the provided segment.
- Your output should be ONLY the corrected text for the segment, ready to replace the original segment.

---
FULL TRANSCRIPT CONTEXT:
---
${fullTranscript}
---
TEXT SEGMENT TO REFINE:
---
${segmentToRefine}
---

Now, analyze the audio and provide the corrected transcription for the segment above.`,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, audioPart] },
      config: {
        temperature: 0.1,
      },
    });

    const refinedSegment = response.text;
    if (!refinedSegment) {
        throw new Error("The model did not return a refined segment.");
    }

    return refinedSegment;
  } catch(error) {
    handleApiError(error, 'refining segment');
  }
}

export const transcribeAudio = async (
  audioBlob: Blob,
  onProgress: (progress: { value: number; message: string }) => void
): Promise<string> => {
  let progressInterval: number | null = null;
  try {
    onProgress({ value: 10, message: 'Encoding audio file...' });
    const audioData = await blobToBase64(audioBlob);
    
    onProgress({ value: 30, message: 'Uploading audio to Gemini...' });

    // Simulate progress for the API call duration, as it's a black box.
    let progress = 30;
    progressInterval = window.setInterval(() => {
        const increment = (95 - progress) / 20; // Slowly approach 95%
        progress += increment;
        if (progress <= 95) {
            onProgress({ value: progress, message: 'AI is processing the audio... please wait.' });
        } else {
            if (progressInterval) clearInterval(progressInterval);
        }
    }, 1000);

    const audioPart = {
      inlineData: {
        mimeType: audioBlob.type,
        data: audioData,
      },
    };

    const textPart = {
      text: `You are a world-class AI system specialized in verbatim legal and court transcription. Your task is to transcribe the provided audio with forensic-level accuracy. You must adhere to the following strict guidelines:

1.  **Strict Verbatim**: Transcribe every single utterance exactly as spoken. This includes all filler words ("um," "uh," "like," "you know"), false starts, stutters, and repetitions. Do NOT correct grammar, colloquialisms, or mispronunciations. The transcript must be a perfect mirror of the spoken audio.

2.  **Speaker Identification & Naming**:
    *   Actively listen for speakers identifying themselves or others by name (e.g., "My name is Jane Doe," "This is Attorney Smith," "Thank you, Mr. Johnson").
    *   If a speaker's name is identified, use that name consistently for all their subsequent lines (e.g., "**Jane Doe:**", "**Attorney Smith:**").
    *   If names are not available, clearly identify and label each new speaker on a new line using the format "**Speaker [Number]:**" (e.g., "**Speaker 1:**", "**Speaker 2:**").
    *   If you can confidently identify a speaker's role from context (e.g., "Judge", "Plaintiff's Attorney"), use that role consistently instead of a number, but prefer a real name if available.
    *   Maintain absolute consistency with speaker labels throughout the entire transcript.

3.  **Punctuation**: Use punctuation to reflect the speaker's natural cadence, pauses, and intonation.
    *   Use commas for short pauses.
    *   Use periods for sentence ends or longer pauses.
    *   Use ellipses (...) to indicate a speaker trailing off.
    *   Use question marks and exclamation points only when clearly warranted by the speaker's tone.

4.  **Non-Speech Sounds**: Note all significant non-speech sounds in brackets. Be precise.
    *   Examples: "[papers shuffling]", "[gavel bangs]", "[door closes]", "[witness crying]", "[phone rings]".
    *   Use "[crosstalk]" when multiple speakers talk over each other, making transcription impossible for that segment.
    *   Use "[inaudible]" for any word or phrase that is impossible to understand. Do not guess.
    *   Use "[mumbled]" for speech that is unclear but still discernible.

5.  **Timestamping**: Begin each speaker line or significant non-speech sound with a precise timestamp in [MM:SS] format (e.g., "[00:14] **Jane Doe:** ...", "[01:32] [gavel bangs]"). For longer audio, use [HH:MM:SS].

6.  **Legal & Technical Terms**: Pay extreme attention to legal terminology, case names, statutes, citations, and proper nouns. Spell them with the highest possible accuracy.

The integrity of legal proceedings depends on the precision of this transcript. There is no room for error, summarization, or paraphrasing. Provide only the verbatim transcript.`,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, audioPart] },
      config: {
        temperature: 0.1, // Lower temperature for more deterministic, factual output
      },
    });
    
    if (progressInterval) clearInterval(progressInterval);
    onProgress({ value: 98, message: 'Receiving transcription...' });

    const transcription = response.text;
    
    if (!transcription) {
        throw new Error("The model did not return a transcription. The audio may be silent or unclear.");
    }
    
    return transcription;
  } catch (error) {
    if (progressInterval) clearInterval(progressInterval);
    handleApiError(error, 'transcribing');
  }
};

export const summarizeText = async (textToSummarize: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert legal AI assistant. Your task is to analyze the following court or legal transcript and generate a detailed, structured summary formatted as a professional case brief. The summary must be objective, neutral, and meticulously organized. Use the following headings and provide comprehensive details for each:

**1. Case/Matter Title:** (If discernible from the text, e.g., "Hearing in the matter of State v. John Doe")
**2. Key Individuals and Roles:** List all significant speakers identified in the transcript and their roles (e.g., Judge, Plaintiff, Defendant, Witness, Attorney for Plaintiff).
**3. Statement of Facts:** Present a neutral, chronological summary of the key facts, events, and evidence discussed in the transcript.
**4. Procedural History:** (If applicable) Describe the legal context and any prior proceedings mentioned.
**5. Legal Issues Presented:** Clearly articulate the central legal questions, disputes, or points of law being debated or ruled upon.
**6. Arguments of the Parties:** Systematically summarize the primary arguments, claims, and defenses presented by each side.
**7. Rulings/Decisions of the Court:** (If applicable) State any rulings, orders, or decisions made by the judge during the proceeding.
**8. Conclusion/Outcome:** Briefly state the outcome of the proceeding as reflected in the transcript (e.g., "Motion denied," "Case proceeding to trial," "Settlement discussed").

---
TRANSCRIPT:
---
${textToSummarize}`
        });
        
        const summary = response.text;
        
        if (!summary) {
            throw new Error("The model did not return a summary.");
        }
        
        return summary;
    } catch (error) {
        handleApiError(error, 'summarizing');
    }
}

export const analyzeLegalText = async (textToAnalyze: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert AI legal analyst. Your task is to perform a rigorous analysis of the following legal transcript. Your response must be structured, thorough, and neutral. Use the following sections:

1.  **Primary Legal Issues**: Identify and articulate the core legal questions or principles at the heart of the discussion (e.g., "admissibility of hearsay evidence," "standard for summary judgment").

2.  **Summary of Competing Arguments**: Provide a balanced summary of the main arguments advanced by each party concerning the legal issues.

3.  **Relevant Legal Precedent**: Identify any statutes, case law, or significant legal precedents that are either explicitly mentioned or are directly relevant to the arguments. For each, briefly explain its relevance.

4.  **Analysis of Arguments**: Provide a neutral, objective analysis of the legal arguments presented. Evaluate their strengths and weaknesses based on established doctrine and precedent. Avoid taking a side.

**IMPORTANT DISCLAIMER**: This analysis is an AI-generated educational tool for informational purposes only and does not constitute legal advice. It is not a substitute for counsel from a qualified attorney licensed to practice in the relevant jurisdiction. Always consult with a qualified attorney for legal matters.

---
TEXT FOR ANALYSIS:
---
${textToAnalyze}`
        });

        const analysis = response.text;
        
        if (!analysis) {
            throw new Error("The model did not return a legal analysis.");
        }
        
        return analysis;
    } catch (error) {
        handleApiError(error, 'analyzing legal text');
    }
}
