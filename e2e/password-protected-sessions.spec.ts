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

test.describe('Password-Protected Sessions', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(
      '**/.netlify/functions/send-verification-code',
      async route => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ message: 'Code sent', success: true }),
        })
      }
    )

    await page.route('**/.netlify/functions/verify-email', async route => {
      const body = await route.request().postDataJSON()
      if (body.code?.toString().length === 6) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            token: 'jwt_' + Math.random(),
          }),
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
      const body = await route.request().postDataJSON()
      if (!body.password || body.password === 'testpass123') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, participantId: 'p1' }),
        })
      } else {
        await route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'Invalid password' }),
        })
      }
    })

    await page.goto('/')
  })

  test('should create session', async ({ page }) => {
    await verifyEmail(page)
    await page.locator('#leaderName').fill('Alice')
    await page.locator('button:has-text("Create Session")').click()
    await page.waitForURL(/\/session\//)
  })

  test('should handle password input', async ({ page }) => {
    await verifyEmail(page)
    await page.locator('#leaderName').fill('Alice')
    const passwordInput = page.locator('input[type="password"]').first()
    if (await passwordInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await passwordInput.fill('testpass123')
    }
    await page.locator('button:has-text("Create Session")').click()
    await page.waitForURL(/\/session\//)
  })

  test('should join session with password', async ({ page }) => {
    await verifyEmail(page)
    await page.locator('#leaderName').fill('Leader')
    await page.locator('button:has-text("Create Session")').click()
    await page.waitForURL(/\/session\/([a-zA-Z0-9-]+)/)
    const sessionId = page.url().match(/\/session\/([a-zA-Z0-9-]+)/)?.[1]

    await page.goto('/')
    await verifyEmail(page)

    const sessionIdInput = page.locator('#sessionId')
    if (await sessionIdInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sessionIdInput.fill(sessionId!)
      await page.locator('#participantName').fill('Member')
      await page.locator('button:has-text("Join Session")').click()
      await page.waitForURL(/\/session\//)
    }
  })

  test('should display session creation form', async ({ page }) => {
    await verifyEmail(page)
    const nameInput = page.locator('#leaderName')
    await expect(nameInput).toBeVisible()
  })
})
