# AGENTS.md — Project Instructions for Codex

> Codex reads this file automatically at session start. These rules apply to ALL tasks.

## Project Context

MintyFit v2 (mintyfit.com) — a family nutrition and meal planning platform. Read `SYSTEM.md` for complete architecture, database schema, and data flow before making any changes.

## Strategic Position

"The only nutrition platform built for families, not individuals." Each family member has their own account with personalized nutrition targets. Families share meal plans, recipes, and shopping lists. AI generates custom recipes with 47-nutrient profiles.

## Core Principles

- **Simplicity First.** Make every change as simple as possible. Minimal code impact.
- **No Laziness.** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact.** Only touch what's necessary. No side effects, no new bugs.
- **One Source of Truth.** BMR lives in `lib/nutrition/portionCalc.js`. Daily needs live in `lib/nutrition/memberRDA.js`. Nutrition is calculated ONCE at write time.

## Architecture Rules

### Tech Stack
- Next.js 15 App Router — NO Pages Router, NO React Router DOM
- React 19 — Server Components by default, 'use client' only when needed
- Tailwind CSS 4 — utility classes, CSS custom properties for theming
- Supabase — single client setup in `lib/supabase/`, no VITE_ env vars
- TypeScript-ready but currently JavaScript (.jsx files)

### File Organization
| Creating... | Put it in... |
|---|---|
| New page | `app/[route]/page.jsx` |
| Shared component | `components/` |
| Business logic | `lib/` (organized by domain) |
| Custom hook | `hooks/` |
| React context | `contexts/` |
| API route | `app/api/[route]/route.js` |

### URL Structure (SEO)
All public URLs use clean descriptive slugs. No UUIDs, no database IDs in URLs.
- `/recipes/chicken-caesar-salad` (not `/recipes/uuid-here`)
- `/menus/4-week-mediterranean-plan`
- `/blog/iron-rich-foods-for-families`

### Nutrition Data Flow — Do Not Break This
1. Recipe nutrition estimated by Codex Haiku / USDA at creation → stored on recipe
2. Family member BMR computed via `computeBMR()` from `lib/nutrition/portionCalc.js`
3. Personal daily needs via `computeMemberDailyNeeds()` from `lib/nutrition/memberRDA.js`
4. Calendar entries store `personal_nutrition` per member (pre-computed, immutable)
5. Statistics reads stored values — it does NOT calculate nutrition
6. Journal entries are facts (exact amounts) — no BMI scaling

### Files You Must Not Duplicate Logic From
- `lib/nutrition/portionCalc.js` — BMR, TDEE, BMI fraction, activity factor
- `lib/nutrition/memberRDA.js` — personal daily nutrient needs
- `lib/nutrition/nutrition.js` — NUTRITION_FIELDS array, nutrient keys

### Meal Types
Always: `['breakfast', 'snack', 'lunch', 'snack2', 'dinner']`

### Family Architecture
Two member types in a family:
- **Linked members** — teens/adults with their own account (profile_id in family_memberships)
- **Managed members** — babies/kids without accounts (managed by parent)

Activity is per-member per-day (not per-meal). Daily activity adjusts calorie target which cascades through all 47 nutrient targets.

## Workflow Rules

### Plan Before Building
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately

### Verify Before Done
- Never mark a task complete without proving it works
- Run the app, check the output, demonstrate correctness

### Self-Correction
- After ANY correction from the user: note the pattern mentally
- Capture it in the session wrap-up so future sessions don't repeat the same mistake

### Knowledge System

This project uses a self-learning knowledge system in `/knowledge`. Follow this workflow:

**At session start:**
1. Read `knowledge/INDEX.md` to find files relevant to your current task
2. Load only the relevant knowledge files — don't read everything

**During the session:**
3. If you discover something that isn't documented (a pattern, a gotcha, a decision), note it mentally

**At session end:**
4. Run the session wrap-up: read `knowledge/prompts/session-wrap.md` and follow it
5. Create a session file in `knowledge/sessions/YYYY-MM-DD-[topic].md`
6. If any finding is critical, update the relevant knowledge file or AGENTS.md directly

**Weekly (every 5-10 sessions):**
7. Run the consolidation: read `knowledge/prompts/consolidate.md` and follow it

**Key rules:**
- Knowledge files are markdown in `/knowledge` — not a database
- Session files are the raw input. Pattern/convention files are the refined output. AGENTS.md is the executive summary.
- Don't bloat AGENTS.md — only promote findings confirmed in 2+ sessions or that prevent major bugs
- Update `knowledge/INDEX.md` whenever you create new knowledge files

### SYSTEM.md Auto-Update Rule
After completing any task, check if you changed:
1. Database schema → update SYSTEM.md
2. New utility files → update SYSTEM.md
3. New components → update SYSTEM.md
4. New API routes → update SYSTEM.md
5. New environment variables → update SYSTEM.md
6. Knowledge base changes → update knowledge/INDEX.md


AGENTS.md — Overnight Execution Protocol Addition
> Paste this section into the bottom of your AGENTS.md after the Knowledge System section.
---
Overnight Execution Protocol
This project supports unattended overnight builds. An external script (`run-overnight.bat`) relaunches Codex after credit exhaustion. Codex must be resilient to interruption and resumption.
How It Works
Read CHECKPOINT.md at the start of every session
Find the next [PENDING] task — skip all [DONE] and [FAILED] tasks
Verify the last [DONE] task actually works before moving forward (quick sanity check)
Execute the pending task using the matching TASK-REFERENCE.md section for full instructions
Verify the task — run build, check files exist, test the feature
Update CHECKPOINT.md — change [PENDING] to [DONE] or [FAILED] with a short verification note
Log learnings — append to `knowledge/sessions/overnight-learnings.md`
Continue to the next task — repeat from step 2
When all tasks are [DONE] — create `OVERNIGHT-COMPLETE.md` in the project root and stop
Checkpoint Format
```
- [DONE] TASK 1.1: Create GitHub repo — ✓ repo created, initial commit pushed
- [FAILED] TASK 1.2: Install deps — npm install failed on sharp, needs manual fix
- [PENDING] TASK 1.3: Create AGENTS.md
```
Rules
Never skip verification. Every task must be proven to work before marking [DONE].
If a task fails and you can fix it, fix it. Only mark [FAILED] if you genuinely cannot resolve it.
If a [FAILED] task blocks subsequent tasks, note the dependency in CHECKPOINT.md and skip dependent tasks with [BLOCKED].
Work through as many tasks as possible in each session before credits run out.
Keep CHECKPOINT.md updated after EVERY task — this is your save file.
The full task instructions live in TASK-REFERENCE.md — read the relevant section for each task.
Learnings File Format
Append to `knowledge/sessions/overnight-learnings.md`:
```markdown
### TASK X.Y — [task name] — [timestamp]
- Status: DONE/FAILED
- What happened: [brief description]
- Issues encountered: [any problems and how they were resolved]
- Files created/modified: [list]
```
