i# AI-Powered Standup Assistant - Implementation Plan

## Progress Tracking
- [x] Phase 1: Project Setup & Configuration ✅
- [x] Phase 2: Core Session Management ✅
- [x] Phase 3: UI Components & Views ✅
- [ ] Phase 4: Code Quality Improvements & Basic Real-time Sync
- [ ] Phase 5: AI Integration (Netlify Functions) - Transcription & Summarization
- [ ] Phase 6: Complete Real-time Features (Transcript Sync)
- [ ] Phase 7: Email Delivery
- [ ] Phase 8: Security & Privacy Features
- [ ] Phase 9: Testing & Quality Assurance
- [ ] Phase 10: Deployment

**Note**: Phase order optimized for logical dependency flow. Audio recording UI was completed in Phase 3.

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

## Phase 4: Code Quality Improvements & Basic Real-time Sync

### 4.0 Code Quality Improvements (Do First)
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
  - [ ] Update usage in: Timer.vue, AudioRecorder.vue

- [ ] **Add window type declarations** `src/types/window.d.ts`:
  ```typescript
  declare global {
    interface Window {
      webkitAudioContext?: typeof AudioContext
    }
  }
  export {}
  ```
  - [ ] Remove type assertion from AudioRecorder.vue

- [ ] **Optional: Extract reusable composables** (if time permits)
  - [ ] `src/composables/useClipboard.ts` - Copy-to-clipboard functionality
  - [ ] `src/composables/useFileDownload.ts` - File download functionality

### 4.1 Pusher Integration Setup
- [ ] Create `src/lib/pusher-client.ts`
- [ ] Initialize Pusher client with env variables
- [ ] Add connection error handling
- [ ] Write unit tests:
  - [ ] Client initialization
  - [ ] Connection handling

### 4.2 Pusher Composable
- [ ] Create `src/composables/usePusher.ts`
- [ ] Implement channel subscription/unsubscription
- [ ] Event listeners:
  - `user-joined`
  - `user-left`
  - `timer-started`
  - `timer-stopped`
  - `transcript-ready`
  - `summary-generated`
- [ ] Write unit tests:
  - [ ] Channel subscription
  - [ ] Event handling
  - [ ] Cleanup on unmount

### 4.3 Real-time State Sync (Basic Features Only)
- [ ] Integrate Pusher with session store (useSession)
- [ ] Broadcast local events to channel:
  - [ ] `timer-started` / `timer-stopped` events
  - [ ] `user-joined` / `user-left` events
  - [ ] Participant status updates (`waiting`, `recording`, `done`)
- [ ] Update local state from remote events
- [ ] Handle race conditions (optimistic UI updates)
- [ ] Write integration tests:
  - [ ] Timer sync across clients
  - [ ] Participant join/leave sync
  - [ ] Participant status updates

**Note**: Transcript sync (`transcript-ready` event) will be implemented in Phase 6 after AI integration is complete, ensuring we can test with real transcription data.

---

## Phase 5: AI Integration (Netlify Functions)

**Status**: AudioRecorder UI component completed in Phase 3. This phase focuses on connecting it to AI services.

### 5.1 Portkey Client Setup
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

### 5.2 Transcription Function (Netlify)
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

### 5.3 Summarization Function (Netlify)
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

### 5.4 Frontend API Integration
- [ ] Create `src/lib/api-client.ts`
- [ ] Functions:
  - [ ] `uploadAudio(sessionId: string, participantId: string, audioBlob: Blob): Promise<{transcript: string, language: string}>`
  - [ ] `generateSummary(sessionId: string, transcripts: Array<{name: string, text: string}>): Promise<string>`
- [ ] Add loading states and progress tracking
- [ ] Error handling with user-friendly messages
- [ ] Write unit tests:
  - [ ] API call formation
  - [ ] Error handling
  - [ ] Response parsing

### 5.5 Connect AudioRecorder to Transcription
- [ ] Update `src/components/AudioRecorder.vue`:
  - [ ] Replace mock `uploadAudio()` with real API call
  - [ ] Show upload progress
  - [ ] Display transcript when ready
  - [ ] Handle transcription errors with retry option
- [ ] Update `src/views/Session.vue`:
  - [ ] Store transcripts in state
  - [ ] Pass transcripts to TranscriptView component
  - [ ] Enable "Generate Summary" button when transcripts exist

### 5.6 Connect Summary to AI
- [ ] Update `src/views/Session.vue`:
  - [ ] Replace mock `generateSummary()` with real API call
  - [ ] Show generation progress
  - [ ] Display summary when ready
  - [ ] Handle summarization errors

---

## Phase 6: Complete Real-time Features (Transcript Sync)

**Prerequisites**: Phase 4 (basic Pusher setup) and Phase 5 (AI transcription) must be complete.

### 6.1 Add Transcript Events to Pusher
- [ ] Update `src/composables/usePusher.ts`:
  - [ ] Add `transcript-ready` event listener
  - [ ] Add `summary-generated` event listener
- [ ] Update `src/composables/useSession.ts`:
  - [ ] Add transcript storage to session state
  - [ ] Add summary storage to session state

### 6.2 Broadcast Transcript Events
- [ ] Update `src/components/AudioRecorder.vue`:
  - [ ] After successful transcription, broadcast `transcript-ready` event via Pusher
  - [ ] Include: participantId, participantName, transcript text, duration
- [ ] Update `src/views/Session.vue`:
  - [ ] After generating summary, broadcast `summary-generated` event
  - [ ] Include: summary text, generated timestamp

