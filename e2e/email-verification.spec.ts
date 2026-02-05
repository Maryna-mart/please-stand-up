import { test, expect, Page } from '@playwright/test'

// Helper to verify email
async function verifyEmail(page: Page, email: string) {
  // Fill email
  const emailInput = page.locator('input[type="email"]').first()
  await emailInput.fill(email)

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

    // Wait for form to appear
    await expect(page.locator('#leaderName')).toBeVisible({ timeout: 5000 })
    return true
  }
  return false
}

test.describe('Email Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock email endpoints
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
      const { code, email } = body

      if (code && code.toString().length === 6) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            token: 'jwt_token_' + Math.random().toString(36).substr(2, 9),
            email: email,
          }),
        })
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid code' }),
        })
      }
    })

    await page.route('**/.netlify/functions/create-session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'session_' + Math.random().toString(36).substr(2, 9),
        }),
      })
    })

    await page.goto('/')
  })

  test('should display email verification form', async ({ page }) => {
    // Email verification card should be visible
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible()

    // Verify Email title visible
    const title = page.locator('text=Verify Your Email')
    await expect(title).toBeVisible()
  })

  test('should send verification code', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first()
    await emailInput.fill('test@example.com')

    const sendCodeBtn = page.locator(
      'button:has-text("Send Verification Code")'
    )
    await sendCodeBtn.click()

    // Code input should appear
    const codeInput = page.locator('input[placeholder="000000"]')
    await expect(codeInput).toBeVisible({ timeout: 5000 })
  })

  test('should verify email with correct code', async ({ page }) => {
    // Complete email verification
    const success = await verifyEmail(page, 'test@example.com')
    expect(success).toBeTruthy()

    // Create session form should be visible
    await expect(page.locator('#leaderName')).toBeVisible()
  })

  test('should reject invalid code', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first()
    await emailInput.fill('test@example.com')

    const sendCodeBtn = page.locator(
      'button:has-text("Send Verification Code")'
    )
    await sendCodeBtn.click()

    const codeInput = page.locator('input[placeholder="000000"]')
    await expect(codeInput).toBeVisible({ timeout: 5000 })

    // Enter invalid code
    await codeInput.fill('12345') // Only 5 digits

    const verifyBtn = page.locator('button:has-text("Verify Email")')
    await verifyBtn.click()

    // Should show error (stays on code screen)
    await expect(codeInput).toBeVisible()
  })

  test('should proceed to create session after verification', async ({
    page,
  }) => {
    // Verify email
    await verifyEmail(page, 'leader@example.com')

    // Fill leader name
    const nameInput = page.locator('#leaderName')
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Test Leader')

    // Create session button should be available
    const createBtn = page.locator('button:has-text("Create Session")')
    expect(await createBtn.isVisible()).toBeTruthy()
  })

  test('should allow different emails', async ({ page }) => {
    // First user
    await verifyEmail(page, 'alice@example.com')
    await page.locator('#leaderName').fill('Alice')
    await page.locator('button:has-text("Create Session")').click()

    // Navigate to new session
    await page.waitForURL(/\/session\//, { timeout: 5000 })
    expect(page.url()).toContain('/session/')
  })

  test('should support join session after email verification', async ({
    page,
  }) => {
    // Verify email
    await verifyEmail(page, 'participant@example.com')

    // Should show create/join options
    const createForm = page.locator('#leaderName')
    expect(await createForm.isVisible()).toBeTruthy()
  })
})
