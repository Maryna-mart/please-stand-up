# Session Flow Architecture

This document describes all session lifecycle scenarios and routing logic for the Standup Timer application.

---

## Core Principle

**No roles.** Everyone has the same capabilities:
- Can create a session
- Can join a session
- Can record standup
- Can generate summary and send email
- Can see all participants' transcripts

Session access is determined by:
1. **Email verification** (required first - passwordless authentication via 6-digit codes sent to email)
2. **Valid session ID in URL** (from backend perspective)
3. **Cached session + user ID in localStorage** (from client perspective)

---

## Session State Model

Session persistence uses a four-key system:

```javascript
localStorage = {
  'standup_email_token': 'eyJ...',  // JWT token from email verification (30-day expiration)
  'standup_session': {...},         // Full session object (4-hour TTL)
  'standup_user_id': 'abc123',      // Current user's ID in session
  'standup_user_name': 'Alice'      // Current user's name
}
```

**Key Details:**
- **Email Token**: JWT generated after email verification. Persists across sessions for 30 days, allowing users to create/join multiple sessions without re-verifying.
- **Session Object**: Cached from backend. Includes participants, expiration, password requirement flag, summary data.
- **Backend**: Source of truth (Redis). Sessions have automatic 4-hour TTL - data deleted after 4 hours regardless of user action.
- **localStorage**: Cache. Used to restore user state without re-authenticating email.

---

## Router Guard Logic

All access to `/session/:id` is protected by this guard:

```
Request: /session/:id
    ↓
1. Email verification check:
    ├─ No emailToken in localStorage? → Redirect to / (must verify email)
    └─ YES → Continue
    ↓
2. Backend validation: Does :id exist and not expired?
    ├─ NO → Redirect to / (user can create new)
    ├─ YES (session valid)
    │   ↓
    │   3. Local cache check: Do I have :id + userId?
    │       ├─ YES → Continue
    │       └─ NO → Redirect to / with ?sessionId=:id (user must join)
    │   ↓
    │   4. Participant verification: Is userId in participants list?
    │       ├─ YES → Continue
    │       └─ NO → Clear cache, redirect to join (prevents spoofing)
    │   ↓
    │   5. Password check: Is session password-protected?
    │       ├─ YES → Redirect to /?sessionId=:id&requirePassword=true (re-enter password on reload)
    │       └─ NO → Allow access (user stays in session)
```

**Implementation Note:** Email token validation happens in Home.vue during email verification flow. Session access is guarded by router checks above. See [src/router/index.ts](src/router/index.ts) for implementation details.

---

## Home Page Logic

The Home page (`/`) shows different UI based on email verification and URL params:

```
Route: /
├─ Has emailToken in localStorage?
│  ├─ NO → Show EmailVerificationCard (Step 1: verify email)
│  │   └─ On success → Get JWT token, store in localStorage
│  │
│  └─ YES (email verified) → Continue to session selection
│      ├─ Has ?sessionId param?
│      │  ├─ YES → Show JoinSessionCard (sessionId pre-filled from query)
│      │  └─ NO → Show CreateSessionCard
│      │
│      └─ Optional: Show email status bar with verified email + "Use another email" button
```

**Email Verification Component** (`EmailVerificationCard.vue` → `VerificationCodeCard.vue`):
- Step 1: User enters email, clicks "Send Code"
- Step 2: SendGrid sends 6-digit code to email (5-minute expiration)
- Step 3: User enters code, clicks "Verify"
- Step 4: Backend validates code, returns JWT token
- JWT stored in localStorage (30-day expiration)

**Routing from session room:**
- Valid session but not in cache → Redirect to `/?sessionId=abc123`
- Invalid/expired session → Redirect to `/` (no params)
- Leave session → Navigate to `/` (programmatically, emailToken persists)
- Session expired (4 hours) → Redis auto-deletes, user can create new session with same email

---

## User Flows

### Flow 1: Create New Session

```
Home page (/) - Email verification flow
  Step 1: User enters email "alice@example.com" → clicks "Send Code"
    ↓
  Backend sends 6-digit code via SendGrid (5-min expiration)
    ↓
  Step 2: User enters code "123456" → clicks "Verify"
    ↓
  Backend validates code, returns JWT emailToken (30-day expiration)
    ↓
  Token stored in localStorage: standup_email_token
    ↓
Home page (/) with CreateSessionCard (email verified)
  User enters name "Alice", optional password → clicks "Create Session"
    ↓
createSession() API call (includes emailToken in Authorization header)
  Backend: Generate sessionId, userId, passwordHash (if provided)
  Returns: {sessionId, userId, expiresAt, passwordRequired, participants}
    ↓
Save to localStorage:
  standup_email_token: 'eyJ...' (persists - 30-day expiration)
  standup_session: {...}
  standup_user_id: '...'
  standup_user_name: 'Alice'
    ↓
Navigate to /session/abc123def
    ↓
Router guard:
  ✓ emailToken exists? YES
  ✓ Backend: Has abc123def? YES
  ✓ Cache: Have session + userId? YES
  ✓ Participant: userId in participants? YES
  ✓ Password: Protected? NO
    ↓
Show session room
```

