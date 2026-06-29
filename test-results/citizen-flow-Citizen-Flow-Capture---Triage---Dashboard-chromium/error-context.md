# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: citizen-flow.spec.ts >> Citizen Flow: Capture -> Triage -> Dashboard
- Location: tests\citizen-flow.spec.ts:3:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Report an Issue"
Received string:    "Community Hero"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    14 × locator resolved to <h1 class="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-1">Community Hero</h1>
       - unexpected value "Community Hero"

```

```yaml
- heading "Community Hero" [level=1]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Citizen Flow: Capture -> Triage -> Dashboard', async ({ page }) => {
  4  |   // 1. Navigate to the app
  5  |   await page.goto('/');
  6  |   await expect(page).toHaveTitle(/Community Hero/);
  7  | 
  8  |   // 2. Go to Report tab
  9  |   await page.click('button:has-text("Report")');
> 10 |   await expect(page.locator('h1')).toContainText('Report an Issue');
     |                                    ^ Error: expect(locator).toContainText(expected) failed
  11 | 
  12 |   // 3. Fill the form
  13 |   await page.fill('textarea[placeholder="Describe the issue (e.g., Deep pothole on main street)..."]', 'Massive pothole causing traffic');
  14 |   
  15 |   // Note: File upload is tricky without a real file. 
  16 |   // For this E2E test, we'll bypass the file chooser dialog by using setInputFiles.
  17 |   // In a real hackathon demo, we would have a mock file in our repo to upload.
  18 |   // We'll create a dummy file for the test or just test the validation if no file is provided.
  19 |   
  20 |   // Submit the report (assuming mock mode lets us bypass image for now, or we'll test the error state)
  21 |   await page.click('button:has-text("File Civic Report")');
  22 | 
  23 |   // In mock mode, the report should be added to the database and we should see a success message.
  24 |   // Wait for the success modal
  25 |   await expect(page.locator('h3:has-text("AI Triage Complete")')).toBeVisible({ timeout: 15000 });
  26 |   await page.click('button:has-text("Close & Return")');
  27 | 
  28 |   // 4. Verify on Dashboard
  29 |   await page.click('button:has-text("Explore")');
  30 |   
  31 |   // Check if our report is in the list
  32 |   await expect(page.locator('text=Massive pothole causing traffic').first()).toBeVisible();
  33 | });
  34 | 
```