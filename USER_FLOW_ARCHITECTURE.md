# End-to-End User Flow Architecture

This document describes the complete user journey through the standup assistant application, including UI steps, business logic, backend calls, and both success and failure paths.

---

## Visual Diagram

See [USER_FLOW_DIAGRAM.svg](USER_FLOW_DIAGRAM.svg) for a complete visual representation of the end-to-end flow, including all 5 steps, backend operations, and the session lifecycle.

---

## High-Level Flow Overview

```
Email Verification → Create/Join Session → Session Room → Record Standups → Finish & Auto-Logout
```

---

## Step 1: Email Verification (Required for All Users)

**Why Email?**
- ✅ Primary credential (email = identity)
- ✅ Proves user can receive notifications
- ✅ Used to deliver summary after standup
- ✅ Prevents spam/bots from joining sessions
- ✅ Short-lived sessions (4h) need simple, fast auth

### UI Steps
1. User arrives at home page (`/`) OR clicks session link
2. **Email Verification Card** appears
3. User enters email address
4. Clicks "Send Verification Code"
5. User checks email inbox
6. User enters 6-digit code
7. Clicks "Verify"
8. Email verified → transitions to **Create/Join Session Card**

### Business Rules
- **Email Format**: Valid email regex required
- **Rate Limiting**: Max 10 code sends per email per hour
- **Code Expiration**: 5 minutes
- **Code Format**: 6 random digits (000000-999999)
- **Single-Use**: Code deleted after first successful verification
- **Email Storage**: Stored in Redis with session object AND as JWT in localStorage
- **emailToken (JWT)**: 30-day token stored in localStorage for persistent auth
- **Token Lifecycle**: Separate from session (enables re-join/new sessions without re-verification)
- **Server-Side Validation**: JWT signature + expiration validated on every request
- **Required**: Cannot proceed without verified email

### Backend Calls

#### POST `/.netlify/functions/send-verification-code`
```typescript
Request: { email: string }
Response: { success: boolean, message: string }

Success Path:
1. Validate email format
2. Check rate limit (max 10 sends per email per hour)
3. Generate random 6-digit code
4. Hash code with PBKDF2
5. Store in Redis with 5-minute TTL
6. Send via SendGrid
7. Return { success: true, message: "Check your email" }

Failure Path:
1. Invalid email → Return error
2. Rate limit exceeded → Return generic message (prevent enumeration)
3. SendGrid down → Store code locally, return success
```

#### POST `/.netlify/functions/verify-email`
```typescript
Request: { email: string, code: string }
Response: { success: boolean, emailToken: string } | { error: string }

Success Path:
1. Validate inputs (email format, code = 6 digits)
2. Hash provided code with SESSION_SECRET
3. Look up in Redis: verification:{hashedCode}
4. Verify: email matches AND code not expired (< 5 min)
5. Check attempts (max 5 failed attempts)
6. Delete code from Redis (single-use)
7. Generate JWT with HS256 + SESSION_SECRET:
   {
     email: "user@example.com",
     issuedAt: timestamp,
     expiresAt: timestamp + 30 days
   }
8. Return { success: true, emailToken: "eyJ..." }

Frontend Action:
- Store emailToken in localStorage (key: 'standup_email_token')
- Token persists across sessions (30-day lifetime)
- User proceeds to Create/Join with emailToken
- Token automatically sent with all API requests

Failure Path:
1. Code not found/expired → Return "Invalid code or expired"
2. Wrong email → Return "Invalid code" (prevent enumeration)
3. Too many attempts (5+) → Return "Too many attempts"
```

### Success Path
✅ Email verified
✅ 30-day JWT emailToken stored in localStorage
→ Proceed to Create/Join Session (Step 2)

**localStorage After Verification:**
```javascript
{
  'standup_email_token': 'eyJ...'  // 30-day JWT (email inside)
}
```

---

## Step 2: Create or Join Session

### UI Steps - Create Session
1. **Create Session Card** appears
2. User enters participant name (1-50 characters)
3. Optional: Adds session password (8+ chars)
4. Clicks "Create Session"
5. Session created, redirected to session room
6. Share link button appears

### UI Steps - Join Session
1. User clicks session link: `https://app.com/session/abc123`
2. Router redirects to home with `?sessionId=abc123`
3. **Join Session Card** appears (sessionId pre-filled)
4. User enters participant name
5. If session has password: password field appears
6. Clicks "Join Session"
7. Joined, redirected to session room

