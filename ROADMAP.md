## **1\. Day 1 Report — Validated Risks \+ What It Missed**

## **The report's own three flags are all real and correctly prioritized:**

| \# | Risk (from report) | Severity | Fix complexity |
| ----- | ----- | ----- | ----- |
| **1** | **`category` CHECK constraint has no escape hatch for non-civic images → hard insert failure** | **🔴 Critical** | **Low** |
| **2** | **`needs_manual_review` status exists in DB but nothing in `triage.ts`/`ReportScreen.tsx` ever sets it** | **🟡 High** | **Low** |
| **3** | **Public-insert storage bucket has no path scoping by `reporter_id`** | **🟢 Medium** | **Low** |

## **Reading the rest of the architecture against what's described, five more are worth adding to the Day 2 backlog — none are in the report, all are cheap to close now while the schema and the `triage.ts` contract are still small:**

| \# | Risk | Why it matters | Fix |
| ----- | ----- | ----- | ----- |
| **4** | **`reports` table allows public INSERT with no rate limit. Anonymous-by-design is correct for the product, but combined with zero throttling it's an open door to spam the table *and* run up Gemini API spend per fake submission.** | **A bored judge (or a bot) can flood your demo data or your bill in minutes.** | **Per-`reporter_id` \+ per-IP rate limit in a Vercel Edge Middleware in front of `/api/triage`, before Phase 2.2 auth exists to lean on.** |
| **5** | **No server-side size cap on the base64 payload `triage.ts` accepts. Client compresses to 0.8MB/1200px, but that's a convention, not a boundary — nothing stops a different/buggy client from sending much more, which either hits Vercel's body limit or burns Gemini multimodal tokens needlessly.** | **Cost \+ reliability under any input that isn't your own `ReportScreen.tsx`.** | **Reject payloads over a hard byte limit *before* the Gemini call, return 413\.** |
| **6** | **No duplicate-submission guard. Double-tap submit, or a Gemini-succeeds/Supabase-insert-fails retry, can write the same incident twice.** | **Inflates report counts, confuses the worker queue you're building in 2.2/2.3.** | **Client-side submit lock \+ a short dedup window (same `reporter_id` \+ `ward_id` \+ `category` within N minutes) before insert.** |
| **7** | **`severity` has no CHECK constraint, unlike `category`. Gemini's phrasing isn't guaranteed stable across calls ("High" vs "high" vs "severe").** | **Silently fragments the Severity Breakdown pie chart in `DashboardScreen.tsx` — a visible demo bug, not a backend one.** | **Either constrain `severity` the same way `category` is constrained, or normalize it server-side in `triage.ts` before insert.** |
| **8** | **Sequencing gap between Phase 2.1 and 2.2. 2.1 starts populating `needs_manual_review`; 2.2 is what gives anyone the ability to act on that queue. If a demo happens between those two phases, you'll be showing a queue that visibly nobody can clear.** | **Optics risk specifically *during* the build window, not a long-term bug.** | **Just sequence-aware: don't demo the manual-review badge until worker auth (2.2) exists to clear it, or clear it manually via the Supabase dashboard for demo purposes.** |

## **(Lower priority, flag-and-move-on: Haversine ward assignment has no distance cutoff, so a report filed well outside all 5 seeded wards still gets force-assigned to whichever is nearest. Fine for a hackathon demo radius, just don't be surprised if it shows up oddly on the map later.)**

## 

## **2\. Full Roadmap — Day 2 through Submission**

MoSCoW-tagged so cuts are obvious if time runs short. Bundling the risk fixes from §1 into the phase where they're cheapest to add, not as a separate cleanup pass.

| Phase | Tag | Tasks | Depends on |
| ----- | ----- | ----- | ----- |
| **2.1 — Triage Hardening** | **Must** | Expand Gemini schema: `isValidCivicIssue`, `confidence`, normalized `severity`. Halt submission client-side if invalid. Set `needs_manual_review` when confidence \< 0.70. Add severity constraint/normalization (\#7). Add size cap on `/api/triage` (\#5). Add submit-lock \+ dedup window (\#6). | Day 1 schema |
| **2.1.5 — Abuse Guard** | **Must** | Rate-limit `/api/triage` and the insert path per `reporter_id`/IP (\#4). Scope storage bucket paths to `${reporter_id}/*` (report's own item \#3). | 2.1 |
| **2.2 — Worker Portal** | **Must** | Supabase Auth login for ward workers. Worker dashboard filtered to assigned ward. Action queue sorted by `needs_manual_review` first, then severity. | 2.1 |
| **2.3 — Resolution Flow (core)** | **Must** | Status transitions `open/needs_manual_review → in_progress → resolved/rejected`, enforced server-side (not just UI-level) so a worker can't skip states. | 2.2 |
| **2.3.5 — Resolution Flow (stretch)** | **Should** | Before/after photo on resolve. Reporter satisfaction survey trigger. | 2.3 |
| **3.0 — Hardening & Demo Prep** | **Must** | Error/loading states on every async path (triage call, insert, geolocation denial). Seed realistic-looking demo data across all 5 wards and all severities so the dashboard doesn't look sparse. Final RLS pass — re-verify public read/insert vs authenticated-update boundaries actually match intent. | 2.3 |
| **3.1 — Submission Packaging** | **Must** | README with setup \+ env vars, confirm production Vercel deploy \+ Supabase prod project are the ones actually demoed (not localhost), short demo script covering Report → Explore → Stats → Worker resolve loop. | 3.0 |
| **Stretch — Cut first if behind** | **Could** | Push notifications, multi-city ward sets beyond the 5 seeded, offline queue for spotty connectivity, native app wrapper. | — |

