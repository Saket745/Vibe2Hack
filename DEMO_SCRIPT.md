# Community Hero: Demo Walkthrough Script

This script is designed for a 3-5 minute live demonstration, ensuring all core features (Citizen Reporting, AI Triage, Worker Resolution, and Data Visualisation) are presented smoothly and in an impactful way.

## Preparations (Before the Demo)
1. Ensure the app is running (`.\start-dev.bat`) and available at `http://localhost:5173`.
2. Clear `localStorage` and refresh the page to ensure exactly 30 seeded mock reports are loaded.
3. Have a sample picture of a pothole or garbage ready on your desktop to upload.

---

## The Script (Start to Finish)

### Part 1: The Citizen's Perspective (Report & Triage)
**Goal:** Show how frictionless it is for a citizen to report an issue, and how AI triages it instantly without human intervention.

1. **Start on the Report Tab:**
   * *"Welcome to Community Hero. As a citizen walking down the street, I notice a severe issue—a massive pothole."*
2. **Upload & Submit:**
   * Click the image upload area and select your sample photo.
   * Type in the description: *"Huge pothole on Commercial Street. Very dangerous for bikes."*
   * Click **File Civic Report**.
3. **The AI Magic (Triage):**
   * Let the audience see the progress steps (Compressing -> Analyzing -> Submitting).
   * *"Behind the scenes, we compress the image locally, then send it to our serverless endpoint where Gemini Vision AI analyzes it instantly."*
4. **The Result:**
   * Once the modal pops up, highlight the **AI Triage Context**.
   * *"Gemini automatically detected this as a 'Pothole', assessed it as 'High' severity, and even provided a segmentation bounding box overlay on the image. No manual data entry required!"*

### Part 2: The Command Center (Stats & Explore)
**Goal:** Show how the city visualizes this incoming data at scale.

1. **Switch to the Stats Tab (Dashboard):**
   * *"Now, let's look at the city-wide view. Our dashboard is currently tracking 30 live reports."*
   * Point out the **Category Breakdown** (bar chart) and **Severity Distribution** (pie chart).
   * Point out the **Live Issue Mapping**. Mention that our new report is already plotted.
2. **Switch to the Explore Tab (Advanced Search):**
   * Open the **Filter Menu**.
   * Filter by `Category: Pothole` and `Severity: High`.
   * *"Citizens and admins can use role-based Advanced Filtering to instantly query the database. As you can see, our newly reported pothole is right at the top."*

### Part 3: The Worker's Perspective (Routing & Resolution)
**Goal:** Show how municipal workers get actionable tasks and optimal routing.

1. **Switch to the Worker Tab:**
   * Log in as `worker@downtown.com` (password: `password`).
   * *"Now I'm logged in as a municipal worker for Ward 1. My queue is automatically sorted by SLA, Severity, and Review needs."*
2. **Route Optimization:**
   * Click on the **Route Optimization** sub-tab.
   * *"Instead of driving aimlessly, the app uses a simulated Haversine nearest-neighbor algorithm to plan the most efficient route for resolving my open tickets."*
3. **Resolving the Issue:**
   * Go back to the **Action Queue**.
   * Click **Manage** on the pothole you just reported.
   * Click **Start Investigation** (moves from Open -> In Progress).
   * Click **Resolve Issue**. Upload an "after" photo (if you have one, or use a dummy image) and type: *"Pothole filled and sealed with cold mix asphalt."*
   * Click **Confirm Resolution**.

### Part 4: The Loop Closes (Citizen Feedback)
**Goal:** Show accountability and closure.

1. **Return to the Explore Tab:**
   * Find the pothole report (now marked as **Resolved** with a green badge).
   * *"The citizen can now see the 'After' photo and the worker's notes."*
2. **Leave Feedback:**
   * Give it 5 stars, write *"Thank you for the quick fix!"* and click **Submit Feedback**.
   * *"The loop is closed. Transparency, speed, and accountability—all powered by AI."*

**[End of Demo]**
