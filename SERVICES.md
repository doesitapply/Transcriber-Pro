# Services Documentation

This document outlines the services used to interact with external APIs. The primary service in this application is `geminiService.ts`.

## `services/geminiService.ts`

This module encapsulates all communication with the Google Gemini API. It abstracts the complexities of API calls, data formatting, and error handling away from the main application logic in `App.tsx`.

### Initialization

The service initializes a `GoogleGenAI` client instance using the `API_KEY` from the environment variables. It will throw an error on startup if the key is not provided.

```typescript
const ai = new GoogleGenAI({ apiKey: API_KEY });
```

### Functions

#### `transcribeAudio(audioBlob: Blob, onProgress: (progress: number) => void): Promise<string>`

-   **Purpose**: Takes an audio blob, sends it to the Gemini API for transcription, and provides progress updates.
-   **Parameters**:
    -   `audioBlob: Blob`: The audio data to transcribe. This can be from a recording or a file upload.
    -   `onProgress: (progress: number) => void`: A callback function that is called periodically to update the UI on the transcription progress.
-   **Process**:
    1.  **Simulates Progress**: It uses `setInterval` to create a smoother, more realistic progress bar experience for the user, as the API call itself does not provide granular progress.
    2.  **Base64 Encoding**: It converts the `Blob` into a Base64-encoded string, which is required for the `inlineData` part of the API request.
    3.  **API Call**: It calls `ai.models.generateContent` with the `gemini-2.5-flash` model.
    4.  **Prompt Engineering**: The request includes a text part with a carefully crafted prompt that instructs the model to:
        -   Transcribe the audio.
        -   Identify and label different speakers (e.g., `**Speaker 1:**`).
        -   Handle video files by transcribing their audio track.
    5.  **Returns**: A `Promise` that resolves to the transcribed text as a string.
-   **Error Handling**: Catches errors from the API call, cleans up the progress interval, and re-throws a user-friendly error using the `handleApiError` utility.

---

#### `summarizeText(textToSummarize: string): Promise<string>`

-   **Purpose**: Sends a block of text to the Gemini API and requests a concise summary.
-   **Parameters**:
    -   `textToSummarize: string`: The transcription text that needs to be summarized.
-   **Process**:
    1.  **API Call**: It calls `ai.models.generateContent` with the `gemini-2.5-flash` model.
    2.  **Prompt Engineering**: The prompt explicitly asks the model to "provide a concise summary" of the provided text.
    3.  **Returns**: A `Promise` that resolves to the summary text as a string.
-   **Error Handling**: Uses `handleApiError` to process and re-throw any errors from the API.

---

#### `handleApiError(error: unknown, context: string): never`

-   **Purpose**: A private utility function to centralize API error handling.
-   **Process**:
    -   It logs the original error for debugging purposes.
    -   It checks for specific error messages, such as those related to safety settings, to provide more specific feedback to the user.
    -   It throws a new, cleaned-up `Error` object that can be safely displayed in the UI.
