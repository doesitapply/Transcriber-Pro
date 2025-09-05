export enum Status {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

export enum RecordingState {
  Idle = 'idle',
  RequestingPermission = 'requesting_permission',
  Recording = 'recording',
  Stopped = 'stopped',
}

export interface TranscriptionResult {
  id: string;
  fileName: string;
  transcription: string;
  summary: string;
  legalAnalysis: string;
  status: Status;
  summaryStatus: Status;
  legalAnalysisStatus: Status;
  refinementStatus: Status;
  correctionStatus: Status;
  refiningSegment: string | null;
  progress: number;
  progressMessage?: string;
  audioSrc?: string;
  audioBlob?: Blob;
  summaryError?: string;
  legalAnalysisError?: string;
  refinementError?: string;
  transcriptionError?: string;
  correctionError?: string;
}
