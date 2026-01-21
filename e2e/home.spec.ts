import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display privacy policy link', async ({ page }) => {
    const privacyLink = page.locator(
      'a[href="https://openai.com/privacy/"]'
    )
    await expect(privacyLink).toBeVisible()
    await expect(privacyLink).toHaveAttribute('target', '_blank')
    await expect(privacyLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('privacy policy link should be clickable', async ({ context, page }) => {
    // Listen for popup/new page
    const popupPromise = context.waitForEvent('page')

    // Click the privacy policy link
    await page.locator('a[href="https://openai.com/privacy/"]').click()

    // Wait for the new page to open
    const popup = await popupPromise
    expect(popup.url()).toContain('openai.com/privacy')

    await popup.close()
  })

  test('should display create session form', async ({ page }) => {
    const createForm = page.locator('text=Create Session')
    await expect(createForm).toBeVisible()

    const nameInput = page.locator('#leaderName')
    await expect(nameInput).toBeVisible()
  })

  test('should display join session form', async ({ page }) => {
    const joinForm = page.locator('text=Join Session')
    await expect(joinForm).toBeVisible()

    const sessionIdInput = page.locator('#sessionId')
    await expect(sessionIdInput).toBeVisible()
  })

  test('should create a session and navigate to session page', async ({
    page,
  }) => {
    const nameInput = page.locator('#leaderName')
    const createButton = page.locator('button:has-text("Create Session")')

    await nameInput.fill('Test Leader')
    await createButton.click()

    // Should navigate to /session/{id}
    await page.waitForURL(/\/session\/[a-zA-Z0-9-]+/)
    await expect(page.locator('text=Standup Session')).toBeVisible()
  })
})
