# Realtime Speech to Text

## Overview

A modern, real-time speech-to-text transcription application powered by ElevenLabs Scribe v2. This application provides high-quality, low-latency voice transcription with a clean and intuitive user interface.

## Features

- Real-time speech-to-text transcription
- Built with ElevenLabs Scribe v2 for accurate transcription
- Modern, responsive UI with dark mode support
- Low-latency audio processing
- Clean and accessible interface using Radix UI components

## Tech Stack

- **Framework:** Next.js 16 (React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI primitives with shadcn/ui
- **Speech API:** ElevenLabs React SDK
- **Analytics:** Vercel Analytics
- **Deployment:** Vercel

## Prerequisites

- Node.js 18.x or higher
- pnpm (recommended) or npm
- ElevenLabs API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/realtime-speech-to-text.git
cd realtime-speech-to-text
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory and add your ElevenLabs API key:
```env
ELEVENLABS_API_KEY=your_api_key_here
```

## Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Build

To create a production build:

```bash
pnpm build
```

To run the production build locally:

```bash
pnpm start
```

## Linting

Run the linter:

```bash
pnpm lint
```

## Deployment

To deploy your own instance:

1. Push your code to a Git repository
2. Import the project to Vercel
3. Add your `ELEVENLABS_API_KEY` to the environment variables in Vercel
4. Deploy

## License

MIT