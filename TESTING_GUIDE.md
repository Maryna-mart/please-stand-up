# Testing Guide: Transcript Persistence & Error Handling

This guide covers all the critical functionality that was recently implemented:
1. **Transcript Persistence** - Save transcripts to Redis and broadcast via Pusher
2. **Retry Logic** - Exponential backoff for transient failures
3. **Error Messages** - Smart, contextual error handling

## Unit Tests (Automated)

### Run All Tests
```bash
npm run test
```

### Run Just AI API Tests
```bash
npm run test -- src/__tests__/unit/ai-api.test.ts
```

### Tests Included

**File: `src/__tests__/unit/ai-api.test.ts`** (26 tests)
- ✅ Error message formatting (handles all error types without "[object Object]")
- ✅ API errors return generic message when `isAPIError=true`
- ✅ Specific errors return detailed messages (microphone, permissions)
- ✅ Error parsing for different error types (timeout, network, validation)

**File: `src/__tests__/unit/usePusher.test.ts`** (updated with transcript event)
- ✅ Pusher channel subscription
- ✅ Transcript-added event binding
- ✅ Event callback registration

---

## Manual Testing Checklist

### Test 1: Single User - Transcript Persistence
**Scenario:** Record a summary, refresh page, verify it persists

1. Create new session
2. Record a summary (click Talk, speak, wait for transcription/summarization)
3. Verify summary appears in "Summaries" section
4. Refresh the browser page
5. **Expected:** Summary still visible after reload

**Success Criteria:**
- ✅ Transcript appears immediately after transcription
- ✅ Transcript remains after page refresh
- ✅ No errors in browser console

**Where to Look:**
- Browser: `http://localhost:3000`
- Component: `src/views/Session.vue` (loads transcripts on mount)
- API: `src/lib/ai-api.ts` → `getSessionTranscripts()`
- Backend: `netlify/functions/get-session.ts`

---

### Test 2: Multi-User Real-Time Broadcast
**Scenario:** Record summary in Browser A, verify it appears in Browser B within 1-2 seconds

1. Create session in **Browser A** (window 1)
2. Note the session ID/URL
3. Open same URL in **Browser B** (window 2) - join as different participant
4. Record summary in **Browser A**
5. Look at **Browser B** without refreshing
6. **Expected:** Summary appears in Browser B within 1-2 seconds

**Success Criteria:**
- ✅ Summary appears without manual refresh in Browser B
- ✅ Timestamp shows when broadcast occurred
- ✅ Both participants see the same summary text
- ✅ No duplicate summaries (deduplication works)

**Where to Look:**
- Component: `src/views/Session.vue` (Pusher event handler)
- API: `src/lib/ai-api.ts` → `saveTranscript()`
- Backend: `netlify/functions/save-transcript.ts`
- Pusher: `netlify/functions/lib/pusher-server.ts`

---

### Test 3: Multi-User Load Existing Transcripts
**Scenario:** Browser A records 2 summaries, Browser B joins and sees them immediately

1. Create session in **Browser A**
2. Record **2 summaries** in Browser A (give each time to complete)
3. Wait for both to appear and persist
4. Open session URL in **Browser B** (as new participant)
5. **Expected:** Both summaries visible immediately after joining (no refresh needed)

**Success Criteria:**
- ✅ Both summaries appear in Browser B immediately after joining
- ✅ Summaries are not duplicated
- ✅ Summaries match exactly what was recorded in Browser A
- ✅ No API errors in console

**Where to Look:**
- Component: `src/views/Session.vue` (onMounted loads transcripts)
- API: `src/lib/ai-api.ts` → `getSessionTranscripts()`
- Backend: `netlify/functions/get-session.ts`
- Data: Redis session storage

---

### Test 4: Error Handling - Retry Logic
**Scenario:** Simulate transient failure, verify retries work

**Note:** Can't easily simulate failures in dev mode without modifying code. Instead verify:

1. Open browser DevTools → Network tab
2. Record a summary in `TalkSession` component
3. Look for network requests in Network tab:
   - ✅ Should see `transcribe` request (may retry if network is slow)
   - ✅ Should see `summarize-transcript` request
   - ✅ Should see `save-transcript` request

**Success Criteria:**
- ✅ All requests succeed (200 responses)
- ✅ Transcript appears in UI
- ✅ Console shows no JavaScript errors

**Network Requests to Verify:**
```
POST /.netlify/functions/transcribe → Response: { text, language }
POST /.netlify/functions/summarize-transcript → Response: { sections }
POST /.netlify/functions/save-transcript → Response: { success: true }
GET /.netlify/functions/get-session?sessionId=... → Response: { transcripts[] }
```

---

### Test 5: Error Messages - Microphone Permission
**Scenario:** Verify microphone-specific error messages

1. Open Session in incognito/private window
2. Try to record (click Talk button)
3. Browser will ask for microphone permission
4. Deny permission
5. **Expected:** Error message says "Microphone permission denied" with instruction to enable in browser settings

**Success Criteria:**
- ✅ Error message is specific and actionable
- ✅ Message doesn't show "[object Object]"
- ✅ Contains text about browser settings
- ✅ Button to retry ("Allow Microphone" button available)

**Where to Look:**
- Component: `src/components/TalkSession.vue` (error display)
- API: `src/lib/ai-api.ts` → `getErrorMessage()`

---

### Test 6: Error Messages - API Failures
**Scenario:** Verify generic error message during API retries

**Setup:** Manually test by editing one API call to fail temporarily

1. During a summary recording, the transcription/summarization could fail
2. Wait for retry logic to kick in (should try again automatically)
3. **Expected:** Error message shows generic "Oops, something went wrong. Please try again."
4. If retries succeed, the error disappears and transcript appears
5. If all retries fail after 3 attempts, persistent generic error shown

