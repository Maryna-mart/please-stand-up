import { test, expect, Page } from '@playwright/test'

async function verifyEmail(page: Page) {
  const emailInput = page.locator('input[type="email"]').first()
  await emailInput.fill('test@example.com')
  const sendCodeBtn = page.locator('button:has-text("Send Verification Code")')
  if (await sendCodeBtn.isVisible()) {
    await sendCodeBtn.click()
    const codeInput = page.locator('input[placeholder="000000"]')
    await expect(codeInput).toBeVisible({ timeout: 5000 })
    await codeInput.fill('123456')
    const verifyBtn = page.locator('button:has-text("Verify Email")')
    await verifyBtn.click()
    await expect(page.locator('#leaderName')).toBeVisible({ timeout: 5000 })
  }
}

test.describe('Real-time Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(
      '**/.netlify/functions/send-verification-code',
      async route => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true }),
        })
      }
    )

    await page.route('**/.netlify/functions/verify-email', async route => {
      const body = await route.request().postDataJSON()
      if (body.code?.toString().length === 6) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, token: 'jwt' }),
        })
      }
    })

    await page.route('**/.netlify/functions/create-session', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          sessionId: 'session_' + Math.random().toString(36).substring(2, 9),
        }),
      })
    })

    await page.route('**/.netlify/functions/get-session/*', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ sessionId: 'test', participants: [] }),
      })
    })

    await page.route('**/.netlify/functions/join-session', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, participantId: 'p1' }),
      })
    })

    await page.route('**/.netlify/functions/save-transcript', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto('/')
  })

  test('should load home page and verify email section visible', async ({
    page,
  }) => {
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible()
  })

  test('should complete email verification flow', async ({ page }) => {
    await verifyEmail(page)
    await expect(page.locator('#leaderName')).toBeVisible()
  })

  test('should create session after verification', async ({ page }) => {
    await verifyEmail(page)
    await page.locator('#leaderName').fill('Leader')
    await page.locator('button:has-text("Create Session")').click()
    await page.waitForURL(/\/session\//)
  })

  test('should support multi-user session flow', async ({ page, context }) => {
    // Leader creates session
    await verifyEmail(page)
    await page.locator('#leaderName').fill('Leader')
    await page.locator('button:has-text("Create Session")').click()
    await page.waitForURL(/\/session\/([a-zA-Z0-9-]+)/)
    const sessionId = page.url().match(/\/session\/([a-zA-Z0-9-]+)/)?.[1]

    // Participant joins
    const pPage = await context.newPage()
    await pPage.route(
      '**/.netlify/functions/send-verification-code',
      async r => {
        await r.fulfill({
          status: 200,
          body: JSON.stringify({ success: true }),
        })
      }
    )
    await pPage.route('**/.netlify/functions/verify-email', async r => {
      const b = await r.request().postDataJSON()
      if (b.code?.toString().length === 6) {
        await r.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, token: 'jwt' }),
        })
      }
    })
    await pPage.route('**/.netlify/functions/join-session', async r => {
      await r.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, participantId: 'p1' }),
      })
    })
    await pPage.route('**/.netlify/functions/get-session/*', async r => {
      await r.fulfill({
        status: 200,
        body: JSON.stringify({ sessionId, participants: ['Leader'] }),
      })
    })

    await pPage.goto('/')
    await verifyEmail(pPage)
    await pPage.goto(`/?sessionId=${sessionId}`)
    await pPage.locator('#participantName').fill('Member')
    await pPage.locator('button:has-text("Join Session")').click()
    await pPage.waitForURL(/\/session\//)
    await pPage.close()
  })
})
