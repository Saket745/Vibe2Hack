import { test, expect } from '@playwright/test';

test('Worker Flow: Login -> Queue -> Resolve', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Worker")');
  
  // Login
  await page.fill('input[placeholder="worker@downtown.com"]', 'worker@downtown.com');
  await page.fill('input[placeholder="••••••••"]', 'password');
  await page.click('button:has-text("Sign In")');

  // Verify Dashboard loaded
  await expect(page.locator('text=Ward 1 - Downtown')).toBeVisible();

  // Find the first Open report
  const firstReport = page.locator('.border-gray-200').filter({ hasText: 'Open' }).first();
  await expect(firstReport).toBeVisible();

  // Click Manage
  await firstReport.locator('button:has-text("Manage")').click();

  // Start Investigation
  await expect(page.locator('h3:has-text("Action Panel")')).toBeVisible();
  const startButton = page.locator('button:has-text("Start Investigation")');
  if (await startButton.isVisible()) {
      await startButton.click();
  }

  // Resolve Issue
  await page.click('button:has-text("Resolve Issue")');
  await page.fill('textarea[placeholder="Describe the actions taken to resolve this issue..."]', 'Issue resolved successfully by the team.');
  
  // Confirm Resolution
  await page.click('button:has-text("Confirm Resolution")');

  // Verify status updated
  await expect(page.locator('span:has-text("Resolved")').first()).toBeVisible();
});
