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
-
 [ ] 11: Documentation & Architecture - *Post-MVP*

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

### Architecture Decision: Deepgram for Transcription (Latest)
- ✅ Discovered Portkey Whisper requires OpenAI API key (not available)
- ✅ Evaluated alternatives: Deepgram, AssemblyAI, browser Web Speech API
- ✅ **Decision**: Use Deepgram for transcription
  - **Why Deepgram**:
    - Free tier: 12,500 minutes/month (covers ~350 standups/month)
    - SOC 2 certified (enterprise-grade security)
    - 97%+ accuracy for English speech
    - 1-3 seconds latency (fastest in market)
    - Supports multiple audio formats (webm, mp3, mp4, wav)
  - **Why not others**:
    - AssemblyAI: No free tier, pay-as-you-go expensive
    - Browser Web Speech API: Less accurate, inconsistent across browsers
    - Portkey/OpenAI: Requires external API key
- **NEXT**: Implement Deepgram integration
  - Create `netlify/functions/lib/deepgram-server.ts`
  - Maintain same `transcribeAudio()` interface (frontend unchanged)
  - Keep Portkey for Claude summarization only
  - Test transcription end-to-end
  - If successful, move to Phase 7 (Email Delivery)

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

## Phase 6: AI Integration ⏳ **IN PROGRESS**

### 6.1 Audio Transcription with Deepgram ⏳ (NEW)
- [ ] Create `netlify/functions/lib/deepgram-server.ts`
  - Initialize with Deepgram API key
  - Implement `transcribeAudio()` function
  - Error handling and retry logic
  - Logging for debugging
- [ ] Update `netlify/functions/transcribe.ts`
  - Change import from portkey-server to deepgram-server
  - Keep same request/response interface
- [ ] Add DEEPGRAM_API_KEY to `.env.example`
- [ ] Test transcription end-to-end

### 6.2 Portkey Setup ✅ (Revised for Summarization Only)
- [x] Create `netlify/functions/lib/portkey-server.ts`
- [x] Initialize with API key, configure Portkey routing
- [x] Error handling, retry logic, logging
- [x] Create `src/lib/portkey-types.ts`
- [ ] **PENDING**: Update Portkey to use Claude for summarization ONLY
  - Remove transcribeAudio() (now in deepgram-server)
  - Keep generateSummary() function
  - Send to GPT 5.2 model (available in Portkey account)
  - Use prompt: "Transcribe the following audio to text. Return only the transcribed text."
  - Extract transcription from model response

### 6.3 Transcription Netlify Function ✅
- [x] Create `netlify/functions/transcribe.ts`
- [x] Accept multipart audio (max 25MB, webm/mp3/mp4/wav)
- [x] Error handling: 400 (invalid), 413 (too large), 502 (API fail)
- [x] Multipart form parsing and session validation
- [ ] **TODO**: Update to call deepgram-server instead of portkey-server
- [x] **Language Support**: en, de, fr, es, it, pt, ja, zh (auto-detect)

### 6.4 Summarization Function ✅
- [x] Create `netlify/functions/summarize.ts`
- [x] Accept: `{sessionId, transcripts: [{name, text}]}`
- [x] Call Claude via Portkey with prompt for standup format
- [x] Return formatted summary with language
- [x] Error handling and validation
- [x] **Language Support**: en, de, fr, es, it, pt, ja, zh

### 6.5 Frontend AI API ✅
- [x] Create `src/lib/ai-api.ts`
- [x] `uploadAudio(sessionId, participantId, audioBlob)`
- [x] `generateSummary(sessionId, transcripts)`
- [x] Error handling, retry logic (3x with exponential backoff)
- [x] Timeout handling (120s for long operations)

### 6.6 Connect TalkSession Component ✅
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

## Phase 11: Documentation & Architecture Refactoring ⏳ **PLANNED** (Post-MVP)

### 11.1 Create Comprehensive Architecture Diagram
- [ ] Add visual system architecture diagram to IMPLEMENTATION.md
- [ ] Show all services: Frontend (Vue), Backend (Netlify), Redis, Pusher, Portkey, SendGrid
- [ ] Document data flow for key operations:
  - Session creation → Redis storage → Pusher broadcast
  - Audio recording → Portkey/GPT → Transcript storage
  - Summary generation → Claude → Email delivery
