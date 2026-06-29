import { test, expect } from '@playwright/test';

test('Citizen Flow: Capture -> Triage -> Dashboard', async ({ page }) => {
  // 1. Navigate to the app
  await page.goto('/');
  await expect(page).toHaveTitle(/Community Hero/);

  // 2. Go to Report tab
  await page.click('button:has-text("Report")');
  await expect(page.locator('h1')).toContainText('Report an Issue');

  // 3. Fill the form
  await page.fill('textarea[placeholder="Describe the issue (e.g., Deep pothole on main street)..."]', 'Massive pothole causing traffic');
  
  // Note: File upload is tricky without a real file. 
  // For this E2E test, we'll bypass the file chooser dialog by using setInputFiles.
  // In a real hackathon demo, we would have a mock file in our repo to upload.
  // We'll create a dummy file for the test or just test the validation if no file is provided.
  
  // Submit the report (assuming mock mode lets us bypass image for now, or we'll test the error state)
  await page.click('button:has-text("File Civic Report")');

  // In mock mode, the report should be added to the database and we should see a success message.
  // Wait for the success modal
  await expect(page.locator('h3:has-text("AI Triage Complete")')).toBeVisible({ timeout: 15000 });
  await page.click('button:has-text("Close & Return")');

  // 4. Verify on Dashboard
  await page.click('button:has-text("Explore")');
  
  // Check if our report is in the list
  await expect(page.locator('text=Massive pothole causing traffic').first()).toBeVisible();
});
