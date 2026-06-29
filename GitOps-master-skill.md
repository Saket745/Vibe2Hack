# GitOps Master Skill

## Universal Git Repository Governance & Branch Management Skill

**Skill Name:** `gitops_master.skill.md`

**Version:** 1.0.0

---

# Purpose

This skill governs every Git and GitHub operation performed by AI agents.

Its purpose is to maintain a professional repository architecture by enforcing clean branching strategies, predictable release workflows, traceable commit history, and disciplined repository management.

This skill applies globally to every software project regardless of programming language, framework, or deployment platform.

---

# Core Philosophy

Git is not a backup tool.

Git is the architectural history of the software.

Every commit should explain **why** the software evolved.

Every branch should represent one isolated engineering objective.

Every merge should represent a validated milestone.

Repository history must be readable months later without requiring external explanations.

---

# Primary Objectives

This skill ensures:

* Clean Git history
* Small logical commits
* Predictable branching
* Safe releases
* Easy rollback
* High maintainability
* Professional repository structure
* Minimal branch clutter

---

# Repository Lifecycle

```text
Research
    ↓
Planning
    ↓
Feature Branch
    ↓
Task Ledger
    ↓
Implementation
    ↓
Validation
    ↓
Pull Request
    ↓
Develop
    ↓
Release
    ↓
Main
```

No workflow should bypass this lifecycle.

---

# Long-Lived Branches

Only the following permanent branches are allowed.

```text
main
develop
release/*
```

Never create additional permanent branches unless explicitly requested.

---

## main

Purpose

Production-ready software.

Rules

* Always deployable
* Stable
* Protected
* Never commit directly
* Never experiment
* Merge only from release branches

---

## develop

Purpose

Integration branch.

Rules

* Receives validated features
* Active development branch
* Protected
* No direct experimental work

---

## release/*

Examples

```text
release/v1.0
release/v1.1
release/v2.0
```

Purpose

Release stabilization.

Allowed

* Documentation
* Version updates
* Bug fixes
* Release preparation

Forbidden

* New features

---

# Feature Branch Strategy

Every feature starts from:

```text
develop
```

Naming convention

```text
feature/<feature-name>
```

Examples

```text
feature/auth

feature/dashboard

feature/offline

feature/routing

feature/docs

feature/admin

feature/ml

feature/api

feature/payment

feature/research
```

---

# Feature Branch Lifecycle

```text
develop

↓

feature/<name>

↓

Task Ledger

↓

Agent Tasks

↓

Commits

↓

Validation

↓

Pull Request

↓

develop

↓

Delete Branch
```

Feature branches are temporary.

Delete immediately after merge.

---

# Branch Creation Rules

Before creating a branch

The AI must determine

* Why this branch exists
* Expected scope
* Expected completion
* Merge destination

If work cannot be completed independently

Do not create a new branch.

---

# Experimental Work

Research should never pollute production branches.

Use

```text
feature/research
```

or

```text
research/*
```

After validation

Move useful work into a proper feature branch.

---

# Commit Philosophy

Every commit should represent

One logical engineering decision.

Never combine

* Documentation
* Refactoring
* Bug fixes
* Features
* Styling

inside one commit.

---

# Commit Format

Always use Conventional Commits.

Examples

```text
feat(api): implement webhook integration

fix(storage): prevent orphan uploads

refactor(worker): simplify queue logic

perf(search): optimize clustering

docs(readme): update architecture

style(ui): improve dashboard spacing

test(auth): add login tests

build(ci): update workflow
```

---

# Commit Rules

Good

```text
feat(notification): add browser push support
```

Bad

```text
misc updates

latest work

changes

small fixes
```

---

# Task Ledger

Every feature branch should maintain

```text
Pending

↓

In Progress

↓

Completed

↓

Validated
```

The ledger becomes the working memory.

Agents must update it continuously.

---

# Pull Request Rules

Every Pull Request must include

## Summary

What changed

---

## Motivation

Why it changed

---

