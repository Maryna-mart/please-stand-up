i# AI-Powered Standup Assistant - Implementation Plan

## Progress Tracking
- [x] Phase 1: Project Setup & Configuration ✅
- [x] Phase 2: Core Session Management ✅
- [x] Phase 3: UI Components & Views ✅
- [ ] **Phase 3.5: Critical Security Fixes (PRE-REQUISITE for Phase 4)**
- [ ] Phase 4: Backend Session Storage (Netlify Functions + Redis)
- [ ] Phase 5: Code Quality Improvements & Basic Real-time Sync
- [ ] Phase 6: AI Integration (Netlify Functions) - Transcription & Summarization
- [ ] Phase 7: Complete Real-time Features (Transcript Sync)
- [ ] Phase 8: Email Delivery
- [ ] Phase 9: Security & Privacy Features
- [ ] Phase 10: Testing & Quality Assurance
- [ ] Phase 11: Deployment

**Note**: Phase 4 (Backend Session Storage) moved to priority position - required for multi-browser/remote functionality. This is essential for the MVP to work across different browsers and devices, not just same-browser testing.

**SECURITY ALERT**: Phase 3.5 added to address critical security vulnerabilities discovered during Phase 4 review. Must be completed before Phase 4 implementation.

---

## Phase 1: Project Setup & Configuration ✅ COMPLETED

### 1.1 Initialize Vue 3 + Vite Project
- [x] Run `npm create vite@latest . -- --template vue-ts`
- [x] Install core dependencies: `npm install`
- [x] Create `.gitignore` (include `.env`, `node_modules`, `dist`, `.netlify`)
- [x] Create basic Vue app structure (index.html, vite.config.ts, tsconfig.json)

### 1.2 Install & Configure Tailwind CSS
- [x] Install Tailwind: `npm install -D tailwindcss postcss autoprefixer`
- [x] Configure Tailwind CSS v4 with `@import 'tailwindcss'` syntax
- [x] Create `postcss.config.js` with Tailwind plugin
- [x] Create `src/assets/main.css` with Tailwind directives
- [x] Import CSS in `src/main.ts`
- [x] Add Tailwind classes to App.vue

### 1.3 Install Additional Dependencies
- [x] Vue Router: `npm install vue-router@4`
- [x] Pusher Client: `npm install pusher-js`
- [x] Type definitions: `npm install -D @types/node`
- [x] Testing: `npm install -D vitest @vue/test-utils jsdom @vitest/ui`
- [x] E2E Testing: `npm install -D @playwright/test`
- [x] Coverage: `npm install -D @vitest/coverage-v8`

### 1.4 Configure Testing Infrastructure
- [x] Create `vitest.config.ts` for unit tests
- [x] Create `playwright.config.ts` for E2E tests
- [x] Add test scripts to `package.json`:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
  - `"test:ui": "vitest --ui"`
  - `"test:e2e": "playwright test"`
  - `"test:coverage": "vitest --coverage"`
- [x] Create `__tests__` directory structure
- [x] Write sample test to verify setup works

### 1.5 Netlify Configuration
- [x] Create `netlify.toml` in project root
- [x] Configure build settings (build command, publish directory, functions)
- [x] Add security headers (X-Frame-Options, CSP, etc.)
- [x] Add SPA redirect rule
- [x] Create `netlify/functions` directory structure
- [x] Install Netlify CLI: `npm install -D netlify-cli`
- [x] Install Netlify Functions types: `npm install -D @netlify/functions`
- [x] Add dev script: `"dev:netlify": "netlify dev"`
- [x] Create TypeScript config for Netlify functions

### 1.6 Environment Variables Setup
- [x] Create `.env.example` with all required keys (no values)
- [x] Create `.env` with empty values (gitignored)
- [x] Document required environment variables:
  - `VITE_PUSHER_APP_KEY`
  - `VITE_PUSHER_CLUSTER`
  - `PORTKEY_API_KEY`
  - `PUSHER_APP_ID`
  - `PUSHER_SECRET`
  - `SENDGRID_API_KEY`
  - `SESSION_SECRET`
- [x] Add Vite env type definitions in `src/vite-env.d.ts`

### 1.7 Project Structure Setup
- [x] Create folder structure:
  ```
  src/
  ├── components/
  ├── composables/
  ├── lib/
  ├── router/
  ├── types/
  ├── views/
  └── __tests__/
      ├── unit/
      └── e2e/
  ```

### 1.8 Code Quality Tools (Added)
- [x] Install ESLint: `npm install -D eslint @eslint/js typescript-eslint eslint-plugin-vue`
- [x] Install Prettier: `npm install -D prettier eslint-config-prettier eslint-plugin-prettier`
- [x] Create `eslint.config.js` with Vue + TypeScript support
- [x] Create `.prettierrc` with code style rules
- [x] Create `.prettierignore`
- [x] Add lint and format scripts to `package.json`:
  - `"lint": "eslint . --ext .vue,.ts,.js"`
  - `"lint:fix": "eslint . --ext .vue,.ts,.js --fix"`
  - `"format": "prettier --write \"src/**/*.{ts,vue,css}\""`
  - `"format:check": "prettier --check \"src/**/*.{ts,vue,css}\""`
  - `"pre-push": "npm run lint:fix && npm run format && npm run test"`

### 1.9 Documentation
- [x] Update README.md with all available commands
- [x] Document environment variables
- [x] Add project structure overview
- [x] Add pre-push checklist
- [x] Document optional git hooks setup

---

## Phase 2: Core Session Management ✅ COMPLETED

### 2.1 Session Types & Interfaces
- [x] Create `src/types/session.ts`:
  - `Session` interface (id, createdAt, expiresAt, password, participants)
  - `Participant` interface (id, name, audioBlob, transcript)
  - `SessionState` type
- [x] Write unit tests for type guards

### 2.2 Session ID Generation
- [x] Create `src/lib/crypto-utils.ts`
- [x] Implement `generateSessionId()` using Web Crypto API
- [x] Ensure cryptographically random (min 32 bytes entropy)
- [x] Write unit tests (17 tests):
  - [x] Generates unique IDs
  - [x] IDs are URL-safe
  - [x] Minimum length requirements