### Business Rules - Create
- **Session ID**: 32 bytes entropy, base64url encoded
- **Name**: 1-50 characters, required
- **Password**: Optional (8+ chars) for extra security
- **Max Participants**: 20 per session
- **TTL**: 4 hours from creation
- **Email**: Creator's verified email automatically associated

### Business Rules - Join
- **Session ID**: Must exist and not be expired
- **Name**: 1-50 characters, required
- **Email**: Must be verified
- **Password**: Required if session has one
- **Max Participants**: Cannot exceed 20

### Backend Calls

#### POST `/.netlify/functions/create-session`
```typescript
Request: {
  emailToken: string,               // 30-day JWT from verification
  participantName: string,
  password?: string
}
Response: {
  sessionId: string,
  userId: string,
  expiresAt: ISO8601,
  participants: Participant[]
}

Success Path:
1. Verify JWT signature and expiration (HS256 + SESSION_SECRET)
2. Extract email from JWT payload
3. Validate inputs (name, password strength)
4. Generate sessionId (32-byte entropy) and userId
5. If password: hash with PBKDF2 (100K iterations)
6. Create session in Redis with 4-hour TTL:
   {
     id: sessionId,
     email: email,                  // ← From JWT, stored for sending emails
     createdAt: timestamp,
     expiresAt: timestamp + 4h,
     participants: [{ id: userId, name: participantName, email, ... }],
     transcripts: [],
     passwordHash: null | hash,
     ...
   }
7. Broadcast 'user-joined' event via Pusher
8. Return { sessionId, userId, expiresAt, participants }

Failure Path:
- Invalid/expired JWT → Return 401 "Email verification expired"
- Invalid inputs → Return 400
- Redis unavailable → Return 503
```

#### POST `/.netlify/functions/join-session`
```typescript
Request: {
  sessionId: string,
  emailToken: string,               // 30-day JWT from verification
  participantName: string,
  password?: string
}
Response: {
  sessionId: string,
  userId: string,
  participants: Participant[],
  transcripts: Transcript[]
}

Success Path:
1. Verify JWT signature and expiration (HS256 + SESSION_SECRET)
2. Extract email from JWT payload
3. Validate inputs (sessionId, name)
4. Get session from Redis: session:{sessionId}
5. Verify: exists AND not expired AND < 20 participants
6. If password protected:
   - Hash provided password
   - Compare with session.passwordHash (timing-safe)
   - Return 401 if mismatch
7. Generate userId for this participant
8. Add to session.participants[]:
   { id: userId, name: participantName, email, joinedAt: timestamp, ... }
9. Save updated session to Redis
10. Broadcast 'user-joined' event via Pusher
11. Return { sessionId, userId, participants, transcripts }

Failure Path:
- Invalid/expired JWT → Return 401 "Email verification expired"
- Session not found/expired → Return 404/410
- Session full (20+ participants) → Return 403
- Wrong password → Return 401
- Invalid inputs → Return 400
```

### Success Path
✅ Session created/joined
→ Proceed to Session Room (Step 3)

**localStorage After Create/Join:**
```javascript
{
  'standup_email_token': 'eyJ...',     // 30-day JWT (persists)
  'standup_session': {...},             // Session object (cleared after 4h)
  'standup_user_id': 'user123',        // User ID (cleared after 4h)
  'standup_user_name': 'Alice'         // Name (cleared after 4h)
}
```

---

## Step 3: Session Room

### UI Layout
1. **Header**: Session ID, 4-hour countdown timer
2. **Participants Panel**: Real-time list with status (ready, recording, done)
3. **Talk Button**: Blue button to record standup
4. **Summaries Section**: Raw participant summaries as recorded
5. **Finish Button**: "Standup is Finished" (sends emails and closes session)

### Real-Time Features
- **Pusher Channels**: Subscribe to `session-{sessionId}`
- **Broadcast Events**: Joins, leaves, status changes, new summaries
- **Latency**: <2 seconds for all participants

### Business Rules
- **Status Flow**: `ready` → `recording` → `transcribing` → `done`
- **Transcript Storage**: Persisted in Redis, visible to all
- **Display Format**: Raw summaries, no combining or reformatting
- **Real-Time**: All participants see updates immediately (via Pusher)

### Backend Calls

