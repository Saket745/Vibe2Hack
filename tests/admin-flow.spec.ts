import { test, expect } from '@playwright/test';

test('Admin Flow: Login -> Analytics -> Copilot', async ({ page }) => {
  // Mock /api/copilot for E2E tests
  await page.route('/api/copilot', async route => {
    // Delay response slightly so "Copilot is thinking..." becomes visible
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'Mock AI analysis complete.' }),
    });
  });

  await page.goto('/');
  await page.click('button:has-text("Worker")');
  
  // Login
  await page.fill('input[type="email"]', 'admin@mock.city');
  await page.fill('input[type="password"]', 'password');
  await page.click('button:has-text("Sign In")');

  // Verify Dashboard loaded
  await expect(page.locator('text=Executive KPIs')).toBeVisible();

  // Verify Charts / KPIs
  await expect(page.locator('text=Active Wards')).toBeVisible();
  
  // Verify Operations Copilot is present
  await expect(page.locator('text=Operations Copilot')).toBeVisible();

  // Ask Copilot a question
  await page.fill('input[placeholder="Ask Operations Copilot..."]', 'What is the current status of pothole reports?');
  
  // Wait for it to process (we can just check if the button works)
  await page.click('button:has-text("Send")');
  await expect(page.locator('text=Analyzing...')).toBeVisible();
  
  // We don't wait for the actual AI response in E2E unless it's mocked, to avoid flaky tests.
});
