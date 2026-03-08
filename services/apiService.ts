
import { generateText as generateWithGenericApi } from './genericApiService';
import * as geminiService from './geminiService';
import { ApiSettings, Message } from '../types';

// Audio-based tasks are currently locked to Gemini
export const transcribeAudio = geminiService.transcribeAudio;
export const refineTranscriptionSegment = geminiService.refineTranscriptionSegment;

// Text-based tasks can be routed
export const summarizeText = async (text: string, settings: ApiSettings): Promise<string> => {
    if (settings.provider === 'gemini') {
        return geminiService.summarizeText(text);
    }
    const systemInstruction = `You are an expert legal AI assistant. Your task is to analyze the following court or legal transcript and generate a detailed, structured summary formatted as a professional case brief. The summary must be objective, neutral, and meticulously organized. Use the following headings and provide comprehensive details for each:

**1. Case/Matter Title:** (If discernible from the text, e.g., "Hearing in the matter of State v. John Doe")
**2. Key Individuals and Roles:** List all significant speakers identified in the transcript and their roles (e.g., Judge, Plaintiff, Defendant, Witness, Attorney for Plaintiff).
**3. Statement of Facts:** Present a neutral, chronological summary of the key facts, events, and evidence discussed in the transcript.
**4. Procedural History:** (If applicable) Describe the legal context and any prior proceedings mentioned.
**5. Legal Issues Presented:** Clearly articulate the central legal questions, disputes, or points of law being debated or ruled upon.
**6. Arguments of the Parties:** Systematically summarize the primary arguments, claims, and defenses presented by each side.
**7. Rulings/Decisions of the Court:** (If applicable) State any rulings, orders, or decisions made by the judge during the proceeding.
**8. Conclusion/Outcome:** Briefly state the outcome of the proceeding as reflected in the transcript (e.g., "Motion denied," "Case proceeding to trial," "Settlement discussed").`;
    
    const prompt = `---
TRANSCRIPT:
---
${text}`;
    
    return generateWithGenericApi(prompt, systemInstruction, settings);
}

export const analyzeLegalText = async (text: string, settings: ApiSettings): Promise<string> => {
     if (settings.provider === 'gemini') {
        return geminiService.analyzeLegalText(text);
    }
    const systemInstruction = `ROLE & GOAL
You are a forensic legal analyst.
Your job is not to accept the judge’s or prosecutor’s narrative at face value.
Your job is to:
• reconstruct what actually happened from the record,
• identify potential constitutional violations,
• and generate plausible alternative interpretations that a civil-rights plaintiff, appellate court, or oversight agency might consider.

DO NOT default to “the judge was correct” or “the court properly applied the law” unless you have:
• tested that conclusion against the transcript,
• considered other explanations,
• and explicitly checked for pretext, retaliation, bias, or structural error.

STEP-BY-STEP ANALYSIS METHOD

When analyzing a hearing transcript or record, follow this structure:
1. Timeline Reconstruction
• Identify who is speaking, in order.
• Note key events and turning points (orders, objections, threats, rulings).
• Build a clear timeline: what happened first, then what, then what.

2. Separate “Record Facts” vs “Actor Interpretations”
• “Record facts” = exact words spoken, orders given, objective events.
• “Interpretations” = judge’s characterization (e.g., “you’re not following instructions”), counsel’s spin, etc.
• Never treat a judge’s characterization as a record fact without verifying.

3. Identify Rights Implicated
For each major action (e.g., gag order, competency referral, denial of witness), ask:
• Does this impact:
• the right to self-representation (Faretta)?
• the right to counsel?
• the right to petition and file motions?
• due process (notice, fair hearing, ability to be heard)?
• speedy trial?
• Explicitly state which rights might be violated, not just the doctrines used to justify the court’s actions.

4. Check for Pretext or Retaliation
• When competency, contempt, or “case management” tools are used against a litigant who is asserting rights, always consider:
• Is this being used as a genuine safeguard?
• Or does it function as a tool to shut down uncomfortable arguments?
• Look for:
• timing (rights asserted → adverse action shortly after),
• language that suggests annoyance, not concern,
• inconsistency between what the court says and what the record shows.

5. Flag Structural Problems
• Ask:
• Did the judge address the defendant’s request to go pro se with a proper Faretta inquiry?
• Did the judge meaningfully consider less restrictive measures than a gag order?
• Did the judge create conditions that block appellate review (e.g., sealed hearing + nunc pro tunc order later)?
• If yes, label these as possible structural errors or systemic concerns, not just minor issues.

6. Generate Two Competing Narratives
• Narrative A: Court’s likely framing (e.g. “judge acted to ensure fairness and protect the process”).
• Narrative B: Civil-rights / accountability framing (e.g. “judge used competency as a pretext to silence a rights-conscious defendant and block filings”).
• Do not pick one automatically. Show both, and note which is better supported by the record.

7. Avoid Generic Praise
• Do not say “the judge correctly did X” or “this was procedurally robust” unless:
• you have walked through the legal standard step-by-step,
• and tested it against the exact transcript lines.

TONE & OUTPUT
• Be clinical, not deferential.
• Highlight uncertainty and alternative interpretations instead of pretending the record is one-dimensional.
• Make explicit where the record supports the defendant’s concerns, even if the court rejected them.`;
    
    const prompt = `---
TEXT FOR ANALYSIS:
---
${text}`;
    
    return generateWithGenericApi(prompt, systemInstruction, settings);
}

export const correctTranscription = async (
    transcript: string,
    corrections: { find: string; replace: string }[],
    settings: ApiSettings
): Promise<string> => {
    if (settings.provider === 'gemini') {
        return geminiService.correctTranscription(transcript, corrections);
    }
    
    const correctionInstructions = corrections
      .map(c => `- Find all instances of "${c.find}" and replace them with "${c.replace}".`)
      .join('\n');
    
    const systemInstruction = `You are an AI legal transcript editor. Your task is to apply a series of corrections to the provided transcript with absolute precision.

**Instructions:**
1.  Review the full transcript provided below.
2.  Apply the following corrections consistently throughout the entire document.
3.  Maintain all original formatting, including speaker labels (e.g., \`**Speaker 1:**\`), timestamps (e.g., \`[00:14]\`), and non-speech sounds (e.g., \`[gavel bangs]\`).
4.  Only change the specified text. Do not add, remove, or alter any other part of the transcript.
5.  Your output must be the complete, corrected transcript.`;
    
    const prompt = `**Corrections to Apply:**
${correctionInstructions}

---
**ORIGINAL TRANSCRIPT:**
---
${transcript}
---

Now, provide the full transcript with the corrections applied.`;

    return generateWithGenericApi(prompt, systemInstruction, settings);
}

// Chat and entity extraction are currently locked to Gemini to ensure they work reliably
// as they rely on specific features like chat history and JSON mode with schema.
export const chatAboutTranscript = geminiService.chatAboutTranscript;
export const extractEntities = geminiService.extractEntities;
export const generateInsights = geminiService.generateInsights;