---

### Flow 2: Join via Link (First Time)

```
Receive link: https://app.com/session/abc123def
  Click link
    ↓
Browser: Navigate to /session/abc123def
    ↓
Router guard:
  ✗ emailToken in localStorage? NO → Redirect to /
    ↓
Home page (/): Email verification needed
  Step 1: User enters email "bob@example.com" → clicks "Send Code"
  Step 2: User enters code from email → clicks "Verify"
  Step 3: JWT emailToken stored in localStorage
    ↓
Router guard re-checks:
  ✓ emailToken exists? YES
  ✓ Backend: Has abc123def? YES
  ✗ Cache: Empty
    ↓
Redirect: /?sessionId=abc123def
    ↓
Home page: Shows JoinSessionCard
  (sessionId='abc123def' pre-filled from query param)
  Email already verified - show status bar with email
  User enters name "Bob", password if required
    ↓
joinSession() API call (includes emailToken in Authorization header)
  Backend: Verify password (if required), add Bob to session, generate userId
  Returns: {sessionId, userId, participants, passwordRequired, ...}
    ↓
Save to localStorage:
  standup_email_token: 'eyJ...' (persists)
  standup_session: {...}
  standup_user_id: '...'
  standup_user_name: 'Bob'
    ↓
Navigate to /session/abc123def
    ↓
Router guard:
  ✓ emailToken exists? YES
  ✓ Backend: Has abc123def? YES
  ✓ Cache: Have session + userId? YES
  ✓ Participant: userId in participants? YES
  ✓ Password: Protected? NO (or was verified)
    ↓
Show session room
```

---

### Flow 3: Page Reload While in Session (Non-Password-Protected)

```
User in: /session/abc123def (no password protection)
  Has in cache: {session.id=abc123def, userId='xyz'}
    ↓
User: Reloads page
    ↓
App.vue: mounted → initializeSessionFromCache()
    ↓
Load from localStorage:
  ✓ standup_session → currentSession
  ✓ standup_user_id → currentUserId
  ✓ standup_user_name → currentUserName
    ↓
Browser: Navigate to /session/abc123def
    ↓
Router guard:
  ✓ Backend: Validates abc123def exists? YES
  ✓ Cache: session.id === 'abc123def' && userId set? YES
  ✓ Participant: Is userId in participants list? YES ← NEW
  ✓ Password: Is session password-protected? NO ← NEW
    ↓
Allow direct access (no redirect)
    ↓
Show same session room
```

### Flow 3b: Page Reload While in Password-Protected Session

```
User in: /session/abc123def (password-protected)
  Has in cache: {session.id=abc123def, userId='xyz', userName='Alice'}
    ↓
User: Reloads page
    ↓
App.vue: mounted → initializeSessionFromCache()
    ↓
Load from localStorage:
  ✓ standup_session → currentSession
  ✓ standup_user_id → currentUserId
  ✓ standup_user_name → currentUserName
    ↓
Browser: Navigate to /session/abc123def
    ↓
Router guard:
  ✓ Backend: Validates abc123def exists? YES
  ✓ Cache: session.id === 'abc123def' && userId set? YES
  ✓ Participant: Is userId in participants list? YES
  ✗ Password: Is session password-protected? YES
    ↓
Redirect: /?sessionId=abc123def&requirePassword=true
  (All participants must re-enter password on reload - no role exemptions)
    ↓
Home page: Shows JoinSessionCard with:
  - sessionId pre-filled: 'abc123def'
  - Name pre-filled from cache: 'Alice'
  - Password field auto-focused
  - Blue info banner: "Session reload detected. Please re-enter your password to continue."
    ↓
User: Enters password "SecurePass123", clicks "Join Session"
    ↓
joinSession() API call:
  - Backend verifies password hash matches
  - Returns existing userId (user already participant)
    ↓
Navigate to: /session/abc123def
    ↓
Router guard:
  ✓ All checks pass (userId valid, password just verified)
    ↓
Show: Same session room
```

---

### Flow 4: Leave Session

```
User in: /session/abc123def
  Clicks: "Leave Session" button
    ↓
leaveSession() called:
  Clear: currentSession = null
  Clear: currentUserId = null
  Clear: currentUserName = null
  Delete from localStorage:
    - standup_session
    - standup_user_id
    - standup_user_name
    ↓
Navigate to: /
    ↓
Home page: Shows CreateSessionCard
  (No ?sessionId param, fresh UI)
  User can: Create new OR have another way to join
```

