# Community Hero — Agent Context

## Identity
Community Hero is a civic-issue reporting platform: anonymous citizens report problems via
photo + GPS, Gemini 2.5 Flash triages them, ward workers resolve them. Stack: React/Vite
frontend, Vercel serverless functions, Supabase Postgres + Storage + Auth, Gemini API for
triage and admin copilot.

## AI context:
- **Phase 1-8**: Core civic-issue capture, triage, mapping, worker routing, offline-first, admin dashboard.
- **Phase 9**: Integration & Expansion (multi-city, 311 webhooks) — already implemented.
- **Phase 10**: AI Operations & Decision Intelligence (prediction, clustering, recommendation, admin copilot) — NOW ACTIVE.

Gemini Integration Policy

The platform exposes exactly two server-side Gemini entry points:

1. /api/triage
   - Used exclusively for image-based civic issue triage.
   - Invoked during citizen report submission.

2. /api/copilot
   - Used exclusively by authenticated administrators.
   - Provides operational insights and natural-language analysis using platform analytics and incident data.
   - Never accepts direct citizen input or performs report creation.

No client-side Gemini API calls are permitted.
All Gemini requests must originate from secure server-side endpoints.
Any future Gemini integration must be explicitly documented before implementation.

## Hard constraints — do not violate without explicit human approval
- Citizens never authenticate. Reporting stays anonymous-UUID-based.
- There are EXACTLY TWO sanctioned Gemini API calls in the system: /api/triage for image triage and /api/copilot for administrative analytics. No other component should invoke Gemini directly.
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