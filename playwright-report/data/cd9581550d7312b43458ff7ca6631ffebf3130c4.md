# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: worker-flow.spec.ts >> Worker Flow: Login -> Queue -> Resolve
- Location: tests\worker-flow.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.border-gray-200').filter({ hasText: 'Open' }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.border-gray-200').filter({ hasText: 'Open' }).first()

```

```yaml
- banner:
  - text: CH Community Hero
  - button
  - button "Report"
  - button "Explore"
  - button "Profile"
  - button "Stats"
  - button "Workers"
- text: Authorized Worker
- heading "worker@downtown.com" [level=3]
- text: "Assigned:"
- strong: Ward 1 - Downtown
- button "Log Out"
- text: Total 0 Pending 0 Active 0 Done 0
- heading "Action Queue 0" [level=4]
- button "List View"
- button "Route Map View"
- button "Refresh Queue"
- textbox "Search reports by description..."
- button "Filters"
- paragraph: Queue Load Failed
- paragraph: supabase.from(...).select(...).eq(...).not is not a function
- button "Retry Loading"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Worker Flow: Login -> Queue -> Resolve', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   await page.click('button:has-text("Worker")');
  6  |   
  7  |   // Login
  8  |   await page.fill('input[placeholder="worker@downtown.com"]', 'worker@downtown.com');
  9  |   await page.fill('input[placeholder="••••••••"]', 'password');
  10 |   await page.click('button:has-text("Sign In")');
  11 | 
  12 |   // Verify Dashboard loaded
  13 |   await expect(page.locator('text=Ward 1 - Downtown')).toBeVisible();
  14 | 
  15 |   // Find the first Open report
  16 |   const firstReport = page.locator('.border-gray-200').filter({ hasText: 'Open' }).first();
> 17 |   await expect(firstReport).toBeVisible();
     |                             ^ Error: expect(locator).toBeVisible() failed
  18 | 
  19 |   // Click Manage
  20 |   await firstReport.locator('button:has-text("Manage")').click();
  21 | 
  22 |   // Start Investigation
  23 |   await expect(page.locator('h3:has-text("Action Panel")')).toBeVisible();
  24 |   const startButton = page.locator('button:has-text("Start Investigation")');
  25 |   if (await startButton.isVisible()) {
  26 |       await startButton.click();
  27 |   }
  28 | 
  29 |   // Resolve Issue
  30 |   await page.click('button:has-text("Resolve Issue")');
  31 |   await page.fill('textarea[placeholder="Describe the actions taken to resolve this issue..."]', 'Issue resolved successfully by the team.');
  32 |   
  33 |   // Confirm Resolution
  34 |   await page.click('button:has-text("Confirm Resolution")');
  35 | 
  36 |   // Verify status updated
  37 |   await expect(page.locator('span:has-text("Resolved")').first()).toBeVisible();
  38 | });
  39 | 
```