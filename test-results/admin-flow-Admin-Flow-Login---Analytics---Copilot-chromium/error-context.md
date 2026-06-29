# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-flow.spec.ts >> Admin Flow: Login -> Analytics -> Copilot
- Location: tests\admin-flow.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Admin")')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: CH
      - text: Community Hero
    - generic [ref=e7]:
      - button [ref=e9]:
        - img [ref=e10]
      - generic [ref=e13]:
        - button "Report" [ref=e14] [cursor=pointer]:
          - img [ref=e15]
          - text: Report
        - button "Explore" [ref=e18] [cursor=pointer]:
          - img [ref=e19]
          - text: Explore
        - button "Profile" [ref=e21] [cursor=pointer]:
          - img [ref=e22]
          - text: Profile
        - button "Stats" [ref=e25] [cursor=pointer]:
          - img [ref=e26]
          - text: Stats
        - button "Workers" [ref=e27] [cursor=pointer]:
          - img [ref=e28]
          - text: Workers
  - generic [ref=e34]:
    - generic [ref=e35]:
      - generic [ref=e36]:
        - img [ref=e37]
        - text: AI-Powered Civic Reporting
      - heading "Community Hero" [level=1] [ref=e40]
      - paragraph [ref=e41]: Capture and report local infrastructure issues. Instantly triaged by AI.
    - generic [ref=e43]:
      - generic [ref=e44]:
        - generic [ref=e45]: Capture Issue Photo *
        - generic [ref=e46] [cursor=pointer]:
          - img [ref=e48]
          - generic [ref=e51]:
            - paragraph [ref=e52]: Take Photo or Upload Image
            - paragraph [ref=e53]: Accepts mobile camera capture or photo files
      - generic [ref=e54]:
        - generic [ref=e55]:
          - img [ref=e57]
          - generic [ref=e60]:
            - generic [ref=e61]: GPS Location
            - generic [ref=e62]:
              - img [ref=e63]
              - text: Location permission denied. Please enable GPS permissions.
        - button "Refresh Location" [ref=e65] [cursor=pointer]:
          - img [ref=e66]
      - generic [ref=e71]:
        - generic [ref=e72]: Select City *
        - combobox [ref=e73]:
          - option "Bengaluru" [selected]
          - option "Mumbai"
      - generic [ref=e74]:
        - generic [ref=e75]:
          - img [ref=e76]
          - text: Description / Notes
        - textbox "Provide details about the issue (e.g. large pothole on main road, overflowing garbage container...)" [ref=e79]
      - button "File Civic Report" [disabled] [ref=e80]:
        - img [ref=e81]
        - generic [ref=e84]: File Civic Report
      - generic [ref=e85]:
        - img [ref=e86]
        - paragraph [ref=e88]: Reporting is anonymous. A persistent reporter ID has been generated in your browser. All submissions are public.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Admin Flow: Login -> Analytics -> Copilot', async ({ page }) => {
  4  |   await page.goto('/');
> 5  |   await page.click('button:has-text("Admin")');
     |              ^ Error: page.click: Test timeout of 30000ms exceeded.
  6  |   
  7  |   // Login
  8  |   await page.fill('input[placeholder="admin@city.gov"]', 'admin');
  9  |   await page.fill('input[placeholder="••••••••"]', 'password');
  10 |   await page.click('button:has-text("Sign In")');
  11 | 
  12 |   // Verify Dashboard loaded
  13 |   await expect(page.locator('h2:has-text("Executive KPIs")')).toBeVisible();
  14 | 
  15 |   // Verify Charts / KPIs
  16 |   await expect(page.locator('text=Total Reports')).toBeVisible();
  17 |   
  18 |   // Verify Operations Copilot is present
  19 |   await expect(page.locator('h3:has-text("Operations Copilot")')).toBeVisible();
  20 | 
  21 |   // Ask Copilot a question
  22 |   await page.fill('input[placeholder="Ask Copilot about trends, risks, or resource allocation..."]', 'What is the current status of pothole reports?');
  23 |   
  24 |   // Wait for it to process (we can just check if the button works)
  25 |   await page.click('button:has-text("Send")');
  26 |   await expect(page.locator('text=Copilot is thinking...')).toBeVisible();
  27 |   
  28 |   // We don't wait for the actual AI response in E2E unless it's mocked, to avoid flaky tests.
  29 | });
  30 | 
```