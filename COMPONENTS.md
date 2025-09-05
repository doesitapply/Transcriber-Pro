# Component Documentation

This document provides a detailed breakdown of each React component in the application.

---

### `App.tsx`

-   **Purpose**: The root component of the application. It orchestrates all state management, handles user interactions, and conditionally renders child components based on the application's state.
-   **Props**: None.
-   **State Management**: Manages the `results` array, `currentResultId`, `mode`, and `globalError`. Contains all primary handler functions (`handleTranscription`, `handleSummarize`, `handleNewTranscription`).

---

### `HistoryPanel.tsx`

-   **Purpose**: Renders the left sidebar that displays the list of transcription results from the current session.
-   **Props**:
    | Prop | Type | Description |
    | :--- | :--- | :--- |
    | `results` | `TranscriptionResult[]` | The full array of transcription jobs. |
    | `currentResultId` | `string \| null` | The ID of the currently active result. |
    | `onSelectResult` | `(id: string) => void` | Callback function executed when a user clicks on a result in the history. |
    | `onNewTranscription`| `() => void` | Callback function executed when the "New Transcription" button is clicked. |

---

### `ProgressBar.tsx`

-   **Purpose**: Displays a visual progress bar and percentage, indicating the status of an in-progress transcription.
-   **Props**:
    | Prop | Type | Description |
    | :--- | :--- | :--- |
    | `progress` | `number` | A number between 0 and 100 representing the completion percentage. |

---

### `TranscriptionDisplay.tsx`

-   **Purpose**: Displays the results of a completed transcription, including the formatted text, action buttons (Copy, Download, Summarize), and the summary section.
-   **Props**:
    | Prop | Type | Description |
    | :--- | :--- | :--- |
    | `result` | `TranscriptionResult` | The complete result object to display. |
    | `onSummarize` | `() => void` | Callback function executed when the "Summarize" button is clicked. |

---

### `RecordButton.tsx`

-   **Purpose**: A stateful button for starting and stopping audio recording. It provides clear visual feedback with icons and animations.
-   **Props**:
    | Prop | Type | Description |
    | :--- | :--- | :--- |
    | `isRecording` | `boolean` | If `true`, the button is in its "stop" state. Otherwise, it's in its "start" state. |
    | `onStart` | `() => void` | Callback function executed when the user clicks to start recording. |
    | `onStop` | `() => void` | Callback function executed when the user clicks to stop recording. |

---

### `FileUpload.tsx`

-   **Purpose**: Provides a user interface for selecting a file via drag-and-drop or a standard file input dialog.
-   **Props**:
    | Prop | Type | Description |
    | :--- | :--- | :--- |
    | `onFileSelect` | `(file: File) => void` | Callback function executed when a user selects a file. |
    | `disabled` | `boolean` | Disables the component, typically during an active recording. |

---

### `Loader.tsx`

-   **Purpose**: A reusable loading spinner component with optional text.
-   **Props**:
    | Prop | Type | Description |
    | :--- | :--- | :--- |
    | `title` | `string` (optional) | The main text to display below the spinner (e.g., "Processing..."). |
    | `subtitle` | `string` (optional) | Smaller, secondary text to display. |

---

### `Icons.tsx`

-   **Purpose**: A collection of stateless functional components that render SVG icons used throughout the application. This centralizes icon definitions and makes them easy to reuse.
-   **Props**:
    | Prop | Type | Description |
    | :--- | :--- | :--- |
    | `className` | `string` (optional) | CSS classes to apply to the SVG element for styling (e.g., size, color). |
