# Session Wrap-Up Prompt

> Paste this at the end of every Claude Code session to capture learnings.

---

## Prompt

Review the work done in this session and create a session findings file.

1. Create a new file: `knowledge/sessions/YYYY-MM-DD-[brief-topic].md` (use today's date and a 2-3 word topic slug)

2. Use this template:

```
# Session: [Brief Title]
**Date**: YYYY-MM-DD
**Duration**: ~[estimate]
**Task**: [What was the goal]

## What Was Done
- [Bullet points of changes made]

## Findings

### What Worked
- [Pattern/approach that was effective]

### What Didn't Work
- [Approach that was tried and failed or caused issues]

### Bugs Found
- [Any bugs discovered, with root cause if known]

### New Knowledge
- [Things learned that weren't documented before]

## Recommendations

### Should be added to CLAUDE.md (hot rules)
- [Only the most critical, always-relevant items]

### Should be added to knowledge/ (reference)
- [Less critical but worth preserving]

## Supersedes
- [If any existing knowledge is now outdated, note which file/section]
```

3. After creating the session file, check if any findings are critical enough to promote to `CLAUDE.md` or update in `knowledge/patterns/*.md`. If yes, make those updates too.

4. Update `knowledge/INDEX.md` if you created any new knowledge files.
