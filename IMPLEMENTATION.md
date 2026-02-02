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

### Current Session: Email Capture + Session Finalization (IN PROGRESS)
- ✅ **DONE**: Frontend email capture
  - CreateSessionCard with email field
  - JoinSessionCard with email field
- ✅ **DONE**: Email validation & encryption
  - validateEmail(), validateEmailList()
  - AES-256-GCM email encryption with PBKDF2
  - Comprehensive tests (90+ test cases)
- ✅ **DONE**: Frontend API types updated
  - CreateSessionPayload includes email
  - JoinSessionPayload includes email
  - useSession composable passes email
- ⏳ **NEXT STEP**: Backend email storage
  - Update create-session.ts to validate & store encrypted email
  - Update join-session.ts to validate & store encrypted email
- ⏳ **THEN**: Email delivery infrastructure
  - Create SendGrid client (sendgrid-client.ts)
  - Create finish-session endpoint
  - Generate & send summary email with structured format
- ⏳ **THEN**: UI & orchestration
  - Rename "Generate Summary" → "Standup is Finished"
  - Update Session.vue to call finish-session
  - Remove SummaryView UI component

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
- [x] Create `netlify/functions/lib/deepgram-server.ts`
  - Initialize with Deepgram API key
  - Implement `transcribeAudio()` function
  - Error handling and retry logic
  - Logging for debugging
- [x] Update `netlify/functions/transcribe.ts`
  - Change import from portkey-server to deepgram-server
  - Keep same request/response interface
- [x] Add DEEPGRAM_API_KEY to `.env.example`
- [x] **DONE**: Test transcription endpoint
  - Created `netlify/functions/__tests__/transcribe.test.ts`
  - Tests multipart form parsing, validation, error handling

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

## Phase 7: Email-Driven Session Completion (REDESIGNED)

### 7.0 Architecture Changes
**Objective**: Move email collection to login, auto-send summary on session completion
- Remove `SummaryView.vue` UI (keep parsing utilities for backend)
- Email field added to both CreateSessionCard and JoinSessionCard
- Store email in Redis session data (encrypted in transit, hashed at rest if needed)
- "Generate Summary" button renamed to "Standup is Finished"
- Single action: Generate summary + send email + end session

### 7.1 Data Model Changes
- Update Redis session schema to include email field
- Extend `Session` interface in types to include organizer email
- Migration: CreateSessionCard + JoinSessionCard need email input

### 7.2 Frontend: Login/Join Page Email Integration

#### 7.2.1 CreateSessionCard Enhancement
- [ ] Add email input field (required)
- [ ] Email validation: basic format check (email regex)
- [ ] Show validation error if invalid
- [ ] Update API call to include email in create-session request
- [ ] File: [src/components/CreateSessionCard.vue](src/components/CreateSessionCard.vue)

#### 7.2.2 JoinSessionCard Enhancement
- [ ] Add email input field (required)
- [ ] Email validation: basic format check
- [ ] Update API call to include email in join-session request
- [ ] File: [src/components/JoinSessionCard.vue](src/components/JoinSessionCard.vue)

#### 7.2.3 Session Storage
- [ ] Update localStorage to include organizer email
- [ ] File: [src/composables/useSession.ts](src/composables/useSession.ts)

### 7.3 Backend: Email Storage & Encryption

#### 7.3.1 Create Session Function Update
- [ ] Update `netlify/functions/create-session.ts`:
  - Accept `email` field in request
  - Validate email format (regex pattern)
  - Store email in Redis session data
  - Return email in response (confirmation only)
- [ ] Add email validation utility to `netlify/functions/lib/validation.ts`

#### 7.3.2 Join Session Function Update
- [ ] Update `netlify/functions/join-session.ts`:
  - Accept `email` field in request
  - Validate email format
  - Store email in Redis session (update organizer email if needed)
  - Return email in response

