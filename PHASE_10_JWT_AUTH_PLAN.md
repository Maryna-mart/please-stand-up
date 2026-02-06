# Phase 10: Email Token Authentication via JWT

## Overview
Implement proper JWT authentication for `create-session` and `join-session` endpoints. The backend will validate the emailToken from the `Authorization: Bearer <token>` header, extract the verified email from JWT payload, and use that for session creation.

---

## Current Problem

1. **No Authentication Required**: Users can create/join sessions without proving email verification
2. **Email Token Not Validated**: Frontend has emailToken (30-day JWT) but never sends it
3. **Email As User Input**: Backend accepts email from request body (should be from verified JWT)
4. **Security Gap**: Session creator's email is not cryptographically verified

---

## Solution Architecture

### Flow Diagram
```
User verifies email
    ↓
JWT emailToken stored in localStorage
    ↓
User creates/joins session
    ↓
Frontend sends Authorization header: Bearer <token>
    ↓
Backend:
  1. Extract token from Authorization header
  2. Verify JWT signature (HS256 + SESSION_SECRET)
  3. Check expiration (not older than 30 days)
  4. Extract email from JWT payload
  5. Use verified email for session
    ↓
Session created with verified email
```

---

## Implementation Steps

### Phase 10.1: Backend - JWT Utility Function

**File:** `netlify/functions/lib/jwt-utils-server.ts` (NEW)

Create utility functions for JWT validation:

```typescript
interface JWTPayload {
  email: string
  issuedAt: number
  expiresAt: number
}

interface JWTValidationResult {
  valid: boolean
  payload?: JWTPayload
  error?: string
  errorCode?: 'MISSING' | 'INVALID_FORMAT' | 'INVALID_SIGNATURE' | 'EXPIRED' | 'MALFORMED'
}

export function extractTokenFromHeader(authHeader?: string): string | null
export function verifyEmailToken(token: string): JWTValidationResult
export function decodeJWT(token: string): JWTPayload | null
```

**Security Requirements:**
- Use `SESSION_SECRET` environment variable for signature verification
- Use HMAC-SHA256 for signature validation
- Check expiration timestamp
- Handle malformed tokens gracefully
- Return specific error codes for different failure scenarios

---

### Phase 10.2: Backend - Update create-session.ts

**File:** `netlify/functions/create-session.ts`

**Changes:**

1. **Add Authorization header validation** (after request body parsing):
```typescript
const authHeader = event.headers['authorization']
const tokenResult = verifyEmailToken(authHeader)

if (!tokenResult.valid) {
  // Return 401 for token issues
  return {
    statusCode: 401,
    body: JSON.stringify({
      error: 'Email verification required or expired',
      code: tokenResult.errorCode || 'INVALID_TOKEN'
    })
  }
}

const verifiedEmail = tokenResult.payload.email
```

2. **Remove email from request body validation** (line 185-220):
   - Make `body.email` optional
   - Don't validate it
   - Don't use it
   - Use `verifiedEmail` instead

3. **Update session storage** (line 223-235):
   - Change `email` field to use `verifiedEmail`
   - Store verified email in session object

4. **Update error responses**:
   - 401 "Email verification required" → Missing/invalid Authorization header
   - 401 "Email verification expired" → Expired JWT token
   - 400 "Invalid request format" → For other validation errors

5. **Update JSDoc** to document:
   - Authorization header requirement
   - JWT validation on backend
   - Email extracted from JWT

---

### Phase 10.3: Backend - Update join-session.ts

**File:** `netlify/functions/join-session.ts`

**Same changes as Phase 10.2:**
- Add Authorization header validation
- Extract verified email from JWT
- Remove email from request body
- Update error responses
- Update JSDoc

---

### Phase 10.4: Frontend - Update session-api.ts

**File:** `src/lib/session-api.ts`

**Update `createSession()` function:**

