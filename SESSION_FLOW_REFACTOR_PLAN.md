# SESSION_FLOW.md Refactoring Plan (Complete)
## Including Logic, UI, and Tests

**⚠️ Important**: This is a **TEMPORARY BLUEPRINT/ROADMAP** for refactoring SESSION_FLOW.md.
- Use this plan to guide updates to the actual **SESSION_FLOW.md** documentation
- After completing all updates to SESSION_FLOW.md, **DELETE THIS FILE**
- Do NOT commit both files long-term

---

## Current State → New State

### What We're Changing
- **Auth Model**: Password-based → Email-based (with optional password)
- **Primary Credential**: Session ID + Password → Email verification token (JWT)
- **Flows**: 8 scenarios need email verification step added
- **localStorage**: 3 keys → 4 keys (add emailToken)
- **Router Guard**: Session existence check → Email token validation + session existence check
- **Password**: Primary feature → Optional secondary feature
- **Tests**: All router/session tests need updates for email auth

---

## Part 1: DOCUMENTATION REFACTORING

### Phase 1: Core Concept Updates

#### Task 1.1: Update "Core Principle" Section
- **Current**: "No roles. Everyone has same capabilities."
- **New**: Keep this, but clarify email auth is mandatory first step
- **Details**:
  - Email verification required before any session access
  - Password is optional (secondary) protection
  - Email proves deliverability for summary emails
  - Everyone has same capabilities once email verified

#### Task 1.2: Update "Session State Model"
- **Current localStorage keys**:
  ```javascript
  {
    'standup_session': {...},
    'standup_user_id': '...',
    'standup_user_name': '...'
  }
  ```
- **New localStorage keys**:
  ```javascript
  {
    'standup_session': {...},
    'standup_user_id': '...',
    'standup_user_name': '...',
    'standup_email_token': 'eyJ...'  // NEW: JWT from Step 1
  }
  ```
- **Add note**: Email token is validated server-side on EVERY API call

#### Task 1.3: Update "Router Guard Logic"
- **Current flow**:
  1. Backend validation: Session exists?
  2. Local cache check: Have session + userId?

- **New flow**:
  1. Check if emailToken in localStorage
     - NO → Redirect to / (must verify email first)
     - YES → Validate JWT server-side
  2. Backend validation: Session exists?
  3. Local cache check: Have session + userId?
  4. Optional: If session has password, might need re-entry on reload

- **Pseudo-code**:
  ```
  Request: /session/:id with emailToken in header
      ↓
  1. EmailToken present?
      ├─ NO → Redirect to / (verify email)
      └─ YES → Validate JWT server-side
          ↓
  2. JWT valid and not expired?
      ├─ NO → Redirect to / (re-verify email)
      └─ YES → Continue
          ↓
  3. Backend: Session :id exists?
      ├─ NO → Redirect to / (no params)
      └─ YES → Continue
          ↓
  4. Cache: Have session + userId?
      ├─ YES → Allow access
      └─ NO → Redirect to /?sessionId=:id (join)
  ```

#### Task 1.4: Update "Home Page Logic"
- **Add email verification as first step**:
  - Email verification card appears BEFORE CreateSessionCard
  - Once verified, email token stored in localStorage
  - Then show Create/Join based on ?sessionId param

---

### Phase 2: Update 8 User Flow Scenarios

#### Task 2.1: Refactor Flow 1 - Create New Session
- **Add Step 0**: Email verification (send code, verify, get JWT token)
- **Update**: Flow now starts with verified email
- **Key changes**:
  - Email already verified (have emailToken)
  - Session creation includes email in request
  - localStorage now includes emailToken
  - Router guard validates emailToken first

#### Task 2.2: Refactor Flow 2 - Join via Link (First Time)
- **Add Step 0**: Email verification before join card
- **Update**: User provides verified email when joining
- **Key changes**:
  - User clicks link → redirects to home with ?sessionId=...
  - Email verification card appears (not join card yet)
  - After email verified, join card appears with sessionId pre-filled
  - Join includes email from token
  - Optional: If session has password, password field appears

