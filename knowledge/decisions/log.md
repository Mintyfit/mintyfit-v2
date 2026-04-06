# Architectural Decision Records

> Chronological log of major technical decisions and their rationale.

## Format

Each entry follows:
- **Date**: When the decision was made
- **Decision**: What was decided
- **Context**: Why it came up
- **Rationale**: Why this option was chosen
- **Alternatives considered**: What else was evaluated
- **Status**: Active / Superseded / Deprecated

---

## ADR-001: Complete Rebuild Instead of Continuing Migration
- **Date**: Early 2026
- **Decision**: Rebuild MintyFit from scratch as a clean Next.js 15 project (v2) rather than continuing the Vite→Next.js incremental migration
- **Context**: The v1 project accumulated technical debt from a half-completed migration: dual Supabase clients, BrowserRouter wrappers, VITE_ env var fallbacks in 12+ files, and 1900-line SPA view files that couldn't be incrementally refactored
- **Rationale**: The bridge layer complexity was slowing down feature development. A clean rebuild with the same Supabase DB allows v2 to launch clean while v1 stays live
- **Alternatives**: Continue incremental migration (12+ months estimated), full Next.js rewrite of v1 in place (too risky with live users)
- **Status**: Active

## ADR-002: Single Supabase Client (No VITE_ vars)
- **Date**: 2026-04-06
- **Decision**: v2 uses a single Supabase client setup in `lib/supabase/` with only `NEXT_PUBLIC_` env vars
- **Context**: v1 had two clients and dual env var sets (NEXT_PUBLIC_ and VITE_) causing confusion and potential auth state mismatches
- **Rationale**: Simplicity. One client per rendering context (server vs browser), managed by `@supabase/ssr`
- **Status**: Active

## ADR-003: Family Account Architecture
- **Date**: 2026-04-06
- **Decision**: Individual accounts linked into family groups via `family_memberships` table, not profiles under a single master account
- **Context**: V1 had families as "profiles under one account" which caused permission complexity and prevented family members from having their own recipes/stats
- **Rationale**: Each family member (teen, adult) gets their own Supabase auth account. Babies/kids are "managed members" (no auth, managed by parent). This enables per-member nutrition targets, personal recipe libraries, and proper RLS
- **Alternatives**: Single account with sub-profiles (v1 approach — caused RLS headaches), separate unlinked accounts (loses family sharing features)
- **Status**: Active

## ADR-004: Self-Learning Knowledge System
- **Date**: 2026-04-06
- **Decision**: Implement a file-based knowledge capture system in `/knowledge`
- **Context**: Claude Code sessions produce valuable learnings that are lost between sessions
- **Rationale**: Markdown files are version-controlled, human-readable, and natively consumed by AI. No infrastructure overhead vs. a database or RAG system.
- **Alternatives**: Database-backed RAG (over-engineered), just CLAUDE.md (too limited), external tool (fragmentation)
- **Status**: Active

## ADR-005: No React Router DOM
- **Date**: 2026-04-06
- **Decision**: v2 uses Next.js App Router navigation exclusively. React Router DOM is not installed.
- **Context**: v1 required BrowserRouter wrappers around every protected page to make SPA views work
- **Rationale**: Next.js App Router handles all routing. Using React Router alongside it creates conflicts and confusion.
- **Status**: Active

---
*Last updated: 2026-04-06*