### 2.3 Session Store (Composable)
- [x] Create `src/composables/useSession.ts`
- [x] Implement client-side session state management (reactive with Vue refs)
- [x] Use localStorage for session persistence (leader browser)
- [x] Functions:
  - `createSession(password?: string)` - Generate ID, store locally
  - `joinSession(sessionId: string, userName: string, password?: string)` - Validate & join
  - `leaveSession()` - Clean up local state
  - `getSessionState()` - Return current session
  - `isSessionExpired()` - Check 4-hour timeout
- [x] Add 4-hour expiration logic (timestamp-based)
- [x] Document limitation: Leader must stay connected (or use Upstash Redis in future)
- [x] Write unit tests (23 tests):
  - [x] Session creation with localStorage
  - [x] Joining with/without password
  - [x] Password validation
  - [x] Expiration check
  - [x] Participant management
  - [x] localStorage persistence

### 2.4 Password Protection
- [x] Create `src/lib/password-utils.ts`
- [x] Implement password hashing using **Web Crypto API (PBKDF2)**
  - Browser-native, no backend needed
  - Secure for temporary session protection (100,000 iterations, SHA-256)
- [x] Functions:
  - `hashPassword(password: string): Promise<string>` - PBKDF2 hash
  - `verifyPassword(password: string, hash: string): Promise<boolean>` - Compare with constant-time comparison
- [x] Write unit tests (14 tests):
  - [x] Hash generation (PBKDF2)
  - [x] Verification success/failure
  - [x] Edge cases (empty password, special characters)
  - [x] Hash consistency

**Test Coverage:** 56 tests passing, 93.93% coverage overall

---

## Phase 3: UI Components & Views ✅ COMPLETED

### 3.1 Vue Router Setup ✅
- [x] Create `src/router/index.ts`
- [x] Define routes:
  - [x] `/` → Home view (create/join)
  - [x] `/session/:id` → Session view
  - [x] `/:pathMatch(.*)*` → Not found (404)
- [x] Add route meta for page titles
- [x] Update document title on route change

### 3.2 Home View ✅
- [x] Create `src/views/Home.vue`
- [x] Features:
  - [x] "Create Session" form with leader name and optional password
  - [x] "Join Session" form (session ID, participant name, optional password)
  - [x] Form validation
  - [x] Error handling display
  - [x] Privacy notice with links to Portkey/OpenAI policies
- [x] Responsive grid layout (2 columns on desktop, 1 on mobile)
- [x] Loading states on both buttons

### 3.3 Session View Layout ✅
- [x] Create `src/views/Session.vue`
- [x] Layout sections:
  - [x] Session info header (ID, copy link button with confirmation)
  - [x] 3-column responsive grid:
    - Left: Timer + Audio Recorder
    - Middle: Participants List
    - Right: Transcripts + Summary (when available)
- [x] Session controls (Generate Summary, Leave Session)
- [x] Responsive design (stacks on mobile)
- [x] Cleanup on unmount (leave session)

### 3.4 Timer Component ✅
- [x] Create `src/components/Timer.vue`
- [x] Features:
  - [x] Display countdown (default: 120 seconds)
  - [x] Start/Stop/Reset controls
  - [x] Visual progress bar with percentage
  - [x] Status display (Ready, Running, Paused)
  - [x] Time formatting (M:SS)
- [x] Props: `duration` (default: 120), `autoStart` (default: false)
- [x] Emits: `timer-started`, `timer-stopped`, `timer-ended`
- [x] Automatic cleanup on unmount

### 3.5 Audio Recorder Component ✅
- [x] Create `src/components/AudioRecorder.vue`
- [x] Features:
  - [x] Record/Stop buttons
  - [x] Recording time counter
  - [x] Microphone permission handling
  - [x] Error messages for permission denial / no mic
  - [x] Audio file size display
  - [x] Playback preview with HTML5 audio element
  - [x] Transcribe button (stub for Phase 6)
  - [x] Discard button to clear recording
- [x] Events: `transcript-ready` emission
- [x] WebM/Opus codec preference (with fallback)

### 3.6 Participants List Component ✅
- [x] Create `src/components/ParticipantsList.vue`
- [x] Features:
  - [x] Display participant name, status, transcript indicator
  - [x] Status badges: Recording (with pulse), Done, Waiting
  - [x] Transcript ready indicator
  - [x] Session stats (Total, Done count, Recording count)
  - [x] Empty state message
- [x] Props: `participants` array with id, name, status, transcriptReady
- [x] Reactive stat calculations

### 3.7 Transcript View Component ✅
- [x] Create `src/components/TranscriptView.vue`
- [x] Features:
  - [x] Display transcripts per participant
  - [x] Copy to clipboard button with confirmation
  - [x] Loading state with spinner
  - [x] Error display
  - [x] Duration formatting (Xm Ys)
  - [x] Generic participant name fallback
- [x] Props: `transcripts`, `isLoading`, `error`
- [x] Empty state message

### 3.8 Summary View Component ✅
- [x] Create `src/components/SummaryView.vue`
- [x] Features:
  - [x] Display formatted summary in monospace
  - [x] Email form with comma-separated email input
  - [x] Email validation (at least one email required)
  - [x] Pre-filled subject with today's date
  - [x] Send via email button (stub for Phase 7)
  - [x] Success/error message display
  - [x] Copy summary to clipboard
  - [x] Download as .txt file
- [x] Props: `summary`, `sessionId`
- [x] Form state management with loading/success/error states

---

## Phase 3.5: Critical Security Fixes (PRE-REQUISITE for Phase 4)

**Priority**: CRITICAL - Security vulnerabilities discovered during Phase 4 architecture review. Must be fixed before implementing backend storage.

### 3.5.1 Input Validation & Sanitization (CRITICAL)
- [ ] **Install DOMPurify**: `npm install dompurify` and `npm install -D @types/dompurify`
- [ ] **Create `src/lib/sanitize.ts`**:
  - [ ] `sanitizeUserInput(input: string): string` - HTML sanitization for user names
  - [ ] `sanitizeForDisplay(input: string): string` - Escape HTML entities for display
  - [ ] `validateSessionId(id: string): boolean` - Use existing `isValidSessionId()`
  - [ ] `validateUserName(name: string): boolean` - Max 50 chars, no special HTML chars
- [ ] **Update `src/composables/useSession.ts`**:
  - [ ] Add JSON schema validation in `loadFromLocalStorage()`:
    ```typescript
    // Validate session structure before using
    if (!isValidSessionStructure(session)) {
      console.error('Invalid session structure in localStorage')
      return null
    }
    ```
  - [ ] Sanitize participant names before adding: `sanitizeUserInput(userName)`
  - [ ] Add max participants limit (20) in `joinSession()`
