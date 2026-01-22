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
 [x] 4: Backend (Netlify Functions + Upstash Redis)
-
 [x] 5: Real-time (Pusher - user join/leave, timer, status)
-
 [ ] **6: AI Integration** ⚠️ **NEXT** (6-8h)
-
 [ ] **7: Email Delivery** ⚠️ **MVP Critical** (3-4h)
-
 [ ] **8: Privacy Banner** ⚠️ **MVP Critical** (1-2h)
 -
 [ ] 9: Real-time Transcripts - *Post-MVP*
-
 [ ] 10: Testing & Deployment - *Post-MVP*

**Current**: 162 tests passing, 93.93% coverage

---

## Phase 6: AI Integration ⚠️ **CURRENT PRIORITY**

### 6.1 Portkey Setup
-
 [ ] Create `netlify/functions/lib/portkey-server.ts`
  
-
 Initialize with API key, configure Whisper + Claude
  
-
 Error handling, retry logic, logging
-
 [ ] Create `src/lib/portkey-types.ts`
-
 [ ] Unit tests: initialization, errors, retries

### 6.2 Transcription Function
-
 [ ] Create `netlify/functions/transcribe.ts`
-
 [ ] Accept multipart audio (max 25MB, webm/mp3/mp4/wav)
-
 [ ] Call Whisper API, return transcript + language
-
 [ ] Errors: 400 (invalid), 413 (too large), 502 (API fail)
-
 [ ] Tests: success, language detection, errors

### 6.3 Summarization Function
-
 [ ] Create `netlify/functions/summarize.ts`
-
 [ ] Accept: `{sessionId, transcripts: [{name, text}]}`
-
 [ ] Detect language, call Claude with prompt:
Extract per person: ✅ Yesterday, 🎯 Today, 🚫 Blockers 📌 Team Action Items

- [ ] Return formatted summary (same language as input)
- [ ] Errors: 400 (empty), 502 (API fail)
- [ ] Tests: success, language matching, multiple participants

### 6.4 Frontend API
- [ ] Create `src/lib/ai-api.ts`
- `uploadAudio(sessionId, participantId, audioBlob)`
- `generateSummary(sessionId, transcripts)`
- [ ] Error handling, retry logic (3x for 502/503)
- [ ] Tests: API calls, errors, responses

### 6.5 Connect TalkSession
- [ ] Update `src/components/TalkSession.vue`:
- Replace mock with real API, show progress
- Display transcript, handle errors with retry
- [ ] Update `src/views/Session.vue`:
- Store transcripts, pass to TranscriptView
- Enable "Generate Summary" when transcripts exist

### 6.6 Connect Summary
- [ ] Update `src/views/Session.vue`:
- Replace mock with real API
- Show progress, display summary, handle errors

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

## Environment Variables

```bash
# Upstash Redis (see SERVICE_SETUP.md)
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Pusher (see SERVICE_SETUP.md)
VITE_PUSHER_APP_KEY=your_key
VITE_PUSHER_CLUSTER=your_cluster
PUSHER_APP_ID=your_id
PUSHER_SECRET=your_secret

# Portkey
PORTKEY_API_KEY=your_key

# SendGrid
SENDGRID_API_KEY=your_key

# Security
SESSION_SECRET=random_32_byte_string
Success Criteria (MVP)
✅ Phases 1-5 complete
 Phases 6, 8, 9.4 complete
 >80% test coverage maintained
 E2E tests passing
 Tested with 5+ person standup
 Email delivery working
 Transcription >80% accuracy
 No security vulnerabilities
 Monthly cost <$10
Postponed (Post-MVP)
Phase 9: Real-time transcript sync
Phase 10: Comprehensive testing and Production deployment