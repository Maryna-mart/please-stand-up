import { test, expect, Page } from '@playwright/test'

// Helper to complete email verification
async function verifyEmailAndProceed(page: Page) {
  // Fill email
  const emailInput = page.locator('input[type="email"]').first()
  await emailInput.fill('test@example.com')

  // Send code
  const sendCodeBtn = page.locator('button:has-text("Send Verification Code")')
  if (await sendCodeBtn.isVisible()) {
    await sendCodeBtn.click()

    // Wait for code input
    const codeInput = page.locator('input[placeholder="000000"]')
    await expect(codeInput).toBeVisible({ timeout: 5000 })

    // Enter code
    await codeInput.fill('123456')

    // Verify
    const verifyBtn = page.locator('button:has-text("Verify Email")')
    await verifyBtn.click()

    // Wait for session creation form to appear
    await expect(page.locator('#leaderName')).toBeVisible({ timeout: 5000 })
  }
}

test.describe('Recording & Transcription Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock email verification endpoints
    await page.route(
      '**/.netlify/functions/send-verification-code',
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Code sent', success: true }),
        })
      }
    )

    await page.route('**/.netlify/functions/verify-email', async route => {
      const request = route.request()
      const body = await request.postDataJSON()
      if (body.code && body.code.toString().length === 6) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            token: 'jwt_token_' + Math.random().toString(36).substr(2, 9),
            email: body.email,
          }),
        })
      }
    })

    // Mock create-session
    await page.route('**/.netlify/functions/create-session', async route => {
      const request = route.request()
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'session_' + Math.random().toString(36).substring(2, 9),
            leaderName: 'Test Leader',
            createdAt: new Date().toISOString(),
          }),
        })
      }
    })

    // Mock join-session
    await page.route('**/.netlify/functions/join-session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          participantId: 'p_' + Math.random().toString(36).substring(2, 9),
          participantName: 'Test Participant',
        }),
      })
    })

    // Mock get-session
    await page.route('**/.netlify/functions/get-session/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'session_test',
          leaderName: 'Test Leader',
          participants: ['Test Leader'],
          createdAt: new Date().toISOString(),
          transcripts: [],
        }),
      })
    })

    // Mock audio transcription responses
    await page.route('**/.netlify/functions/transcribe', async route => {
      const request = route.request()
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            text: 'This is a test transcript from the standup meeting',
            language: 'en',
            confidence: 0.98,
          }),
        })
      }
    })

    // Mock transcribe
    await page.route('**/.netlify/functions/transcribe', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'Completed the API integration. Working on frontend components. Waiting for design approval.',
          language: 'en',
          confidence: 0.98,
        }),
      })
    })

    // Mock summarize-transcript
    await page.route(
      '**/.netlify/functions/summarize-transcript',
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            yesterday: 'Completed the API integration',
            today: 'Working on the frontend components',
            blockers: 'Waiting for design approval',
            actionItems: 'Schedule design review meeting',
            other: 'Team sync on Friday at 10am',
          }),
        })
      }
    )

    // Mock save-transcript
    await page.route('**/.netlify/functions/save-transcript', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          transcriptId:
            'transcript_' + Math.random().toString(36).substring(2, 9),
        }),
      })
    })

    // Mock MediaRecorder and getUserMedia
    await page.addInitScript(() => {
      ;(window as unknown as Record<string, unknown>).AudioContext = class {
        createOscillator() {
          return { connect: () => {}, start: () => {} }
        }
        createMediaStreamDestination() {
          return { stream: new MediaStream() }
        }
      }
      ;(window as unknown as Record<string, unknown>).MediaRecorder = class {
        state = 'inactive'
        ondataavailable: ((event: BlobEvent) => void) | null = null
        onstop: (() => void) | null = null
        constructor() {}
        start() {
          this.state = 'recording'
        }
        stop() {
          this.state = 'inactive'
          if (this.ondataavailable) {
            const blob = new Blob(['audio'], { type: 'audio/webm' })
            this.ondataavailable({ data: blob } as BlobEvent)
          }
          if (this.onstop) this.onstop()
        }
        addEventListener(event: string, cb: (e: unknown) => void) {
          if (event === 'dataavailable')
            this.ondataavailable = cb as (event: BlobEvent) => void
          if (event === 'stop') this.onstop = cb as () => void
        }
      }
    })

    await page.goto('/')
  })

  test('should complete email verification and create session', async ({
    page,
  }) => {
    // Complete email verification
    await verifyEmailAndProceed(page)

    // Create session
    await page.locator('#leaderName').fill('Alice')
    await page.locator('button:has-text("Create Session")').click()

    // Should navigate to session
    await page.waitForURL(/\/session\/[a-zA-Z0-9-]+/, { timeout: 10000 })
    const sessionId = page.url().match(/\/session\/([a-zA-Z0-9-]+)/)?.[1]
    expect(sessionId).toBeDefined()
  })

  test('should record and transcribe audio', async ({ page }) => {
    // Complete email verification
    await verifyEmailAndProceed(page)

    // Create session
    await page.locator('#leaderName').fill('Bob')
    await page.locator('button:has-text("Create Session")').click()
    await page.waitForURL(/\/session\/[a-zA-Z0-9-]+/)

    // Try to record (if recording UI is available)
    const recordBtn = page
      .locator('button')
      .filter({ hasText: /Record|Start/ })
      .first()
    if (await recordBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recordBtn.click()
      await page.waitForTimeout(300)

      // Stop recording
      const stopBtn = page
        .locator('button')
        .filter({ hasText: /Stop|End/ })
        .first()
      if (await stopBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await stopBtn.click()
      }
    }
  })

  test('should handle multiple participants', async ({ page, context }) => {
    // Leader: verify email and create session
    await verifyEmailAndProceed(page)
    await page.locator('#leaderName').fill('Leader')
    await page.locator('button:has-text("Create Session")').click()

    await page.waitForURL(/\/session\/[a-zA-Z0-9-]+/)
    const sessionId = page.url().match(/\/session\/([a-zA-Z0-9-]+)/)?.[1]

    // Participant: join session
    const pPage = await context.newPage()
    await pPage.goto('/')

    // Setup mocks for participant page
    await pPage.route(
      '**/.netlify/functions/send-verification-code',
      async route => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Code sent', success: true }),
        })
      }
    )

    await pPage.route('**/.netlify/functions/verify-email', async route => {
      const { code } = await route.request().postDataJSON()
      if (code?.toString().length === 6) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            token: 'jwt_' + Math.random(),
          }),
        })
      }
    })

    await pPage.route('**/.netlify/functions/join-session', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, participantId: 'p1' }),
      })
    })

    // Participant joins session
    await verifyEmailAndProceed(pPage)
    await pPage.goto(`/?sessionId=${sessionId}`)
    await pPage.locator('#participantName').fill('Member')
    await pPage.locator('button:has-text("Join Session")').click()

    await pPage.waitForURL(/\/session\//)
    await pPage.close()
  })
})
