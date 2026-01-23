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

Session access is determined solely by:
1. **Valid session ID in URL** (from backend perspective)
2. **Cached session + user ID in localStorage** (from client perspective)

---

## Session State Model

Session persistence uses a three-key system:

```javascript
localStorage = {
  'standup_session': {...},      // Full session object
  'standup_user_id': 'abc123',   // Current user's ID in session
  'standup_user_name': 'Alice'   // Current user's name
}
```

- **Backend**: Source of truth (Redis). Validates sessions exist and aren't expired.
- **localStorage**: Cache. Used to restore user to previous session without re-joining.

---

## Router Guard Logic

All access to `/session/:id` is protected by this guard:

```
Request: /session/:id
    ↓
1. Backend validation: Does :id exist and not expired?
    ├─ NO → Redirect to / (user can create new)
    ├─ YES (session valid)
    │   ↓
    │   2. Local cache check: Do I have :id + userId?
    │       ├─ YES → Allow access (user stays in session)
    │       └─ NO → Redirect to / with ?sessionId=:id (user must join)
```

---

## Home Page Logic

The Home page (`/`) shows different UI based on URL params:

```
Route: /
├─ Has ?sessionId param?
│  ├─ YES → Show JoinSessionCard (sessionId pre-filled from query)
│  └─ NO → Show CreateSessionCard
│
└─ (Optional: Show ContinueSessionCard if user has cached session)
```

**Routing from session room:**
- Valid session but not in cache → Redirect to `/?sessionId=abc123`
- Invalid/expired session → Redirect to `/` (no params)
- Leave session → Navigate to `/` (programmatically, no params)

---

## User Flows

### Flow 1: Create New Session

```
Home page (/) with CreateSessionCard
  User enters name "Alice" → clicks "Create Session"
    ↓
createSession() API call
  Backend: Generate sessionId, userId
  Returns: {sessionId, userId, expiresAt}
    ↓
Save to localStorage:
  standup_session: {...}
  standup_user_id: '...'
  standup_user_name: 'Alice'
    ↓
Navigate to /session/abc123def
    ↓
Router guard:
  ✓ Backend: Has abc123def? YES
  ✓ Cache: Have session + userId? YES
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
  ✓ Backend: Has abc123def? YES
  ✗ Cache: Empty
    ↓
Redirect: / with ?sessionId=abc123def
    ↓
Home page: Shows JoinSessionCard
  (sessionId='abc123def' pre-filled from query param)
  User enters name "Bob"
    ↓
joinSession() API call
  Backend: Add Bob to session, generate userId
  Returns: {sessionId, userId, participants, ...}
    ↓
Save to localStorage:
  standup_session: {...}
  standup_user_id: '...'
  standup_user_name: 'Bob'
    ↓
Navigate to /session/abc123def
    ↓
Router guard:
  ✓ Backend: Has abc123def? YES
  ✓ Cache: Have session + userId? YES
    ↓
Show session room
```

---

### Flow 3: Page Reload While in Session

```
User in: /session/abc123def
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
    ↓
Allow direct access (no redirect)
    ↓
Show same session room
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
- ✅ After `createSession()` → All three keys
- ✅ After `joinSession()` → All three keys
- ✅ After `updateParticipantStatus()` → Session only
- ✅ After `addTranscript()` → Session only
- ✅ After `addSummary()` → Session only

### When Cleared
- ✅ After `leaveSession()` → All three keys
- ✅ On expiration check → All three keys
- ✅ When entering different sessionId → Overwrites all

### Restoration
- ✅ On app mount → `initializeSessionFromCache()`
- ✅ Loads all three keys
- ✅ Validates expiration
- ✅ Restores to reactive state

---

## Session Validation Rules

### Backend (`/netlify/functions/get-session/:id`)
- ✓ Session ID exists in Redis
- ✓ Session not expired (expiresAt > now)
- ✓ Returns session object

### Client-Side
- ✓ Session ID format (base64url, 40+ chars)
- ✓ Participant structure valid
- ✓ Date fields valid
- ✓ Not expired: expiresAt < now

### Router Guard
- ✓ Always check backend first
- ✓ Then check local cache
- ✓ Redirect if mismatch

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

---

## Testing Coverage

### Unit Tests (useSession.test.ts)
- ✓ Create/join saves all three localStorage keys
- ✓ Leave clears all three keys
- ✓ Initialize restores all three keys
- ✓ Expired sessions removed on load
- ✓ Invalid data handled gracefully

### Router Tests (router.test.ts)
- ✓ Allows access when cached
- ✓ Redirects to join when valid but not cached
- ✓ Redirects to create when invalid/expired
- ✓ Preserves ?sessionId query param
- ✓ Different sessions redirect to join

### E2E Tests (session-persistence.spec.ts)
- ✓ Create → Reload → Still in session
- ✓ Join → Reload → Still in session
- ✓ Leave → Back to home
- ✓ Invalid link → Back to home
- ✓ Multiple reloads → Persist
- ✓ Member stays after reload

---

## Implementation Status

- [x] Router guard logic implemented
- [x] localStorage persistence (all 3 keys)
- [x] Initialize on app mount
- [x] Leave clears storage
- [x] Unit tests written
- [x] Router tests written
- [x] E2E tests written
- [ ] Password protection (post-MVP)
- [ ] Multi-tab sync (future)
- [ ] Session history DB (future)
