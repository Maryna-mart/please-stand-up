# Implementation Plan - Standup Timer

This document outlines the development phases, current status, and planned features.

---

## Overview

**Core Mission:** Build an AI-powered standup timer for remote teams with:
- Synchronized timer
- Audio transcription (Whisper)
- AI summaries (Claude)
- Email delivery (SendGrid)

**MVP Target:** Core functionality with no persistent storage, auth via session links.

---

## Phase 1: Core Setup ✅ COMPLETE

### Backend Infrastructure
- [x] Netlify Functions setup
- [x] Environment variable configuration
- [x] Redis session storage (via Netlify)

### Frontend Framework
- [x] Vue 3 + TypeScript
- [x] Vite bundler
- [x] Tailwind CSS styling
- [x] Vue Router with guards

### Utilities
- [x] Session validation library
- [x] Input sanitization
- [x] Password strength validation

---

## Phase 2: Session Management ✅ COMPLETE

### Backend Functions
- [x] `/create-session` - Generate sessionId, userId, return credentials
- [x] `/join-session` - Add participant to existing session
- [x] `/get-session` - Validate session exists and not expired

### Frontend Composables
- [x] `useSession()` - Reactive session state + API calls
- [x] `initializeSessionFromCache()` - Restore from localStorage on app mount
- [x] Persistence: Save/restore sessionId, userId, userName

### Router & Navigation
- [x] Router guard for `/session/:id` routes
- [x] Backend validation check (always)
- [x] Local cache check (session + userId)
- [x] Redirect to join flow if needed

### Flows
- [x] Create new session
- [x] Join existing session via link
- [x] Page reload persistence
- [x] Leave session (clear cache)
- [x] Session expiration (4 hours)

### Testing
- [x] Unit tests: useSession composable
- [x] Unit tests: Router guard logic
- [x] Unit tests: localStorage persistence
- [x] E2E tests: Session persistence scenarios
- [x] E2E tests: Join/leave flows

---

## Phase 3: Home Page UI ✅ COMPLETE

### Components
- [x] CreateSessionCard - Name + optional password input
- [x] JoinSessionCard - Name + sessionId + optional password
- [x] Home.vue - Route conditional rendering based on query params

### Logic
- [x] Show CreateSessionCard if no ?sessionId param
- [x] Show JoinSessionCard if ?sessionId param present
- [x] Pre-fill sessionId from query param

### Polish
- [ ] Show "Continue Session" button if cached session exists
- [ ] Add "Back" navigation between create/join
- [ ] Error message display

---

## Phase 4: Recording Phase ✅ IN PROGRESS

### Audio Recording
- [x] AudioRecorder component
- [x] MediaRecorder API integration
- [x] WebM/Opus format capture
- [ ] Error handling for browser compatibility

### Session Room View
- [x] Session.vue main component
- [x] Display current user info
- [x] Show participant list
- [x] Show timer component
- [ ] Real-time participant updates (via Pusher)
- [ ] Record button UI
- [ ] Recording status indicator

### State Management
- [ ] Track recording state per participant
- [ ] Store audio blob in memory
- [ ] Update participant status (recording → done)

---

## Phase 5: Transcription ✅ PLANNED

### Backend Function
- [ ] `/netlify/functions/transcribe`
  - Accept audio file upload
  - Call Portkey Whisper API
  - Return transcript + language
  - Handle errors (corrupt audio, timeout, etc.)

### Frontend Integration
- [ ] Upload audio blob to transcribe function
- [ ] Show transcription progress
- [ ] Display transcript in real-time
- [ ] Language indicator (EN/DE auto-detected)

### Real-time Sync
- [ ] Pusher event: `transcript-ready`
- [ ] Broadcast transcript to all participants
- [ ] Show in TranscriptView component

---

## Phase 6: Summarization ✅ PLANNED

### Backend Function
- [ ] `/netlify/functions/summarize`
  - Accept array of transcripts
  - Call Portkey Claude API
  - Format response (Yesterday/Today/Blockers)
  - Handle multi-language

### Frontend Integration
- [ ] "Generate Summary" button (only for session creator or anyone?)
- [ ] Show summary loading state
- [ ] Display formatted summary

### Real-time Sync
- [ ] Pusher event: `summary-generated`
- [ ] All participants see summary
- [ ] Show in SummaryView component

---

## Phase 7: Email Delivery ✅ PLANNED

### Backend Function
- [ ] `/netlify/functions/send-summary`
  - Accept recipients list
  - Format email with summary
  - Call SendGrid API
  - Return delivery status

### Frontend Integration
- [ ] Email form in SummaryView
- [ ] Comma-separated email list input
- [ ] "Send Email" button
- [ ] Success/error feedback

---

## Phase 8: Real-time Sync (Pusher) ⏳ PLANNED

### Events to Implement
- [ ] `user-joined` - New participant joined
- [ ] `user-left` - Participant left
- [ ] `timer-started` / `timer-stopped` - Timer state
- [ ] `recording-started` / `recording-done` - Participant status
- [ ] `transcript-ready` - New transcript available
- [ ] `summary-generated` - Summary ready

### Frontend
- [ ] `usePusher()` composable
- [ ] Channel subscription
- [ ] Event listeners & handlers
- [ ] Reactive state updates

---

## Phase 9: MVP Polish ✅ PARTIAL

### Error Handling
- [x] Session validation errors
- [x] API call errors with retry logic
- [x] localStorage corruption handling
- [ ] Audio recording errors
- [ ] Transcription errors
- [ ] Summary generation errors

### User Experience
- [x] Loading states
- [x] Error messages
- [x] Validation feedback
- [ ] Session timer/countdown
- [ ] Browser compatibility warnings
- [ ] Privacy notices

