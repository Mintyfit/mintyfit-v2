# MintyFit v2 — Build Session Guide

> This folder contains 10 sequential session files that rebuild MintyFit from scratch as a clean Next.js 15 project. Each session is a self-contained Claude Code prompt.

## Session Order

| Session | File | What It Does | Estimated Time |
|---|---|---|---|
| 00 | `SESSION-00-PREREQUISITES.md` | Generate tokens, connect MCP servers, prepare environment | 30 min (manual) |
| 01 | `SESSION-01-FOUNDATION.md` | Create GitHub repo, scaffold Next.js, knowledge system, CLAUDE.md, SYSTEM.md, deploy to Vercel test URL | 1-2 sessions |
| 02 | `SESSION-02-BUSINESS-LOGIC.md` | Transplant all utility files from old project into clean `lib/` structure | 1 session |
| 03 | `SESSION-03-LANDING-PAGE.md` | Conversion-focused landing page, onboarding quiz, auth modal | 1-2 sessions |
| 04 | `SESSION-04-RECIPES.md` | Recipe list, AI generator (with image), recipe detail with progressive nutrition | 2-3 sessions |
| 05 | `SESSION-05-PLANNER.md` | Week overview + day agenda, journal entries, activity system, shopping list generation | 2-3 sessions |
| 06 | `SESSION-06-MENUS-SHOPPING.md` | Menus browsing page, shopping list as standalone feature | 1-2 sessions |
| 07 | `SESSION-07-STATS-ACCOUNT.md` | Statistics, My Profile, My Family, nutritionist link | 2-3 sessions |
| 08 | `SESSION-08-ADMIN-BLOG-SEO.md` | Admin dashboard, blog/CMS, pricing page, SEO infrastructure | 1-2 sessions |
| 09 | `SESSION-09-POLISH-DEPLOY.md` | Full testing, performance audit, knowledge consolidation, production domain switch | 1-2 sessions |

**Estimated total: 12-20 Claude Code sessions**

## How to Use

1. Complete Session 00 manually (it's terminal commands, not a Claude Code prompt)
2. For each subsequent session: open Claude Code, paste the session file content as your prompt
3. Claude Code will execute the steps, building on previous sessions
4. Each session ends with a knowledge system wrap-up that captures learnings
5. The knowledge base grows with each session, making subsequent sessions more informed

## Key Files Created in Session 01

These files persist across all sessions and form the project's "brain":

- **`CLAUDE.md`** — Rules Claude Code follows every session (always read automatically)
- **`SYSTEM.md`** — Full technical documentation (updated after each session)
- **`knowledge/INDEX.md`** — Table of contents for the knowledge base
- **`knowledge/prompts/session-wrap.md`** — Run at end of every session to capture learnings
- **`knowledge/prompts/consolidate.md`** — Run every 5-10 sessions to refine knowledge

## Architecture Decisions

These decisions were made during the strategy session and are baked into the build:

- **Family accounts** — Individual accounts linked into family groups, not profiles under one account
- **Two-view planner** — Week overview (bird's eye) + day agenda (full interaction)
- **Progressive nutrition disclosure** — Big 4 → Key nutrients → All 47
- **Recipe detail is separate from planner** — Planner links to recipes, doesn't embed them
- **Activity at day level** — Not per-meal. Default templates auto-populate from member profiles
- **Shopping list is standalone** — Accessible from recipes, planner, and its own page/icon
- **Clean URLs** — Descriptive slugs everywhere, no UUIDs in URLs
- **No Vite remnants** — Pure Next.js 15 App Router, single Supabase client, no React Router DOM

## Pricing Model

| Tier | Price | What's Included |
|---|---|---|
| Free | $0 | Up to 2 members, 5 recipes/day, full planner, all 47 nutrients, journal, basic shopping list |
| Pro | $4.99/mo ($39.99/yr) | 1 person, unlimited recipes, stats & trends, activity tracking, advanced shopping list |
| Family | $7.99/mo ($59.99/yr) | Up to 6 accounts + kids, shared planning, family dashboard, nutritionist link |