```typescript
export async function createSession(
  payload: CreateSessionPayload
): Promise<CreateSessionResponse> {
  // Get email token from localStorage
  const emailToken = localStorage.getItem('standup_email_token')
  if (!emailToken) {
    throw new Error('Email verification required. Please verify your email first.')
  }

  const response = await fetchWithRetry<CreateSessionResponse>(
    `${API_BASE}/create-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${emailToken}`,  // ← Add this
      },
      body: JSON.stringify(payload),
    }
  )
  // ... error handling
}
```

**Update `joinSession()` function:**
- Same Authorization header addition

**Update error handling:**
```typescript
case 'INVALID_TOKEN':
  throw new Error('Email verification expired. Please verify again.')
case 'MISSING_AUTH_HEADER':
  throw new Error('Email verification required.')
case 'EXPIRED_TOKEN':
  throw new Error('Your email verification has expired. Please verify again.')
```

---

### Phase 10.5: Frontend - Update useSession.ts

**File:** `src/composables/useSession.ts`

Update JSDoc comments:
- Email is extracted from JWT on backend
- Token validation happens server-side
- No email parameter needed in frontend
- Token automatically sent via Authorization header

No code changes needed (session-api.ts handles it).

---

### Phase 10.6: Documentation Updates

#### Update USER_FLOW_ARCHITECTURE.md

**Section: POST `/.netlify/functions/create-session` (Lines 156-194)**

Change from:
```typescript
Request: {
  emailToken: string,               // 30-day JWT from verification
  participantName: string,
  password?: string
}
```

To:
```typescript
Headers: {
  'Authorization': 'Bearer eyJ...',  // 30-day JWT emailToken
  'Content-Type': 'application/json'
}

Request: {
  leaderName: string,
  password?: string
}

Success Path:
1. Extract emailToken from Authorization: Bearer header
2. Verify JWT signature and expiration (HS256 + SESSION_SECRET)
3. Extract email from JWT payload
4. Validate inputs (name, password strength)
5. Generate sessionId and userId
6. Hash password if provided (PBKDF2)
7. Create session in Redis with 4-hour TTL
8. Return response with sessionId, userId, expiresAt
```

**Failure Path:**
```
- Missing Authorization header → Return 400
- Invalid Authorization header format → Return 400
- Invalid JWT signature → Return 401 "Email verification invalid"
- Expired JWT (>30 days) → Return 401 "Email verification expired"
- Invalid inputs (name/password) → Return 400
```

**Do the same for join-session (lines 196-234)**

#### Update SESSION_FLOW.md

Confirm lines 128 & 180 describe Authorization header approach correctly:
- Should document `createSession()` API call includes emailToken in Authorization header
- Should document `joinSession()` API call includes emailToken in Authorization header

Add implementation details section if missing:
```
Backend JWT Validation:
- Extract token from Authorization: Bearer header
- Verify signature using SESSION_SECRET
- Check expiration (HS256)
- Extract email from payload
- Use extracted email for session operations
```

---

## Testing

### Phase 10.7: Unit Tests

#### JWT Utility Tests
**File:** `netlify/functions/__tests__/jwt-utils-server.test.ts` (NEW)

Test cases:
- ✅ `verifyEmailToken()` with valid token → Returns payload with email
- ✅ `verifyEmailToken()` with expired token → Returns error with code 'EXPIRED'
- ✅ `verifyEmailToken()` with invalid signature → Returns error with code 'INVALID_SIGNATURE'
- ✅ `verifyEmailToken()` with malformed token → Returns error with code 'MALFORMED'
- ✅ `extractTokenFromHeader()` with valid Bearer header → Returns token
- ✅ `extractTokenFromHeader()` with missing Bearer → Returns null
- ✅ `extractTokenFromHeader()` with invalid format → Returns null

#### create-session Tests
**File:** `netlify/functions/__tests__/create-session.test.ts`

Add test cases:
- ✅ Missing Authorization header → Returns 400 with code 'MISSING_AUTH_HEADER'
- ✅ Invalid Authorization header format → Returns 400
- ✅ Invalid JWT signature → Returns 401 with code 'INVALID_TOKEN'
- ✅ Expired JWT token → Returns 401 with code 'EXPIRED_TOKEN'
- ✅ Valid JWT → Extracts email from token and creates session
- ✅ Valid JWT with password → Creates session with password hash
- ✅ Email from JWT is stored in session object

