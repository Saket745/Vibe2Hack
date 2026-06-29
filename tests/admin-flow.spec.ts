import { test, expect } from '@playwright/test';

test('Admin Flow: Login -> Analytics -> Copilot', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Admin")');
  
  // Login
  await page.fill('input[placeholder="admin@city.gov"]', 'admin');
  await page.fill('input[placeholder="••••••••"]', 'password');
  await page.click('button:has-text("Sign In")');

  // Verify Dashboard loaded
  await expect(page.locator('h2:has-text("Executive KPIs")')).toBeVisible();

  // Verify Charts / KPIs
  await expect(page.locator('text=Total Reports')).toBeVisible();
  
  // Verify Operations Copilot is present
  await expect(page.locator('h3:has-text("Operations Copilot")')).toBeVisible();

  // Ask Copilot a question
  await page.fill('input[placeholder="Ask Copilot about trends, risks, or resource allocation..."]', 'What is the current status of pothole reports?');
  
  // Wait for it to process (we can just check if the button works)
  await page.click('button:has-text("Send")');
  await expect(page.locator('text=Copilot is thinking...')).toBeVisible();
  
  // We don't wait for the actual AI response in E2E unless it's mocked, to avoid flaky tests.
});
