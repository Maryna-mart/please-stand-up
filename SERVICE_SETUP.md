# Service Setup Guide for MVP Testing

This guide walks you through setting up all required external services for local development testing.

## Required Services for MVP

### 1. Upstash Redis (Backend Session Storage) ✅ DONE
**Status**: Already documented in IMPLEMENTATION.md lines 23-93
- Free tier: 10,000 requests/day
- Setup: https://console.upstash.com/
- Environment variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

---

### 2. Pusher Channels (Real-time Sync) ⚠️ **REQUIRED FOR MVP**

**Purpose**: Synchronize timer, participant join/leave, status updates across browsers

#### Setup Steps:

1. **Create Account**
   - Go to: https://dashboard.pusher.com/accounts/sign_up
   - Sign up for free account

2. **Create Channels App**
   - Click "Create app" button
   - App name: `please-stand-up-dev`
   - Select cluster closest to you (e.g., `us2` for US, `eu` for Europe)
   - Select "Vue" as frontend tech
   - Click "Create app"

3. **Get Credentials**
   - After creation, click on "App Keys" tab
   - Copy these values:
     - `app_id` → `PUSHER_APP_ID`
     - `key` → `VITE_PUSHER_APP_KEY` (frontend uses VITE_ prefix)
     - `secret` → `PUSHER_SECRET`
     - `cluster` → `VITE_PUSHER_CLUSTER` (e.g., `us2`)

4. **Add to .env**
   ```bash
   # Pusher Channels (Real-time sync)
   VITE_PUSHER_APP_KEY=your_pusher_key_here
   VITE_PUSHER_CLUSTER=us2
   PUSHER_APP_ID=your_app_id_here
   PUSHER_SECRET=your_pusher_secret_here
   ```

5. **Free Tier Limits**
   - 200,000 messages/day
   - 100 concurrent connections
   - Unlimited channels
   - **Perfect for MVP testing** ✅

---

### 3. Deepgram (Audio Transcription) ⚠️ **REQUIRED FOR MVP**

**Purpose**: Fast, accurate audio-to-text transcription using Deepgram STT API

#### Setup Steps:

1. **Create Account**
   - Go to: https://console.deepgram.com/signup
   - Sign up with email (free tier available)

2. **Get API Key**
   - After login, go to "API Keys" tab
   - Click "Create API Key"
   - Name: `please-stand-up-dev`
   - Copy the generated key (starts with `a99...`)

3. **Add to .env**
   ```bash
   # Deepgram (Audio transcription)
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   ```

4. **Free Tier Limits**
   - 12,500 minutes/month (FREE)
   - Covers ~350 standups/month (12,500 ÷ 2 min per person × 10 people)
   - Supports: webm, mp3, mp4, wav, and more
   - Accuracy: 97%+ for English
   - **Perfect for MVP testing** ✅

5. **Security**
   - SOC 2 Type II certified
   - HTTPS encryption in transit
   - Audio deleted after processing
   - Enterprise-grade service (used by Slack, Salesforce, etc.)

---

### 3.1 Portkey (AI: Claude for Summarization) ⚠️ **REQUIRED FOR MVP**

**Purpose**: Summary generation from transcripts using Claude

#### Setup Steps:

1. **Create Account**
   - Go to: https://app.portkey.ai/
   - Sign up with email or GitHub

2. **Get API Key**
   - After login, click "API Keys" in left sidebar
   - Click "Create API Key"
   - Name: `please-stand-up-dev`
   - Copy the generated key (starts with `pk-...`)

