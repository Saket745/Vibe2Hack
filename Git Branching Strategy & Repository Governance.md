# Git Branching Strategy & Repository Governance

## Vibe2Hack – Repository Restructuring Guide

---

# Objective

The purpose of this document is to establish a professional Git workflow for the Vibe2Hack repository.

The repository has reached feature-complete status. Future development should prioritize maintainability, clean history, traceability, and predictable release management rather than rapid feature accumulation.

This document defines:

* Repository workflow
* Branch hierarchy
* Agent workflow
* Commit conventions
* Merge policies
* GitHub CLI usage principles
* Repository architecture
* Pull Request standards
* Release process
* Code ownership philosophy

This document is considered the single source of truth for Git operations.

---

# Repository Philosophy

The repository should behave like a professional software product.

Every change must be:

* Atomic
* Reversible
* Reviewable
* Traceable
* Well documented

The repository should never become a collection of random commits or experimental branches.

---

# Repository Lifecycle

```
Research

↓

Planning

↓

Feature Branch

↓

Task Commits

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

↓

Delete Feature Branch
```

Only completed work reaches **main**.

---

# Long-Lived Branches

Only three permanent branches are allowed.

```
main
develop
release/*
```

## main

Purpose

Production-ready code.

Rules

* Always deployable
* Protected
* No direct commits
* Merge only from release branches
* Every commit represents a stable version

---

## develop

Purpose

Integration branch.

Rules

* Receives completed features
* May contain unfinished releases
* Never used for experiments
* Acts as the project's working branch

---

## release/*

Examples

```
release/v1.0

release/v1.1

release/v2.0
```

Purpose

Release stabilization.

Allowed

* Documentation
* Version bump
* Minor bug fixes

Not allowed

* New features

After release:

Merge into

```
main

↓

develop
```

---

# Feature Branches

Every feature begins from **develop**.

Naming

```
feature/<name>
```

Examples

```
feature/routing

feature/offline

feature/ml

feature/docs

feature/admin

feature/integrations

feature/copilot

feature/research

feature/simulation
```

Never create nested feature branches.

Never create feature branches from another feature branch.

---

# Branch Lifecycle

```
develop

↓

feature/routing

↓

Task Ledger

↓

Agent Tasks

↓

Small Commits

↓

Validation

↓

Pull Request

↓

develop

↓

Delete feature/routing
```

Feature branches must be short-lived.

Delete immediately after merge.

---

# Experimental Work

Research should not pollute feature branches.

Use

```
feature/research
```

or

```
research/*
```

Only promote validated work into proper feature branches.

---

# Commit Strategy

Commits must represent one logical change.

Never mix:

* bug fixes
* refactoring
* documentation
* architecture
* UI
* backend

inside one commit.

---

# Commit Format

Use Conventional Commits.

Examples

```
feat(worker): add resolution workflow

fix(storage): prevent orphan uploads

refactor(notification): introduce NotificationService

docs(readme): update architecture diagram

test(worker): add route tests

perf(prediction): optimize clustering

style(ui): improve dashboard spacing

chore(ci): update GitHub Actions
```

---

# Commit Rules

One commit = one purpose.

Good

```
feat(admin): add worker reassignment

fix(route): correct ward lookup

docs(api): update integration examples
```

Bad

```
misc updates

changes

fixes

latest work

new commit
```

---

# Task Ledger

Every feature branch should maintain:

```
Task Ledger

↓

Pending

↓

In Progress

↓

Completed

↓

Validated
```

Agents work from the Task Ledger.

Never from memory.

---

# Agent Workflow

Every AI agent must follow:

```
Understand

↓

Plan

↓

Implement

↓

Validate

↓

Commit

↓

Update Task Ledger
```

Agents never skip validation.

---

# Merge Rules

Allowed

```
feature/*

↓

develop

↓

release/*

↓

main
```

Forbidden

```
feature

↓

main
```

---

# Pull Request Rules

Every PR must include

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

# Code Ownership

Major modules

```
AI

Notifications

Integrations

Routing

Offline

Worker

Admin

Citizen

Gamification
```

Each should evolve independently.

Avoid cross-module coupling.

---

# Repository Structure

```
.github/

docs/

scripts/

api/

src/

tests/

supabase/

assets/

README.md

CHANGELOG.md

LICENSE
```

No experimental files in the root.

---

# Documentation Rules

Architecture changes must update

```
README.md

Architecture Diagram

Roadmap

API Documentation

CHANGELOG
```

Documentation is part of the feature.

---

# GitHub CLI Workflow

Preferred workflow

```
Create Branch

↓

Implement

↓

Commit

↓

Push

↓

Open Pull Request

↓

Review

↓

Merge

↓

Delete Branch
```

Avoid pushing unfinished work to `main`.

---

# Branch Protection

Protect

```
main

develop
```

Require

* Pull Requests
* Passing checks
* No force pushes
* No direct commits

---

# Release Workflow

```
develop

↓

release/v1.0

↓

Testing

↓

Bug Fixes

↓

main

↓

Tag

↓

develop
```

Every release must be tagged.

Examples

```
v1.0.0

v1.1.0

v2.0.0
```

---

# Versioning

Use Semantic Versioning.

```
MAJOR.MINOR.PATCH
```

Examples

```
1.0.0

1.1.0

1.1.2

2.0.0
```

---

# Quality Gates

Before merging

All must pass

* Build
* Lint
* Type Check
* Tests
* Documentation Updated
* No merge conflicts

---

# Repository Health Rules

Never

* Commit secrets
* Commit `.env`
* Commit build artifacts
* Commit node_modules
* Commit temporary files
* Force push shared branches

---

# Branch Naming Examples

```
feature/offline-queue

feature/copilot

feature/admin-dashboard

feature/integration-service

feature/notification-center

feature/prediction-engine

feature/incident-clustering

feature/routing

feature/gamification

feature/docs

feature/research
```

---

# Merge Philosophy

Merge only completed features.

Never merge partial implementations.

If unfinished:

Keep working on the feature branch.

---

# Release Philosophy

The repository should always satisfy:

```
main

=

Stable

Deployable

Demo Ready

Production Quality
```

---

# AI Agent Operational Rules

Every AI agent working on this repository must:

1. Read repository documentation before modifying code.
2. Never commit directly to `main`.
3. Never create unnecessary branches.
4. Keep commits small and meaningful.
5. Update documentation whenever architecture changes.
6. Preserve modularity and service abstractions.
7. Validate before committing.
8. Delete merged feature branches.
9. Prefer GitHub CLI over GUI tooling for repository operations.
10. Treat Git history as an architectural asset, not just a backup mechanism.

---

# Success Criteria

The repository is considered healthy when:

* Only three long-lived branches exist.
* Feature branches are short-lived.
* Every commit has a clear purpose.
* Documentation matches implementation.
* Releases are reproducible.
* Git history tells the story of the project.
* The codebase remains modular, scalable, and easy to navigate.

This document is mandatory guidance for all future contributors, AI agents, and automation workflows interacting with the Vibe2Hack repository.