## Technical Design

Architecture impact

---

## Validation

Testing performed

---

## Risks

Known limitations

---

## Screenshots

If UI changed

---

## Breaking Changes

If applicable

---

# Merge Rules

Allowed

```text
feature/*

↓

develop

↓

release/*

↓

main
```

Forbidden

```text
feature/*

↓

main
```

Never bypass develop.

---

# Merge Strategy

Prefer

* Squash Merge for small features
* Merge Commit for large milestones
* Rebase only when history remains understandable

Never rewrite shared history.

---

# Release Workflow

```text
develop

↓

release/vX.Y

↓

Testing

↓

Bug Fixes

↓

main

↓

Git Tag

↓

Merge Back

↓

develop
```

---

# Semantic Versioning

Always follow

```text
MAJOR.MINOR.PATCH
```

Examples

```text
1.0.0

1.1.0

1.1.4

2.0.0
```

---

# Branch Protection Rules

Protect

```text
main
develop
```

Require

* Pull Request
* Passing CI
* No force pushes
* No direct commits
* Code review

---

# Repository Structure

Preferred

```text
.github/

docs/

scripts/

src/

tests/

api/

supabase/

assets/

README.md

CHANGELOG.md

LICENSE
```

Avoid clutter in the repository root.

---

# Documentation Policy

Every architectural change must update

* README
* Architecture diagrams
* API documentation
* CHANGELOG
* Roadmap (if applicable)

Documentation is part of implementation.

---

# GitHub CLI Policy

Preferred workflow

```text
Create Branch

↓

Implement

↓

Commit

↓

Push

↓

Open PR

↓

Review

↓

Merge

↓

Delete Branch
```

Prefer GitHub CLI over GUI tooling for automation and reproducibility.

---

# Validation Gates

Before every merge verify

✓ Build succeeds

✓ Lint passes

✓ Type check passes

✓ Tests pass

✓ Documentation updated

✓ No merge conflicts

✓ Feature complete

---

# AI Agent Responsibilities

Before making changes

The AI must

1. Read repository documentation.
2. Understand current branch state.
3. Review open Pull Requests.
4. Identify feature scope.
5. Plan commits before coding.

---

# During Development

The AI must

* Keep commits atomic.
* Avoid unrelated changes.
* Update Task Ledger.
* Preserve modular architecture.
* Avoid unnecessary dependencies.
* Maintain clean Git history.

---

# Before Commit

The AI must verify

* No secrets committed.
* No generated files committed.
* No build artifacts committed.
* No temporary debugging code.
* Commit message follows conventions.

---

# Before Merge

Confirm

* Feature complete.
* Documentation complete.
* Validation complete.
* No known regressions.

---

# Repository Health Checklist

Healthy repositories have

✓ Small branches

✓ Small commits

✓ Clean history

✓ Protected branches

✓ Tagged releases

✓ Consistent documentation

✓ Modular code

✓ Predictable workflow

---

# Decision Matrix

## Should I create a branch?

Only if

* Work spans multiple commits
* Work changes one feature
* Work needs review
* Work can be isolated

Otherwise

Commit directly to the active development branch (if permitted).

---

## Should I merge?

Only if

* Validation complete
* Documentation updated
* CI passes
* Feature complete

---

## Should I delete the branch?

Immediately after successful merge.

Never keep merged feature branches.

---

# Success Criteria

The repository is considered healthy when

* Only three long-lived branches exist.
* Every feature has its own short-lived branch.
* Every commit tells a meaningful story.
* Git history is readable.
* Releases are reproducible.
* Documentation reflects implementation.
* Repository architecture remains scalable.

---

# Golden Rules

1. Never commit directly to `main`.
2. Never use Git as a file dump.
3. One branch = one feature.
4. One commit = one logical change.
5. Validate before merging.
6. Delete merged feature branches.
7. Documentation evolves with code.
8. Protect long-lived branches.
9. Prefer automation over manual Git operations.
10. Treat Git history as part of the software architecture.
