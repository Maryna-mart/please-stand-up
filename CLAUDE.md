# AI-Powered Standup Assistant

## Core Concept
Web app for 7-10 person remote teams: synchronized timer + AI transcription (Whisper) + AI summary (Claude) via Portkey → email delivery.

**Language Support**: 
- UI: Always English
- Audio/Transcripts: English or German (auto-detected)
- Summary: Same language as spoken (if German spoken → German summary)

## Tech Stack
- **Frontend**: Vue 3 + TypeScript + Vite + Tailwind CSS
- **Hosting**: Netlify (FREE)
- **Real-time**: Pusher Channels (FREE tier - 100 concurrent, 200K msgs/day)
- **AI**: Portkey API - Whisper (transcription) + Claude (summarization)
- **Email**: SendGrid (FREE - 100/day)
- **Cost**: ~$10/month (Portkey only)

## Architecture
**Netlify Functions** (serverless):
- `/netlify/functions/transcribe` - Audio → Portkey Whisper
- `/netlify/functions/summarize` - Transcripts → Portkey Claude
- `/netlify/functions/send-summary` - SendGrid email delivery

## Security (NDA-Safe)
- ✅ Cryptographically random session IDs
- ✅ Optional password protection
- ✅ No persistent storage (session memory only)
- ✅ HTTPS only
- ✅ API keys in Netlify env vars (never exposed to browser)
- ⚠️ Warning: Audio sent to Portkey/OpenAI (their privacy policy applies)

## Data Flow
1. Leader creates session → shares URL
2. Team joins via link
3. Each person: Start timer → Record audio → Auto-transcribe
4. All done → Claude generates summary (yesterday/today/blockers)
5. Send via email to team

## Real-time Sync (Pusher Events)
- `timer-started` / `timer-stopped`
- `transcript-ready`
- `summary-generated`
- `user-joined` / `user-left`

## File Structure
```
standup-timer/
├── .env                    # API keys (gitignored)
├── netlify.toml            # Netlify config
├── vite.config.ts          # Vite config
├── index.html
├── src/
│   ├── main.ts             # Vue app entry
│   ├── App.vue             # Root component
│   ├── router/
│   │   └── index.ts        # Vue Router
│   ├── views/
│   │   ├── Home.vue        # Create/join session
│   │   └── Session.vue     # Main standup room
│   ├── components/
│   │   ├── Timer.vue
│   │   ├── AudioRecorder.vue   # MediaRecorder API
│   │   ├── TranscriptView.vue
│   │   └── SummaryView.vue
│   ├── composables/
│   │   ├── useAudioRecorder.ts
│   │   ├── usePusher.ts
│   │   └── useSession.ts
│   └── lib/
│       ├── portkey.ts      # Portkey client
│       └── audio-utils.ts
└── netlify/functions/      # Serverless functions
    ├── transcribe.ts
    ├── summarize.ts
    └── send-summary.ts
```

## Environment Variables
```bash
PORTKEY_API_KEY=xxx
NEXT_PUBLIC_PUSHER_APP_KEY=xxx
PUSHER_APP_ID=xxx
PUSHER_SECRET=xxx
NEXT_PUBLIC_PUSHER_CLUSTER=us2
SENDGRID_API_KEY=xxx
SESSION_SECRET=xxx  # for optional password encryption
```

## Implementation Phases
1. **Setup**: Vue 3 + Vite + Tailwind + Vue Router + Netlify config
2. **Core**: Timer component + AudioRecorder composable + session routing
3. **AI**: Portkey integration (Whisper + Claude) via Netlify Functions
4. **Delivery**: Summary display + SendGrid email
5. **Polish**: Password protection + error handling + security warnings
6. **Deploy**: Netlify production

## AI Prompts

### Transcription (Whisper via Portkey)
```typescript
// Auto-detects English or German
{
  file: audioFile,
  model: "whisper-1",
  language: "auto"  // or omit for auto-detection
}
```

### Summarization (Claude via Portkey)
```
You are analyzing a team standup transcript. Respond in the same language as the transcripts (German or English).

Extract for each person:
**[Name]:**
- ✅ Yesterday: [accomplishments]
- 🎯 Today: [current work]
- 🚫 Blockers: [obstacles or "None"]

**📌 Team Action Items:**
[Dependencies, important points]

Transcripts:
[Insert all transcripts with speaker names]
```

## Critical Security Notes
- Session expires after 4 hours
- Audio cleared from browser after summary generation
- No server-side logging of sensitive content
- Share session URLs only via trusted channels (Slack/Teams)
- Optional password: Leader sets when creating session

## Success Metrics
- Transcription accuracy > 80%
- Summary captures all key points
- Email delivery reliable
- Cost < $10/month
- No security incidents

## Future Enhancements (Post-MVP)
- Database for standup history (Vercel Postgres)
- Slack OAuth authentication
- Calendar integration
- Jira/Linear blocker linking
- Multi-language support