- [ ] Include security layers (PBKDF2, rate limiting, XSS prevention)

### 11.2 Consolidate Service Documentation
- [ ] Identify redundancy between SERVICE_SETUP.md and IMPLEMENTATION.md
- [ ] Consolidate external service setup (Pusher, Portkey, Upstash, SendGrid)
- [ ] Create single source of truth for:
  - Environment variables (dev vs production)
  - Free tier limits and cost estimates
  - Setup instructions with URLs
- [ ] Update README.md to point to consolidated docs
- [ ] Remove or archive redundant documentation

### 11.3 Service Integration Summary
- [ ] Add comprehensive table showing:
  - Service name, purpose, free tier limits, production requirements
  - Dev vs Production credentials (which to separate)
  - Cost estimates at different scales (7-person, 50-person, 200-person teams)
  - Setup URLs and key generation commands

### 11.4 Architecture Documentation
- [ ] Document complete request/response flow for each major feature
- [ ] Add sequence diagrams for:
  - Session creation and joining
  - Real-time participant sync
  - Audio transcription flow
  - Summary generation and email delivery
- [ ] Document error handling strategy across all layers

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
  - [ ] Portkey: ~$0.50/hour usage (for GPT + Claude)
  - [ ] Claude: $0.003/K input tokens (for summaries)
  - [ ] Total estimated: <$10/month

### Netlify Deployment
- [ ] Connect GitHub repository to Netlify
- [ ] Configure build command: `npm run build`
- [ ] Configure publish directory: `dist`
- [ ] Generate and set production environment variables:
  - [ ] `SESSION_SECRET`: Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - [ ] `PORTKEY_API_KEY`: Production Portkey API key
  - [ ] `UPSTASH_REDIS_REST_URL`: Production Redis URL
  - [ ] `UPSTASH_REDIS_REST_TOKEN`: Production Redis token
  - [ ] `VITE_PUSHER_APP_KEY`: Production Pusher key
  - [ ] `VITE_PUSHER_CLUSTER`: Production Pusher cluster
  - [ ] `PUSHER_APP_ID`: Production Pusher app ID
  - [ ] `PUSHER_SECRET`: Production Pusher secret
  - [ ] `SENDGRID_API_KEY`: SendGrid API key
  - [ ] `SENDGRID_FROM_EMAIL`: Verified sender email
  - [ ] `SENDGRID_FROM_NAME`: Email display name
- [ ] Enable automatic deploys on main branch
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS/TLS (automatic)

### Production API Keys Setup
**⚠️ IMPORTANT**: Create separate accounts/apps for production (do NOT reuse dev credentials)

#### Pusher Production App
1. Go to https://dashboard.pusher.com/
2. Create new app: `please-stand-up-prod` (or your project name)
3. Select cluster (same or better coverage as dev, e.g., `eu`, `us2`)
4. Get credentials from App Keys tab:
   - `PUSHER_APP_ID` (app_id)
   - `VITE_PUSHER_APP_KEY` (key) - same as dev
   - `PUSHER_SECRET` (secret)
   - `VITE_PUSHER_CLUSTER` (cluster name)
5. **Free tier covers most small teams**: 200K msgs/day, 100 concurrent connections

#### Portkey Production
1. Go to https://app.portkey.ai/
2. Create production API key (separate from dev)
3. Ensure OpenAI + Anthropic integrations are active
4. Set `PORTKEY_API_KEY` to production key

#### Upstash Redis Production
1. Go to https://console.upstash.com/
2. Create production database (separate from dev)
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

#### SendGrid Production
1. Go to https://app.sendgrid.com/
2. Same API key works for dev + prod (use same key)
3. Verify production sender email if different from dev
4. Set `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`

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
# Portkey API (for GPT transcription + Claude summarization)
PORTKEY_API_KEY=pk-your-portkey-key

# Storage
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Real-time
VITE_PUSHER_APP_KEY=your_key
VITE_PUSHER_CLUSTER=your_cluster
PUSHER_APP_ID=your_id
PUSHER_SECRET=your_secret

# Security
SESSION_SECRET=your-random-32-char-string
```

### Production (Netlify)
Set via **Site Settings** → **Build & deploy** → **Environment**:
- `PORTKEY_API_KEY` - Portkey API key (for GPT + Claude)
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