- [ ] **Update `src/views/Home.vue`**:
  - [ ] Validate and sanitize leader name input before `createSession()`
  - [ ] Validate and sanitize participant name input before `joinSession()`
  - [ ] Add client-side validation messages
- [ ] Write unit tests:
  - [ ] Test XSS prevention (`<script>alert('xss')</script>` → sanitized)
  - [ ] Test HTML entity escaping
  - [ ] Test max participant limit
  - [ ] Test invalid session structure in localStorage

### 3.5.2 Password Security Enhancement (HIGH PRIORITY)
- [ ] **Update `src/lib/password-utils.ts`**:
  - [ ] Add constant-time comparison in `verifyPassword()`:
    ```typescript
    // Prevent timing attacks by comparing all bytes
    const hashBuffer = new TextEncoder().encode(hash)
    const computedBuffer = new TextEncoder().encode(computedHash)
    return crypto.subtle.timingSafeEqual(hashBuffer, computedBuffer)
    ```
  - [ ] Add password strength validation (min 8 chars, optional complexity)
  - [ ] Add rate limiting hint for UI (prevent brute force)
- [ ] Write unit tests:
  - [ ] Test timing-safe comparison
  - [ ] Test password strength validation

### 3.5.3 Session ID Validation (HIGH PRIORITY)
- [ ] **Create `src/lib/session-validation.ts`**:
  - [ ] `isValidSessionStructure(obj: unknown): obj is Session` - Type guard with runtime checks
  - [ ] `validateParticipant(obj: unknown): obj is Participant` - Participant validation
  - [ ] Check all required fields exist and are correct types
- [ ] **Update all session-related code**:
  - [ ] Validate session ID before localStorage access
  - [ ] Validate before routing to `/session/:id`
  - [ ] Add validation in Session.vue's `onMounted()`
- [ ] Write unit tests:
  - [ ] Test valid session structure
  - [ ] Test invalid structures (missing fields, wrong types)
  - [ ] Test malformed participant data

### 3.5.4 Environment Variables Update
- [ ] **Update `.env.example`**:
  - [ ] Add `UPSTASH_REDIS_REST_URL=your_upstash_url_here`
  - [ ] Add `UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here`
  - [ ] Add comments explaining where to get each variable
  - [ ] Add security note about never committing `.env`

### 3.5.5 Enhanced Security Headers (MEDIUM PRIORITY)
- [ ] **Update `netlify.toml`**:
  - [ ] Add stricter CSP header:
    ```toml
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.pusher.com https://*.upstash.io; media-src 'self' blob:"
    ```
  - [ ] Update Permissions-Policy to be path-specific (if possible with Netlify)
  - [ ] Add HSTS header: `Strict-Transport-Security = "max-age=31536000; includeSubDomains"`

### 3.5.6 Testing for Security Fixes
- [ ] **Create `src/__tests__/unit/sanitize.test.ts`**:
  - [ ] Test XSS prevention for all user inputs
  - [ ] Test HTML entity escaping
  - [ ] Test Unicode handling
- [ ] **Create `src/__tests__/unit/session-validation.test.ts`**:
  - [ ] Test session structure validation
  - [ ] Test malicious JSON payloads
  - [ ] Test localStorage corruption handling
- [ ] **Update existing tests**:
  - [ ] Update `useSession.test.ts` to include sanitization checks
  - [ ] Update `Home.vue` E2E tests to test XSS inputs

**Completion Criteria:**
- [ ] All new tests passing
- [ ] No regression in existing 56 tests
- [ ] Security linter (ESLint security plugin) passes
- [ ] Manual security review of localStorage handling
- [ ] Manual XSS testing with common payloads

---

## Phase 4: Backend Session Storage (Netlify Functions + Upstash Redis)

**Priority**: CRITICAL - Required for multi-browser/remote team functionality. Current localStorage-only approach only works in same browser.

**Architecture Decision**: Use Netlify Functions + Upstash Redis instead of full database:
- Upstash provides free tier: Up to 10,000 requests/day, perfect for MVP
- Serverless (no server management) - fits Netlify hosting
- Fast response times for session validation
- Simple key-value storage ideal for session data
- Cost: Free tier or ~$0-10/month if exceeded

### 4.1 Upstash Redis Setup
- [ ] Create Upstash account (upstash.com)
- [ ] Create Redis database (free tier)
- [ ] Add connection details to Netlify environment variables:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- [ ] Document setup in `.env.example`

### 4.2 Security & Rate Limiting Setup (CRITICAL - Do First)
- [ ] **Install rate limiting library**: `npm install @upstash/ratelimit`
- [ ] **Create `netlify/functions/lib/rate-limiter.ts`**:
  - [ ] Initialize Upstash Rate Limiter with Redis client
  - [ ] Session creation: 5 requests per IP per hour (sliding window)
  - [ ] Session join: 10 requests per IP per hour
  - [ ] Helper function: `checkRateLimit(identifier: string, limit: 'create' | 'join'): Promise<boolean>`
- [ ] **Create `netlify/functions/lib/csrf.ts`**:
  - [ ] `generateCsrfToken(): string` - Random token generation
  - [ ] `validateCsrfToken(token: string, storedToken: string): boolean` - Constant-time comparison
  - [ ] Store tokens in Redis with 10-minute expiration
- [ ] **Create `netlify/functions/lib/validation.ts`**:
  - [ ] Copy validation functions from `src/lib/crypto-utils.ts` (for backend use)
  - [ ] `isValidSessionId(id: string): boolean`
  - [ ] `isValidUserName(name: string): boolean` - Max 50 chars, sanitized
  - [ ] `sanitizeInput(input: string): string` - Server-side sanitization

### 4.3 Backend Session Storage Functions
- [ ] Create `netlify/functions/lib/redis-client.ts`
  - [ ] Initialize Redis REST client with env variables
  - [ ] Add connection retry logic (3 attempts with exponential backoff)
  - [ ] Add connection health check: `isRedisHealthy(): Promise<boolean>`
  - [ ] Add helper functions: `setSession()`, `getSession()`, `deleteSession()`
  - [ ] Add automatic expiration (4 hours using Redis TTL)
  - [ ] Error handling with proper logging (but no sensitive data in logs)

