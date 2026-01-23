import { test, expect } from '@playwright/test'

test.describe('Session Persistence on Reload', () => {
  test('should restore session state after page reload when user is in session', async ({
    page,
  }) => {
    // Step 1: Create a session
    await page.goto('/')
    const nameInput = page.locator('#leaderName')
    const createButton = page.locator('button:has-text("Create Session")')

    await nameInput.fill('Alice')
    await createButton.click()

    // Wait for navigation to session page
    await page.waitForURL(/\/session\/[a-zA-Z0-9-]+/)
    const sessionUrl = page.url()
    const sessionId = sessionUrl.match(/\/session\/([a-zA-Z0-9-]+)/)?.[1]

    expect(sessionId).toBeDefined()

    // Verify we're in the session view
    await expect(page.locator('text=Standup Session')).toBeVisible()

    // Step 2: Reload the page
    await page.reload()

    // Step 3: Verify we're still in the same session (not redirected to join card)
    // After reload, we should be back in the session view
    await expect(page.locator('text=Standup Session')).toBeVisible()
    expect(page.url()).toContain(`/session/${sessionId}`)

    // Step 4: Verify participant is still in the session
    // The session should still have Alice as a participant
    await expect(page.locator('text=Alice')).toBeVisible()
  })

  test('should show join card when session is valid but user not in cache', async ({
    page,
  }) => {
    // Step 1: Create a session in one tab
    await page.goto('/')
    const nameInput = page.locator('#leaderName')
    const createButton = page.locator('button:has-text("Create Session")')

    await nameInput.fill('Bob')
    await createButton.click()

    await page.waitForURL(/\/session\/[a-zA-Z0-9-]+/)
    const sessionUrl = page.url()
    const sessionId = sessionUrl.match(/\/session\/([a-zA-Z0-9-]+)/)?.[1]

    // Step 2: Clear browser storage to simulate fresh browser/incognito
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Step 3: Navigate directly to the session URL (as if clicking shared link)
    await page.goto(`/session/${sessionId}`)

    // Step 4: Should show join card, not grant direct access
    // The page should redirect to home with ?sessionId query param
    await expect(page.locator('text=Join Session')).toBeVisible()
    expect(page.url()).toContain(`sessionId=${sessionId}`)
  })

  test('should clear session from storage when leaving session', async ({
    page,
  }) => {
    // Step 1: Create a session
    await page.goto('/')
    const nameInput = page.locator('#leaderName')
    const createButton = page.locator('button:has-text("Create Session")')

    await nameInput.fill('Charlie')
    await createButton.click()

    await page.waitForURL(/\/session\/[a-zA-Z0-9-]+/)

    // Step 2: Verify session is in localStorage
    const storageKeys = await page.evaluate(() => {
      return Object.keys(localStorage)
    })
    expect(storageKeys).toContain('standup_session')
    expect(storageKeys).toContain('standup_user_id')
    expect(storageKeys).toContain('standup_user_name')

    // Step 3: Leave the session (click leave button if available, or navigate home)
    // Look for a leave/exit button
    const leaveButton = page.locator('button:has-text("Leave")')
    if (await leaveButton.isVisible()) {
      await leaveButton.click()
    } else {
      // If no leave button, navigate back home
      await page.goto('/')
    }

    // Step 4: Verify localStorage was cleared
    const storageKeysAfter = await page.evaluate(() => {
      return Object.keys(localStorage)
    })
    expect(storageKeysAfter).not.toContain('standup_session')
    expect(storageKeysAfter).not.toContain('standup_user_id')
    expect(storageKeysAfter).not.toContain('standup_user_name')
  })

  test('should maintain session across multiple reloads', async ({ page }) => {
    // Step 1: Create a session
    await page.goto('/')
    const nameInput = page.locator('#leaderName')
    const createButton = page.locator('button:has-text("Create Session")')

    await nameInput.fill('Dave')
    await createButton.click()

    await page.waitForURL(/\/session\/[a-zA-Z0-9-]+/)
    const sessionUrl = page.url()
    const sessionId = sessionUrl.match(/\/session\/([a-zA-Z0-9-]+)/)?.[1]

    // Step 2: Reload multiple times
    for (let i = 0; i < 3; i++) {
      await page.reload()
      await expect(page.locator('text=Standup Session')).toBeVisible()
      expect(page.url()).toContain(`/session/${sessionId}`)
      await expect(page.locator('text=Dave')).toBeVisible()
    }
  })

  test('participant should stay in session after reload', async ({
    page,
    context,
  }) => {
    // Step 1: Leader creates a session
    await page.goto('/')
    await page.locator('#leaderName').fill('Leader')
    await page.locator('button:has-text("Create Session")').click()

    await page.waitForURL(/\/session\/[a-zA-Z0-9-]+/)
    const sessionUrl = page.url()
    const sessionId = sessionUrl.match(/\/session\/([a-zA-Z0-9-]+)/)?.[1]

    // Step 2: Participant joins in separate browser context
    const participantPage = await context.newPage()
    await participantPage.goto(`/session/${sessionId}`)

    // Join session
    await participantPage.locator('#participantName').fill('Member')
    await participantPage.locator('button:has-text("Join Session")').click()

    await participantPage.waitForURL(/\/session\/[a-zA-Z0-9-]+/)

    // Step 3: Member reloads page
    await participantPage.reload()

    // Step 4: Should still be in session
    await expect(participantPage.locator('text=Standup Session')).toBeVisible()
    expect(participantPage.url()).toContain(`/session/${sessionId}`)
    await expect(participantPage.locator('text=Member')).toBeVisible()

    await participantPage.close()
  })
})