#### GET `/.netlify/functions/get-session?sessionId={sessionId}`
```typescript
Returns:
- Current participant list and status
- All recorded summaries (raw format)
- Session expiration countdown

Used for:
1. Initial load when entering session
2. Periodic polling (every 10s)
3. Fallback if Pusher events missed
```

### Success Path
→ Participants record standups in real-time
→ Summaries appear immediately in Summaries section
→ Proceed to Record Standups (Step 4)

---

## Step 4: Recording Standups

### UI Flow (TalkSession Component)
1. User clicks **"Talk" button**
2. Browser requests microphone permission (first time)
3. User grants permission
4. **Recording starts**, 2-minute countdown visible
5. User speaks standup
6. User stops recording (manual or auto-stop)
7. **"Transcribing..." status**
8. Deepgram transcribes audio
9. Claude auto-summarizes
10. **Summary appears in Summaries section** (raw format)
11. Visible to all participants within <2s

### Business Rules
- **Recording**: 1-120 seconds (2 minutes max)
- **Audio Format**: WebM/Opus (browser native)
- **Transcription**: Deepgram with language auto-detection
- **Summarization**: Claude with structured sections
- **Display**: Raw summary, exactly as-is
- **Persistence**: Saved to Redis
- **Broadcast**: Real-time via Pusher to all participants

### Backend Calls

#### POST `/.netlify/functions/transcribe`
```typescript
Request: {
  audio: Blob,
  sessionId: string,
  userId: string
}
Response: { text: string, language: string, duration: number }

Success Path:
1. Validate: sessionId + userId in Redis session
2. Send audio to Deepgram with language auto-detect
3. Retry with exponential backoff (100ms, 300ms, 900ms) on failure
4. Return transcribed text

Failure Path:
- Invalid sessionId/userId → Return 401
- Deepgram failed (all retries) → Return generic error
- Timeout (120s) → Return error
```

#### POST `/.netlify/functions/summarize-transcript`
```typescript
Request: {
  text: string,
  sessionId: string,
  userId: string
}
Response: {
  sections: {
    yesterday?: string,
    today?: string,
    blockers?: string,
    actionItems?: string,
    other?: string
  }
}

Success Path:
1. Validate: sessionId + userId in Redis session
2. Send text to Claude via Portkey API
3. Retry with exponential backoff (100ms, 300ms, 900ms) on failure
4. Parse structured response (yesterday/today/blockers/actionItems)
5. Return sections

Failure Path:
- Invalid sessionId/userId → Return 401
- Claude failed (all retries) → Return raw text as fallback
```

#### POST `/.netlify/functions/save-transcript`
```typescript
Request: {
  sessionId: string,
  userId: string,
  transcript: {
    participantName: string,
    text: string,
    summary: { yesterday?, today?, blockers?, actionItems?, other? },
    language: string,
    duration: number,
    timestamp: ISO8601
  }
}
Response: { success: boolean }

Success Path:
1. Validate: sessionId + userId in Redis session
2. Append transcript to session.transcripts[]
3. Save updated session to Redis
4. Broadcast 'transcript-added' event via Pusher
5. Return { success: true }

Failure Path:
- Invalid sessionId/userId → Return 401
- Pusher fails → Still save to Redis, return success (async broadcast)
- Redis fails → Return 503
```

### Success Path
✅ Summary appears in Summaries section
✅ Visible to all participants within <2s
→ Participants continue recording or proceed to finish

---

## Step 5: Standup is Finished (Send Emails & Auto-Logout)

### UI Steps (Complete Flow)
1. All participants have recorded
2. Anyone clicks **"Standup is Finished" button**
3. **Spinner appears** (sending emails in progress)
4. Backend:
   - Gets all current summaries (raw format)
   - Sends emails to creator (auto-included)
   - Clears session from Redis (deletes completely)
5. Once emails sent:
   - Browser detects session deleted
   - **Auto-logs out all participants**
   - Clears localStorage (sessionId, userId, emailToken)
   - Redirects all to home page
   - Shows message: "Standup completed! Summary sent to email."
6. Session completely gone

### Business Rules
- **Email Content**: Raw participant summaries (no combining/reformatting)
- **Email Recipients**: At minimum, creator's verified email
- **Auto-Logout**: All participants logged out simultaneously
- **Data Cleanup**: Session deleted from Redis (no recovery)
- **localStorage Cleanup**: All session data cleared from client
- **Status**: Session marked as finished, no longer accessible

