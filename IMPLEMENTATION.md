# AI-Powered Standup Assistant - Implementation Plan

## Progress Tracking
- [ ] Phase 1: Project Setup & Configuration
- [ ] Phase 2: Core Session Management
- [ ] Phase 3: UI Components & Views
- [ ] Phase 4: Real-time Synchronization
- [ ] Phase 5: Audio Recording & Processing
- [ ] Phase 6: AI Integration (Netlify Functions)
- [ ] Phase 7: Email Delivery
- [ ] Phase 8: Security & Privacy Features
- [ ] Phase 9: Testing & Quality Assurance
- [ ] Phase 10: Deployment

---

## Phase 1: Project Setup & Configuration

### 1.1 Initialize Vue 3 + Vite Project
- [ ] Run `npm create vite@latest . -- --template vue-ts`
- [ ] Install core dependencies: `npm install`
- [ ] Verify dev server runs: `npm run dev`
- [ ] Create `.gitignore` (include `.env`, `node_modules`, `dist`, `.netlify`)

### 1.2 Install & Configure Tailwind CSS
- [ ] Install Tailwind: `npm install -D tailwindcss postcss autoprefixer`
- [ ] Run `npx tailwindcss init -p`
- [ ] Configure `tailwind.config.js` with Vue content paths
- [ ] Create `src/assets/main.css` with Tailwind directives
- [ ] Import CSS in `src/main.ts`
- [ ] Test: Add Tailwind classes to App.vue and verify styling works

### 1.3 Install Additional Dependencies
- [ ] Vue Router: `npm install vue-router@4`
- [ ] Pusher Client: `npm install pusher-js`
- [ ] Type definitions: `npm install -D @types/node`
- [ ] Testing: `npm install -D vitest @vue/test-utils jsdom`
- [ ] E2E Testing: `npm install -D @playwright/test`

### 1.4 Configure Testing Infrastructure
- [ ] Create `vitest.config.ts` for unit tests
- [ ] Create `playwright.config.ts` for E2E tests
- [ ] Add test scripts to `package.json`:
  - `"test": "vitest"`
  - `"test:ui": "vitest --ui"`
  - `"test:e2e": "playwright test"`
  - `"test:coverage": "vitest --coverage"`
- [ ] Create `__tests__` directory structure
- [ ] Write sample test to verify setup works

### 1.5 Netlify Configuration
- [ ] Create `netlify.toml` in project root
- [ ] Configure build settings:
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Functions directory: `netlify/functions`
- [ ] Create `netlify/functions` directory
- [ ] Install Netlify CLI: `npm install -D netlify-cli`
- [ ] Add dev script: `"dev:netlify": "netlify dev"`

### 1.6 Environment Variables Setup
- [ ] Create `.env.example` with all required keys (no values)
- [ ] Create `.env` with actual keys (gitignored)
- [ ] Document required environment variables:
  - `VITE_PUSHER_APP_KEY`
  - `VITE_PUSHER_CLUSTER`
  - `PORTKEY_API_KEY`
  - `PUSHER_APP_ID`
  - `PUSHER_SECRET`
  - `SENDGRID_API_KEY`
  - `SESSION_SECRET`
- [ ] Add Vite env type definitions in `src/vite-env.d.ts`

### 1.7 Project Structure Setup
- [ ] Create folder structure:
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
- [ ] Create `src/types/index.ts` for shared TypeScript types

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
- [ ] Implement in-memory session state management (reactive)
- [ ] Functions:
  - `createSession(password?: string)`
  - `joinSession(sessionId: string, userName: string, password?: string)`
  - `leaveSession()`
  - `getSessionState()`
  - `isSessionExpired()`
- [ ] Add 4-hour expiration logic
- [ ] Write unit tests:
  - [ ] Session creation
  - [ ] Joining with/without password
  - [ ] Password validation
  - [ ] Expiration check
  - [ ] Participant management

### 2.4 Password Protection
- [ ] Create `src/lib/password-utils.ts`
- [ ] Implement password hashing (use bcrypt or similar)
- [ ] Implement password verification
- [ ] Write unit tests:
  - [ ] Hash generation
  - [ ] Verification success/failure
  - [ ] Edge cases (empty password, special characters)

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
- [ ] All linting passes (ESLint + TypeScript)
- [ ] All tests passing (unit + integration + E2E)
- [ ] No console errors in production
- [ ] Lighthouse score >90 (performance, accessibility)
- [ ] Mobile responsive on iOS and Android

---

## Notes

- Mark tasks as complete as you finish them with `[x]`
- Add new tasks as needed during implementation
- Document any blockers or issues discovered
- Update estimates if timeline changes
- Keep CLAUDE.md as source of truth for requirements