- [ ] Create `netlify/functions/create-session.ts` (HTTP POST)
  - [ ] **Security checks (in order)**:
    1. [ ] Check rate limit (5 per IP per hour)
    2. [ ] Validate CSRF token (if implementing)
    3. [ ] Validate input: `leaderName` (sanitized, max 50 chars)
    4. [ ] Validate password strength if provided (min 8 chars)
  - [ ] **Session creation**:
    - [ ] Generate cryptographically secure session ID (backend - more secure)
    - [ ] Copy crypto utils from frontend or use Node's `crypto.randomBytes()`
    - [ ] Hash password if provided using PBKDF2
    - [ ] Store session in Redis with 4-hour TTL
    - [ ] Enforce max 20 participants per session
  - [ ] Return: `{ sessionId: string, userId: string, expiresAt: timestamp }`
  - [ ] Error handling:
    - [ ] Rate limited → 429 Too Many Requests
    - [ ] Invalid input → 400 Bad Request
    - [ ] Redis error → 502 Bad Gateway

- [ ] Create `netlify/functions/get-session.ts` (HTTP GET)
  - [ ] **Security checks**:
    1. [ ] Validate session ID format using `isValidSessionId()`
    2. [ ] Check Redis connection health
  - [ ] Retrieve session from Redis
  - [ ] **Never return**: password hash, internal IDs
  - [ ] Return: `{ id, createdAt, status, participantCount, passwordRequired: boolean }`
  - [ ] Error handling:
    - [ ] Invalid session ID → 400 Bad Request
    - [ ] Session not found → 404 Not Found
    - [ ] Redis error → 502 Bad Gateway

- [ ] Create `netlify/functions/join-session.ts` (HTTP POST)
  - [ ] **Security checks (in order)**:
    1. [ ] Check rate limit (10 per IP per hour)
    2. [ ] Validate CSRF token (if implementing)
    3. [ ] Validate session ID format
    4. [ ] Validate participant name (sanitized, max 50 chars)
    5. [ ] Check max participants limit (20)
  - [ ] Verify session exists
  - [ ] Verify password if required (constant-time comparison)
  - [ ] Check for duplicate participant names in session
  - [ ] Add participant to session
  - [ ] Update Redis atomically
  - [ ] Return: `{ sessionId, userId, participants, status }`
  - [ ] Error handling:
    - [ ] Rate limited → 429 Too Many Requests
    - [ ] Not found → 404 Not Found
    - [ ] Wrong password → 401 Unauthorized
    - [ ] Invalid input → 400 Bad Request
    - [ ] Session full → 403 Forbidden

### 4.4 Frontend API Integration
- [ ] Create `src/lib/session-api.ts`
  - [ ] `createSession(leaderName: string, password?: string): Promise<{ sessionId: string, userId: string }>`
  - [ ] `getSession(sessionId: string): Promise<Session | null>`
  - [ ] `joinSession(sessionId: string, participantName: string, password?: string): Promise<{ sessionId: string, userId: string }>`
  - [ ] Error handling with user-friendly messages (map HTTP codes to messages)
  - [ ] Retry logic for transient errors (503, 502 - max 3 retries with backoff)
  - [ ] Handle rate limiting (429) with user message "Too many requests, please wait"

- [ ] Update `src/composables/useSession.ts`
  - [ ] Replace local session creation with API call to `create-session`
  - [ ] Replace local session join with API call to `join-session`
  - [ ] Store userId from API response (for authentication)
  - [ ] Keep local state for current session (reactive state)
  - [ ] Keep localStorage as backup/cache (not primary source of truth)
  - [ ] Add session sync function: Periodically fetch from backend to detect changes

- [ ] Create `src/components/JoinSessionModal.vue` component
  - [ ] Modal overlay with dark backdrop
  - [ ] Input: Name (required, max 50 chars, sanitized on client)
  - [ ] Input: Password (optional, show/hide toggle)
  - [ ] Submit button with loading state
  - [ ] Call `joinSession()` API on submit
  - [ ] Error handling:
    - [ ] 404 → "Session not found or expired"
    - [ ] 401 → "Incorrect password"
    - [ ] 403 → "Session is full (max 20 participants)"
    - [ ] 429 → "Too many attempts, please wait"
    - [ ] 400 → "Invalid input, please check your name"
  - [ ] Success: Close modal, add participant to local session state
  - [ ] Cannot close modal until joined (or cancel to go home)

### 4.5 Session View Updates
- [ ] Update `src/views/Session.vue` to detect new browser/tab context
  - [ ] On mount: Check if current user is in session participants (via localStorage userId)
  - [ ] If no userId or not in participants: Show `JoinSessionModal`
  - [ ] If yes: Fetch latest session from API, show full session UI
  - [ ] Handle "Session Not Found" error → Redirect to home with toast message
  - [ ] Handle session expired → Show expiration message with "Create New Session" button

### 4.6 Error Handling & Edge Cases
- [ ] **Session expires while in use**:
  - [ ] Detect via 404 from API calls
  - [ ] Show error banner: "Session expired. Please create a new session."
  - [ ] Disable all actions (recording, summary generation)
  - [ ] Provide "Create New Session" button
- [ ] **API returns 404** → Show "Session not found or expired"
- [ ] **API returns 401** → Show "Incorrect password"
- [ ] **API returns 429** → Show "Too many requests. Please wait a moment and try again."
- [ ] **API returns 502/503** → Show "Connection error. Retrying..." (with automatic retry)
- [ ] **Redis connection fails** → Backend returns 502, frontend shows "Server error, please refresh"
- [ ] **Participant reconnects after network failure**:
  - [ ] Check localStorage for userId
  - [ ] Fetch session from backend
  - [ ] If userId in participants → Resume session
  - [ ] If not → Show JoinSessionModal

### 4.7 Testing (Comprehensive)
- [ ] **Unit tests for backend functions** (use Redis mock):
  - [ ] `rate-limiter.test.ts`:
    - [ ] Test rate limit enforcement
    - [ ] Test limit reset after time window
    - [ ] Test different limit types (create vs join)
  - [ ] `redis-client.test.ts`:
    - [ ] Test connection retry logic
    - [ ] Test TTL expiration
    - [ ] Test error handling
  - [ ] `validation.test.ts`:
    - [ ] Test session ID validation
    - [ ] Test user name validation
    - [ ] Test input sanitization
  - [ ] `create-session.test.ts`:
    - [ ] Test successful session creation
    - [ ] Test password hashing
    - [ ] Test rate limiting
    - [ ] Test validation errors
  - [ ] `get-session.test.ts`:
    - [ ] Test successful retrieval
    - [ ] Test session not found
    - [ ] Test password hash not exposed
  - [ ] `join-session.test.ts`:
    - [ ] Test successful join
    - [ ] Test password verification
    - [ ] Test max participants limit
    - [ ] Test duplicate name handling
    - [ ] Test rate limiting

