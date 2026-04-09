# MintyFit Knowledge Base — Index

> Claude Code: Read this file at the start of every session to find relevant knowledge for your task. Only load files that are relevant — don't read everything.

## How This System Works

1. **Sessions** → Raw learnings captured at the end of each Claude Code session (`sessions/`)
2. **Consolidated knowledge** → Refined, deduplicated findings organized by category (`patterns/`, `anti-patterns/`, `conventions/`, `decisions/`)
3. **Hot rules** → The most critical items promoted to `CLAUDE.md` (always in context)
4. **This index** → Tells you which files exist and what they cover so you load only what's relevant

## Knowledge Files

### Patterns (what works)
| File | Covers |
|---|---|
| `patterns/data-fetching.md` | Supabase queries, caching, Server Components vs client data loading |
| `patterns/supabase.md` | RLS, auth, storage, edge functions, client init |
| `patterns/auth.md` | Auth flows, session handling, protected routes, middleware |
| `patterns/component-design.md` | Component patterns, Server vs Client Components, state management |
| `patterns/ai-integration.md` | Claude/Grok/Ideogram API patterns, prompt design, nutrition estimation |

### Anti-Patterns (what to avoid)
| File | Covers |
|---|---|
| `anti-patterns/known-pitfalls.md` | Bugs that have been hit before, things that break silently |

### Conventions (project rules)
| File | Covers |
|---|---|
| `conventions/naming.md` | File naming, variable naming, database column naming |
| `conventions/file-structure.md` | Where files go, the clean Next.js 15 App Router architecture |
| `conventions/styling.md` | CSS approach, dark mode, responsive patterns |

### Decisions (why we chose X over Y)
| File | Covers |
|---|---|
| `decisions/log.md` | Architectural Decision Records — chronological log of major decisions |

### Session Logs
| File | Summary |
|---|---|
| `sessions/2026-04-06-knowledge-system-setup.md` | Session 01 — Knowledge system and project scaffolding setup |
| `sessions/2026-04-06-business-logic.md` | Session 02 — Business logic transplant from v1; API route conversion; build verified |
| `sessions/SESSION-08-WRAPUP.md` | Sessions 03–08 — All pages built (landing, recipes, planner, shopping, menus, blog, admin, pricing, SEO) |
| `sessions/2026-04-09-session07-session09.md` | Sessions 07+09 — Statistics, Account, Family, Nutritionist; full audit; SYSTEM.md updated |

### Prompts
| File | Purpose |
|---|---|
| `prompts/session-wrap.md` | Template prompt for end-of-session knowledge capture |
| `prompts/consolidate.md` | Template prompt for weekly consolidation pass |
| `prompts/cross-project.md` | Template for extracting cross-project learnings |