### Security
- [x] Session ID validation (base64url, 40+ chars)
- [x] User name sanitization (prevent XSS)
- [x] Password strength validation (8+ chars)
- [x] localStorage data validation on load
- [x] Backend session expiration
- [x] HTTPS enforcement (Netlify handles)
- [ ] CSRF protection if needed

### Documentation
- [x] SESSION_FLOW.md - User flows & architecture
- [x] IMPLEMENTATION_PLAN.md - This file
- [x] CLAUDE.md - Project guidelines
- [ ] API documentation
- [ ] Deployment guide

---

## Phase 10: Post-MVP Enhancements 🔮

### Password Protection
**Status:** Collected in UI but not enforced
**Scope:** Post-MVP (Phase 2)
**Details:**
- [ ] Store password hash in backend session
- [ ] Validate password on rejoin
- [ ] Don't require password for cached users (in same session)
- [ ] Re-ask password if browser cleared
- [ ] Prevent brute force (rate limiting)

### Multi-Tab Synchronization
**Status:** Not implemented
**Issue:** One tab leaving clears state for all tabs
**Scope:** Post-MVP (Phase 3)
**Solution:** BroadcastChannel API
- [ ] Sync leave/join events across tabs
- [ ] One tab = one session (tab ID tracking)
- [ ] Clear only current tab's data

### Session History & Persistence
**Status:** Sessions lost after 4 hours
**Scope:** Post-MVP (Phase 3)
**Solution:** Database integration
- [ ] Vercel Postgres or similar
- [ ] Store completed sessions
- [ ] Replay transcripts/summaries
- [ ] Analytics dashboard

### Calendar Integration
**Status:** Not planned
**Scope:** Post-MVP (Phase 4)
**Details:**
- [ ] Google Calendar API
- [ ] Create standup event
- [ ] Auto-remind team

### Slack Integration
**Status:** Not planned
**Scope:** Post-MVP (Phase 4)
**Details:**
- [ ] OAuth authentication
- [ ] Post summary to Slack
- [ ] Create channel invites

### Jira/Linear Integration
**Status:** Not planned
**Scope:** Post-MVP (Phase 4)
**Details:**
- [ ] Auto-link blockers to tickets
- [ ] Create issues from standup
- [ ] Status updates

---

## Known Issues & Limitations

### Current Limitations
1. **No persistent storage** - Sessions gone after 4 hours or browser close
2. **No authentication** - Access via session links only
3. **No user accounts** - No login/signup
4. **No password enforcement** - Password collected but not validated on rejoin
5. **No multi-tab sync** - Leaving from one tab affects all tabs
6. **Audio stored in memory only** - Not persisted server-side
7. **No analytics** - No usage tracking

### Known Bugs
1. (Fixed) Session reload redirects to join page instead of showing session
   - **Cause:** userId and userName not persisted to localStorage
   - **Fix:** Added USER_ID_KEY and USER_NAME_KEY to localStorage persistence
   - **Status:** ✅ Complete with tests

---

## Tech Stack Reference

### Frontend
- Vue 3 (Composition API)
- TypeScript
- Vite
- Tailwind CSS
- Vue Router
- Pusher JS (for real-time)

### Backend
- Netlify Functions (serverless)
- Node.js runtime
- Redis (via Netlify, for session storage)

### External APIs
- Portkey - Whisper (transcription) + Claude (summary)
- SendGrid - Email delivery
- Pusher Channels - Real-time sync
- OpenAI - NLP/summarization

### Development Tools
- Vitest (unit tests)
- Vue Test Utils
- Playwright (E2E tests)
- ESLint + Prettier
- Husky + pre-commit hooks

---

## Testing Strategy

### Unit Tests
- Session composable (create, join, leave, persistence)
- Router guard (backend check, cache check, redirects)
- Input validation (names, passwords, session IDs)
- localStorage handling (save, load, expire, corrupt)

### Integration Tests
- API calls to backend functions
- Full session lifecycle (create → join → record → transcribe → summarize)

### E2E Tests
- Real browser testing
- User journeys (create/join/leave/rejoin)
- Page reload persistence
- Session expiration

### Coverage Goals
- [ ] 80%+ code coverage
- [ ] All critical flows tested
- [ ] Edge cases covered

---

## Deployment Checklist

- [ ] All tests passing (unit + E2E)
- [ ] No TypeScript errors
- [ ] Env vars configured on Netlify
- [ ] Build succeeds: `npm run build`
- [ ] Preview on Netlify
- [ ] Test full flows in production
- [ ] Monitor error logs
- [ ] Set up alerts for failures

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page load | < 3s | ✅ ~1-2s |
| Session creation | < 1s | ✅ ~500ms |
| Join session | < 1s | ✅ ~600ms |
| Audio upload | < 30s (depends on duration) | ⏳ TBD |
| Transcription | < 60s | ⏳ TBD |
| Summary generation | < 10s | ⏳ TBD |
| Simultaneous users | 100+ | ✅ (Pusher limit) |

---

## Success Metrics

| Goal | Target | Status |
|------|--------|--------|
| MVP launch | v1.0 | 🔄 In progress |
| Session persistence | 100% uptime | ✅ Done |
| Transcription accuracy | > 80% | ⏳ TBD |
| Email delivery | 100% | ⏳ TBD |
| Cost per standup | < $0.50 | 🔄 Estimate |
| User onboarding | < 30s to first session | ✅ Likely |

---

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Vue 3 Docs](https://vuejs.org/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Portkey Docs](https://portkey.ai/)
- [SendGrid API](https://sendgrid.com/docs/)
- [Pusher Docs](https://pusher.com/docs/)
