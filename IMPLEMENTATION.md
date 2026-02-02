# AI Standup Assistant - Implementation Plan

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1-5 | ✅ Complete | Setup, Session Mgmt, UI, Backend, Real-time |
| 3.6 | ✅ Complete | Password Protection (PBKDF2) |
| 6 | ✅ Complete | AI Integration (Deepgram + Portkey) |
| 6.7 | ✅ Complete | Real-time Summarization |
| **7.A** | 🔄 **IN PROGRESS** | **Email Verification Login (CURRENT)** |
| 7 | ⏳ Next | Email Infrastructure |
| 8 | ⏳ Next | Privacy Banner |
| 9+ | 📋 Post-MVP | Transcript sync, Testing, Deployment |

**Current Stats**: 238+ tests passing, comprehensive coverage

---

## Current Work: Phase 7.A - Email Verification Login

### Overview
Replace inline email input with **verified email login** before accessing standup features.

**Why Email Verification?**
- ✅ Prevents email typos (user validates before entering)
- ✅ No password needed (verification code = passwordless auth)
- ✅ Better security (prevents fake emails, guarantees deliverability)
- ✅ Better UX (simple 6-digit code entry)
- ✅ Email persists across sessions (localStorage + JWT token)

### 7.A.1 Frontend: Email Verification Components

**EmailVerificationCard.vue**
- Email input field (validated with regex)
- "Send Verification Code" button
- Countdown timer (5 min expiration)
- Error handling for invalid email/send failure

**VerificationCodeCard.vue**
- 6-digit code input (numeric only)
- "Verify" button (disabled while validating)
- "Resend Code" button (30s cooldown)
- Error messages: "Code expired" / "Invalid code"
- Success: "✓ Email verified" + redirect to create/join

**Update Home.vue**
- Show email verification flow first
- On success: Store email in localStorage
- Display create/join cards with verified email pre-filled

### 7.A.2 Security: Email Verification

**Rate Limiting**
- Max 5 verification attempts per email per 15 min
- Max 10 code sends per email per hour
- Track in Redis: `email:verification:attempts:${email}`

**Code Generation & Storage**
- Generate: 6-digit random code (000000-999999)
- Algorithm: `crypto.randomBytes(3).readUintBE(0, 3) % 1000000`
- Hash with PBKDF2 before storage (never store plaintext)
- Redis TTL: 5 minutes (300 seconds)
- Single-use: Delete after verification

