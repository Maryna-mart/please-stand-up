# AI Standup Assistant - Implementation Plan

## Phase Progress
-
 [x] 1: Setup (Vue3, Vite, Tailwind, Testing)
-
 [x] 2: Session Management
-
 [x] 3: UI Components (8 components + 2 views)
-
 [x] 3.5: Security (XSS, validation, sanitization)
-
 [x] 3.6: Password Protection (PBKDF2, strength validation, timing-safe comparison)
-
 [x] 4: Backend (Netlify Functions + Upstash Redis)
-
 [x] 5: Real-time (Pusher - user join/leave, timer, status)
-
 [x] **6: AI Integration** ✅ **COMPLETED**
-
 [ ] **7: Email Delivery** ⚠️ **NEXT** (3-4h)
-
 [ ] **8: Privacy Banner** ⚠️ **MVP Critical** (1-2h)
 -
 [ ] 9: Real-time Transcripts - *Post-MVP*
-
 [ ] 9.5: E2E Tests - Full transcription flow
-
 [ ] 10: Testing & Deployment - *Post-MVP*

**Current**: 238 tests passing, comprehensive coverage

## Recent Updates (Current Session)
- ✅ Fixed participants list initialization from session data
- ✅ Removed leader role - implemented true no-roles architecture
- ✅ All participants can generate summaries (no role guard)
- ✅ Creators skip password on fresh creation (sessionStorage flag)
- ✅ Added comprehensive Session.vue tests (12 new tests)
- ✅ Implemented Phase 6: AI Integration (Portkey)
  - Portkey server setup (transcribeAudio, generateSummary)
  - Type definitions for AI operations
  - Frontend AI API client (retry logic, error handling)
  - Connected TalkSession to real transcribe API
  - Connected Session.vue to real summarize API
  - Full error handling with user feedback

---

## Phase 3.6: Password Protection ✅ **COMPLETED**

### Overview
Sessions can be optionally protected with passwords using PBKDF2 hashing and timing-safe comparison.

### Implementation Details
- **Frontend**:
  - CreateSessionCard: Optional password input with validation
  - JoinSessionCard: Optional password input with validation
  - Real-time strength feedback (minimum 8 characters)
  - [src/components/CreateSessionCard.vue](src/components/CreateSessionCard.vue)
  - [src/components/JoinSessionCard.vue](src/components/JoinSessionCard.vue)

- **Backend**:
  - Password hashing: PBKDF2 (100K iterations)
  - Timing-safe comparison to prevent timing attacks
  - Server-side validation on join
  - Error responses: 401 for wrong password, 400 for missing password on protected sessions

- **Utilities**:
  - [src/lib/password-utils.ts](src/lib/password-utils.ts) - Hashing & comparison
  - [src/lib/sanitize.ts](src/lib/sanitize.ts) - Strength validation

### Testing ✅
- [x] Password strength validation tests
- [x] PBKDF2 hashing tests
- [x] Timing-safe comparison tests
- [x] Create session with password
- [x] Join with correct password
- [x] Reject wrong password
- [x] Require password for protected sessions
- [x] Full flow integration tests

---

## Phase 6: AI Integration ✅ **COMPLETED**

### 6.1 Portkey Setup ✅
- [x] Create `netlify/functions/lib/portkey-server.ts`
- [x] Initialize with API key, configure Whisper + Claude
- [x] Error handling, retry logic, logging
- [x] Create `src/lib/portkey-types.ts`
- [x] Unit tests: initialization, errors, retries

### 6.2 Transcription Function ✅
- [x] Create `netlify/functions/transcribe.ts`
- [x] Accept multipart audio (max 25MB, webm/mp3/mp4/wav)
- [x] Call Whisper API, return transcript + language
- [x] Error handling: 400 (invalid), 413 (too large), 502 (API fail)
- [x] Multipart form parsing and session validation
- [x] **Language Support**: en, de, fr, es, it, pt, ja, zh

### 6.3 Summarization Function ✅
- [x] Create `netlify/functions/summarize.ts`
- [x] Accept: `{sessionId, transcripts: [{name, text}]}`
- [x] Call Claude with prompt for standup format
- [x] Return formatted summary with language
- [x] Error handling and validation
- [x] **Language Support**: en, de, fr, es, it, pt, ja, zh

### 6.4 Frontend API ✅
- [x] Create `src/lib/ai-api.ts`
- [x] `uploadAudio(sessionId, participantId, audioBlob)`
- [x] `generateSummary(sessionId, transcripts)`
- [x] Error handling, retry logic (3x with exponential backoff)
- [x] Timeout handling (120s for long operations)

### 6.5 Connect TalkSession ✅
- [x] Update `src/components/TalkSession.vue`:
- [x] Add sessionId, userId, userName props
- [x] Replace mock with real uploadAudio API
- [x] Error handling and feedback
- [x] Update `src/views/Session.vue`:
- [x] Pass session context to TalkSession
- [x] Store transcripts with participant names

### 6.6 Connect Summary ✅
- [x] Update `src/views/Session.vue`:
- [x] Replace mock with real generateSummary API
- [x] Show progress, display summary, handle errors
- [x] Add error display component

---

## Phase 7: Email Delivery

### 7.1 SendGrid Setup
- [ ] Create `netlify/functions/lib/sendgrid-client.ts`
- [ ] Initialize with API key, create template function
- [ ] Tests: initialization, template generation

### 7.2 Send Function
- [ ] Create `netlify/functions/send-summary.ts`
- [ ] Accept: sessionId, summary, emails[], subject
- [ ] Format HTML + plain text, include date/time
- [ ] Send via SendGrid
- [ ] Errors: invalid emails, SendGrid errors, rate limits
- [ ] Tests: success, invalid emails, errors

