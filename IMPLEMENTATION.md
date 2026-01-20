# AI-Powered Standup Assistant - Implementation Plan

## Progress Tracking
- [x] Phase 1: Project Setup & Configuration ✅
- [ ] Phase 2: Core Session Management (In Progress)
- [ ] Phase 3: UI Components & Views
- [ ] Phase 4: Real-time Synchronization
- [ ] Phase 5: Audio Recording & Processing
- [ ] Phase 6: AI Integration (Netlify Functions)
- [ ] Phase 7: Email Delivery
- [ ] Phase 8: Security & Privacy Features
- [ ] Phase 9: Testing & Quality Assurance
- [ ] Phase 10: Deployment

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

## Phase 2: Core Session Management

### 2.1 Session Types & Interfaces
- [ ] Create `src/types/session.ts`:
  - `Session` interface (id, createdAt, expiresAt, password, participants)
  - `Participant` interface (id, name, audioBlob, transcript)
  - `SessionState` type
- [ ] Write unit tests for type guards

### 2.2 Session ID Generation
- [ ] Create `src/lib/crypto-utils.ts`
- [ ] Implement `generateSessionId()` using Web Crypto API
- [ ] Ensure cryptographically random (min 32 bytes entropy)
- [ ] Write unit tests:
  - [ ] Generates unique IDs
  - [ ] IDs are URL-safe
  - [ ] Minimum length requirements

### 2.3 Session Store (Composable)
- [ ] Create `src/composables/useSession.ts`
- [ ] Implement client-side session state management (reactive with Vue refs)
- [ ] Use localStorage for session persistence (leader browser)
- [ ] Functions:
  - `createSession(password?: string)` - Generate ID, store locally
  - `joinSession(sessionId: string, userName: string, password?: string)` - Validate & join
  - `leaveSession()` - Clean up local state
  - `getSessionState()` - Return current session
  - `isSessionExpired()` - Check 4-hour timeout
- [ ] Add 4-hour expiration logic (timestamp-based)
- [ ] Document limitation: Leader must stay connected (or use Upstash Redis in future)
- [ ] Write unit tests:
  - [ ] Session creation with localStorage
  - [ ] Joining with/without password
  - [ ] Password validation
  - [ ] Expiration check
  - [ ] Participant management
  - [ ] localStorage persistence

### 2.4 Password Protection
- [ ] Create `src/lib/password-utils.ts`
- [ ] Implement password hashing using **Web Crypto API (PBKDF2)**
  - Browser-native, no backend needed
  - Secure for temporary session protection
- [ ] Functions:
  - `hashPassword(password: string): Promise<string>` - PBKDF2 hash
  - `verifyPassword(password: string, hash: string): Promise<boolean>` - Compare
- [ ] Write unit tests:
  - [ ] Hash generation (PBKDF2)
  - [ ] Verification success/failure
  - [ ] Edge cases (empty password, special characters)
  - [ ] Hash consistency

---

## Phase 3: UI Components & Views

### 3.1 Vue Router Setup
- [ ] Create `src/router/index.ts`
- [ ] Define routes:
  - `/` → Home view (create/join)
  - `/session/:id` → Session view
  - `/404` → Not found
- [ ] Add route guards for session validation
- [ ] Write E2E tests:
  - [ ] Navigation between routes
  - [ ] Protected route access

### 3.2 Home View
- [ ] Create `src/views/Home.vue`
- [ ] Features:
  - "Create Session" button
  - "Join Session" form (session ID input)
  - Optional password input
  - Instructions/welcome text
- [ ] Add form validation
- [ ] Write component tests:
  - [ ] Create session button works
  - [ ] Join form validation
  - [ ] Navigation on submit

### 3.3 Session View Layout
- [ ] Create `src/views/Session.vue`
- [ ] Layout sections:
  - Session info header (ID, copy link button)
  - Participants list
  - Timer component area
  - Audio controls area
  - Transcripts display area
  - Summary display area
- [ ] Add responsive design (mobile-friendly)
- [ ] Write component tests:
  - [ ] Renders all sections
  - [ ] Copy link functionality
  - [ ] Responsive behavior

### 3.4 Timer Component
- [ ] Create `src/components/Timer.vue`
- [ ] Features:
  - Display countdown (default: 2 minutes per person)
  - Start/Stop/Reset controls
  - Visual progress indicator
  - Sound notification on time end (optional)
- [ ] Props: `duration`, `autoStart`
- [ ] Emits: `timer-started`, `timer-stopped`, `timer-ended`
- [ ] Write component tests:
  - [ ] Timer countdown works
  - [ ] Start/stop functionality
  - [ ] Events emitted correctly
  - [ ] Visual updates

### 3.5 Participants List Component
- [ ] Create `src/components/ParticipantsList.vue`
- [ ] Display:
  - Participant name
  - Status (recording, done, waiting)
  - Transcript ready indicator
- [ ] Write component tests:
  - [ ] Renders participant list
  - [ ] Status updates correctly

