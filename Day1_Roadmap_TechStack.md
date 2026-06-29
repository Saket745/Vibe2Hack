# Community Hero — Day 1 Roadmap (Today, 8 hours)
**Build environment: your Antigravity workspace · AI layer: Gemini via Google AI Studio API key**

---

## 0. Honesty check on the "SIH winner" reference

I could not verify that `souravxbera/swachh-nagar-app---SIH-2025` actually won Smart India
Hackathon 2025 — no winner list mentions it. Treat it as a strong reference build on the same
theme, not a confirmed winner. A genuinely *verified* 1st-place winner on a closely related
problem (pothole detection) is listed in the resources section below — different tech approach,
still worth knowing.

---

## 1. Final tech stack (detailed, with reasoning)

### Frontend
- **Vite + React + TypeScript** — fastest local dev loop, no SSR complexity you don't need for
  a 4-screen hackathon demo. Skip Next.js unless your agent already scaffolded one.
- **Tailwind CSS** — fast styling, matches what most AI codegen already knows well.
- **react-leaflet + Leaflet** — map rendering with zero API key friction (unlike Mapbox/Google
  Maps which need a token + billing setup you don't have time for today).
- **Recharts** — dashboard charts (avg resolution time, severity breakdown, ward heat).
- **browser-image-compression** (npm) — shrink phone-camera photos client-side before upload;
  saves Gemini token cost and upload time.
- No state library needed — plain `useState`/`useEffect` is enough at this scale.

### Backend / data
- **Supabase** (already connected) — Postgres + Auth + Storage. Use this from the start.
  If you ever touch Google AI Studio's own "Build" UI, it will default to Firebase —
  explicitly tell it to use Supabase instead, or just skip that UI and build directly in your
  own Antigravity workspace as planned.
- Tables for today: `reports`, `wards`. (`resolutions`, `users` trust-score fields come Day 2.)
- **No formal login for citizens today** — use a localStorage-generated anonymous UUID as the
  reporter identity. Removes signup friction for the demo. Ward-worker login can wait until
  Day 2 when the resolution flow needs it.

### AI layer
- **Gemini API** (`@google/genai` SDK), called from **server-side functions** — never call
  Gemini directly from the browser, your API key leaks. We expose exactly two endpoints:
  1. `/api/triage.ts` (for citizen report processing)
  2. `/api/copilot.ts` (for admin analytics, utilizing the `CopilotContextBuilder` to safely limit and anonymize DB context).
- Use **structured JSON output** (response schema) for every Gemini call — never regex-parse
  free text. This is the single biggest reliability win for a one-day build.
- Disable `thinking` (`thinking_level: minimal`) on segmentation calls for speed.

### Dev environment & deployment
- **GitHub** — push early, push often. `github.com` and `codeload.github.com` are already
  reachable from your environment.
- **Vercel** — deploy from hour 1 with a placeholder page, not at the end. A broken deploy
  pipeline discovered at hour 7 is a bad time to discover it.
- **.env.example committed, .env never committed** — standard hygiene, your agent should set
  this up automatically; double-check it did.

### Deliberately cut for today (don't build these now)
- Voice/audio input — Day 3+ if on schedule.
- Duplicate detection — Day 3.
- Ward-worker auth / resolution flow — Day 2.
- Any map styling beyond default Leaflet tiles — purely cosmetic, zero demo value today.

---

## 2. Task ownership — what your AI agent should own vs. what only you can do

| Task category | Best owner | Why |
|---|---|---|
| Boilerplate scaffolding, schema, CRUD code | **Agent** | Pure pattern application — faster and less error-prone than typing it by hand |
| First-draft Gemini prompt engineering | **Agent** | Knows the API's structured-output conventions natively |
| Structured JSON parsing / type safety | **Agent** | Mechanical correctness, easy to miss edge cases by hand |
| UI component styling | **Agent** | Fast iteration, no typing fatigue |
| Creating accounts (AI Studio, Supabase, Vercel, GitHub) | **You** | Requires your identity, 2FA, billing — no agent can do this for you |
| Taking real test photos (incl. fake before/after pair) | **You** | Physical-world task — the agent cannot generate the data you actually need |
| Judging whether a severity score "feels right" | **You** | Contextual judgment a model can't self-verify |
| Security sanity-check on Supabase RLS policies | **You** (agent drafts, you review) | The cost of a missed hole is high; a second human pass matters |
| Demo narrative & pitch wording | **You** | Strategic framing, in your own voice as presenter |
| Go/no-go calls when you're behind schedule | **You** | Judgment under uncertainty, not a coding task |

---

## 3. Hour-by-hour roadmap — two parallel tracks

Track times are relative (Hour 0 = whenever you start). Each block runs the **agent track**
and **your track** at the same time — that's the multitasking gain.

### Block 1 — Setup (0:00–0:45)
- **Agent**: Initialize Vite+React+TS+Tailwind project; init git repo; create folder structure
  (`components/`, `lib/`, `api/`); write `.env.example`.
- **You**: Get a Gemini API key from Google AI Studio; create a Supabase project (save URL +
  anon key + service key); create/link a Vercel project; create the GitHub repo.
- **Checkpoint**: Empty app boots locally. All keys captured, none committed yet.

### Block 2 — Schema + Gemini service (0:45–1:45)
- **Agent**: Write Supabase migration (`reports`, `wards` tables + RLS policies); write
  `/api/triage.ts` (image → Gemini → structured JSON: category, severity, segmentation mask);
  matching TypeScript types.
- **You**: Review the RLS draft for obvious holes (citizens can't edit others' reports or
  self-mark "resolved"); finalize your 5 issue categories (pothole, garbage, streetlight,
  water leakage, drainage) — keep it tight for demo clarity.
- **Checkpoint**: A test call to `/api/triage.ts` with a sample image returns valid structured
  JSON.

### Block 3 — Citizen report screen (1:45–2:45)
- **Agent**: Build `ReportScreen.tsx` — camera/file input, GPS via `navigator.geolocation`,
  description field, submit wired to Supabase insert + Gemini call, loading/error states,
  image compression before upload.
- **You**: Go take 10–15 real test photos right now (real issues near you, plus at least one
  deliberately mismatched "before/after" pair you'll need for tomorrow's fraud-catch demo).
  Do this *while* the agent codes — don't wait.
- **Checkpoint**: You can submit a real report from your phone and see it land in Supabase
  with an AI-generated category + severity.

**Break (2:45–3:00)**

### Block 4 — Storage + reports list (3:00–4:00)
- **Agent**: Wire Supabase Storage bucket with correct access rules; build a "My Reports" list
  view; wire the anonymous-UUID identity.
- **You**: Run the full loop 3–4 times on your actual phone browser, not just desktop — mobile
  camera/GPS permissions behave differently. Note friction points.
- **Checkpoint**: List view renders your real submissions with photos + AI labels, correctly,
  on mobile.

**Break (4:00–4:15)**

### Block 5 — Severity tuning (the one block you sit with the agent) (4:15–5:15)
- **Agent**: Iterate the segmentation/severity prompt based on real outputs; add fallback
  handling for low-confidence responses; log raw responses for debugging.
- **You**: Run 8–10 of your real test photos through it and give direct feedback ("this
  garbage pile should score large, not small") — this judgment call can't be delegated.
- **Checkpoint**: Severity scoring feels reasonable on at least 8/10 real photos.

**Lunch / long break (5:15–6:00)**

### Block 6 — Map + dashboard v0 (6:00–7:00)
- **Agent**: Leaflet map plotting reports by category color; a 3-metric dashboard (total
  reports, avg severity, category breakdown) via Recharts, seeded with your real test data.
- **You**: Rough-draft today's demo pitch narrative in parallel — don't leave this for hour 8.
- **Checkpoint**: Map + dashboard render correctly; you have a first pitch draft.

### Block 7 — Polish pass (7:00–7:45)
- **Agent**: Empty states, loading skeletons, error toasts, responsive CSS fixes, README.
- **You**: Click through it like a judge would — does it look credible in 30 seconds? Flag
  anything broken for an immediate fix.
- **Checkpoint**: App looks demo-credible end to end on mobile width.

### Block 8 — Wrap (7:45–8:00)
- **Agent**: Commit, push to GitHub, deploy to Vercel, confirm env vars are set on Vercel
  (not just locally).
- **You**: Open the **live deployed URL** on your phone and run one real end-to-end test before
  stopping — "works on localhost" and "works deployed" are different claims.
- **Checkpoint**: A live, shareable URL works for the core report flow.

---

## 4. Ready-made resources

### Reference architecture (same theme, unconfirmed winner status — see note above)
- `souravxbera/swachh-nagar-app---SIH-2025` — github.com/souravxbera/swachh-nagar-app---SIH-2025
  React app, 40+ reusable UI components, multi-language claims, ward heatmap pattern. Good for
  component-structure inspiration, not a guaranteed-winning blueprint.

### Pothole detection fallback (only if Gemini zero-shot underperforms on a category)
- `mounishvatti/pothole_detection_yolov8` — github.com/mounishvatti/pothole_detection_yolov8
  Colab-ready YOLOv8 + Roboflow pipeline, single-click training.
- `jaygala24/pothole-detection` — github.com/jaygala24/pothole-detection
  Labeled dataset + accompanying paper specifically on dimension/severity estimation.
- Browse more: github.com/topics/pothole-detection

### A genuinely verified past hackathon winner (different approach, worth knowing)
- `BrianRuizy/2019-Microsoft-IoT-hackathon` (Bump.IT) —
  github.com/BrianRuizy/2019-Microsoft-IoT-hackathon
  Confirmed 1st place at a Microsoft Azure-sponsored hackathon. Used phone accelerometer
  telemetry instead of photos to passively detect potholes while driving — a sensor-based
  angle, not vision-based. Good Day-6+ stretch idea, not a Day-1 priority.

### Official Google AI Studio / Gemini docs
- ai.google.dev/gemini-api/docs/aistudio-fullstack — secrets management, connecting Supabase
  instead of the default Firebase.
- ai.google.dev/gemini-api/docs/image-understanding — official segmentation/bounding-box
  reference, exact prompt format and JSON schema.
- codelabs.developers.google.com/vibe-code-with-gemini-in-aistudio — official walkthrough if
  you ever want to see the Build UI for reference.

### Minimal starter pattern (bare-bones React+Gemini wiring, if you want to see the simplest
possible version before your agent builds the real thing)
- reactmayhem.com/build-an-ai-assistant-using-react-and-google-gemini

---

## 5. End-of-day success checkpoint

By hour 8 tonight, "done" means: a live Vercel URL where you can take a real photo on your
phone, submit it, watch it get an AI-generated category and severity score, and see it appear
on a map and in a list — all backed by real Supabase data, not mocked. Nothing about the
before/after verification yet — that's tomorrow's centerpiece, and it needs today's foundation
working cleanly first.