### 7.3 UI Integration
- [ ] Add email form to Summary component
- [ ] Validate emails (comma-separated)
- [ ] Send button with loading state
- [ ] Success/error notifications
- [ ] E2E tests: validation, send flow, messages

---

## Phase 8: Privacy Banner

- [ ] Add banner to Session.vue:
- "Audio sent to Portkey/OpenAI for transcription"
- Link to privacy policies
- [ ] Implement data cleanup:
- Clear audio blobs after transcription
- Clear session after 4h (Redis TTL)
- [ ] Add "Delete Session" button (leader only)
- [ ] Tests: cleanup triggers, deletion

---

## Architecture Summary

### Security (Completed ✅)
- XSS prevention (DOMPurify)
- Rate limiting (5 create/h, 10 join/h)
- CSRF protection
- Password: PBKDF2 (100K iterations), timing-safe comparison
- Input validation (client + server)
- Max 20 participants/session
- Session IDs: 32 bytes entropy (Web Crypto API)

### Backend (Completed ✅)
- Netlify Functions (serverless)
- Upstash Redis (4h TTL, free tier: 10K req/day)
- Functions: `create-session`, `get-session`, `join-session`
- Multi-browser support

### Real-time (Completed ✅)
- Pusher Channels (free: 200K msgs/day, 100 concurrent)
- Events: `user-joined`, `user-left`, `timer-started`, `timer-stopped`, `status-changed`

### Testing
- Unit: Vitest, >80% coverage, `src/__tests__/unit/`
- Integration: Vitest, `src/__tests__/integration/`
- E2E: Playwright, `e2e/`

---

## Phase 9.5: E2E Tests (End-to-End) ⏳ **PENDING**

### Full Transcription Flow Tests
- [ ] Playwright E2E test: Create session → Record → Transcribe
- [ ] Verify transcript appears with participant name
- [ ] Test timeout handling (mock slow API)
- [ ] Test retry logic (mock failed requests)
- [ ] Test error display for failed transcription
- [ ] Test summary generation from transcripts
- [ ] Test multi-participant flow
- [ ] Test language detection and display

### Test Coverage Target
- [ ] >90% coverage across all new AI components
- [ ] Full flow tested with real Netlify Functions
- [ ] Error scenarios tested (timeouts, network, API errors)
- [ ] Session cleanup tested

---

## Phase 10: Production Deployment ⏳ **PENDING**

### Pre-Deployment Checklist
- [ ] All tests passing (238+ tests)
- [ ] No console errors in production build
- [ ] Security audit complete:
  - [ ] No secrets in source code
  - [ ] HTTPS only enforced
  - [ ] CORS properly configured
  - [ ] Rate limiting active
  - [ ] Input validation working
- [ ] Performance audit:
  - [ ] Bundle size optimized
  - [ ] API response times <2s
  - [ ] Transcription <60s for 2min audio
- [ ] Cost audit:
  - [ ] Portkey: ~$0.50/hour usage
  - [ ] OpenAI Whisper: $0.02/min audio
  - [ ] Claude: $0.003/K input tokens
  - [ ] Total estimated: <$10/month

### Netlify Deployment
- [ ] Connect GitHub repository to Netlify
- [ ] Configure build command: `npm run build`
- [ ] Configure publish directory: `dist`
- [ ] Generate and set production environment variables:
  - [ ] `SESSION_SECRET`: Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - [ ] `PORTKEY_API_KEY`: Your production Portkey key
  - [ ] All other API keys (Pusher, Upstash, etc.)
- [ ] Enable automatic deploys on main branch
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS/TLS (automatic)

### Monitoring & Logging
- [ ] Set up Netlify Analytics
- [ ] Configure error tracking (Sentry)
- [ ] Monitor Portkey API usage
- [ ] Monitor Redis connection health
- [ ] Monitor Pusher channel usage
- [ ] Set up alerts for errors/timeouts

### Post-Deployment
- [ ] Smoke test: Full session flow works
- [ ] Performance baseline recorded
- [ ] Rollback plan documented
- [ ] User documentation complete
- [ ] Support channel set up

---

## Environment Variables

### Local Development
Create `.env.local` file (in `.gitignore`):
```bash
PORTKEY_API_KEY=pk-your-actual-key
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
VITE_PUSHER_APP_KEY=your_key
VITE_PUSHER_CLUSTER=your_cluster
PUSHER_APP_ID=your_id
PUSHER_SECRET=your_secret
```

### Production (Netlify)
Set via **Site Settings** → **Build & deploy** → **Environment**:
- `PORTKEY_API_KEY` - Portkey API key (for Whisper + Claude)
- `UPSTASH_REDIS_REST_URL` - Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis token
- All Pusher keys
- `SESSION_SECRET` - Random 32-character string
Success Criteria (MVP)
✅ Phases 1-5 + 3.6 (Password Protection) complete
 Phases 6, 8 complete
 >80% test coverage maintained
 E2E tests passing
 Tested with 5+ person standup
 Email delivery working
 Transcription >80% accuracy
 No security vulnerabilities
 Monthly cost <$10

Features Implemented
✅ Session creation & management
✅ Real-time updates via Pusher
✅ Password protection (PBKDF2)
✅ Rate limiting
✅ Input validation & XSS prevention
✅ localStorage persistence
✅ Audio recording (120s timer)
✅ Real-time participant status

Postponed (Post-MVP)
Phase 9: Real-time transcript sync
Phase 10: Comprehensive testing and Production deployment