# Development Setup Guide

## Email Configuration

This project supports two modes for email handling:

### 1. Development Mode (Default) 🚀

**Perfect for local development without a SendGrid account**

When `ENABLE_DEV_MODE_EMAIL_MOCK=true` in `.env`:
- Verification codes are **logged to the browser console** instead of being sent
- Summary emails are logged to the **server console**
- No external email service needed
- Clean and fast development experience

#### How to Use Development Mode:

1. Make sure `.env` has:
   ```
   ENABLE_DEV_MODE_EMAIL_MOCK=true
   ```

2. Start your development server:
   ```bash
   npm run dev
   ```

3. Request a verification code on the homepage
4. **Check the browser console** - you'll see a formatted message like:
   ```
   🔐 [EMAIL_CODE] Development Mode - Verification Code
   Email: your.email@example.com
   Code: 123456
   ```

5. Copy the code and paste it into the verification field
6. Continue with the app flow!

#### Console Output Example:
```
▼ 🔐 [EMAIL_CODE] Development Mode - Verification Code
  Email: test@example.com
  Code: 456789
  ℹ This code is displayed here because ENABLE_DEV_MODE_EMAIL_MOCK is enabled
  ✓ Copy the code above and paste it into the verification field
```

---

### 2. Production Mode (Real Email via SendGrid) 📧

**For when you're ready to send real emails to users**

#### Prerequisites:
- SendGrid account (free tier available at https://sendgrid.com)
- Verified sender email in SendGrid

#### Setup Steps:

1. Create SendGrid account and get API key:
   - Go to https://app.sendgrid.com/settings/api_keys
   - Create a new API key with "Mail Send" permissions
   - Copy the key

2. Verify your sender email:
   - Go to https://app.sendgrid.com/settings/sender_auth/senders
   - Verify a domain or single sender email
   - Wait for verification (usually instant)

3. Update your `.env` file:
   ```bash
   ENABLE_DEV_MODE_EMAIL_MOCK=false
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   SENDGRID_FROM_EMAIL=your-verified-email@example.com
   SENDGRID_FROM_NAME=Your Display Name
   ```

4. Restart your development server
5. Verification codes and emails will now be sent via SendGrid

---

## Switching Between Modes

### From Development to Production:

```env
# Change this:
ENABLE_DEV_MODE_EMAIL_MOCK=true

# To this:
ENABLE_DEV_MODE_EMAIL_MOCK=false

# And add these:
SENDGRID_API_KEY=SG.your_api_key
SENDGRID_FROM_EMAIL=your-verified-email@example.com
```

### From Production Back to Development:

```env
# Change this:
ENABLE_DEV_MODE_EMAIL_MOCK=false

# To this:
ENABLE_DEV_MODE_EMAIL_MOCK=true

# The SENDGRID_* variables will be ignored
```

---

## Code Cleanup & Architecture

The email system is designed to be **clean and easy to switch**:

### Key Files:

1. **`netlify/functions/lib/email-mock-client.ts`**
   - Mock email implementation for development
   - Generates console.log JavaScript that runs in browser
   - Returns code via `devConsolePayload` in response

2. **`netlify/functions/lib/sendgrid-client.ts`**
   - SendGrid email implementation for production
   - Checks `isDevelopmentEmailMockEnabled()` to decide which mode
   - If mock mode: calls `sendMockVerificationCodeEmail()`
   - If production: calls SendGrid API

3. **`netlify/functions/send-verification-code.ts`**
   - Handler for email verification requests
   - In dev mode: includes `devConsolePayload` in response
   - Frontend detects this and executes the console logging code

4. **`src/components/EmailVerificationCard.vue`**
   - Frontend component for email verification
   - If `data.devConsolePayload` exists: executes it to log code to console
   - Otherwise: waits for actual email (production mode)

### Design Benefits:

✅ **Zero Dependencies** - No external email service needed for development
✅ **Easy to Switch** - One environment variable changes the behavior
✅ **Production Ready** - Uses real SendGrid API in production
✅ **Clean Code** - No hardcoded test modes or workarounds
✅ **No Test Data** - Uses actual email validation & hashing
✅ **Secure** - Development mode doesn't expose codes in URLs or localStorage

---

## Troubleshooting

### "Check your email" but nothing appears in console

**Issue:** The `devConsolePayload` isn't being executed

**Solutions:**
1. Make sure `.env` has `ENABLE_DEV_MODE_EMAIL_MOCK=true`
2. Restart your development server after changing `.env`
3. Check browser console - it should show the code within 2 seconds
4. Look for a message with `🔐 [EMAIL_CODE]` prefix

### "SendGrid not configured" error in production

**Issue:** Real SendGrid credentials are missing or invalid

**Solutions:**
1. Check that `ENABLE_DEV_MODE_EMAIL_MOCK=false`
2. Verify `SENDGRID_API_KEY` is set and correct
3. Verify `SENDGRID_FROM_EMAIL` is a verified sender in SendGrid
4. Check Netlify Functions logs for the exact error

### Browser console shows gibberish instead of code

**Issue:** The JavaScript payload didn't execute properly

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify the response from `send-verification-code` includes `devConsolePayload`
3. Open DevTools → Network tab and inspect the response JSON

---

## Testing Both Modes

### To Test Development Mode:
```bash
# In .env:
ENABLE_DEV_MODE_EMAIL_MOCK=true

# Request code → Check browser console → Copy code
```

### To Test Production Mode:
```bash
# In .env:
ENABLE_DEV_MODE_EMAIL_MOCK=false
SENDGRID_API_KEY=SG.test_key_here
SENDGRID_FROM_EMAIL=test@example.com

# Request code → Check your email inbox
```

---

## When to Use Each Mode

| Mode | Use Case |
|------|----------|
| **Development** | Local development, no SendGrid account, quick testing |
| **Production** | Staging/production environments, real email delivery |

---

## Notes

- Development codes are **not stored anywhere** - they only appear in the browser console
- Production codes are **hashed before storage** in Redis (never stored plaintext)
- Both modes use the same verification logic (5-min expiration, 6 digits, single-use)
- Switching modes is **instant** - just change the env var and restart