#### 7.3.3 Security: Email Encryption in Redis
- [ ] Option A: Hash email using SHA256 (one-way, for storage)
- [ ] Option B: Encrypt email with session secret (reversible for SendGrid)
- **Decision**: Use encryption (Option B) for sending capability
  - Create `netlify/functions/lib/email-crypto.ts`:
    - `encryptEmail(email, sessionSecret)` - AES-256-GCM
    - `decryptEmail(encryptedEmail, sessionSecret)` - AES-256-GCM
  - Derive session secret from session ID + env secret
- [ ] Never log or expose plaintext email in logs

### 7.4 Backend: Session Finalization Function

#### 7.4.1 Create Finish Session Function
- [ ] Create `netlify/functions/finish-session.ts`:
  - Accept: `sessionId` only (email comes from Redis)
  - Retrieve session from Redis
  - Generate summary from stored transcripts
  - Decrypt email from session
  - Send email via SendGrid
  - Mark session as completed (status: "completed")
  - Delete session from Redis (cleanup)
  - Broadcast "session-finished" via Pusher (all clients disconnect)
  - Return: `{success: true, emailSent: boolean, message: string}`
- [ ] Error handling:
  - 404: Session not found
  - 500: Summary generation failed
  - 502: Email send failed (non-blocking, still complete session)
  - 400: Missing/invalid sessionId

### 7.5 Backend: SendGrid Integration

#### 7.5.1 SendGrid Client Setup
- [ ] Create `netlify/functions/lib/sendgrid-client.ts`:
  - Initialize with SENDGRID_API_KEY
  - Function: `sendSummaryEmail(to, subject, summary)`
  - Return: success status + message ID
  - Error handling: Invalid emails, API errors, rate limits
  - Logging: Track email sends (but NOT email addresses)

#### 7.5.2 Email Template
- [ ] Plain text format (no HTML for now, focus on deliverability)
- [ ] Include:
  - Subject: "Standup Summary - [date]"
  - Greeting
  - Per-participant sections (use parsed summary format)
  - Timestamp
  - Footer with app link
- [ ] Variables: summary text, date, participant names

### 7.6 Frontend: Session.vue Updates

#### 7.6.1 Remove SummaryView Component
- [ ] Delete SummaryView component UI section
- [ ] Keep transcript display
- [ ] Update imports

#### 7.6.2 Rename & Update "Generate Summary" Button
- [ ] Rename to "Standup is Finished"
- [ ] Update handler: `finishSession()` instead of `generateSummary()`
- [ ] Show loading state: "Finishing..."
- [ ] API call: `finishSessionAPI(sessionId)`
- [ ] On success: Show completion message + redirect to home after 2s
- [ ] On error: Show error, allow retry
- [ ] File: [src/views/Session.vue](src/views/Session.vue)

#### 7.6.3 Real-time Session Completion
- [ ] Listen for "session-finished" Pusher event
- [ ] On event: Show "Session ended by organizer" + redirect to home
- [ ] Unsubscribe from channel after completion

### 7.7 Frontend: AI API Update
- [ ] Add `finishSessionAPI(sessionId)` to [src/lib/ai-api.ts](src/lib/ai-api.ts):
  - POST to `/.netlify/functions/finish-session`
  - Pass sessionId
  - Return success/error status
  - Retry logic (3x for transient errors)

### 7.8 Security Checklist
- [ ] Email validation: Reject invalid format before storage
- [ ] Email encryption: Use AES-256-GCM with session secret
- [ ] Never log plaintext email
- [ ] Secure deletion: Remove email from Redis immediately after send
- [ ] Rate limiting: Prevent spam (1 finish per session)
- [ ] No email in responses: Don't echo email back in API responses
- [ ] HTTPS only: All email transmission encrypted

### 7.9 Testing Strategy

#### 7.9.1 New Tests Required
- [ ] **Unit: Email Validation**
  - Valid emails: user@example.com, test+tag@domain.co.uk
  - Invalid emails: missing @, no domain, control chars
  - File: `src/__tests__/unit/email-validation.test.ts`

- [ ] **Unit: Email Encryption/Decryption**
  - Encrypt → decrypt roundtrip
  - Different session secrets produce different ciphertexts
  - Invalid encrypted data handled gracefully
  - File: `netlify/functions/__tests__/lib/email-crypto.test.ts`

