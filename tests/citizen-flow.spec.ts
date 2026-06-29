import { test, expect } from '@playwright/test';


test('Citizen Flow: Capture -> Triage -> Dashboard', async ({ page }) => {
  // 1. Navigate to the app
  await page.goto('/');
  await expect(page).toHaveTitle(/Community Hero/);

  // 2. Go to Report tab
  await page.click('button:has-text("Report")');
  await expect(page.locator('h1')).toContainText('Community Hero');

  // 3. Upload photo
  const dummyFile = 'tests/fixtures/dummy.png';

  await page.setInputFiles('input[type="file"]', dummyFile);

  // 4. Wait for Location 
  await expect(page.locator('.text-sm.font-semibold.text-slate-700').filter({ hasText: ',' })).toBeVisible({ timeout: 10000 });

  // 5. Fill the form
  await page.fill('textarea[placeholder="Provide details about the issue (e.g. large pothole on main road, overflowing garbage container...)"]', 'Massive pothole causing traffic');
  
  // Submit the report
  await page.click('button:has-text("File Civic Report")');

  // Wait for the success state
  await expect(page.locator('button:has-text("Submit Another Report")')).toBeVisible({ timeout: 20000 });

  // 6. Verify on Dashboard
  await page.click('button:has-text("Explore")');
  
  // Check if our report is in the list
  await expect(page.locator('text=Massive pothole causing traffic').first()).toBeVisible();
});
