# Gemini Audio Transcriber

A modern, web-based audio transcription and analysis tool powered by the Google Gemini API. This application allows users to transcribe audio from live recordings or uploaded files, perform speaker diarization, generate concise summaries, and manage a session-based history of their transcriptions.

## Features

- **Live Audio Recording**: Transcribe audio directly from the user's microphone in real-time.
- **File Upload**: Supports transcription of various audio and video file formats.
- **Speaker Diarization**: Automatically identifies and labels different speakers in the transcript (e.g., "Speaker 1:", "Speaker 2:").
- **AI-Powered Summarization**: Generates a concise summary of the transcribed conversation on demand.
- **Session History**: All transcriptions are saved in a session panel, allowing users to revisit previous results.
- **Real-time Progress**: A visual progress bar provides feedback during the transcription process.
- **Downloadable Transcripts**: Users can download the final transcription as a `.txt` file.
- **Responsive Design**: A clean, modern, and fully responsive user interface built with Tailwind CSS.

## Tech Stack

- **Frontend**: React, TypeScript
- **AI Model**: Google Gemini API (`@google/genai`)
- **Styling**: Tailwind CSS
- **Module Loading**: ES Modules via esm.sh

## Getting Started

### Prerequisites

- A modern web browser with microphone access.
- A valid Google Gemini API Key.

### Installation & Setup

1.  **Clone the repository (or set up the files):**
    If this were a standard project, you would clone it. In this environment, ensure all the project files are in place.

2.  **API Key Configuration:**
    This application requires a Google Gemini API key to function. The key must be provided as an environment variable named `API_KEY`. The application is configured to read `process.env.API_KEY` directly.

    *   **Important**: The application code assumes `process.env.API_KEY` is already configured in the execution environment. There is no UI or client-side mechanism for setting the key.

3.  **Running the Application:**
    Serve the `index.html` file using a local web server. The application will mount and be ready to use.

## Project Structure

The project is organized into logical directories to maintain a clean and scalable codebase.

```
/
├── components/          # Reusable React components
│   ├── FileUpload.tsx
│   ├── HistoryPanel.tsx
│   ├── Icons.tsx
│   ├── Loader.tsx
│   ├── ProgressBar.tsx
│   ├── RecordButton.tsx
│   └── TranscriptionDisplay.tsx
├── hooks/               # Custom React hooks
│   └── useAudioRecorder.ts
├── services/            # Modules for external API interactions
│   └── geminiService.ts
├── App.tsx              # Main application component and state management
├── index.html           # The main HTML entry point
├── index.tsx            # React root renderer
├── metadata.json        # Application metadata (e.g., permissions)
├── types.ts             # Shared TypeScript types and enums
└── README.md            # This file
```

---

*Powered by Google Gemini*