### Backend Calls

#### POST `/.netlify/functions/finish-session`
```typescript
Request: {
  sessionId: string,
  userId: string,
  recipientEmails?: string[]
}
Response: {
  success: boolean,
  sent: number,
  message: string
}

Success Path:
1. Validate: sessionId + userId in Redis session
2. Get session object from Redis
3. Get all current transcripts (raw format)
4. Validate recipient emails (if provided):
   - Valid email format
   - Max 5 additional recipients
   - No duplicates
5. Prepare email content:
   - Subject: "Standup Summary - [Date]"
   - All participant summaries (raw, unmodified)
   - Participant list (who recorded, who didn't)
   - NO reformatting or combining
6. Send emails via SendGrid:
   - Creator's email from session.email (auto-included)
   - Any additional recipients provided
7. Delete session from Redis (complete removal)
8. Broadcast 'session-finished' event via Pusher
   (tells all connected clients to logout and redirect)
9. Return { success: true, sent: N, message: "..." }

Failure Path:
1. Invalid sessionId/userId → Return 401
2. Session not found → Return 404
3. Session already finished → Return 400
4. Email validation fails → Return 400
5. SendGrid fails → Return 500 (session still deleted)
6. Redis unavailable → Return 503
```

### Email Content Format
```
SUBJECT: Standup Summary - [Date]

Standup Completed: [Day, Date, Time]

PARTICIPANTS:
- Alice (recorded)
- Bob (recorded)
- Carol (did not record)

---

ALICE:
Yesterday: Fixed login bug, updated deployment docs
Today: Working on email notification system
Blockers: Waiting on design review

---

BOB:
Yesterday: Completed user dashboard redesign
Today: Testing on mobile devices
Blockers: None

---

CAROL:
(No standup recorded)

---

Session automatically closed.
```

### Frontend Auto-Logout Logic
```typescript
When 'session-finished' Pusher event received OR
When GET /get-session returns 404/410:

1. Show spinner → "Session ending, sending emails..."
2. Wait for completion signal
3. Clear localStorage (session data ONLY):
   - standup_session          ← CLEARED
   - standup_user_id          ← CLEARED
   - standup_user_name        ← CLEARED
   - standup_email_token      ← KEPT (30-day lifecycle)
4. Clear reactive state (sessionId, userId, participants, transcripts, etc.)
5. Clear Pusher subscription to session-{sessionId}
6. Redirect to home: "/"
7. Show toast: "Standup completed! Summary sent to email."

IMPORTANT: emailToken persists to avoid re-verification for next session
```

### Success Path
✅ Emails sent to all participants
✅ Session deleted from backend
✅ All participants auto-logged out
✅ Everyone redirected to home
→ Can create new session or wait for next standup

### Failure Path
- **Email Send Failed**: Show error, allow retry
- **Session Already Finished**: Show "Session already closed"
- **Network Error**: Show "Failed to complete session. Retry or refresh page."

---

## Session Data Lifecycle

```
1. EMAIL VERIFICATION (5 min, single-use)
   Code → Verify → Generate 30-day JWT emailToken
   Store emailToken in localStorage

2. CREATE SESSION (4-hour TTL starts)
   JWT validated → Email extracted from token
   Creator's email stored in Redis session object
   sessionId + userId generated → stored in localStorage

3. PARTICIPANTS JOIN (real-time via Pusher)
   JWT validated → Email extracted
   Participants added to session.participants[]
   Updates broadcast in real-time

4. RECORD STANDUPS (summaries saved to Redis)
   Audio → Transcribe → Summarize → Save
   All changes broadcast via Pusher

5. CLICK "STANDUP IS FINISHED"
   Send emails (raw transcripts) to creator + optional recipients
   Delete session from Redis

6. AUTO-LOGOUT ALL PARTICIPANTS (via Pusher event)
   Broadcast 'session-finished' event
   Clear session data from localStorage (sessionId, userId, userName)
   KEEP emailToken (30-day lifecycle)

7. SESSION GONE, EMAIL TOKEN PERSISTS
   Redis entry deleted
   localStorage: sessionId, userId, userName cleared
   localStorage: emailToken REMAINS (enables next session without re-verification)

8. NEXT SESSION (Within 30 days)
   User can create/join NEW session using same emailToken
   No email re-verification needed ✅
```

