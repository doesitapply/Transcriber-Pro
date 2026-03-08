
export enum Status {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

export enum AppState {
  Idle = 'idle',
  Setup = 'setup',
  Live = 'live',
  Analysis = 'analysis',
}

export enum LiveRecordingState {
  Idle = 'idle',
  RequestingPermission = 'requesting_permission',
  Connecting = 'connecting',
  Live = 'live',
  Stopped = 'stopped',
  Error = 'error',
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface NormalizedEntity {
    category: string;
    items: string[];
}

export interface TrackedKeywordHit {
  keyword: string;
  timestamp: number;
}

export interface CaseMention {
  citation: string;
  timestamp: number;
}

export interface InsightData {
  metrics: {
    constitutionalRisk: number;
    proceduralIntegrity: number;
    tensionLevel: number;
  };
  timeline: {
    timestamp: string;
    description: string;
    type: 'ruling' | 'objection' | 'argument' | 'procedure';
  }[];
}

export type ApiProvider = 'gemini' | 'groq' | 'local';

export interface ApiSettings {
  provider: ApiProvider;
  groqApiKey?: string;
  localUrl?: string;
}

export interface TranscriptionResult {
  id: string;
  fileName: string;
  transcription: string;
  summary: string;
  legalAnalysis: string;
  entities: NormalizedEntity[];
  chatHistory: Message[];
  keywords: string[];
  keywordHits: TrackedKeywordHit[];
  caseMentions: CaseMention[];
  insights?: InsightData;
  status: Status;
  summaryStatus: Status;
  legalAnalysisStatus: Status;
  refinementStatus: Status;
  correctionStatus: Status;
  chatStatus: Status;
  entityStatus: Status;
  insightStatus: Status;
  refiningSegment: string | null;
  progress: number;
  progressMessage?: string;
  mediaSrc?: string;
  mediaBlob?: Blob;
  mediaType?: string;
  summaryError?: string;
  legalAnalysisError?: string;
  refinementError?: string;
  transcriptionError?: string;
  correctionError?: string;
  chatError?: string;
  entityError?: string;
  insightError?: string;
}

export interface LegalEntityProfile {
  id: string;
  name: string;
  role: string;
  notes: string;
  behaviorPatterns: string[];
}

export interface IntelligenceMemory {
  entities: Record<string, LegalEntityProfile>;
}
