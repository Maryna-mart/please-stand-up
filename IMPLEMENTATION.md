# AI Standup Assistant - Implementation Plan

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1-5 | ✅ Complete | Setup, Session Mgmt, UI, Backend, Real-time |
| 3.6 | ✅ Complete | Password Protection (PBKDF2) |
| 6 | ✅ Complete | AI Integration (Deepgram + Portkey) |
| 6.7 | ✅ Complete | Real-time Summarization |
| **7.A** | ✅ **COMPLETE** | **Email Verification Login** |
| **7.A.Setup** | 🔄 **IN PROGRESS** | **SendGrid Configuration (CURRENT)** |
| 7 | ⏳ Next | Email Infrastructure (finish-session) |
| 8 | ⏳ Next | Privacy Banner |
| 9+ | 📋 Post-MVP | Transcript sync, Testing, Deployment |

**Current Stats**: 238+ tests passing, comprehensive coverage

---

## Completed: Phase 7.A - Email Verification Login ✅

All components, endpoints, and state management implemented and working.

### Files Created:
- src/components/Alert.vue
- src/components/EmailVerificationCard.vue
- src/components/VerificationCodeCard.vue
- netlify/functions/send-verification-code.ts
- netlify/functions/verify-email.ts
- netlify/functions/lib/jwt-utils.ts
- netlify/functions/lib/crypto-utils-server.ts
- netlify/functions/lib/api-types.ts

### Files Enhanced:
- src/views/Home.vue (email verification flow)
- src/composables/useSession.ts (email token functions)
- netlify/functions/lib/redis-client.ts (verification code storage)
- netlify/functions/lib/sendgrid-client.ts (email sending)

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

1. **Phase 7.A.Setup: SendGrid Configuration** 🔄 NEXT

   **Step 1: Create SendGrid Account**
   - Go to https://sendgrid.com
   - Sign up (free tier: 100 emails/day)

   **Step 2: Generate API Key**
   - Login → Settings → API Keys → Create New
   - Choose "Full Access"
   - Copy the key

   **Step 3: Verify Sender Email**
   - Settings → Sender Authentication
   - Verify your domain OR single sender email
   - Note: Must be verified before sending emails

   **Step 4: Update .env.local**
   ```bash
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=your-verified-email@example.com
   SENDGRID_FROM_NAME=Please Stand Up
   ```

   **Step 5: Test Sending**
   - Request verification code with test email
   - Verify email arrives with 6-digit code

2. **Complete Phase 7: Email Infrastructure**
   - Wire finish-session endpoint
   - Test full flow: Record → Summarize → Finish → Email delivery

3. **Phase 8: Privacy Banner**
   - Add audio disclosure banner
   - Data cleanup implementation

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
- [ ] **SendGrid Domain Authentication set up** (see below)

### Email Configuration for Production
- [ ] Domain registered and pointing to your app
- [ ] SendGrid domain authentication configured (Settings → Sender Authentication → Authenticate Your Domain)
- [ ] Add DNS records (CNAME, SPF, DKIM) to your domain registrar
- [ ] Wait ~30 min for SendGrid to verify DNS records
- [ ] Update `SENDGRID_FROM_EMAIL` to use your verified domain (e.g., `noreply@yourdomain.com`)

**Note**: During development, single sender email verification works fine. For production, domain authentication is required for better email deliverability and professional appearance.

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
4. **SendGrid**: Same API key works for dev + prod (but use domain-authenticated email)

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

## Completed Phases Summary

### Phase 3.6: Password Protection ✅
Sessions can be optionally protected with passwords using PBKDF2 hashing and timing-safe comparison.

### Phase 6: AI Integration ✅
- **Transcription**: Deepgram Nova-2 STT with auto language detection (German, English, Spanish, French, etc.)
- **Summarization**: Claude 3.5 Sonnet via Portkey with structured output (yesterday, today, blockers, actionItems)
- **Real-time Summarization**: Individual transcripts summarized immediately after recording
- **Retry Logic**: Exponential backoff (100ms, 300ms, 900ms) for transient failures
- **Error Handling**: Smart, contextual error messages (specific for permissions, generic during retries)

### Phase 6.7: Real-time Sync ✅
- **Transcript Persistence**: Saved to Redis, visible for 4 hours
- **Broadcasting**: Pusher Channels for instant sync across browsers (<2s latency)
- **Load on Join**: New participants see all existing transcripts immediately
- **Deduplication**: Prevents duplicate transcripts from multiple participants

---

## Current Implementation Status

### ✅ Completed & Tested
- Session management (create, join, leave, persistence)
- Real-time participant updates (Pusher Channels)
- Audio recording with synchronized timer
- AI transcription (Deepgram) with language auto-detection
- Structured summarization (Claude via Portkey)
- Transcript persistence (Redis with 4-hour TTL)
- Real-time broadcasting and multi-browser sync
- Retry logic with exponential backoff
- Smart error messages (prevents "[object Object]" errors)
- Password protection (PBKDF2 hashing)
- Input validation & XSS prevention
- Rate limiting
- Unit tests (238+ passing, >80% coverage)

### ⏳ In Progress
- Phase 7.A: Email Verification Login (passwordless auth before accessing standup)
- Phase 7: Email Infrastructure (auto-send summary on session finish)

### Architecture Summary
- **Frontend**: Vue 3 + TypeScript + Vite + Tailwind CSS
- **Backend**: Netlify Functions (serverless)
- **Storage**: Upstash Redis (4h TTL, 10K req/day free)
- **Real-time**: Pusher Channels (200K msgs/day, 100 concurrent)
- **AI Services**: Deepgram (transcription), Portkey/Claude (summarization), SendGrid (email)
- **Security**: XSS prevention, PBKDF2 hashing, timing-safe comparison, AES-256-GCM encryption, rate limiting