---

### Flow 5: Rejoin After Leaving

```
User: Previously in /session/abc123def
  Actions: Left the session (Flow 4)
  State: localStorage cleared
    ↓
User: Wants to rejoin
  Option A: Clicks saved link: /session/abc123def
  Option B: Asks for link again: /session/abc123def
    ↓
Browser: Navigate to /session/abc123def
    ↓
Router guard:
  ✓ Backend: Has abc123def? YES (still valid)
  ✗ Cache: Empty
    ↓
Redirect: / with ?sessionId=abc123def
    ↓
Home page: Shows JoinSessionCard
  (sessionId='abc123def' pre-filled)
  User: Enters name (can be same or different)
    ↓
joinSession() API call
  Backend: Add to session
  Returns: userId (may be same if rejoining with same name)
    ↓
Save to localStorage & navigate
    ↓
Show session room (rejoined)
```

---

### Flow 6: Session Expired (4 Hours)

```
Created: /session/abc123def at 10:00 AM
  Expires: 2:00 PM (4 hours later)
    ↓
User: Reloads page at 3:00 PM (expired)
    ↓
App.vue: mounted → initializeSessionFromCache()
    ↓
Load from localStorage:
  Check: expiresAt < now?
  YES → Expired
    ↓
Remove from localStorage (auto cleanup)
  Return: null
    ↓
Browser: Navigate to /session/abc123def
    ↓
Router guard:
  ✗ Backend: Has abc123def? NO (expired, deleted)
    ↓
Redirect: / (no params)
    ↓
Home page: Shows CreateSessionCard
  (Fresh state, user can create new)
```

---

### Flow 7: Invalid/Expired Link

```
Received: /session/abc123def (old link)
  Created: 5+ hours ago (now expired)
    ↓
Click: Link
    ↓
Router guard:
  ✗ Backend: abc123def exists? NO
    ↓
Redirect: /
    ↓
Home page: Shows CreateSessionCard
```

---

### Flow 8: Switch Between Sessions

```
User in: /session/abc123 (cached)
  localStorage: {session.id='abc123', userId='user-A'}
    ↓
Receives: Link to /session/xyz789
  Clicks: Link
    ↓
Router guard:
  ✓ Backend: Has xyz789? YES
  ✗ Cache: session.id='abc123' != 'xyz789'
    ↓
Redirect: /?sessionId=xyz789
    ↓
Home page: Shows JoinSessionCard (xyz789 filled)
  Old cache (abc123) still in localStorage
    ↓
User: Enters name, joins xyz789
    ↓
joinSession(xyz789) called
    ↓
Save to localStorage:
  standup_session: xyz789 (overwrites abc123)
  standup_user_id: user-B
  standup_user_name: (new name)
    ↓
Show: /session/xyz789
```

---

## localStorage Persistence

### When Saved
- ✅ After `verifyEmail()` → emailToken (JWT stored, 30-day expiration)
- ✅ After `createSession()` → All four keys (emailToken + session data)
- ✅ After `joinSession()` → All four keys (emailToken + session data)
- ✅ After `updateParticipantStatus()` → Session only
- ✅ After `addTranscript()` → Session only
- ✅ After `addSummary()` → Session only

### When Cleared
- ✅ After `leaveSession()` → Session data only (emailToken persists for 30 days)
- ✅ On expiration check → Session data only if expired
- ✅ When entering different sessionId → Overwrites session data (emailToken persists)
- ✅ On email re-verification → Replaces emailToken (starts new 30-day timer)

### Automatic Cleanup (Server-Side)
- Redis automatically deletes session data after **4 hours** (14400 seconds)
- Verification codes expire after **5 minutes** (300 seconds)
- Rate limit counters expire after **1 hour** (3600 seconds)
- Email token JWT expires after **30 days** (can be regenerated by reverifying email)

### Restoration
- ✅ On app mount → `initializeSessionFromCache()`
- ✅ Checks emailToken first (required for any session access)
- ✅ Validates emailToken expiration (not expired?)
- ✅ Loads session cache if valid
- ✅ Restores to reactive state

---

## Session Validation Rules

### Email Token Validation
**Frontend** (`src/views/Home.vue`):
- ✓ Check emailToken exists in localStorage before showing session cards
- ✓ Verify JWT structure (three dot-separated parts: header.payload.signature)
- ✓ Decode payload to extract email (for display in status bar)

**Backend** (`netlify/functions/*`):
- ✓ Extract emailToken from Authorization header (`Bearer <token>`)
- ✓ Verify JWT signature (using SESSION_SECRET)
- ✓ Check expiration (30 days from issuance)
- ✓ Return 401 if invalid/expired

