import { test, expect } from '@playwright/test';


test('Worker Flow: Login -> Queue -> Resolve', async ({ page }) => {
  await page.goto('/');
  // Mock the /api/resolve backend endpoint for local E2E tests
  await page.route('/api/resolve', async route => {
    // In a real environment, this updates the Supabase DB.
    // For E2E, we'll just return a success response. The test doesn't strictly need the DB to update,
    // or we can let the frontend optimistic update work if there is one.
    // Wait, WorkerScreen actually relies on the DB update and refetches?
    // Let's just fulfill it successfully.
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, mock: true, message: 'Status updated' }),
    });
  });

  await page.click('button:has-text("Worker")');
  
  // Login
  await page.fill('input[type="email"]', 'worker@mock.city');
  await page.fill('input[placeholder="••••••••"]', 'password');
  await page.click('button:has-text("Sign In")');

  // Verify Dashboard loaded
  await expect(page.locator('text=Ward 1 - Downtown')).toBeVisible();

  // Find the first report in the list
  const firstReport = page.locator('.group').first();
  await expect(firstReport).toBeVisible();

  // Click Manage (card click)
  await firstReport.click();

  // Wait for the slide-over details panel to appear
  await expect(page.locator('button:has-text("Start Investigation")')).toBeVisible();

  // Start Investigation
  await page.click('button:has-text("Start Investigation")');

  // Wait for status update
  await expect(page.locator('button:has-text("Resolve Issue")')).toBeVisible();
  await page.click('button:has-text("Resolve Issue")');
  
  // Upload photo
  const dummyFile = 'tests/fixtures/dummy.png';

  await page.setInputFiles('input[type="file"]', dummyFile);
  
  await page.fill('textarea[placeholder="Add notes about the resolution..."]', 'Issue resolved successfully by the team.');
  
  // Confirm Resolution (use evaluate to bypass visibility/viewport checks for sticky elements)
  await page.locator('button:has-text("Confirm Resolution")').evaluate(node => (node as HTMLButtonElement).click());

  // Wait for the modal to close and status to update
  await expect(page.locator('.group').filter({ hasText: /resolved/i }).first()).toBeVisible({ timeout: 10000 });
});