**Protection from Enumeration**
- Always return "Check your email" (even if email doesn't exist)
- Don't expose whether email is registered or has active codes

### 7.A.3 Backend: Verification API Endpoints

**POST `/api/send-verification-code`**
- Request: `{ email: string }`
- Response: `{ success: bool, message: string }` (always generic)
- Implementation:
  1. Validate email format (regex)
  2. Check rate limit: max 10/hour per email
  3. Generate 6-digit code
  4. Hash with PBKDF2 + SESSION_SECRET
  5. Store in Redis: `verification:${hashedCode}` → `{email, createdAt, attempts: 0}`
  6. Send via SendGrid (plain text)
  7. Return generic success message

**POST `/api/verify-email`**
- Request: `{ email: string, code: string }`
- Response: `{ success: bool, token: string }` OR `{ error: string }`
- Implementation:
  1. Validate inputs (email format, code = 6 digits)
  2. Hash the code
  3. Look up `verification:${hashedCode}` in Redis
  4. Verify: `code.email === request.email` AND `code.createdAt > now - 5min`
  5. Increment attempts: fail if > 5
  6. Delete code (single-use)
  7. Generate JWT: `{ email, issuedAt, expiresAt: now + 30days }`
  8. Return token

### 7.A.4 Frontend: Email Persistence

**Update useSession.ts composable**
- Store `emailVerificationToken` in localStorage
- Function: `setVerifiedEmail(token)` → store token
- Function: `getVerifiedEmail()` → retrieve email from token
- Validate token expiration

**Update CreateSessionCard.vue & JoinSessionCard.vue**
- Remove email input field
- Get email from localStorage (already verified)
- Pass to API endpoints

### 7.A.5 Backend: JWT Token Verification

**Create verify-jwt.ts utility**
- Function: `verifyEmailToken(token)` → `{ email, isValid }`
- Algorithm: HS256 with SESSION_SECRET
- Validate signature + expiration
- Used by create-session, join-session endpoints

### 7.A.6 Email Template (SendGrid)

```
Subject: Your Standup Verification Code

Your verification code is: 123456

This code expires in 5 minutes.

If you didn't request this code, please ignore this email.

---
Please Stand Up
```

### 7.A.7 Architecture Decision

**Why NO password in verification flow?**
- ✅ Sessions are ephemeral (created → used → deleted in 4h)
- ✅ Verification email proves ownership
- ✅ Email itself is the credential (passwordless auth)
- ✅ Simpler UX (no password to remember)
- ✅ Better on mobile
- ✅ Lower support burden

**Optional password protection** (separate from email auth)
- Can add to create-session separately (optional session password)
- Password protects JOIN (not CREATE)
- Independent of email verification

### 7.A.8 Testing Requirements

**Unit Tests**
- Email validation regex
- Code generation (randomness, format)
- PBKDF2 hashing consistency
- Rate limit tracking
- JWT generation & verification

**Integration Tests**
- Send code: valid, invalid, rate limit exceeded
- Verify code: correct, wrong, expired, already used
- Token: valid, expired, invalid signature
- Full flow: send → verify → create session

**E2E Tests** (Playwright)
- User enters email → clicks send → receives code
- User enters code → email verified → shown to create/join
- Invalid code → shows error → can resend
- Code expires → must resend
- Multiple attempts → locked out temporarily

---

## Next Steps (Immediate)

1. **Complete Phase 7.A: Email Verification Login** (1-2 days)
   - Create EmailVerificationCard.vue + VerificationCodeCard.vue
   - Create send-verification-code.ts + verify-email.ts endpoints
   - Create verify-jwt.ts utility
   - Update useSession.ts composable
   - Update Home.vue to show verification first
   - Write comprehensive tests

2. **Complete Phase 7: Email Infrastructure** (1 day)
   - finish-session endpoint (already coded)
   - Wire finishSession() in Session.vue
   - Test full flow: Record → Summarize → Finish → Email

3. **Phase 8: Privacy Banner** (1-2h)
   - Add banner to Session.vue
   - Audio disclosure + links to privacy policies
   - Implement data cleanup

---

## Known Issues & Gaps

**Current Issues**
- [ ] summarize-transcript returning empty sections (fixed in code, needs testing)
- [ ] OpenAI SDK format updated (system role in messages array)

**Missing Tests (Critical for Phase 7)**
- [ ] Email verification endpoints (send-code, verify-email)
- [ ] JWT token verification
- [ ] SendGrid integration
- [ ] finish-session endpoint
- [ ] Rate limiting on email verification

---

## Environment Variables

### Local Development (.env.local)
```bash
# Portkey API (Claude summarization)
PORTKEY_API_KEY=pk-your-portkey-key

# Storage
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Real-time
VITE_PUSHER_APP_KEY=your_key
VITE_PUSHER_CLUSTER=your_cluster
PUSHER_APP_ID=your_id
PUSHER_SECRET=your_secret

# Email
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Please Stand Up

# Security
SESSION_SECRET=your-random-32-char-string
```

### Production (Netlify Site Settings)
- All above variables (with production values)
- Keep SESSION_SECRET secret (generate new for prod)
- Use production Portkey, Pusher, SendGrid keys

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (238+ tests)
- [ ] No console errors in production build
- [ ] No secrets in source code
- [ ] HTTPS enforced
- [ ] Rate limiting active
- [ ] Input validation working

### Netlify Setup
- [ ] Connect GitHub repository
- [ ] Build: `npm run build`
- [ ] Publish: `dist`
- [ ] Set all environment variables
- [ ] Enable auto-deploy on main

### Production API Keys
1. **Pusher**: Create prod app on dashboard.pusher.com
2. **Portkey**: Create prod API key on app.portkey.ai
3. **Upstash**: Create prod database on console.upstash.com
4. **SendGrid**: Same API key works for dev + prod

---

## Success Criteria (MVP)

✅ **Completed**
- Phases 1-5: Setup, Session Mgmt, UI, Backend, Real-time
- Phase 3.6: Password Protection (PBKDF2)
- Phase 6: AI Integration (Deepgram + Portkey)
- Phase 6.7: Real-time Summarization

⏳ **In Progress**
- Phase 7.A: Email Verification Login (CURRENT)
- Phase 7: Email Infrastructure

📋 **Criteria**
- >80% test coverage maintained
- Email delivery working (auto-send on session finish)
- Transcription >80% accuracy
- No security vulnerabilities
- Monthly cost <$10

---

---

# APPENDIX: Completed Phases

## Phase 3.6: Password Protection ✅

Sessions can be optionally protected with passwords using PBKDF2 hashing and timing-safe comparison.

### Implementation
- **Frontend**: CreateSessionCard + JoinSessionCard with password input
- **Backend**: PBKDF2 hashing (100K iterations), timing-safe comparison
- **Utilities**: `src/lib/password-utils.ts`, `src/lib/sanitize.ts`

### Key Files
- [src/components/CreateSessionCard.vue](src/components/CreateSessionCard.vue)
- [src/components/JoinSessionCard.vue](src/components/JoinSessionCard.vue)

---

## Phase 6: AI Integration ✅

### 6.1 Audio Transcription (Deepgram)
- Netlify Function: `transcribe.ts`
- Deepgram API integration with auto language detection
- Error handling, retry logic, 25MB file limit
- Supports: webm, mp3, mp4, wav

### 6.2 Summarization (Portkey + Claude)
- Netlify Functions: `summarize.ts`, `summarize-transcript.ts`
- Claude 3.5 Sonnet via Portkey
- Structured JSON output: yesterday, today, blockers, actionItems, other
- Real-time individual transcript summarization
- Error handling with fallback to raw text

### 6.3 Frontend API Client
- `src/lib/ai-api.ts`: uploadAudio(), generateSummary(), summarizeTranscript(), finishSession()
- Retry logic (3x with exponential backoff)
- Timeout handling (120s)
- Error parsing and user feedback

### 6.4 Component Integration
- **TalkSession.vue**: Fully controlled component, no internal state duplication
- **Session.vue**: Manages summarizing state, real-time transcript display
- **TranscriptView.vue**: Parses and displays structured sections

### 6.5 Recent Improvements
- Real-time individual transcript summarization (immediately after transcription)
- Structured sections displayed in UI
- Button state management during summarization
- UI text standardization ("status" instead of "standup")
- Removed separate status message element

---

## Deepgram Language Support

**Service**: Deepgram Nova-2 STT
**Model**: nova-2 (latest, most accurate)
**Auto-detect**: Enabled by default
**API**: https://api.deepgram.com/v1/listen

### Supported Languages
**European**: German, English (GB/US), Spanish, French, Italian, Polish, Portuguese, Russian, Swedish, Dutch, Ukrainian

**Asian**: Hindi, Indonesian, Japanese, Korean, Mandarin, Traditional Chinese, Thai, Filipino, Vietnamese, Malay

**Other**: Arabic, Hebrew, Greek, Turkish

### Features
- Smart formatting (punctuation, capitalization)
- Automatic language detection
- Supports: webm, mp3, mp4, wav
- Max file size: 25MB
- Latency: 1-3 seconds

---

## Architecture Summary

### Security ✅
- XSS prevention (DOMPurify)
- Rate limiting (5 create/h, 10 join/h)
- CSRF protection
- PBKDF2 hashing (100K iterations)
- Timing-safe comparison
- AES-256-GCM email encryption
- Input validation (client + server)
- Max 20 participants/session
- Session IDs: 32 bytes entropy

### Backend ✅
- Netlify Functions (serverless)
- Upstash Redis (4h TTL, 10K req/day free)
- Functions: create-session, get-session, join-session, transcribe, summarize, finish-session

### Real-time ✅
- Pusher Channels (200K msgs/day, 100 concurrent)
- Events: user-joined, user-left, timer-started, timer-stopped, status-changed

### Testing ✅
- Unit: Vitest, >80% coverage
- Integration: Vitest
- E2E: Playwright

### Features Implemented ✅
- Session creation & management
- Real-time updates via Pusher
- Password protection (PBKDF2)
- Rate limiting
- Input validation & XSS prevention
- localStorage persistence
- Audio recording (120s timer)
- Real-time participant status
- AI summarization (Claude via Portkey)
- Audio transcription (Deepgram)
- Structured summary display

### Features In Progress ⏳
- Email verification login
- Email-based session finalization
- Auto-send summary email
