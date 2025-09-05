# Contributing to Gemini Audio Transcriber

We welcome contributions to improve this project. Please follow these guidelines to ensure a smooth and effective development process.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

1.  **Reporting Bugs**: If you find a bug, please create an issue in the project's issue tracker. Describe the bug in detail, including steps to reproduce it, the expected behavior, and the actual behavior.

2.  **Suggesting Enhancements**: If you have an idea for a new feature or an improvement to an existing one, please create an issue to discuss it. This allows us to align on the proposal before you invest time in development.

3.  **Pull Requests**:
    -   Ensure your code adheres to the existing code style.
    -   Write clear, concise, and descriptive commit messages.
    -   Update the documentation (`README.md`, `ARCHITECTURE.md`, etc.) if your changes affect the project's structure, components, or setup.
    -   Make sure your PR is focused on a single issue or feature. Do not mix unrelated changes.

## Development Guidelines

### Code Style

-   **TypeScript**: We use TypeScript for static typing. Please ensure your code is fully typed.
-   **React**: We use functional components with React Hooks.
-   **Formatting**: We encourage using a code formatter like Prettier to maintain a consistent code style.
-   **Naming Conventions**:
    -   Components: `PascalCase` (e.g., `HistoryPanel.tsx`)
    -   Variables/Functions: `camelCase` (e.g., `handleSummarize`)
    -   Types/Interfaces: `PascalCase` (e.g., `TranscriptionResult`)

### Component Design

-   **Keep components small and focused.** Each component should have a single responsibility.
-   **Prefer composition over inheritance.**
-   **Separate stateful logic from presentational components.** Use custom hooks (`hooks/`) for complex logic and services (`services/`) for API interactions.

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This makes the commit history easier to read and helps with automated changelog generation.

**Examples:**

-   `feat: Add summarization feature`
-   `fix: Correctly handle microphone permission errors`
-   `docs: Update component documentation for HistoryPanel`
-   `refactor: Centralize API error handling in geminiService`
-   `style: Adjust padding on the main content area`

Thank you for your contributions!
