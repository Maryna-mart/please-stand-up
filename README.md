# AI-Powered Standup Assistant

A smart web application designed for remote teams to conduct efficient daily standup meetings with synchronized timers, AI-powered transcription, and automated summaries.

## What It Does

- **Synchronized Timer**: Keep everyone on track during standup meetings
- **AI Transcription**: Automatic speech-to-text (English & German supported)
- **Smart Summaries**: AI-generated summaries with yesterday's work, today's plans, and blockers
- **Email Delivery**: Automated summary distribution to your team
- **Privacy-Focused**: No data storage, session-based memory, optional password protection

## Tech Stack

- Vue 3 + TypeScript + Vite + Tailwind CSS
- Netlify (hosting + serverless functions)
- Portkey API (Whisper + Claude AI)
- Pusher Channels (real-time sync)
- SendGrid (email delivery)

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env

# Add your API keys to .env (see Environment Variables section below)
```

### Development

```bash
# Start Vite dev server
npm run dev

# Start Netlify dev server (with serverless functions)
npm run dev:netlify

# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Build & Deploy

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Git Hooks (Automatic)

Git hooks are automatically configured via Husky:

**Pre-commit** (runs before each commit):
- Blocks `.env` file from being committed (security protection)
- Auto-fixes linting issues
- Auto-formats code with Prettier

**Pre-push** (runs before each push):
- Runs all tests to ensure code quality

## Environment Variables

**For local development:**
1. Copy the template: `cp .env.example .env`
2. Get API keys from your team lead
3. Fill in your local `.env` file with the provided keys
4. **Never commit `.env` to git** (it's already in `.gitignore`)

**Required variables:**

```bash
# Pusher (real-time sync) - Get from https://pusher.com
VITE_PUSHER_APP_KEY=your_pusher_key
VITE_PUSHER_CLUSTER=us2
PUSHER_APP_ID=your_pusher_app_id
PUSHER_SECRET=your_pusher_secret

# Portkey (AI transcription & summarization) - Get from https://portkey.ai
PORTKEY_API_KEY=your_portkey_key

# SendGrid (email delivery) - Get from https://sendgrid.com
SENDGRID_API_KEY=your_sendgrid_key

# Session security (generate random string)
SESSION_SECRET=your_random_32_char_secret
```


## Project Structure

```
please-stand-up/
├── src/
│   ├── components/      # Vue components
│   ├── composables/     # Vue composables
│   ├── lib/             # Utility libraries
│   ├── router/          # Vue Router config
│   ├── types/           # TypeScript types
│   ├── views/           # Page components
│   └── __tests__/       # Unit & integration tests
├── netlify/functions/   # Serverless functions
├── e2e/                 # E2E tests
└── IMPLEMENTATION.md    # Detailed implementation plan
```

## Documentation

- [CLAUDE.md](CLAUDE.md) - Technical specifications
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Detailed implementation plan with checklist