#### Task 2.3: Refactor Flow 3 - Page Reload (Non-Password-Protected)
- **Add checks**:
  - Check emailToken exists
  - Validate emailToken server-side
  - Check session exists
  - Check userId in participants
- **Difference**: Now TWO validations (email + session)

#### Task 2.4: Refactor Flow 3b - Page Reload (Password-Protected)
- **Changes**:
  - EmailToken still valid (no re-verification needed)
  - But password-protected session requires password re-entry
  - User redirected to /?sessionId=...&requirePassword=true
  - Join card shows: sessionId + name pre-filled, password field focused

#### Task 2.5: Refactor Flow 4 - Leave Session
- **Changes**:
  - Clear sessionId, userId, userName from localStorage
  - **Decision**: Clear emailToken or keep it?
    - Option A: Clear on leave (must re-verify next time)
    - Option B: Keep (30-day expiration, user can create new sessions)
  - Recommended: **Keep emailToken** (better UX)

#### Task 2.6: Refactor Flow 5 - Rejoin After Leaving
- **Changes**:
  - If emailToken kept: User can rejoin without re-verification
  - If emailToken cleared: User must re-verify email first

#### Task 2.7: Refactor Flow 6 - Session Expired (4 Hours)
- **Changes**:
  - Email token stays valid (separate 30-day expiration)
  - Session expires from Redis
  - User redirected to home
  - Can create new session with same email token (no re-verification)