---

## Complete Data Flow Diagram

```
┌──────────────────────────────────────────────────┐
│            USER BROWSER(S)                       │
├──────────────────────────────────────────────────┤
│                                                   │
│ 1. Email Verification                           │
│    Email → Code → Verify → JWT Token            │
│                    ↓                              │
│ 2. Create/Join Session                          │
│    Name → Optional Password → Create/Join       │
│                    ↓                              │
│ 3. Session Room (Real-time via Pusher)          │
│    Participants + Summaries                     │
│                    ↓                              │
│ 4. Record Standups (Auto-save to Redis)         │
│    Talk → Transcribe → Summarize → Display      │
│                    ↓                              │
│ 5. Standup is Finished (Send + Auto-Logout)    │
│    Click button → Spinner → Send emails         │
│    → Session deleted → Auto-logout → Home       │
│                                                   │
└──────────────────────────────────────────────────┘
                    ↑ ↓ ↔
   ┌────────────────────────────────┐
   │                                  │
   ↓                                  ↓
┌──────────────────┐      ┌──────────────────┐
│ NETLIFY FUNCTIONS│      │ EXTERNAL SERVICES│
├──────────────────┤      ├──────────────────┤
│                   │      │                   │
│ send-verification │────→ │ SendGrid         │
│ verify-email      │────→ │ (Email codes)    │
│ create-session    │      │                   │
│ join-session      │      │                   │
│ get-session       │      │                   │
│ transcribe        │────→ │ Deepgram         │
│ summarize-trans   │────→ │ (Audio-to-text)  │
│ save-transcript   │      │                   │
│ finish-session    │────→ │ Portkey/Claude   │
│ (send emails      │      │ (Summarization)  │
│  + delete session)│      │                   │
│                   │      │ SendGrid         │
│                   │────→ │ (Emails)         │
│                   │      │                   │
└────┬──────────────┘      └──────────────────┘
     │
     ↓
┌──────────────────┐      ┌──────────────────┐
│ REDIS (Upstash)  │      │ PUSHER CHANNELS  │
├──────────────────┤      ├──────────────────┤
│                   │      │                   │
│ session:{id}     │ ←───→ │ session-{id}     │
│ - participants   │ Events│ user-joined      │
│ - transcripts    │      │ user-left        │
│ - TTL: 4 hours   │      │ status-changed   │
│                   │      │ transcript-added │
│ Deleted after     │      │ session-finished │
│ finish-session    │      │ (triggers logout)│
│                   │      │                   │
└──────────────────┘      └──────────────────┘
```

---

## Security Model

### Email Verification (Primary)
- ✅ Email proves identity (can receive messages)
- ✅ 6-digit code single-use, 5-min expiration
- ✅ Rate limited (10 codes/hour per email)
- ✅ Prevents enumeration (generic messages)
- ✅ Code hashed with PBKDF2 before Redis storage
- ✅ 30-day JWT emailToken stored in localStorage (HS256 + SESSION_SECRET)
- ✅ JWT validated server-side on every request (signature + expiration)
- ✅ Email stored with session for sending summaries

### Optional Password (Secondary)
- ✅ Protects against accidental joins
- ✅ Not required (email auth sufficient)
- ✅ PBKDF2 hashed (100K iterations)
- ✅ Timing-safe comparison

### Attack Prevention
- ✅ Rate Limiting: 10 codes/hour per email, 5 attempts per code
- ✅ Email Enumeration: Generic "Check email" responses
- ✅ Brute Force: Code expires after 5 wrong attempts
- ✅ Replay Attacks: Single-use verification codes
- ✅ Credential Stuffing: Email + code required (not passwords)
- ✅ Session Fixation: sessionId + userId validated against Redis on every request
- ✅ JWT Forgery: Server validates signature (HS256) and expiration on every request
- ✅ Token Theft: Limited impact (can only create/join 4h sessions, no persistent access)
- ✅ XSS: Input validation & DOMPurify on user input
- ✅ localStorage Tampering: Server validates emailToken JWT + sessionId + userId against Redis
- ✅ Timing Attacks: Timing-safe password comparison (if password used)

---

## Browser Compatibility

- ✅ Chrome/Chromium (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (iOS 14+, macOS 11+)
- ✅ Edge (latest 2 versions)
- ⚠️ Requires: Microphone API, WebRTC, localStorage, Pusher WebSocket