### 3.6 Transcript View Component
- [ ] Create `src/components/TranscriptView.vue`
- [ ] Features:
  - Display transcripts per participant
  - Auto-scroll to latest
  - Loading states
  - Error handling display
- [ ] Write component tests:
  - [ ] Renders transcripts
  - [ ] Loading states
  - [ ] Error states

### 3.7 Summary View Component
- [ ] Create `src/components/SummaryView.vue`
- [ ] Features:
  - Display formatted summary
  - Copy to clipboard button
  - Send email button
  - Export options
- [ ] Write component tests:
  - [ ] Renders summary
  - [ ] Copy functionality
  - [ ] Email trigger

---

## Phase 4: Real-time Synchronization

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

### 4.3 Real-time State Sync
- [ ] Integrate Pusher with session store
- [ ] Broadcast local events to channel
- [ ] Update local state from remote events
- [ ] Handle race conditions
- [ ] Write integration tests:
  - [ ] Timer sync across clients
  - [ ] Participant updates sync
  - [ ] Transcript sync

---

## Phase 5: Audio Recording & Processing

### 5.1 Audio Recorder Composable
- [ ] Create `src/composables/useAudioRecorder.ts`
- [ ] Features:
  - Start/stop recording using MediaRecorder API
  - Request microphone permissions
  - Handle different audio formats (prefer webm/opus)
  - Convert to format accepted by Whisper API
  - Error handling (no mic, permission denied)
- [ ] Write unit tests (with mocked MediaRecorder):
  - [ ] Start/stop recording
  - [ ] Permission handling
  - [ ] Error scenarios

### 5.2 Audio Utilities
- [ ] Create `src/lib/audio-utils.ts`
- [ ] Functions:
  - `convertAudioBlob(blob: Blob): Promise<Blob>` (if format conversion needed)
  - `validateAudioSize(blob: Blob): boolean` (max 25MB for Whisper)
  - `getAudioDuration(blob: Blob): Promise<number>`
- [ ] Write unit tests:
  - [ ] Size validation
  - [ ] Format handling

### 5.3 Audio Recorder Component
- [ ] Create `src/components/AudioRecorder.vue`
- [ ] UI:
  - Record/Stop button
  - Recording indicator (red dot)
  - Audio duration display
  - Playback preview (optional)
  - Upload/Transcribe button
- [ ] Integrate with useAudioRecorder composable
- [ ] Write component tests:
  - [ ] Record button behavior
  - [ ] State changes
  - [ ] Upload trigger

---

## Phase 6: AI Integration (Netlify Functions)

### 6.1 Portkey Client Setup
- [ ] Create `src/lib/portkey.ts` (for type definitions)
- [ ] Create `netlify/functions/lib/portkey-server.ts`
- [ ] Initialize Portkey client with API key
- [ ] Add error handling and retry logic
- [ ] Write unit tests:
  - [ ] Client initialization
  - [ ] Error handling

### 6.2 Transcribe Function
- [ ] Create `netlify/functions/transcribe.ts`
- [ ] Accept audio file via multipart/form-data
- [ ] Call Portkey Whisper API:
  - Model: `whisper-1`
  - Language: auto-detect (or explicit de/en)
- [ ] Return transcript text
- [ ] Error handling:
  - Invalid audio format
  - File too large
  - API errors
- [ ] Write integration tests:
  - [ ] Successful transcription
  - [ ] Error handling
  - [ ] Language detection

### 6.3 Summarize Function
- [ ] Create `netlify/functions/summarize.ts`
- [ ] Accept array of transcripts with participant names
- [ ] Detect language from transcripts
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
- [ ] Return formatted summary
- [ ] Write integration tests:
  - [ ] Successful summarization
  - [ ] Language matching (German in → German out)
  - [ ] Error handling

### 6.4 API Integration in Frontend
- [ ] Create `src/lib/api-client.ts`
- [ ] Functions:
  - `uploadAudio(sessionId: string, participantId: string, audioBlob: Blob)`
  - `generateSummary(sessionId: string, transcripts: Transcript[])`
- [ ] Add loading states
- [ ] Error handling with user-friendly messages
- [ ] Write unit tests:
  - [ ] API calls formation
  - [ ] Error handling
  - [ ] Response parsing

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

---

## Notes

- Mark tasks as complete as you finish them with `[x]`
- Add new tasks as needed during implementation
- Document any blockers or issues discovered
- Update estimates if timeline changes
- Keep CLAUDE.md as source of truth for requirements

## Changelog

### 2026-01-20
- ✅ **Phase 1 Completed:** Full project setup with Vue 3, TypeScript, Tailwind CSS v4, testing infrastructure (Vitest + Playwright), ESLint/Prettier, and Netlify configuration
- 📝 Added code quality tools (ESLint, Prettier) beyond original plan
- 📝 Added comprehensive README documentation with all commands
- 📝 Postponed auto-imports and git hooks for later (optional enhancements)