- [ ] **Unit: SendGrid Client**
  - Initialize with API key
  - Send email success response
  - Handle SendGrid API errors
  - Invalid email format handling
  - File: `netlify/functions/__tests__/lib/sendgrid-client.test.ts`

- [ ] **Integration: CreateSessionCard with Email**
  - Email field rendered
  - Email validation feedback
  - API call includes email
  - File: `src/__tests__/unit/CreateSessionCard.test.ts` (update)

- [ ] **Integration: JoinSessionCard with Email**
  - Email field rendered
  - Email validation feedback
  - API call includes email
  - File: `src/__tests__/unit/JoinSessionCard.test.ts` (update)

- [ ] **Integration: create-session Endpoint**
  - Accept email, validate, store encrypted
  - Return success/error with email confirmation
  - File: `netlify/functions/__tests__/create-session.test.ts` (update)

- [ ] **Integration: join-session Endpoint**
  - Accept email, validate, update session
  - File: `netlify/functions/__tests__/join-session.test.ts` (update)

- [ ] **Integration: finish-session Endpoint**
  - Retrieve session + email
  - Generate summary
  - Send email via SendGrid
  - Delete session from Redis
  - Broadcast Pusher event
  - Error handling (session not found, send failure)
  - File: `netlify/functions/__tests__/finish-session.test.ts` (new)

- [ ] **Component: Session.vue**
  - "Generate Summary" renamed to "Standup is Finished"
  - Button calls finish-session API
  - Show loading state
  - Success: Show message + redirect
  - Error: Show error, allow retry
  - Listen for "session-finished" Pusher event
  - File: `src/__tests__/unit/Session.test.ts` (update)

- [ ] **Component: SummaryView Removal**
  - Tests for SummaryView component can be removed
  - Keep tests for parseSummary utility function
  - File: `src/__tests__/unit/summary-parser.test.ts` (if exists)

- [ ] **E2E: Full Flow**
  - Create session with email
  - Record transcripts
  - Click "Standup is Finished"
  - Verify email sent
  - Verify session deleted
  - Verify all users see session-finished event
  - File: `e2e/full-flow.spec.ts`

#### 7.9.2 Test Coverage Goals
- >90% coverage for new email utilities
- >85% coverage for backend finish-session
- All error paths tested
- No security bypass scenarios

### 7.10 Environment Variables (NEW)
- [ ] `SENDGRID_API_KEY` - SendGrid API key
- [ ] `SENDGRID_FROM_EMAIL` - Verified sender email (e.g., noreply@standup.app)
- [ ] `SENDGRID_FROM_NAME` - Display name for sender
- [ ] `SESSION_SECRET` (existing) - Use for email encryption derivation

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

## Known Testing Gaps ⚠️

**Missing Endpoint Tests (Critical for Phase 7)**:
- [ ] `create-session.test.ts` - Session creation, password hashing, email storage
- [ ] `join-session.test.ts` - Session joining, password validation, email update
- [ ] `get-session.test.ts` - Session retrieval, privacy (no password in response)
- [ ] `summarize.test.ts` - Summary generation, Portkey integration
- [ ] `finish-session.test.ts` - Session completion, email sending, cleanup

**Note**: These tests are essential for Phase 7 implementation and should be added alongside backend changes.

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
✅ Phases 6 complete
⏳ Phase 7 (Email-Driven Session Completion) - IN PROGRESS
⏳ Phase 8 (Privacy Banner) - PENDING
 >80% test coverage maintained
 E2E tests passing
 Tested with 5+ person standup
 Email delivery working (auto-send on session finish)
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
✅ AI summarization (Claude via Portkey)
✅ Audio transcription (Deepgram)
⏳ Email capture on login (NEW)
⏳ Email-based session finalization (NEW)
⏳ Auto-send summary email (NEW)

Postponed (Post-MVP)
Phase 9: Real-time transcript sync
Phase 10: Comprehensive testing and Production deployment