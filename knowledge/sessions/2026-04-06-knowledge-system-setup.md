# Session: Knowledge System Setup
**Date**: 2026-04-06
**Duration**: ~1 session
**Task**: Implement the self-learning knowledge system for MintyFit v2

## What Was Done
- Created `/knowledge` directory structure with patterns, anti-patterns, conventions, decisions, sessions, and prompts subdirectories
- Populated initial knowledge files with v2-specific architecture decisions (clean Next.js 15, no Vite/hybrid)
- Created session wrap-up, consolidation, and cross-project prompt templates
- Created `CLAUDE.md` with full project rules, architecture guidelines, and knowledge system workflow
- Adapted all content for v2 (no Vite_, no SPA bridge layer, no React Router DOM, single Supabase client)
- Documented 5 initial Architectural Decision Records in `decisions/log.md`

## Findings

### New Knowledge
- v2 starts completely clean — no technical debt from v1's hybrid migration
- The single biggest v1 pain point was dual Supabase clients + VITE_ env var fallbacks; v2 eliminates this by design
- Family architecture change (individual accounts linked in groups, not profiles under one master account) requires careful RLS policy design on `family_memberships` table
- Supabase `getUser()` vs `getSession()` distinction is critical: always use `getUser()` in server code to avoid stale session bugs

### What Worked
- Knowledge system structure from KNOWLEDGE-SYSTEM-REFERENCE.md adapted cleanly to v2
- Separating hot rules (CLAUDE.md) from reference knowledge (knowledge/) from raw sessions keeps context lean

## Recommendations

### Should be added to CLAUDE.md (already done)
- Knowledge system workflow rules
- SYSTEM.md auto-update rule

### Should be added to knowledge/ (done)
- All 15 initial knowledge files

## Consolidated: 2026-04-06
