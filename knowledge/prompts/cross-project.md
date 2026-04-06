# Cross-Project Knowledge Extraction

> Use this when a finding from MintyFit applies to other projects (Rapid Security contracts, iPumps, SPS Grupp, etc.)

---

## Prompt

Review the most recent session findings and identify any learnings that are NOT MintyFit-specific but apply broadly.

Examples of cross-project knowledge:
- Supabase patterns (auth, RLS, storage) → useful for any Supabase project
- Next.js App Router patterns → useful for any Next.js project
- A4 print-ready CSS/HTML conventions → useful for Rapid Security contracts
- Stripe integration patterns → useful for any payment project
- SEO patterns → useful for SPS Grupp, MintyFit, iPumps
- AI API integration patterns → useful for any project using Claude/Grok APIs

For each cross-project finding:
1. Write it up as a standalone, project-agnostic pattern
2. Save to `~/shared-knowledge/[topic].md` (create the directory if it doesn't exist)
3. Reference the MintyFit session where it was discovered

Keep these files self-contained — someone working on a different project should understand the pattern without needing MintyFit context.
