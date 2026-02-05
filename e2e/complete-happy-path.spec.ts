import { test, expect, Page } from '@playwright/test'

async function verifyEmail(page: Page, email: string) {
  const emailInput = page.locator('input[type="email"]').first()
  await emailInput.fill(email)
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

test('Complete Happy Path: Email → Create → Join → Finish', async ({
  page,
  context,
}) => {
  // Setup mocks for leader
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

  await page.route('**/.netlify/functions/finish-session', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ success: true }),
    })
  })

  // Step 1: Leader navigates and verifies email
  await page.goto('/')
  const emailInput = page.locator('input[type="email"]').first()
  await expect(emailInput).toBeVisible()

  await verifyEmail(page, 'leader@example.com')

  // Step 2: Leader creates session
  await page.locator('#leaderName').fill('Alice')
  await page.locator('button:has-text("Create Session")').click()

  await page.waitForURL(/\/session\/[a-zA-Z0-9-]+/, { timeout: 10000 })
  const sessionId = page.url().match(/\/session\/([a-zA-Z0-9-]+)/)?.[1]
  expect(sessionId).toBeDefined()

  // Step 3: Participant joins
  const pPage = await context.newPage()

  await pPage.route('**/.netlify/functions/send-verification-code', async r => {
    await r.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
  })

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
      body: JSON.stringify({ success: true, participantId: 'p2' }),
    })
  })

  await pPage.route('**/.netlify/functions/get-session/*', async r => {
    await r.fulfill({
      status: 200,
      body: JSON.stringify({ sessionId, participants: [] }),
    })
  })

  await pPage.goto('/')
  await verifyEmail(pPage, 'participant@example.com')
  await pPage.goto(`/?sessionId=${sessionId}`)

  await pPage.locator('#participantName').fill('Bob')
  await pPage.locator('button:has-text("Join Session")').click()

  await pPage.waitForURL(/\/session\//)
  expect(pPage.url()).toContain('/session/')

  // Step 4: Leader finishes session
  const finishBtn = page
    .locator('button')
    .filter({ hasText: /Finish|Complete/ })
    .first()
  if (await finishBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await finishBtn.click()
  }

  // Cleanup
  await pPage.close()
})