### 6.3 Sync Transcripts Across Clients
- [ ] Listen for `transcript-ready` events from other participants
- [ ] Update local transcript list when remote transcript arrives
- [ ] Update participant status to "done" when transcript ready
- [ ] Show visual notification when new transcript arrives

### 6.4 Sync Summary Across Clients
- [ ] Listen for `summary-generated` event
- [ ] Display summary when it arrives (even if not the generator)
- [ ] Show visual notification when summary is ready

### 6.5 Integration Tests
- [ ] Write multi-client tests:
  - [ ] Participant A records → Participant B sees transcript
  - [ ] Leader generates summary → All participants see it
  - [ ] Late joiner sees existing transcripts
  - [ ] Handle network disconnection/reconnection

---

## Phase 7: Email Delivery

### 7.1 SendGrid Integration
- [ ] Create `netlify/functions/lib/sendgrid-client.ts`
- [ ] Initialize SendGrid with API key
- [ ] Create email template function
- [ ] Write unit tests:
  - [ ] Client initialization
  - [ ] Template generation

### 7.2 Send Summary Function
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

### 7.3 Email UI Integration
- [ ] Add email input form to Summary component
- [ ] Validate email addresses (multiple, comma-separated)
- [ ] Send button with loading state
- [ ] Success/error notifications
- [ ] Write E2E tests:
  - [ ] Email form validation
  - [ ] Send flow
  - [ ] Success/error messages

---

## Phase 8: Security & Privacy Features

### 8.1 HTTPS Enforcement
- [ ] Configure Netlify to force HTTPS
- [ ] Add HTTPS check in app initialization
- [ ] Add security headers in `netlify.toml`:
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`

### 8.2 API Key Protection
- [ ] Verify all API keys are in Netlify environment variables
- [ ] Ensure no keys in client-side code
- [ ] Add environment variable validation in functions
- [ ] Document required env vars in `.env.example`

### 8.3 Session Security
- [ ] Implement session expiration cleanup (4 hours)
- [ ] Add CSRF protection for sensitive operations
- [ ] Validate session IDs on all function calls
- [ ] Rate limiting for session creation
- [ ] Write security tests:
  - [ ] Session expiration
  - [ ] Invalid session ID handling
  - [ ] Rate limiting

### 8.4 Privacy Features
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

### 8.5 Input Validation & Sanitization
- [ ] Validate all user inputs:
  - Session IDs (format, length)
  - Participant names (XSS prevention)
  - Email addresses
  - Passwords
- [ ] Sanitize all displayed user content
- [ ] Write security tests:
  - [ ] XSS prevention
  - [ ] Injection attacks
  - [ ] Input validation

---

## Phase 9: Testing & Quality Assurance

### 9.1 Unit Test Coverage
- [ ] Achieve >80% coverage for:
  - [ ] Utility functions
  - [ ] Composables
  - [ ] Components
  - [ ] Type guards
- [ ] Run coverage report: `npm run test:coverage`
- [ ] Fix any uncovered critical paths

### 9.2 Integration Tests
- [ ] Test Netlify Functions locally:
  - [ ] Transcribe function
  - [ ] Summarize function
  - [ ] Send-summary function
- [ ] Test Pusher integration
- [ ] Test session flow end-to-end

### 9.3 E2E Tests (Playwright)
- [ ] Complete standup flow:
  - [ ] Create session
  - [ ] Join session
  - [ ] Record audio
  - [ ] View transcript
  - [ ] Generate summary
  - [ ] Send email
- [ ] Multi-user scenarios (2+ browsers)
- [ ] Error scenarios
- [ ] Mobile responsive testing

### 9.4 Manual Testing Checklist
- [ ] Test on browsers: Chrome, Firefox, Safari, Edge
- [ ] Test on devices: Desktop, tablet, mobile
- [ ] Test microphone permissions on different browsers
- [ ] Test with real audio (English & German)
- [ ] Test password protection flow
- [ ] Test session expiration
- [ ] Test email delivery
- [ ] Test error handling (network errors, API failures)

### 9.5 Performance Testing
- [ ] Test with 7-10 participants
- [ ] Measure audio upload times
- [ ] Measure transcription response times
- [ ] Measure summary generation times
- [ ] Check for memory leaks (long sessions)
- [ ] Optimize bundle size

### 9.6 Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] WCAG 2.1 AA compliance
- [ ] Color contrast ratios
- [ ] Focus indicators visible

---

## Phase 10: Deployment

### 10.1 Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Environment variables documented
- [ ] README.md updated with setup instructions
- [ ] Security review completed
- [ ] Performance benchmarks acceptable
- [ ] Browser compatibility verified

### 10.2 Netlify Production Setup
- [ ] Create Netlify account/site
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Add environment variables in Netlify dashboard
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS

### 10.3 Third-Party Service Setup
- [ ] Pusher Channels account + app creation
- [ ] Portkey account + API key
- [ ] SendGrid account + API key + sender verification
- [ ] Verify free tier limits:
  - Pusher: 100 concurrent connections
  - SendGrid: 100 emails/day
  - Portkey: Usage-based pricing

### 10.4 Production Deploy
- [ ] Deploy to Netlify
- [ ] Verify all functions deploy successfully
- [ ] Test production environment:
  - [ ] Create session works
  - [ ] Join session works
  - [ ] Audio recording works
  - [ ] Transcription works
  - [ ] Summary generation works
  - [ ] Email delivery works
- [ ] Monitor for errors (Netlify logs)

### 10.5 Post-Deployment
- [ ] Set up error monitoring (Sentry or similar)
- [ ] Configure analytics (optional)
- [ ] Create deployment documentation
- [ ] Share with initial test users
- [ ] Collect feedback
- [ ] Monitor costs (Portkey usage)

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

## Changelog

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