3. **Add Anthropic Integration** (for Claude)
   - Click "Integrations" in sidebar
   - Find "Anthropic"
   - Click "Connect"
   - Enter your Anthropic API key (get from https://console.anthropic.com/)

4. **Add to .env**
   ```bash
   # Portkey (AI summarization via Claude)
   PORTKEY_API_KEY=pk-your-portkey-api-key-here
   ```

5. **Cost Estimation**
   - **Claude (summarization)**: ~$0.003 per 1K input tokens
     - 10 transcripts × 100 tokens each → ~$0.003 per summary
   - **Per standup**: <$0.01
   - **Monthly (20 standups)**: <$0.20

---

### 4. SendGrid (Email Delivery) ⚠️ **REQUIRED FOR MVP**

**Purpose**: Send standup summaries via email

#### Setup Steps:

1. **Create Account**
   - Go to: https://signup.sendgrid.com/
   - Sign up for free account (100 emails/day free)

2. **Verify Email Address**
   - SendGrid will send a verification email
   - Click the verification link

3. **Create API Key**
   - Go to: https://app.sendgrid.com/settings/api_keys
   - Click "Create API Key"
   - Name: `please-stand-up-dev`
   - Permissions: "Full Access" (for simplicity in dev)
   - Click "Create & View"
   - **IMPORTANT**: Copy the API key NOW (you won't see it again)

4. **Verify Sender Email**
   - Go to: https://app.sendgrid.com/settings/sender_auth/senders
   - Click "Create New Sender"
   - Fill in:
     - From Name: "Standup Bot" (or your team name)
     - From Email: Your work email
     - Reply To: Same as From Email
     - Company Address: Your address (required by SendGrid)
   - Click "Save"
   - SendGrid will send verification email to your From Email
   - Click verification link in email

5. **Add to .env**
   ```bash
   # SendGrid (Email delivery)
   SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
   SENDGRID_FROM_EMAIL=your-verified-email@example.com
   SENDGRID_FROM_NAME=Standup Bot
   ```

6. **Free Tier Limits**
   - 100 emails/day
   - **Perfect for MVP testing** ✅

---

## Complete .env Configuration

After setting up all services, your `.env` should look like this:

```bash
# Upstash Redis (Backend session storage)
UPSTASH_REDIS_REST_URL=https://your-database-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_rest_token_here

# Pusher Channels (Real-time sync)
VITE_PUSHER_APP_KEY=your_pusher_key_here
VITE_PUSHER_CLUSTER=us2
PUSHER_APP_ID=your_app_id_here
PUSHER_SECRET=your_pusher_secret_here

# Deepgram (Audio transcription)
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Portkey (Claude for summarization)
PORTKEY_API_KEY=pk-your-portkey-api-key-here

# SendGrid (Email delivery)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=your-verified-email@example.com
SENDGRID_FROM_NAME=Standup Bot

# Session Security (generate random string)
SESSION_SECRET=generate_random_32_char_string_here
```

---

## Verification Checklist

After setup, verify each service:

### ✅ Upstash Redis
```bash
npm run dev:netlify
# Should see: "Loaded function create-session" without errors
```

### ✅ Pusher Channels
```bash
# After Phase 5 implementation, check browser console:
# Should see: "Pusher connected" when joining a session
```

### ✅ Deepgram
```bash
# After Phase 6 implementation:
# 1. Record audio in session
# 2. Click "Transcribe"
# 3. Should see transcript appear without errors
```

### ✅ Portkey (Summarization)
```bash
# After Phase 7 implementation:
# 1. Have multiple transcripts
# 2. Click "Generate Summary"
# 3. Should see AI-generated summary without errors
```

### ✅ SendGrid
```bash
# After Phase 8 implementation:
# 1. Generate summary
# 2. Enter email addresses
# 3. Click "Send Email"
# 4. Check inbox for standup summary
```

---

## Cost Summary for MVP Testing

| Service | Free Tier | Monthly Cost (if exceeded) |
|---------|-----------|----------------------------|
| Upstash Redis | 10,000 req/day | $0-10 |
| Pusher Channels | 200K msgs/day, 100 concurrent | $0 (within limits) |
| Deepgram | 12,500 minutes/month | ~$0.50-2.00 per 1K minutes |
| Portkey (Claude only) | Usage-based | <$0.20 (20 summaries/month) |
| SendGrid | 100 emails/day | $0 (within limits) |
| **TOTAL** | **FREE** | **~$0-5/month** |

---

## Troubleshooting

### Pusher Connection Issues
- Check cluster matches your app (e.g., `us2`)
- Verify `VITE_PUSHER_APP_KEY` has `VITE_` prefix (for frontend access)
- Check browser console for Pusher errors

### Deepgram Transcription Errors
- Check API key is valid (go to https://console.deepgram.com/settings/api-keys)
- Ensure audio file is supported (webm, mp3, mp4, wav)
- Check free tier hasn't exceeded 12,500 minutes/month
- Verify Deepgram API is responding (check their status page)

### Portkey Summarization Errors
- Verify Anthropic integration is active in Portkey
- Check API key starts with `pk-`
- Ensure you have at least 1 transcript to summarize
- Verify Anthropic API key is valid in Portkey vault

### SendGrid Email Not Received
- Check sender email is verified
- Check spam folder
- Verify API key has "Full Access" permissions
- Check SendGrid dashboard for delivery errors

---

## Security Notes

1. **Never commit .env to Git** (already in `.gitignore`)
2. **Use different API keys for production** (create separate apps/keys)
3. **Rotate keys if exposed** (regenerate immediately)
4. **Monitor usage** (set up billing alerts to avoid surprise charges)

---

## Next Steps

After all services are configured:

1. ✅ Run `npm run dev:netlify`
2. ✅ Test session creation and joining (already working via Phase 4)
3. ✅ Implement Phase 5 (Pusher integration) to test real-time sync
4. ⏳ Implement Phase 6 (Deepgram + Portkey integration) to test transcription and summarization
   - 6a: Implement Deepgram transcription
   - 6b: Connect Claude summarization via Portkey
5. ⏳ Implement Phase 8 (SendGrid integration) to test email delivery
