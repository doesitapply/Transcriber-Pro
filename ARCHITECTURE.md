# Application Architecture

This document provides a deep dive into the technical architecture of the Gemini Audio Transcriber application.

## Core Philosophy

The application is designed as a single-page application (SPA) using React. The architecture prioritizes a centralized state management model within the main `App` component, ensuring a unidirectional data flow and making the application state predictable and easier to debug.

## State Management

The primary state is managed within the `App.tsx` component using React hooks (`useState`, `useMemo`, `useCallback`).

### Central State: `results`

The most critical piece of state is the `results` array:
`const [results, setResults] = useState<TranscriptionResult[]>([]);`

- This array holds the state for every transcription job initiated by the user during their session.
- Each object in the array adheres to the `TranscriptionResult` interface (defined in `types.ts`), which includes:
  - `id`: A unique identifier for the job.
  - `fileName`: The source of the audio (e.g., "Recording - 2023-10-27" or "uploaded-file.mp4").
  - `transcription`: The transcribed text.
  - `summary`: The generated summary text.
  - `status`: The current state of the transcription job (`idle`, `loading`, `success`, `error`).
  - `summaryStatus`: The state of the summarization job.
  - `progress`: A number from 0 to 100 representing the transcription progress.

### UI State

- `currentResultId`: A string that tracks which result from the `results` array is currently being viewed by the user. When `null`, the initial "start" screen is shown.
- `mode`: Toggles between `'record'` and `'upload'` on the start screen.
- `globalError`: Stores top-level errors, such as microphone permission denial.

## Data Flow

The application follows a strict unidirectional data flow, which makes it robust and predictable.

### Transcription Data Flow

1.  **User Action**: The user either clicks "Stop Recording" or uploads a file.
2.  **`App.tsx` Handler**: The `handleTranscription` function is called with the audio data (`Blob`).
3.  **State Update (Initial)**:
    - A new `TranscriptionResult` object is created with `status: Status.Loading` and `progress: 0`.
    - This new object is prepended to the `results` array.
    - `currentResultId` is set to the ID of the new result.
    - The UI re-renders to show the `<ProgressBar />`.
4.  **Service Call**: `handleTranscription` calls `transcribeAudio` from `geminiService.ts`, passing the audio blob and an `onProgress` callback.
5.  **`geminiService.ts`**:
    - The service simulates progress by calling the `onProgress` callback periodically.
    - It encodes the audio blob to a Base64 string.
    - It sends the data and a specialized prompt (requesting transcription and speaker diarization) to the Gemini API.
6.  **State Update (Progress)**: The `onProgress` callback in `App.tsx` calls `updateResult` to update the `progress` property for the current job, causing the `<ProgressBar />` to update.
7.  **API Response**: The `geminiService` receives the transcribed text from the API.
8.  **State Update (Final)**:
    - `handleTranscription` receives the text.
    - It calls `updateResult` to set `status: Status.Success`, `progress: 100`, and populate the `transcription` field.
    - If an error occurs, the `status` is set to `Status.Error` and the error message is stored in the `transcription` field.
9.  **UI Re-render**: The UI displays the `<TranscriptionDisplay />` component with the final result.

### Summarization Data Flow

This flow is simpler and occurs after a transcription is complete.

1.  **User Action**: User clicks the "Summarize" button in `<TranscriptionDisplay />`.
2.  **`App.tsx` Handler**: The `handleSummarize` function is called with the `resultId`.
3.  **State Update (Initial)**: `updateResult` is called to set `summaryStatus: Status.Loading` for the relevant result. The UI re-renders to show a loader in the summary section.
4.  **Service Call**: `summarizeText` from `geminiService.ts` is called with the transcription text.
5.  **API Response**: The service receives the summary.
6.  **State Update (Final)**: `updateResult` is called to set `summaryStatus: Status.Success` and populate the `summary` field.
7.  **UI Re-render**: The summary is displayed.

## Component Hierarchy

```
<App>
├── <header>
│   └── <GithubIcon />
├── <HistoryPanel>
│   ├── <PlusIcon />
│   └── (List of results) -> <MicIcon />, <FileIcon />
└── <main>
    └── (Conditional Rendering)
        ├── Initial View
        │   ├── <RecordButton>
        │   │   └── <MicIcon />, <StopIcon />
        │   └── <FileUpload>
        │       └── <UploadIcon />
        ├── <ProgressBar />
        └── <TranscriptionDisplay>
            ├── <CopyIcon />, <CheckIcon />
            ├── <DownloadIcon />
            ├── <SparklesIcon />
            └── (Summary Section) -> <Loader />
```

## External Services

- **`@google/genai`**: The official library for interacting with the Google Gemini API. All API calls are encapsulated within `services/geminiService.ts`.
- **`navigator.mediaDevices.getUserMedia`**: A browser Web API used in the `useAudioRecorder` hook to access the microphone.
