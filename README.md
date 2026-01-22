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
# Start the app locally (REQUIRED - includes Netlify Functions)
npm run dev:netlify

# The app will be available at http://localhost:3000
# This command starts both Vite (frontend) and Netlify Functions (backend)

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
# Upstash Redis (session storage) - Get from https://upstash.com
UPSTASH_REDIS_REST_URL=https://[project].upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

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

## Service Limits & Scaling

This MVP uses **free/freemium tiers** designed for small teams. Here are the limits and what to do when you outgrow them:

### Upstash Redis (Session Storage)

**Free Tier:**
- 10,000 requests/day
- 256 MB storage
- 1 database

**Typical Usage:**
- 7-person team, 1 standup/day: ~16 requests ✅
- 50-person team, 2 standups/day: ~320 requests ✅
- 200-person team, 5 standups/day: ~3,200 requests ✅

**When to Upgrade:**
- If exceeding 10,000 requests/day consistently
- Paid tier: $0.2/request (auto-scales with usage)
- Pro tier starts at $48/month with guaranteed capacity

**How to Monitor:**
1. Check Upstash dashboard for request counts
2. Set up alerts in Netlify logs for Redis errors
3. If seeing 429 errors → Time to upgrade

### Pusher Channels (Real-time Sync)

**Free Tier:**
- 100 concurrent connections
- 200,000 messages/day

**Typical Usage:**
- 7-person team: 7 connections, ~500 messages/day ✅
- 50-person team: 50 connections, ~3,000 messages/day ✅
- 100-person team: 100 connections, ~6,000 messages/day ✅

**When to Upgrade:**
- If exceeding 100 concurrent users
- Paid tier starts at $49/month

### Portkey API (AI Services)

**Free Tier:**
- No limit, pay-as-you-go model
- Whisper: $0.02 per minute of audio
- Claude: Usage-based pricing

**Typical Cost:**
- 7-person standup, 2 min each: ~$0.30/day
- Per month: ~$6 (assuming 20 working days)

**When to Optimize:**
- If costs exceed $50/month, consider:
  - Caching summaries for similar transcripts
  - Batching multiple transcriptions
  - Using Claude's cheaper models for summaries

### SendGrid (Email Delivery)

**Free Tier:**
- 100 emails/day

**Typical Usage:**
- 7-person team, 1 summary/day: 1 email ✅
- 50-person team, 2 standups/day: 2 emails ✅
- 100-person team, 5 standups/day: 5 emails ✅

**When to Upgrade:**
- If exceeding 100 emails/day
- Paid tier: $9.95-99.95/month depending on plan

### Total Monthly Cost (MVP)

| Scale | Upstash | Pusher | Portkey | SendGrid | Total |
|-------|---------|--------|---------|----------|-------|
| 7-person, 1 standup | $0 | $0 | $6 | $0 | **$6/mo** |
| 50-person, 2 standups | $0 | $0 | $48 | $0 | **$48/mo** |
| 100-person, 5 standups | $0 | $0 | $150 | $9.95 | **$160/mo** |
| 200-person, 10 standups | $10+ | $49 | $300+ | $59.95 | **$420+/mo** |

**Note:** Costs will increase significantly beyond free tiers. Consider these expenses when planning to scale.

## Troubleshooting

### Blank Page on `http://localhost:3000`
- **Problem**: Browser shows blank page or "Failed to load module script" error
- **Solution**: Make sure you're using `npm run dev:netlify` (not `npm run dev`)
- **Why**: The app requires Netlify Functions for session management

### Port Already in Use
- **Problem**: "Port 3000 is already in use"
- **Solution**:
  ```bash
  # Find process using port 3000
  lsof -i :3000

  # Kill the process
  kill -9 <PID>
  ```

### Netlify Functions Not Loading
- **Problem**: API calls return 404 or 502 errors
- **Solution**:
  1. Check that `.env` file exists with all required variables
  2. Restart the dev server: `npm run dev:netlify`
  3. Check Netlify dev logs for function compilation errors

### Pusher Connection Failed
- **Problem**: Real-time sync not working
- **Solution**: Verify `VITE_PUSHER_APP_KEY` and `VITE_PUSHER_CLUSTER` in `.env`

## Documentation

- [CLAUDE.md](CLAUDE.md) - Technical specifications
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Detailed implementation plan with checklist
- [SERVICE_SETUP.md](SERVICE_SETUP.md) - Guide for setting up third-party services