### Backend (`/netlify/functions/get-session/:id`)
- ✓ Session ID exists in Redis
- ✓ Session not expired (automatic deletion after 4 hours)
- ✓ Returns session object with participants, passwordRequired flag

### Client-Side Session Validation
- ✓ Session ID format (base64url, 40+ chars)
- ✓ Participant structure valid
- ✓ Date fields valid
- ✓ Expiration check (not expired locally)

### Router Guard (See [src/router/index.ts](src/router/index.ts))
1. ✓ Check emailToken exists in localStorage
2. ✓ Check backend for session existence
3. ✓ Check local cache for session + userId
4. ✓ **Verify userId is in participants list** (prevents localStorage spoofing)
5. ✓ **For password-protected sessions, redirect to password re-entry on reload** (re-verify password)
6. ✓ Redirect if any validation fails

---

## Edge Cases

### Case 1: Stale Link
```
Link: /session/abc123 (created 5+ hours ago, expired)
  ↓
Router: Backend validation fails
  ↓
Result: Redirect to /
```

### Case 2: Invalid SessionID Format
```
URL: /session/!!!invalid!!!
  ↓
Router: Backend validation fails
  ↓
Result: Redirect to /
```

### Case 3: Multiple Browser Tabs
```
Tab A: In session abc123
Tab B: Also in session abc123
  (shared localStorage)
    ↓
Tab A: Leave
  (clears localStorage for both)
    ↓
Tab B: Reload
  (cache gone, shows join card)
```

### Case 4: User Edits SessionID in JoinForm
```
Query: ?sessionId=abc123
Form: sessionId field (allows editing)
  ↓
User: Changes to xyz789
  ↓
Submit: joinSession(xyz789, name, password)
  ↓
Result: Joins xyz789 instead
```

### Case 5: Spoofed userId on Reload (NEW)
```
User in: /session/abc123 (password-protected)
  Has cached: userId='user-abc-123'
  State: Reload page
    ↓
Attacker: Opens DevTools, edits localStorage
  Changes: standup_user_id to 'user-xyz-999'
  This userId doesn't exist in session
    ↓
Browser: Reload page
    ↓
Router guard:
  ✓ Backend: Session exists? YES
  ✓ Cache: Has session & userId? YES
  ✗ Participant: Is userId in participants? NO
    ↓
Router guard action:
  1. Clear cache (leaveSession())
  2. Redirect to /?sessionId=abc123
    ↓
Result: Attacker redirected to join card, can't spoof access
  Must enter correct password to rejoin
```

---

## Password Protection

### Overview
Sessions can be optionally protected with a password. Password validation happens at two levels:
1. **Client-side**: Real-time validation as user types
2. **Server-side**: Verification during `joinSession()` API call

### Implementation Details

**Password Strength Requirements:**
- Minimum 8 characters
- Enforced on both create and join forms
- User gets real-time feedback

**Server-Side Security:**
- Passwords hashed with PBKDF2 (100K iterations)
- Hash stored in Redis (not plaintext)
- Timing-safe comparison to prevent timing attacks
- Backend rejects wrong password with error code 401

**Client-Side Validation:**
- `validatePasswordStrength()` in [src/lib/sanitize.ts](src/lib/sanitize.ts)
- Input validation before API calls
- Error messages shown to user

### User Flows with Password

#### Flow A: Create Protected Session
```
User: Creates session with password "SecurePass123"
  ↓
Client: Validates password strength ✓
  ↓
API: createSession({leaderName, password})
  ↓
Backend: Hash password with PBKDF2
  ↓
Store: {sessionId, passwordRequired: true, passwordHash: '...'}
  ↓
User: Immediately in session (leader doesn't need password)
```

#### Flow B: Join Protected Session
```
User: Receives link to protected session
  ↓
Router: Valid session but not cached → redirect to join card
  ↓
JoinSessionCard: Shows password input (marked "if required")
  ↓
User: Enters name + password, submits
  ↓
API: joinSession({sessionId, participantName, password})
  ↓
Backend: Verify password hash using timing-safe comparison
  ├─ Correct → User joins session ✓
  └─ Wrong → Returns 401 error, user shown error message
```

#### Flow C: Join Without Password
```
User: Joins unprotected session
  ↓
Password field: Left empty (optional)
  ↓
API: joinSession({sessionId, participantName})
  ↓
Backend: Skip password validation
  ↓
Result: User joins successfully ✓
```

### Error Handling

**Frontend:**
- Invalid password format → Real-time validation error below input
- Wrong password on join → Error toast/notification shown

**Backend:**
- Session not found → 404 error
- Password required but not provided → 401 error
- Wrong password → 401 error with "Incorrect password" message
- All errors caught and converted to user-friendly messages