- [ ] **Unit tests for frontend API client**:
  - [ ] `session-api.test.ts`:
    - [ ] Test createSession API call
    - [ ] Test joinSession API call
    - [ ] Test getSession API call
    - [ ] Test error handling (404, 401, 429, 502)
    - [ ] Test retry logic for transient errors
    - [ ] Test timeout handling

- [ ] **Integration tests** (local Netlify dev + Redis mock):
  - [ ] Full create → get → join flow
  - [ ] Password-protected session flow
  - [ ] Session expiration handling
  - [ ] Rate limiting enforcement
  - [ ] Max participants enforcement

- [ ] **E2E tests** (critical for Phase 4 validation):
  - [ ] **Multi-browser session sharing**:
    ```typescript
    test('should share session across browsers', async ({ browser }) => {
      // Browser A: Create session
      const contextA = await browser.newContext()
      const pageA = await contextA.newPage()
      await pageA.goto('/')
      await pageA.fill('#leaderName', 'Leader')
      await pageA.click('button:has-text("Create Session")')
      const sessionUrl = pageA.url()

      // Browser B: Join session (incognito)
      const contextB = await browser.newContext()
      const pageB = await contextB.newPage()
      await pageB.goto(sessionUrl)

      // Should show join modal
      await expect(pageB.locator('text=Join Session')).toBeVisible()
      await pageB.fill('#participantName', 'Participant 1')
      await pageB.click('button:has-text("Join")')

      // Both should see same participant list
      await expect(pageA.locator('text=Participant 1')).toBeVisible()
      await expect(pageB.locator('text=Leader')).toBeVisible()
    })
    ```
  - [ ] Password-protected session join flow
  - [ ] Wrong password error handling
  - [ ] Session not found error handling
  - [ ] Session full (21st participant) rejection
  - [ ] Rate limiting (create 6 sessions rapidly)
  - [ ] Leader disconnect → Participants can still access session

**Note**: Redis TTL handles automatic cleanup - sessions expire after 4 hours without manual cleanup job.

**Security Testing Checklist:**
- [ ] Test XSS payloads in participant names (`<script>alert('xss')</script>`)
- [ ] Test SQL injection attempts in session IDs (should fail validation)
- [ ] Test brute force password attempts (should hit rate limit after 10)
- [ ] Test session ID enumeration (should fail due to randomness)
- [ ] Verify password hashes never exposed in API responses
- [ ] Verify Redis connection strings never exposed in errors

---

## Phase 5: Code Quality Improvements & Basic Real-time Sync

### 5.0 Code Quality Improvements (Do First)
**Note**: These refactoring tasks improve maintainability before adding real-time features.

- [ ] **Extract shared type definitions**
  - [ ] Create `src/types/participant.ts`:
    ```typescript
    export interface Participant {
      id: string
      name: string
      status: 'waiting' | 'recording' | 'done'
      transcriptReady?: boolean
    }
    ```
  - [ ] Create `src/types/transcript.ts`:
    ```typescript
    export interface Transcript {
      participantName?: string
      text: string
      duration?: number
    }
    ```
  - [ ] Update imports in: Session.vue, ParticipantsList.vue, TranscriptView.vue

- [ ] **Create constants file** `src/lib/constants.ts`:
  ```typescript
  export const TIMER_DEFAULT_DURATION = 120 // seconds
  export const AUDIO_MIME_TYPE = 'audio/webm;codecs=opus'
  export const MAX_AUDIO_SIZE = 25 * 1024 * 1024 // 25MB for Whisper
  ```
  - [ ] Update usage in: TalkSession.vue

- [ ] **Add window type declarations** `src/types/window.d.ts`:
  ```typescript
  declare global {
    interface Window {
      webkitAudioContext?: typeof AudioContext
    }
  }
  export {}
  ```
  - [ ] Remove type assertion from TalkSession.vue

- [ ] **Optional: Extract reusable composables** (if time permits)
  - [ ] `src/composables/useClipboard.ts` - Copy-to-clipboard functionality
  - [ ] `src/composables/useFileDownload.ts` - File download functionality

### 5.1 Pusher Integration Setup
- [ ] Create `src/lib/pusher-client.ts`
- [ ] Initialize Pusher client with env variables
- [ ] Add connection error handling
- [ ] Write unit tests:
  - [ ] Client initialization
  - [ ] Connection handling

### 5.2 Pusher Composable
- [ ] Create `src/composables/usePusher.ts`
- [ ] Implement channel subscription/unsubscription
- [ ] Event listeners:
  - `user-joined`
  - `user-left`
  - `talk-started`
  - `talk-stopped`
  - `transcript-ready`
  - `summary-generated`
- [ ] Write unit tests:
  - [ ] Channel subscription
  - [ ] Event handling
  - [ ] Cleanup on unmount

### 5.3 Real-time State Sync (Basic Features Only)
- [ ] Integrate Pusher with session store (useSession)
- [ ] Broadcast local events to channel:
  - [ ] `talk-started` / `talk-stopped` events
  - [ ] `user-joined` / `user-left` events
  - [ ] Participant status updates (`waiting`, `recording`, `done`)
- [ ] Update local state from remote events
- [ ] Handle race conditions (optimistic UI updates)
- [ ] Write integration tests:
  - [ ] Talk session sync across clients
  - [ ] Participant join/leave sync
  - [ ] Participant status updates

**Note**: Transcript sync (`transcript-ready` event) will be implemented in Phase 7 after AI integration is complete, ensuring we can test with real transcription data.

---

## Phase 6: AI Integration (Netlify Functions)

**Status**: TalkSession UI component completed in Phase 3. This phase focuses on connecting it to AI services.

### 6.1 Portkey Client Setup
- [ ] Create `netlify/functions/lib/portkey-server.ts`
  - [ ] Initialize Portkey client with API key from env
  - [ ] Configure for Whisper (transcription) and Claude (summarization)
  - [ ] Add error handling and retry logic
  - [ ] Add request/response logging