#### Task 2.8: Refactor Flow 7 - Invalid/Expired Link
- **Changes**:
  - Link validation same (session doesn't exist)
  - If emailToken valid: Show create card
  - If emailToken expired: Show email verification card

#### Task 2.9: Refactor Flow 8 - Switch Between Sessions
- **Changes**:
  - EmailToken valid for both sessions
  - Session caching changes (overwrites), not email token
  - Can switch between multiple sessions with same email

---

### Phase 3: Update localStorage Persistence Section

#### Task 3.1: When Saved
- **New trigger**: After `verifyEmail()` → Save emailToken
- **Keep existing triggers** but note they also need emailToken

#### Task 3.2: When Cleared
- **Decision**: emailToken persistence on leave
  - Recommend: Keep emailToken in localStorage (30-day expiration)
  - Only clear session data (sessionId, userId, userName)

#### Task 3.3: Restoration
- **New logic**: On app mount
  1. Check emailToken exists
  2. Validate JWT (not expired)
  3. If expired → require re-verification
  4. If valid → check session cache

---

### Phase 4: Update Session Validation Rules

#### Task 4.1: Backend Validation
- **Add**: EmailToken validation (server-side)
- **Add**: Verify email from token matches participants
- **Keep**: Session existence, expiration checks

#### Task 4.2: Client-Side Validation
- **Add**: EmailToken format validation
- **Add**: JWT expiration check
- **Keep**: Session format, date validations

#### Task 4.3: Router Guard
- **Add Step 1**: EmailToken validation
- **Update Step 2-4**: Keep session validation logic

---

### Phase 5: Update Edge Cases

#### Task 5.1: Case 1 - Stale Link
- **Update**: Check both emailToken AND session
- **New logic**: If email valid but session expired, can create new session

#### Task 5.2: Case 2 - Invalid SessionID Format
- **No change**: Still invalid, redirect to home

#### Task 5.3: Case 3 - Multiple Browser Tabs
- **Update**: emailToken shared across tabs (good for UX)
- **Note**: Session cache also shared, so leaving one tab affects all

#### Task 5.4: Case 4 - User Edits SessionID in JoinForm
- **No change**: Form allows editing sessionId
- **Note**: emailToken still valid, can join different sessions

#### Task 5.5: Case 5 - Spoofed userId on Reload
- **Add**: emailToken validation adds another security layer
- **Even if userId spoofed**: emailToken must be valid (prevents unauthorized access)

---

### Phase 6: Update Password Protection Section

#### Task 6.1: Clarify Password is Optional
- **New positioning**: Secondary security layer
- **Update flows**: Password only matters if session creator chose it
- **Simplify**: Remove "password-required re-entry" flows if complex

#### Task 6.2: Update Password Flows
- **Flow A - Create Protected Session**:
  - User already verified email
  - Optional: Add password for extra security
  - Password stored as hash in Redis

- **Flow B - Join Protected Session**:
  - User already verified email
  - If session has password: password field appears
  - Password checked server-side (timing-safe comparison)

- **Flow C - Join Unprotected Session**:
  - No change: Just email verification + join

#### Task 6.3: Clarify Password Isn't Primary Auth
- **Add note**: Email verification is primary credential
- **Password**: Additional protection (like "doorlock on top of entry keycard")
- **Security model**: Email alone sufficient for 4-hour temporary sessions

---

## Part 2: CODE REFACTORING

### Code Changes Needed

#### File 1: `src/composables/useSession.ts`
**Changes**:
1. Add `emailToken` to state:
   ```typescript
   currentEmailToken: ref<string | null>(null)
   ```

2. Update localStorage keys:
   ```typescript
   const STORAGE_KEYS = {
     session: 'standup_session',
     userId: 'standup_user_id',
     userName: 'standup_user_name',
     emailToken: 'standup_email_token'  // NEW
   }
   ```

3. Update `initializeSessionFromCache()`:
   ```typescript
   // Check emailToken first
   const storedEmailToken = localStorage.getItem(STORAGE_KEYS.emailToken)
   if (!storedEmailToken) {
     return null  // Must verify email first
   }
   currentEmailToken.value = storedEmailToken

   // Then check session
   const storedSession = localStorage.getItem(STORAGE_KEYS.session)
   // ... rest of logic
   ```

4. Add new function `setVerifiedEmail(token)`:
   ```typescript
   setVerifiedEmail(token: string) {
     currentEmailToken.value = token
     localStorage.setItem(STORAGE_KEYS.emailToken, token)
   }
   ```

5. Update `leaveSession()`:
   ```typescript
   // Clear session data but KEEP email token
   currentSession.value = null
   currentUserId.value = null
   currentUserName.value = null

   localStorage.removeItem(STORAGE_KEYS.session)
   localStorage.removeItem(STORAGE_KEYS.userId)
   localStorage.removeItem(STORAGE_KEYS.userName)
   // emailToken stays (user can create new session without re-verifying)
   ```

---

#### File 2: `src/router/index.ts` or guard file
**Changes**:
1. Update router guard:
   ```typescript
   router.beforeEach(async (to, from, next) => {
     // If trying to access /session/:id
     if (to.path.startsWith('/session/')) {
       const emailToken = localStorage.getItem('standup_email_token')

       // Step 1: Check emailToken exists
       if (!emailToken) {
         return next({ path: '/', query: { sessionId: to.params.id } })
       }

       // Step 2: Validate JWT server-side
       const isValid = await validateEmailToken(emailToken)
       if (!isValid) {
         localStorage.removeItem('standup_email_token')
         return next('/')
       }

       // Step 3-4: Check session exists and cache
       const session = localStorage.getItem('standup_session')
       if (!session) {
         return next({ path: '/', query: { sessionId: to.params.id } })
       }

       // Allow access
       next()
     } else {
       next()
     }
   })
   ```

---

#### File 3: `src/views/Home.vue` or components
**Changes**:
1. Add EmailVerificationCard as first step
2. Only show CreateSessionCard or JoinSessionCard after email verified
3. Wire `setVerifiedEmail()` from composable on successful verification

---

#### File 4: `src/lib/api.ts` (API client)
**Changes**:
1. Add emailToken to request headers on every call:
   ```typescript
   const headers = {
     'Authorization': `Bearer ${emailToken}`,
     // ... other headers
   }
   ```

2. Handle 401 responses (token expired):
   ```typescript
   if (response.status === 401) {
     // Token expired, redirect to email verification
     localStorage.removeItem('standup_email_token')
     router.push('/')
   }
   ```

---

#### File 5: Netlify Functions (Backend)
**Changes in all endpoints**:
1. Extract and validate emailToken from Authorization header:
   ```typescript
   const emailToken = req.headers.authorization?.split(' ')[1]
   if (!emailToken) {
     return { statusCode: 401, body: 'Missing email token' }
   }

   const decoded = verifyEmailToken(emailToken)
   if (!decoded) {
     return { statusCode: 401, body: 'Invalid email token' }
   }
   ```

2. Use email from token in requests:
   ```typescript
   const email = decoded.email
   // Use this email when creating/joining sessions
   ```

---

## Part 3: TEST REFACTORING

### Phase 1: Unit Tests

#### File: `src/__tests__/unit/useSession.test.ts`
**Tests to Update/Add**:

1. ✅ **Test: Initialize with valid emailToken**
   ```typescript
   it('should initialize with emailToken from localStorage', () => {
     localStorage.setItem('standup_email_token', 'valid.jwt.token')
     localStorage.setItem('standup_session', sessionData)

     initializeSessionFromCache()

     expect(currentEmailToken.value).toBe('valid.jwt.token')
     expect(currentSession.value).toBeDefined()
   })
   ```

2. ✅ **Test: Reject if emailToken missing**
   ```typescript
   it('should return null if emailToken missing', () => {
     localStorage.removeItem('standup_email_token')
     localStorage.setItem('standup_session', sessionData)

     const result = initializeSessionFromCache()

     expect(result).toBeNull()
   })
   ```

3. ✅ **Test: Reject if emailToken invalid**
   ```typescript
   it('should clear localStorage if emailToken invalid', () => {
     localStorage.setItem('standup_email_token', 'invalid.token')
     localStorage.setItem('standup_session', sessionData)

     const result = initializeSessionFromCache()

     expect(result).toBeNull()
     expect(localStorage.getItem('standup_email_token')).toBeNull()
   })
   ```

4. ✅ **Test: setVerifiedEmail stores token**
   ```typescript
   it('should store emailToken in localStorage', () => {
     setVerifiedEmail('new.jwt.token')

     expect(currentEmailToken.value).toBe('new.jwt.token')
     expect(localStorage.getItem('standup_email_token')).toBe('new.jwt.token')
   })
   ```

5. ✅ **Test: leaveSession keeps emailToken**
   ```typescript
   it('should keep emailToken when leaving session', () => {
     currentEmailToken.value = 'token'
     localStorage.setItem('standup_email_token', 'token')
     currentSession.value = sessionData

     leaveSession()

     expect(currentSession.value).toBeNull()
     expect(localStorage.getItem('standup_email_token')).toBe('token')
   })
   ```

6. ✅ **Test: Create session includes emailToken**
   ```typescript
   it('should include emailToken in createSession call', async () => {
     const mockFetch = jest.spyOn(global, 'fetch')
     currentEmailToken.value = 'token'

     await createSession('Alice', 'password')

     expect(mockFetch).toHaveBeenCalledWith(
       expect.any(String),
       expect.objectContaining({
         headers: expect.objectContaining({
           'Authorization': 'Bearer token'
         })
       })
     )
   })
   ```

7. ✅ **Test: Join session includes emailToken**
   ```typescript
   it('should include emailToken in joinSession call', async () => {
     const mockFetch = jest.spyOn(global, 'fetch')
     currentEmailToken.value = 'token'

     await joinSession('abc123', 'Bob', 'password')

     expect(mockFetch).toHaveBeenCalledWith(
       expect.any(String),
       expect.objectContaining({
         headers: expect.objectContaining({
           'Authorization': 'Bearer token'
         })
       })
     )
   })
   ```

---

#### File: `src/__tests__/unit/router.guard.test.ts` (NEW)
**Tests for Router Guard**:

1. ✅ **Test: Redirect to / if no emailToken**
   ```typescript
   it('should redirect to / if emailToken missing', async () => {
     localStorage.removeItem('standup_email_token')

     const result = await guard(to: /session/abc123)

     expect(result).toEqual({ path: '/', query: { sessionId: 'abc123' } })
   })
   ```

2. ✅ **Test: Redirect to / if emailToken invalid**
   ```typescript
   it('should redirect to / if emailToken invalid', async () => {
     localStorage.setItem('standup_email_token', 'invalid.token')
     mockValidateEmailToken.mockResolvedValue(false)

     const result = await guard(to: /session/abc123)

     expect(result).toEqual({ path: '/' })
     expect(localStorage.getItem('standup_email_token')).toBeNull()
   })
   ```

3. ✅ **Test: Redirect to join if session not cached**
   ```typescript
   it('should redirect to join if session not cached', async () => {
     localStorage.setItem('standup_email_token', 'valid.token')
     localStorage.removeItem('standup_session')
     mockValidateEmailToken.mockResolvedValue(true)

     const result = await guard(to: /session/abc123)

     expect(result).toEqual({ path: '/', query: { sessionId: 'abc123' } })
   })
   ```

4. ✅ **Test: Allow access if all validations pass**
   ```typescript
   it('should allow access if emailToken and session valid', async () => {
     localStorage.setItem('standup_email_token', 'valid.token')
     localStorage.setItem('standup_session', sessionData)
     mockValidateEmailToken.mockResolvedValue(true)

     const result = await guard(to: /session/abc123)

     expect(result).toBeUndefined() // Allow access
   })
   ```

---

### Phase 2: Integration Tests

#### File: `src/__tests__/integration/email-auth-flow.test.ts` (NEW)
**Complete Email Auth Flow**:

1. ✅ **Test: Full create session flow**
   ```typescript
   it('should complete full create session flow', async () => {
     // Step 1: Verify email
     const emailToken = await verifyEmail('user@example.com', '123456')
     expect(emailToken).toBeDefined()
     expect(localStorage.getItem('standup_email_token')).toBe(emailToken)

     // Step 2: Create session
     const session = await createSession('Alice', undefined)
     expect(session.sessionId).toBeDefined()
     expect(localStorage.getItem('standup_session')).toBeDefined()

     // Step 3: Navigate to session
     router.push(`/session/${session.sessionId}`)
     expect(router.currentRoute.value.path).toBe(`/session/${session.sessionId}`)
   })
   ```

2. ✅ **Test: Full join session flow**
   ```typescript
   it('should complete full join session flow', async () => {
     // Step 1: Verify email
     const emailToken = await verifyEmail('user@example.com', '123456')

     // Step 2: Join session
     const session = await joinSession('abc123', 'Bob', undefined)
     expect(session.sessionId).toBe('abc123')

     // Step 3: Navigate to session
     router.push(`/session/abc123`)
     expect(router.currentRoute.value.path).toBe('/session/abc123')
   })
   ```

3. ✅ **Test: Leave session keeps emailToken**
   ```typescript
   it('should keep emailToken after leaving session', async () => {
     // Setup: Create and join session
     const emailToken = await verifyEmail('user@example.com', '123456')
     await createSession('Alice')

     // Leave session
     leaveSession()

     // Email token should persist
     expect(localStorage.getItem('standup_email_token')).toBe(emailToken)
     expect(localStorage.getItem('standup_session')).toBeNull()
   })
   ```

4. ✅ **Test: Switch sessions with same email**
   ```typescript
   it('should allow switching between sessions with same email', async () => {
     // Setup
     const emailToken = await verifyEmail('user@example.com', '123456')
     const session1 = await createSession('Alice')

     // Switch to different session
     leaveSession()
     const session2 = await joinSession('xyz789', 'Alice')

     // Same emailToken should still be valid
     expect(localStorage.getItem('standup_email_token')).toBe(emailToken)
     expect(localStorage.getItem('standup_session')).toContain('xyz789')
   })
   ```

---

### Phase 3: E2E Tests

#### File: `e2e/email-auth.spec.ts` (NEW)
**End-to-End Email Auth Scenarios**:

1. ✅ **Test: Create session with email verification**
   ```typescript
   test('user can create session after email verification', async ({ page }) => {
     // Load home page
     await page.goto('/')

     // Step 1: Email verification
     await page.fill('[data-test="email-input"]', 'test@example.com')
     await page.click('[data-test="send-code-button"]')

     // Mock email code (in real test, would check actual email or use test service)
     await page.fill('[data-test="code-input"]', '123456')
     await page.click('[data-test="verify-button"]')

     // Step 2: Create session
     await page.fill('[data-test="name-input"]', 'Alice')
     await page.click('[data-test="create-button"]')

     // Step 3: Verify in session room
     expect(await page.url()).toContain('/session/')
     expect(await page.locator('[data-test="participant-name"]')).toContainText('Alice')
   })
   ```

2. ✅ **Test: Join session with email verification**
   ```typescript
   test('user can join session after email verification', async ({ page }) => {
     // Setup: Create session in another context
     const sessionId = await createSessionViaAPI()

     // Load join link
     await page.goto(`/?sessionId=${sessionId}`)

     // Email verification
     await page.fill('[data-test="email-input"]', 'bob@example.com')
     await page.click('[data-test="send-code-button"]')
     await page.fill('[data-test="code-input"]', '123456')
     await page.click('[data-test="verify-button"]')

     // Join session
     await page.fill('[data-test="name-input"]', 'Bob')
     await page.click('[data-test="join-button"]')

     // Verify in session room
     expect(await page.locator('[data-test="participant-list"]')).toContainText('Bob')
   })
   ```

3. ✅ **Test: Leave session keeps email for new session**
   ```typescript
   test('user can create new session without re-verifying email', async ({ page }) => {
     // Step 1: Create first session
     await verifyEmailUI(page, 'test@example.com')
     await createSessionUI(page, 'Alice')

     // Step 2: Leave session
     await page.click('[data-test="leave-button"]')
     expect(await page.url()).toBe(baseURL + '/')

     // Step 3: Create new session (no re-verification needed)
     await page.fill('[data-test="name-input"]', 'Alice')
     await page.click('[data-test="create-button"]')

     // Verify in new session room
     expect(await page.url()).toContain('/session/')
   })
   ```

4. ✅ **Test: Page reload preserves email token**
   ```typescript
   test('page reload preserves email verification', async ({ page }) => {
     // Create session
     await verifyEmailUI(page, 'test@example.com')
     const sessionId = await createSessionUI(page, 'Alice')

     // Reload page
     await page.reload()

     // Should still be in session (email token valid)
     expect(await page.url()).toContain(`/session/${sessionId}`)
   })
   ```

5. ✅ **Test: Email token expires (30 days)**
   ```typescript
   test('expired email token redirects to verification', async ({ page }) => {
     // Setup: Create session with old token
     const expiredToken = createExpiredEmailToken()
     localStorage.setItem('standup_email_token', expiredToken)
     localStorage.setItem('standup_session', sessionData)

     // Try to navigate to session
     await page.goto('/session/abc123')

     // Should redirect to email verification
     expect(await page.url()).toContain('/')
     expect(await page.locator('[data-test="email-input"]')).toBeVisible()
   })
   ```

---

## Part 4: IMPLEMENTATION PLAN

### Week 1: Planning & Setup
- ✅ Create this comprehensive plan
- ✅ Get user approval on key decisions
- Review and understand current code structure
- Set up test environment

### Week 2: Documentation Refactoring (Parallel)
- **Person A**: Tasks 1.1-1.4 (Core concepts)
- **Person B**: Tasks 2.1-2.9 (8 flow scenarios)
- **Person A**: Tasks 3.1-6.3 (localStorage, validation, password)

### Week 2-3: Code Refactoring (Sequential)
1. Update `useSession.ts` composable
2. Update `router/index.ts` guard
3. Update Home.vue UI component
4. Update API client
5. Update all Netlify function endpoints

### Week 3-4: Test Refactoring (Parallel)
- **Person A**: Unit tests for composables & router
- **Person B**: Integration tests for email auth flows
- **Person C**: E2E tests for complete user journeys

### Week 4: Review & Polish
- Code review of all changes
- Test coverage verification (maintain >80%)
- Documentation verification
- Final cleanup

---

## Key Decisions Needed

### Decision 1: Email Token Persistence
**Question**: Should emailToken be cleared when user leaves session?

**Option A**: Clear on leave (default)
- ✅ More secure (fresh verification each time)
- ❌ Less convenient (must verify email each time)

**Option B**: Keep (30-day expiration) ← **RECOMMENDED**
- ✅ More convenient (one verification per 30 days)
- ✅ Better UX for our standup app
- ❌ Token sits in localStorage

**Decision**: ✅ **KEEP (30-day expiration)** - Users can rejoin/create new sessions without re-verifying email within 30 days

---

### Decision 2: Password Protection Scope
**Question**: Is password protection important enough to keep as documented feature?

**Option A**: Keep detailed password docs (current plan) ← **RECOMMENDED**
- ✅ Complete documentation
- ✅ Users have choice of security level
- ❌ More complex to implement/maintain

**Option B**: Remove from SESSION_FLOW, move to separate doc
- ✅ Keeps SESSION_FLOW focused on email auth
- ❌ Requires new "PASSWORD_PROTECTION.md"

**Decision**: ✅ **KEEP DETAILED (Option A)** - Password protection stays as documented secondary feature

---

### Decision 3: Router Guard Complexity
**Question**: Should router guard validate emailToken or just check localStorage?

**Option A**: Full server-side validation ← **RECOMMENDED**
- ✅ More secure (can't spoof token)
- ✅ Validates JWT signature & expiration server-side
- ❌ More API calls (slower)

**Option B**: Client-side only
- ✅ Faster (no server call)
- ❌ Less secure (could spoof)

**Decision**: ✅ **FULL SERVER-SIDE (Option A)** - Validate emailToken + session on every protected route access

---

### Decision 4: Test Coverage Focus
**Question**: Where should we focus testing efforts?

**Priority 1 (Critical)**:
- Email verification flow (new)
- Router guard with emailToken (changed)
- Session persistence with emailToken (changed)

**Priority 2 (Important)**:
- Leave session behavior (changed)
- Email token expiration handling (new)
- All 8 flow scenarios (changed)

**Priority 3 (Nice to have)**:
- Password protection edge cases
- Multi-tab behavior
- Cross-session switching

**Decision**: ✅ **PRIORITY 1 & 2 (~30 tests)** - Focus on critical + important, defer Priority 3 if time-limited

---

## Files Affected

### Documentation
- `SESSION_FLOW.md` (major refactor)
- `USER_FLOW_ARCHITECTURE.md` (already updated ✓)
- `README.md` (update SESSION_FLOW description)

### Source Code
- `src/composables/useSession.ts` (add emailToken management)
- `src/router/index.ts` (update guard logic)
- `src/views/Home.vue` (add email verification UI)
- `src/lib/api.ts` (add emailToken headers)
- `netlify/functions/*.ts` (all endpoints - validate emailToken)

### Tests
- `src/__tests__/unit/useSession.test.ts` (update + new tests)
- `src/__tests__/unit/router.guard.test.ts` (new file)
- `src/__tests__/integration/email-auth-flow.test.ts` (new file)
- `e2e/email-auth.spec.ts` (new file)

---

## Test Coverage Goals

### Current Coverage
- 238+ unit tests passing
- >80% code coverage maintained

### Post-Refactor Coverage
- +~30 new unit tests (email verification, router guard)
- +~15 new integration tests (complete flows)
- +~5 new E2E tests (user scenarios)
- Maintain >80% coverage (target: 85%)

---

## Summary

This is a **complete refactoring** that includes:
- ✅ Documentation updates (6 major sections)
- ✅ Code changes (5 key files)
- ✅ Test additions (4 test files, ~50 new tests)
- ✅ 4-week implementation timeline
- ✅ Clear decision points

**Estimated effort**:
- Documentation: 6-8 hours
- Code implementation: 2-3 days
- Testing: 2-3 days
- Review & polish: 1 day
- **Total**: ~1-2 weeks of focused work

**Ready to proceed?** Please confirm decisions 1-4 above, then we can begin refactoring!
