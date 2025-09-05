# Custom Hooks Documentation

This document covers the custom React hooks created for the application.

## `hooks/useAudioRecorder.ts`

This hook encapsulates all the logic and state related to recording audio from the user's microphone using the browser's Web APIs. By abstracting this functionality, we keep the main `App.tsx` component cleaner and focused on application-level state.

### Purpose

-   Manage microphone permission requests.
-   Handle the starting and stopping of audio recording.
-   Track the recording state (`idle`, `recording`, etc.).
-   Measure and provide the elapsed recording time.
-   Capture the recorded audio data and provide it as a `Blob`.
-   Report permission errors.

### Return Value

The `useAudioRecorder` hook returns an object with the following properties:

| Key | Type | Description |
| :--- | :--- | :--- |
| `recordingState` | `RecordingState` | The current state of the recorder. Enum values: `idle`, `requesting_permission`, `recording`, `stopped`. |
| `startRecording` | `() => Promise<void>` | An async function to request microphone permission and start recording. It updates the `recordingState` accordingly. |
| `stopRecording` | `() => void` | A function that stops the current recording, finalizes the audio data, and updates the state. |
| `audioBlob` | `Blob \| null` | When a recording is stopped, this state holds the resulting audio data as a `Blob` object (in `audio/webm` format). It is `null` otherwise. |
| `recordingTime`| `number` | The duration of the current recording in seconds. Updates every second while recording. |
| `permissionError`| `boolean` | A flag that is set to `true` if the user denies microphone permission. |

### Usage Example

In `App.tsx`:

```typescript
import { useAudioRecorder } from './hooks/useAudioRecorder';

const App = () => {
  const {
    recordingState,
    startRecording,
    stopRecording,
    audioBlob,
    recordingTime,
    permissionError
  } = useAudioRecorder();

  // When audioBlob is updated via useEffect, trigger transcription
  useEffect(() => {
    if (audioBlob) {
      handleTranscription(audioBlob, `Recording - ${new Date().toLocaleString()}`);
    }
  }, [audioBlob]);

  // Handle permission errors
  useEffect(() => {
    if(permissionError) {
        setGlobalError('Microphone permission was denied.');
    }
  }, [permissionError]);

  //... render RecordButton with isRecording, onStart, onStop etc.
};
```

### Implementation Details

-   **`MediaRecorder` API**: The hook uses the standard `MediaRecorder` Web API to handle the recording process.
-   **State Management**: It uses `useState` and `useRef` internally to manage its state, the `MediaRecorder` instance, audio chunks, and the timer interval.
-   **Cleanup**: A `useEffect` hook with a cleanup function is used to ensure that the timer interval is cleared when the component unmounts, preventing memory leaks.