- [ ] Create `src/lib/portkey-types.ts` (frontend type definitions)
- [ ] Write unit tests:
  - [ ] Client initialization
  - [ ] Error handling
  - [ ] Retry logic

### 6.2 Transcription Function (Netlify)
- [ ] Create `netlify/functions/transcribe.ts`
- [ ] Accept multipart/form-data with audio file
- [ ] Validate audio file:
  - [ ] Max size 25MB (Whisper limit)
  - [ ] Supported formats: webm, mp3, mp4, wav
- [ ] Call Portkey Whisper API:
  - [ ] Model: `whisper-1`
  - [ ] Language: auto-detect (or explicit de/en)
  - [ ] Return transcript text with detected language
- [ ] Error handling:
  - [ ] Invalid audio format → 400 Bad Request
  - [ ] File too large → 413 Payload Too Large
  - [ ] Portkey API errors → 502 Bad Gateway
- [ ] Write integration tests:
  - [ ] Successful transcription (mock Portkey response)
  - [ ] Language detection (German vs English)
  - [ ] Error scenarios

### 6.3 Summarization Function (Netlify)
- [ ] Create `netlify/functions/summarize.ts`
- [ ] Accept JSON: `{ sessionId, transcripts: Array<{name, text}> }`
- [ ] Detect language from transcripts (majority vote)
- [ ] Call Portkey Claude API with prompt:
  ```
  You are analyzing a team standup transcript. Respond in the same language as the transcripts.

  Extract for each person:
  **[Name]:**
  - ✅ Yesterday: [accomplishments]
  - 🎯 Today: [current work]
  - 🚫 Blockers: [obstacles or "None"]

  **📌 Team Action Items:**
  [Dependencies, important points]

  Transcripts:
  [Insert all transcripts]
  ```
- [ ] Return formatted summary (same language as input)
- [ ] Error handling:
  - [ ] Empty transcripts → 400 Bad Request
  - [ ] Portkey API errors → 502 Bad Gateway
- [ ] Write integration tests:
  - [ ] Successful summarization
  - [ ] Language matching (German in → German out)
  - [ ] Multiple participants
  - [ ] Error scenarios

### 6.4 Frontend API Integration
- [ ] Create `src/lib/ai-api.ts`
- [ ] Functions:
  - [ ] `uploadAudio(sessionId: string, participantId: string, audioBlob: Blob): Promise<{transcript: string, language: string}>`
  - [ ] `generateSummary(sessionId: string, transcripts: Array<{name: string, text: string}>): Promise<string>`
- [ ] Add loading states and progress tracking
- [ ] Error handling with user-friendly messages
- [ ] Write unit tests:
  - [ ] API call formation
  - [ ] Error handling
  - [ ] Response parsing

### 6.5 Connect TalkSession to Transcription
- [ ] Update `src/components/TalkSession.vue`:
  - [ ] Replace mock `uploadAudio()` with real API call
  - [ ] Show upload progress
  - [ ] Display transcript when ready
  - [ ] Handle transcription errors with retry option
- [ ] Update `src/views/Session.vue`:
  - [ ] Store transcripts in state
  - [ ] Pass transcripts to TranscriptView component
  - [ ] Enable "Generate Summary" button when transcripts exist

### 6.6 Connect Summary to AI
- [ ] Update `src/views/Session.vue`:
  - [ ] Replace mock `generateSummary()` with real API call
  - [ ] Show generation progress
  - [ ] Display summary when ready
  - [ ] Handle summarization errors

---

## Phase 7: Complete Real-time Features (Transcript Sync)

**Prerequisites**: Phase 5 (basic Pusher setup) and Phase 6 (AI transcription) must be complete.

### 7.1 Add Transcript Events to Pusher
- [ ] Update `src/composables/usePusher.ts`:
  - [ ] Add `transcript-ready` event listener
  - [ ] Add `summary-generated` event listener
- [ ] Update `src/composables/useSession.ts`:
  - [ ] Add transcript storage to session state
  - [ ] Add summary storage to session state

### 7.2 Broadcast Transcript Events
- [ ] Update `src/components/TalkSession.vue`:
  - [ ] After successful transcription, broadcast `transcript-ready` event via Pusher
  - [ ] Include: participantId, participantName, transcript text, duration
- [ ] Update `src/views/Session.vue`:
  - [ ] After generating summary, broadcast `summary-generated` event
  - [ ] Include: summary text, generated timestamp

### 7.3 Sync Transcripts Across Clients
- [ ] Listen for `transcript-ready` events from other participants
- [ ] Update local transcript list when remote transcript arrives
- [ ] Update participant status to "done" when transcript ready
- [ ] Show visual notification when new transcript arrives

### 7.4 Sync Summary Across Clients
- [ ] Listen for `summary-generated` event
- [ ] Display summary when it arrives (even if not the generator)
- [ ] Show visual notification when summary is ready

### 7.5 Integration Tests
- [ ] Write multi-client tests:
  - [ ] Participant A records → Participant B sees transcript
  - [ ] Leader generates summary → All participants see it
  - [ ] Late joiner sees existing transcripts
  - [ ] Handle network disconnection/reconnection

---

## Phase 8: Email Delivery

### 8.1 SendGrid Integration
- [ ] Create `netlify/functions/lib/sendgrid-client.ts`
- [ ] Initialize SendGrid with API key
- [ ] Create email template function
- [ ] Write unit tests:
  - [ ] Client initialization
  - [ ] Template generation

### 8.2 Send Summary Function
- [ ] Create `netlify/functions/send-summary.ts`
- [ ] Accept:
  - Session ID
  - Summary text
  - Recipient emails array
  - Subject line
- [ ] Format email:
  - HTML version (styled)
  - Plain text version (fallback)
  - Include session date/time
- [ ] Send via SendGrid
- [ ] Error handling:
  - Invalid emails
  - SendGrid errors
  - Rate limits
- [ ] Write integration tests:
  - [ ] Successful send
  - [ ] Invalid email handling
  - [ ] Error scenarios

### 8.3 Email UI Integration
- [ ] Add email input form to Summary component
- [ ] Validate email addresses (multiple, comma-separated)
- [ ] Send button with loading state
- [ ] Success/error notifications
- [ ] Write E2E tests:
  - [ ] Email form validation
  - [ ] Send flow
  - [ ] Success/error messages

---

## Phase 9: Security & Privacy Features

