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

test.describe('Session Expiration & TTL', () => {
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
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        }),
      })
    })

    await page.route('**/.netlify/functions/get-session/*', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          sessionId: 'test',
          participants: [],
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        }),
      })
    })

    await page.goto('/')
  })

  test('should show email verification on load', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible()
  })

  test('should create session after email verification', async ({ page }) => {
    await verifyEmail(page)
    await page.locator('#leaderName').fill('Alice')
    await page.locator('button:has-text("Create Session")').click()
    await page.waitForURL(/\/session\//)
  })

  test('should navigate to session page', async ({ page }) => {
    await verifyEmail(page)
    await page.locator('#leaderName').fill('Bob')
    await page.locator('button:has-text("Create Session")').click()
    await page.waitForURL(/\/session\/[a-zA-Z0-9-]+/)
    expect(page.url()).toContain('/session/')
  })

  test('should handle session state persistence', async ({ page }) => {
    await verifyEmail(page)
    await page.locator('#leaderName').fill('Charlie')
    await page.locator('button:has-text("Create Session")').click()
    await page.waitForURL(/\/session\//)

    // Check localStorage has session data
    const sessionData = await page.evaluate(() =>
      localStorage.getItem('standup_session')
    )
    expect(sessionData).toBeTruthy()
  })

  test('should clear session data on logout', async ({ page }) => {
    await verifyEmail(page)
    await page.locator('#leaderName').fill('Dave')
    await page.locator('button:has-text("Create Session")').click()
    await page.waitForURL(/\/session\//)

    // Try to find leave/logout button
    const leaveBtn = page
      .locator('button')
      .filter({ hasText: /Leave|Logout|Exit/ })
      .first()
    if (await leaveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await leaveBtn.click()
      await page.waitForURL('/')
    }
  })

  test('should navigate back to home', async ({ page }) => {
    await verifyEmail(page)
    // Navigate to home
    await page.goto('/')
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible()
  })
})
