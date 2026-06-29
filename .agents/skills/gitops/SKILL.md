---
name: gitops
description: Governs Git repository operations, branching strategies, commit formats, and release workflows. Trigger this skill whenever you need to perform Git operations, create branches, commit code, or manage pull requests to ensure a clean, professional repository history.
---
# GitOps Master Skill

## Universal Git Repository Governance & Branch Management Skill

This skill governs every Git and GitHub operation performed by AI agents. Its purpose is to maintain a professional repository architecture by enforcing clean branching strategies, predictable release workflows, traceable commit history, and disciplined repository management.

## Core Philosophy
Git is not a backup tool. It is the architectural history of the software. Every commit should explain **why** the software evolved. Every branch should represent one isolated engineering objective. Every merge should represent a validated milestone.

## Repository Lifecycle
Research -> Planning -> Feature Branch -> Task Ledger -> Implementation -> Validation -> Pull Request -> Develop -> Release -> Main
No workflow should bypass this lifecycle.

## Long-Lived Branches
Only the following permanent branches are allowed: `main`, `develop`, `release/*`.
- **main**: Production-ready software. Always deployable, stable, protected. Never commit directly or experiment. Merge only from release branches.
- **develop**: Integration branch. Receives validated features. Active development branch. Protected. No direct experimental work.
- **release/***: Release stabilization (e.g. release/v1.0). Allowed: Documentation, Version updates, Bug fixes. Forbidden: New features.

## Feature Branch Strategy
Every feature starts from: `develop`. Naming convention: `feature/<feature-name>` (e.g., feature/auth, feature/docs).
Lifecycle: `develop` -> `feature/<name>` -> Task Ledger -> Agent Tasks -> Commits -> Validation -> Pull Request -> `develop` -> Delete Branch.
Feature branches are temporary. Delete immediately after merge.

Before creating a branch, determine: why it exists, expected scope, expected completion, merge destination. Do not create a new branch if work cannot be completed independently.
Research/Experimental work should use `feature/research` or `research/*`. Move useful work into a proper feature branch after validation.

## Commit Philosophy
Every commit should represent One logical engineering decision.
Never combine Documentation, Refactoring, Bug fixes, Features, and Styling inside one commit.

### Commit Format
Always use Conventional Commits. Examples:
- feat(api): implement webhook integration
- fix(storage): prevent orphan uploads
- refactor(worker): simplify queue logic
- perf(search): optimize clustering
- docs(readme): update architecture

Bad commit messages: "misc updates", "latest work", "changes", "small fixes".

## Task Ledger
Every feature branch should maintain a task ledger: Pending -> In Progress -> Completed -> Validated. Update it continuously.

## Pull Request Rules
Every Pull Request must include:
- Summary: What changed
- Motivation: Why it changed
- Technical Design: Architecture impact
- Validation: Testing performed
- Risks: Known limitations
- Screenshots: If UI changed
- Breaking Changes: If applicable

## Merge Rules & Strategy
Allowed: `feature/*` -> `develop` -> `release/*` -> `main`.
Forbidden: `feature/*` -> `main`. Never bypass develop.
Prefer Squash Merge for small features, Merge Commit for large milestones. Rebase only when history remains understandable. Never rewrite shared history.

## Release Workflow & Versioning
Workflow: `develop` -> `release/vX.Y` -> Testing -> Bug Fixes -> `main` -> Git Tag -> Merge Back -> `develop`.
Always follow Semantic Versioning: `MAJOR.MINOR.PATCH` (e.g., 1.0.0, 1.1.4).

## Branch Protection & Repository Structure
Protect `main` and `develop`. Require Pull Request, passing CI, no force pushes, no direct commits, code review.
Avoid clutter in the repository root. Preferred structure: `.github/`, `docs/`, `scripts/`, `src/`, `tests/`, `api/`, `supabase/`, `assets/`, `README.md`, `CHANGELOG.md`, `LICENSE`.

## Documentation Policy
Every architectural change must update: README, Architecture diagrams, API documentation, CHANGELOG, Roadmap. Documentation is part of implementation.

## Validation Gates (Before Merge)
Verify: Build succeeds, Lint passes, Type check passes, Tests pass, Documentation updated, No merge conflicts, Feature complete.

## AI Agent Responsibilities
Before making changes: Read repository docs, understand current branch state, review open PRs, identify feature scope, plan commits before coding.
During Development: Keep commits atomic, update Task Ledger, preserve modular architecture, avoid unnecessary dependencies.
Before Commit: Verify no secrets, generated files, or build artifacts are committed. Commit message follows conventions.

## Golden Rules
1. Never commit directly to `main`.
2. Never use Git as a file dump.
3. One branch = one feature.
4. One commit = one logical change.
5. Validate before merging.
6. Delete merged feature branches.
7. Documentation evolves with code.
8. Protect long-lived branches.
9. Prefer automation over manual Git operations.
10. Treat Git history as an architectural asset, not just a backup mechanism.