**Success Criteria:**
- ✅ Generic message during retries (not specific error details)
- ✅ Message doesn't show "[object Object]"
- ✅ UI doesn't freeze while retrying
- ✅ After 3 failed attempts, error persists (no more retries)

**Where to Look:**
- Component: `src/components/TalkSession.vue` (displays `transcriptionError`)
- API: `src/lib/ai-api.ts` → `retryWithBackoff()` (retry logic)
- Logging: Browser console shows `[uploadAudio] Attempt X failed, retrying in XXXms...`

---

### Test 7: End-to-End Flow
**Scenario:** Complete standup session from start to finish

1. **Create Session** in Browser A
2. **Record summaries** from 2-3 different participants (record in same browser with different names):
   - Participant 1: "Today I worked on login. Blocked by database."
   - Participant 2: "Yesterday I fixed bugs. Today doing testing."
3. Verify each summary appears immediately and persists
4. **Join in Browser B** as new participant:
   - Verify all existing summaries visible immediately
   - Record new summary in Browser B
   - Verify it appears in Browser A within 1-2 seconds
5. **Finish session** (click "Finish" button)
   - Should generate overall summary from all transcripts
   - Should show final summary screen

**Success Criteria:**
- ✅ All 3 summaries persist and display correctly
- ✅ Multi-browser sync works (no manual refreshes needed)
- ✅ Final summary includes content from all participants
- ✅ No errors in console throughout flow

---

### Test 8: Data Consistency
**Scenario:** Verify data is stored and retrieved correctly

1. Create session, record 2 summaries
2. Check Redis data (in Upstash console or via API):
   - Navigate to https://console.upstash.com/redis
   - Find the session key (looks like `session:{sessionId}`)
   - Verify transcripts array is present with both transcripts
3. Use `GET /.netlify/functions/get-session?sessionId=...` to fetch
   - Verify response includes both transcripts
4. Join session in new browser
   - Verify both transcripts appear

**Success Criteria:**
- ✅ Redis stores complete transcript data
- ✅ API returns all stored transcripts
- ✅ Data matches what was recorded (exact text)
- ✅ All fields present: participantName, text, language, duration

---

## Debugging Tips

### Check Console Logs
```javascript
// Logs to look for (indicates retry logic working):
[uploadAudio] Attempt 1 failed, retrying in 100ms...
[uploadAudio] Attempt 2 failed, retrying in 300ms...
[summarizeTranscript] Retrying in Xms...

// Logs indicating transcript persistence:
[Session] Transcript saved and broadcast
[Session] Loaded 2 existing transcripts
[Session] Received transcript-added event
```

### Check Network Tab
Open DevTools → Network tab and record a summary:
1. **POST transcribe** - Audio upload (should complete in 2-5 seconds)
2. **POST summarize-transcript** - Summarization (should complete in 1-2 seconds)
3. **POST save-transcript** - Persistence (should be very fast, <1 second)
4. **Pusher event** - Real-time broadcast (instant)

All should have status 200.

### Check Browser Storage
- **LocalStorage**: `usePusher.channel` might be stored
- **Session**: Stored in browser `transcripts.value` (Vue component state)
- **Backend**: Redis in Upstash console

### Common Issues & Solutions

**Issue:** Summary appears locally but not in other browser
- **Check:** Pusher is connected (look for connection-related logs)
- **Check:** Both browsers subscribed to same session channel
- **Check:** `onTranscriptAdded` callback is registered in `src/views/Session.vue`

**Issue:** Summary doesn't persist after refresh
- **Check:** Network tab shows `GET /get-session` returns transcripts[]
- **Check:** Redis has transcripts stored (Upstash console)
- **Check:** `getSessionTranscripts()` called in `onMounted`

**Issue:** Error message shows "[object Object]"
- **Check:** `getErrorMessage()` function is being used
- **Check:** No direct `error` object stringification in templates
- **Check:** All error types handled: Error, string, object with message

**Issue:** Retries not happening
- **Check:** Error is actually transient (5xx, 429, timeout)
- **Check:** Console shows retry attempts
- **Check:** `isRetryableError()` correctly identifies error type

---

## Performance Metrics to Monitor

### Transcription Speed
- **Expected:** 2-5 seconds for typical speech (60-120 seconds audio)
- **Limit:** 2 minute timeout per request (120,000ms)

### Summarization Speed
- **Expected:** 1-2 seconds per participant
- **Includes:** AI processing via Portkey/Claude

### Real-Time Broadcasting
- **Expected:** <2 seconds from save to appearance in other browsers
- **Via:** Pusher Channels (included in Netlify function response)

### Data Retrieval
- **Expected:** <500ms to load session and transcripts
- **From:** Redis (Upstash) via netlify function

---

## Test Coverage Summary

### Unit Tests (Automated)
- ✅ 26 error handling tests
- ✅ Error message formatting for all types
- ✅ Contextual error strategy (API vs specific)
- ✅ Error parsing for network/timeout/validation

### Manual Tests (Functional)
- ✅ Single-user persistence
- ✅ Multi-user real-time sync
- ✅ Load existing data on join
- ✅ Retry logic (via console logs)
- ✅ Error messages (microphone, API)
- ✅ End-to-end flow
- ✅ Data consistency

### Not Covered (Would need test environment)
- Netlify function unit tests (require mock Redis/Pusher)
- Integration tests (would need real API calls)
- E2E tests (would need full deployment)

---

## Next Steps

1. **Run unit tests:** `npm run test`
2. **Manual testing:** Use checklists above
3. **Monitor logs:** Check browser console and network tab
4. **Verify persistence:** Check Upstash Redis console
5. **Test multi-browser:** Use two separate windows/incognito

If all tests pass, the system is working as expected!
