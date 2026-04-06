# Weekly Consolidation Prompt

> Run this prompt once a week (or every 5-10 sessions) to consolidate knowledge.

---

## Prompt

Perform a weekly consolidation of the MintyFit knowledge base.

### Step 1: Review Session Logs
Read all files in `knowledge/sessions/` that haven't been consolidated yet (check for absence of `## Consolidated:` header).

### Step 2: Identify Patterns
Look for:
- **Repeated findings** — The same issue/pattern appearing in multiple sessions → promote to the relevant `knowledge/patterns/` or `knowledge/anti-patterns/` file
- **Contradictions** — Finding A says X but Finding B says the opposite → investigate and resolve, note the resolution
- **Evolved understanding** — An earlier finding was incomplete, a later session has better information → update the knowledge file with the latest understanding
- **Cross-cutting concerns** — Patterns that span multiple categories → note them in the most relevant file and cross-reference

### Step 3: Update Knowledge Files
- Merge repeated findings into the appropriate files under `knowledge/patterns/`, `knowledge/anti-patterns/`, or `knowledge/conventions/`
- Update confidence levels based on how many times a finding has been confirmed
- Add "Last updated" dates
- Remove or mark superseded information

### Step 4: Promote to CLAUDE.md
If any consolidated knowledge is critical enough that it should be in every session's context (i.e., violating it would cause bugs or wasted time), add it to `CLAUDE.md` under the appropriate section.

Keep `CLAUDE.md` lean — only promote findings that have been confirmed in 2+ sessions or that prevent significant bugs.

### Step 5: Update Index
Update `knowledge/INDEX.md` with any new files or changed coverage areas.

### Step 6: Archive Processed Sessions
Add a `## Consolidated: YYYY-MM-DD` header to each processed session file so it's clear they've been reviewed. Do not delete session files — they're the audit trail.