### 9.1 HTTPS Enforcement
- [ ] Configure Netlify to force HTTPS
- [ ] Add HTTPS check in app initialization
- [ ] Add security headers in `netlify.toml`:
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`

### 9.2 API Key Protection
- [ ] Verify all API keys are in Netlify environment variables
- [ ] Ensure no keys in client-side code
- [ ] Add environment variable validation in functions
- [ ] Document required env vars in `.env.example`

### 9.3 Session Security (Most Already Completed in Phase 3.5 & 4)
- [x] ✅ Implement session expiration cleanup (4 hours via Redis TTL) - **Completed in Phase 4**
- [x] ✅ Add CSRF protection for sensitive operations - **Completed in Phase 4**
- [x] ✅ Validate session IDs on all function calls - **Completed in Phase 4**
- [x] ✅ Rate limiting for session creation - **Completed in Phase 4**
- [ ] Write additional security tests (if needed):
  - [x] ✅ Session expiration - **Completed in Phase 4**
  - [x] ✅ Invalid session ID handling - **Completed in Phase 4**
  - [x] ✅ Rate limiting - **Completed in Phase 4**

### 9.4 Privacy Features
- [ ] Add privacy warning banner:
  - "Audio sent to Portkey/OpenAI"
  - Link to privacy policies
- [ ] Implement data cleanup:
  - Clear audio blobs after transcription
  - Clear session data after expiration
  - No persistent storage
- [ ] Add "Delete Session" button for leaders
- [ ] Write tests:
  - [ ] Data cleanup triggers
  - [ ] Session deletion

### 9.5 Input Validation & Sanitization (Completed in Phase 3.5)
- [x] ✅ Validate all user inputs - **Completed in Phase 3.5**:
  - [x] Session IDs (format, length)
  - [x] Participant names (XSS prevention)
  - [x] Email addresses
  - [x] Passwords
- [x] ✅ Sanitize all displayed user content - **Completed in Phase 3.5**
- [x] ✅ Write security tests - **Completed in Phase 3.5**:
  - [x] XSS prevention
  - [x] Injection attacks
  - [x] Input validation

**Note**: Most security features have been moved forward to Phase 3.5 and Phase 4 to ensure security is built-in from the start, not bolted on later.

---

## Phase 10: Testing & Quality Assurance

### 10.1 Unit Test Coverage
- [ ] Achieve >80% coverage for:
  - [ ] Utility functions
  - [ ] Composables
  - [ ] Components
  - [ ] Type guards
- [ ] Run coverage report: `npm run test:coverage`
- [ ] Fix any uncovered critical paths

### 10.2 Integration Tests
- [ ] Test Netlify Functions locally:
  - [ ] Session management functions
  - [ ] Transcribe function
  - [ ] Summarize function
  - [ ] Send-summary function
- [ ] Test Pusher integration
- [ ] Test session flow end-to-end

### 10.3 E2E Tests (Playwright)
- [ ] Complete standup flow:
  - [ ] Create session (via API)
  - [ ] Join session in new browser (via modal)
  - [ ] Record audio with Talk button
  - [ ] View transcript
  - [ ] Generate summary
  - [ ] Send email
- [ ] Multi-user scenarios (2+ browsers)
- [ ] Error scenarios (session not found, wrong password)
- [ ] Mobile responsive testing

### 10.4 Manual Testing Checklist
- [ ] Test on browsers: Chrome, Firefox, Safari, Edge
- [ ] Test on devices: Desktop, tablet, mobile
- [ ] Test microphone permissions on different browsers
- [ ] Test with real audio (English & German)
- [ ] Test password protection flow
- [ ] Test session expiration
- [ ] Test email delivery
- [ ] Test error handling (network errors, API failures)

### 10.5 Performance Testing
- [ ] Test with 7-10 participants
- [ ] Measure audio upload times
- [ ] Measure transcription response times
- [ ] Measure summary generation times
- [ ] Check for memory leaks (long sessions)
- [ ] Optimize bundle size

### 10.6 Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] WCAG 2.1 AA compliance
- [ ] Color contrast ratios
- [ ] Focus indicators visible

---

## Phase 11: Deployment

### 11.1 Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Environment variables documented
- [ ] README.md updated with setup instructions
- [ ] Security review completed
- [ ] Performance benchmarks acceptable
- [ ] Browser compatibility verified

### 11.2 Netlify Production Setup
- [ ] Create Netlify account/site
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Add environment variables in Netlify dashboard
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS

### 11.3 Third-Party Service Setup
- [ ] Upstash Redis account + database
- [ ] Pusher Channels account + app creation
- [ ] Portkey account + API key
- [ ] SendGrid account + API key + sender verification
- [ ] Verify free tier limits:
  - Upstash Redis: Up to 10,000 requests/day
  - Pusher: 100 concurrent connections
  - SendGrid: 100 emails/day
  - Portkey: Usage-based pricing

### 11.4 Production Deploy
- [ ] Deploy to Netlify
- [ ] Verify all functions deploy successfully
- [ ] Test production environment:
  - [ ] Create session works (via API)
  - [ ] Join session works (with modal)
  - [ ] Audio recording works
  - [ ] Transcription works
  - [ ] Summary generation works
  - [ ] Email delivery works
- [ ] Monitor for errors (Netlify logs)

### 11.5 Post-Deployment
- [ ] Set up error monitoring (Sentry or similar)
- [ ] Configure analytics (optional)
- [ ] Create deployment documentation
- [ ] Share with initial test users
- [ ] Collect feedback
- [ ] Monitor costs (Upstash, Portkey usage)

---

## Testing Standards

### Unit Tests
- **Coverage Target**: >80% for critical paths
- **Framework**: Vitest + @vue/test-utils
- **Location**: `src/__tests__/unit/`
- **Naming**: `[component-name].test.ts`

### Integration Tests
- **Framework**: Vitest
- **Location**: `src/__tests__/integration/`
- **Focus**: API interactions, Pusher events, multi-component flows

### E2E Tests
- **Framework**: Playwright
- **Location**: `e2e/`
- **Focus**: Full user journeys, multi-user scenarios

### Test Priorities
1. **Critical**: Session management, audio recording, AI integration
2. **High**: Real-time sync, email delivery, security
3. **Medium**: UI components, form validation
4. **Low**: Visual styling, optional features

---

## Success Criteria

### MVP Launch Criteria
- ✅ All Phase 1-8 tasks completed
- ✅ >80% test coverage
- ✅ All E2E tests passing
- ✅ Successfully tested with 5+ person standup
- ✅ Email delivery working reliably
- ✅ Transcription accuracy >80%
- ✅ Summary captures all key points
- ✅ No security vulnerabilities
- ✅ Monthly cost <$10

### Quality Gates
- [x] All linting passes (ESLint + TypeScript) ✅
- [ ] All tests passing (unit + integration + E2E)
- [ ] No console errors in production
- [ ] Lighthouse score >90 (performance, accessibility)
- [ ] Mobile responsive on iOS and Android

---

## Postponed Items (Optional - Add Later If Needed)

### Auto-Import Plugins
**Postponed Reason:** Small project size, explicit imports preferred for clarity and learning

- [ ] Install `unplugin-auto-import` for Vue composables
- [ ] Install `unplugin-vue-components` for component auto-imports
- [ ] Configure auto-import for Vue Router, Pinia, etc.

### Git Hooks with Husky
**Postponed Reason:** Manual pre-push checks sufficient for now

- [ ] Install Husky: `npm install -D husky`
- [ ] Initialize git hooks: `npx husky init`
- [ ] Add pre-push hook: `npm run pre-push`
- [ ] Add pre-commit hook for linting

### Advanced DevTools
**Postponed Reason:** Default Vue DevTools already sufficient

- [ ] Configure Vue DevTools for production debugging (if needed)
- [ ] Add custom DevTools plugins (if needed)

### Persistent Session Storage (Backend)
**Postponed Reason:** MVP uses client-side state for simplicity, acceptable for 15-min standups

**Current Approach:**
- Session IDs generated in browser (Web Crypto API - cryptographically secure)
- Session state stored in leader's browser (localStorage + Pusher sync)
- Limitation: Leader must stay connected during standup

**Future Enhancement (if needed):**
- [ ] Add Netlify Function: `create-session` (backend ID generation)
- [ ] Integrate Upstash Redis for persistent session storage
- [ ] Store session data server-side (survives leader disconnect)
- [ ] Cost: ~$0-10/month for Redis (Upstash free tier available)
- [ ] Benefit: More resilient sessions, leader can disconnect/reconnect

**Security Note:** Frontend ID generation is cryptographically secure (Web Crypto API). Security comes from:
- 32 bytes of entropy (2^256 combinations - unguessable)
- Optional password protection
- HTTPS-only URLs
- 4-hour session expiration

---

## Notes

- Mark tasks as complete as you finish them with `[x]`
- Add new tasks as needed during implementation
- Document any blockers or issues discovered
- Update estimates if timeline changes
- Keep CLAUDE.md as source of truth for requirements

---

## Security Improvements Summary

This implementation plan includes comprehensive security measures integrated throughout development:

### Phase 3.5: Critical Security Fixes (NEW - PRE-REQUISITE)
**Added to address security vulnerabilities before Phase 4:**
- ✅ **Input Validation & Sanitization**: DOMPurify integration, XSS prevention, HTML escaping
- ✅ **Password Security**: Timing-safe comparison, strength validation
- ✅ **Session Validation**: Runtime type guards, localStorage corruption handling
- ✅ **Security Headers**: Stricter CSP, HSTS, enhanced Permissions-Policy
- ✅ **Comprehensive Testing**: XSS payloads, malicious JSON, security test suite

### Phase 4: Enhanced Backend Security (UPDATED)
**Security measures integrated into Netlify Functions architecture:**
- ✅ **Rate Limiting**: 5 sessions/hour (create), 10 sessions/hour (join) via Upstash
- ✅ **CSRF Protection**: Token-based validation for state-changing operations
- ✅ **Server-Side Validation**: Session IDs, user names, password strength
- ✅ **Max Participants Limit**: 20 participants per session (prevent abuse)
- ✅ **Connection Resilience**: Redis retry logic, health checks, graceful degradation
- ✅ **Security Testing**: Multi-browser E2E tests, brute force prevention, XSS payloads

### Security-First Design Principles
1. **Defense in Depth**: Multiple layers of validation (client + server)
2. **Fail Secure**: Invalid input rejected, not sanitized into valid input
3. **Least Privilege**: API responses only return necessary data (no password hashes)
4. **Rate Limiting**: Prevent brute force and DoS attacks
5. **Input Sanitization**: All user input sanitized before storage and display
6. **Constant-Time Comparison**: Password verification resistant to timing attacks
7. **Secure Defaults**: HTTPS-only, strict CSP, secure session IDs

### Dependencies Added for Security
- `dompurify` - XSS prevention and HTML sanitization
- `@upstash/ratelimit` - Distributed rate limiting via Redis
- Enhanced validation in all Netlify Functions

---

## Changelog

### 2026-01-21
- 🔒 **Security Review & Implementation Plan Enhancement**:
  - **Added Phase 3.5**: Critical Security Fixes (XSS prevention, input validation, password timing-safe comparison, session validation)
  - **Enhanced Phase 4** with comprehensive security measures:
    - Rate limiting with `@upstash/ratelimit` (5 create/hour, 10 join/hour)
    - CSRF protection for state-changing operations
    - Server-side validation and sanitization in all Netlify Functions
    - Max participants limit (20 per session)
    - Redis connection resilience and retry logic
    - Comprehensive security-focused E2E tests
  - **Updated Phase 9** to reflect security work completed in earlier phases
  - **Added Security Improvements Summary** section
  - **Updated `.env.example` requirements** for Upstash Redis
  - **Clarified architecture**: Netlify Functions = serverless backend (same repo, no separate Node.js server)

### 2026-01-20 (continued)
- ✅ Phase 3 completed: Full UI layer with 8 components + 2 views
  - Vue Router with 3 routes and title management
  - Home.vue: Create/join session interface with privacy notice
  - Session.vue: Main standup room with responsive 3-column layout
  - Timer.vue: Countdown with progress bar (default 2 min/person)
  - AudioRecorder.vue: Record, playback, file size display (WebM/Opus)
  - ParticipantsList.vue: Status tracking with stats (Total, Done, Recording)
  - TranscriptView.vue: Transcript display with copy/clipboard
  - SummaryView.vue: Summary display + email form + download as .txt
  - Crypto polyfill added for Vite Vue plugin in test environment
  - 54 existing tests remain passing

### 2026-01-20 (earlier)
- ✅ Phase 2 completed: Core session management (56 tests, 93.93% coverage)
- ✅ Phase 1 completed: Project setup with Vue 3, TypeScript, Tailwind CSS v4, testing infrastructure
