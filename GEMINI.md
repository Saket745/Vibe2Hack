# Community Hero — Agent Context

## Identity
Community Hero is a civic-issue reporting platform: anonymous citizens report problems via
photo + GPS, Gemini 2.5 Flash triages them, ward workers resolve them. Stack: React/Vite
frontend, Vercel serverless functions, Supabase Postgres + Storage + Auth, Gemini API for
triage only.

## Hard constraints — do not violate without explicit human approval
- Citizens never authenticate. Reporting stays anonymous-UUID-based.
- The ONLY Gemini call in the system is the triage call in /api/triage.ts. Do not add a
  second AI call path for any other feature.
- Every schema change is a numbered Supabase migration file. No ad-hoc ALTER TABLE.
- category and severity are both CHECK-constrained enums. Any new value needs a migration,
  not a silent string from the AI response.
- RLS stays in force on reports and report-photos at all times. Public insert, public read,
  authenticated-only update — never widen this without being asked.
- No new third-party services beyond Supabase, Vercel, and the Gemini API.

## Current state (Day 1 complete)
Capture → AI triage → Supabase save → Map/List visualization is fully working. See
DAY1_REPORT.md for full detail. Do not re-build anything described there as done — extend it.

## Source of truth for what to build next
ROADMAP.md in this repo, phase by phase. Work phases in order. Do not start a phase whose
"Depends on" column isn't satisfied yet.

## Known Issues
- **Terminal Sandbox / Dev Servers**: Sandbox issues prevent running terminal commands. Launch servers manually via start-dev.bat.
- **Env Loader**: dev-server.ts includes a manual .env loader so running tsx doesn't require --env-file.