#### join-session Tests
**File:** `netlify/functions/__tests__/join-session.test.ts`

Same test cases as create-session

#### Frontend API Tests
**File:** `src/__tests__/unit/session-api.test.ts`

Add test cases:
- ✅ `createSession()` reads emailToken from localStorage
- ✅ `createSession()` throws error if token missing: "Email verification required"
- ✅ `createSession()` includes Authorization header in request
- ✅ `createSession()` throws error on 401 response: "Email verification expired"
- ✅ `joinSession()` same test cases

### Phase 10.8: E2E Tests

**File:** `src/__tests__/e2e/complete-happy-path.spec.ts` (UPDATE)

Update the "Email → Create Session" step:
- Verify Authorization header is sent (check network tab or mock)
- Verify session is created with verified email
- Verify 401 error if token is removed from localStorage

---

## Verification Checklist

### Before Committing:

**Backend:**
- [ ] JWT utility validates signature correctly
- [ ] JWT utility checks expiration
- [ ] create-session extracts token from Authorization header
- [ ] create-session uses verified email (not from request body)
- [ ] join-session does same
- [ ] Error messages are generic (no token enumeration)
- [ ] Unit tests pass
- [ ] Manual test: Create session with valid token ✅
- [ ] Manual test: Create session without token → 400 error ✅
- [ ] Manual test: Create session with expired token → 401 error ✅

**Frontend:**
- [ ] session-api.ts sends Authorization header
- [ ] Error handling shows correct messages
- [ ] Unit tests pass
- [ ] Manual test: Verify session creation works
- [ ] Manual test: Check DevTools Network tab shows Authorization header

**Documentation:**
- [ ] USER_FLOW_ARCHITECTURE.md shows Authorization header (not body)
- [ ] SESSION_FLOW.md matches architecture
- [ ] No conflicting information between docs

**Overall:**
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Security audit: Token only in Authorization header (never logged/cached)
- [ ] Manual testing complete
- [ ] Git commit message describes why JWT auth was added

---

## Security Considerations

1. **Token Transport**: Always HTTPS in production (not just in test)
2. **No Token Logging**: Never log Authorization header value
3. **Error Messages**: Generic errors prevent token enumeration
4. **Token Expiration**: 30-day window is intentional (re-verification required monthly)
5. **Signature Verification**: Use SESSION_SECRET, never hardcode keys
6. **localStorage Storage**: Safe for 4-hour sessions (XSS impact limited)

---

## Files Changed Summary

| File | Change | Type |
|------|--------|------|
| `netlify/functions/lib/jwt-utils-server.ts` | NEW | Backend Utility |
| `netlify/functions/create-session.ts` | UPDATE | Backend Function |
| `netlify/functions/join-session.ts` | UPDATE | Backend Function |
| `src/lib/session-api.ts` | UPDATE | Frontend API |
| `src/composables/useSession.ts` | UPDATE (comments only) | Frontend Composable |
| `USER_FLOW_ARCHITECTURE.md` | UPDATE | Documentation |
| `SESSION_FLOW.md` | UPDATE (if needed) | Documentation |
| `netlify/functions/__tests__/jwt-utils-server.test.ts` | NEW | Test |
| `netlify/functions/__tests__/create-session.test.ts` | UPDATE | Test |
| `netlify/functions/__tests__/join-session.test.ts` | UPDATE | Test |
| `src/__tests__/unit/session-api.test.ts` | UPDATE | Test |
| `src/__tests__/e2e/complete-happy-path.spec.ts` | UPDATE | Test |

---

## Next Steps (After Phase 10)

- Phase 11: Consolidate Participant Interface (Remove duplicates)
- Phase 12: Privacy Banner (audio disclosure/consent before recording)
- Production deployment (with JWT validation verified)
