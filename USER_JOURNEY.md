User Journey:
1. Entry Point
Leader Path:

Goes to home page
Enters name + optional password
Creates session → Gets shareable link
Shares link with team
Participant Path:

Receives link from leader (e.g., https://app.com/session/abc123xyz)
Clicks link → Modal appears: Enter name + password (if session is protected) -> Joins session
2. Session Room
All participants see the same synchronized view
Real-time updates via Pusher when anyone joins/leaves
Timer visible to everyone (leader controls it)
3. Recording Phase
Each participant records their standup (typically 2 minutes)
Audio captured in browser (WebM/Opus format)
Visual feedback: Recording status, timer countdown
Participants can see who's recording vs. who's done
4. Transcription Phase
After recording, participant clicks "Transcribe"
Audio uploaded to Netlify Function → GPT API (via Portkey)
Transcript appears in real-time for all participants
Language auto-detected (German/English)
5. Summary Generation
Leader waits for all participants to finish
Clicks "Generate Summary" button
All transcripts sent to Claude API via Netlify Function
Formatted summary appears with:
✅ Yesterday's accomplishments per person
🎯 Today's plans per person
🚫 Blockers per person
📌 Team action items
6. Distribution
Email form with comma-separated addresses
Send via SendGrid
Session auto-expires after 4 hours