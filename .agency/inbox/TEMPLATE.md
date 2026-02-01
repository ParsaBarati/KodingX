# Inbox Task Template

When Cursor assigns a task to an agent, create a file organized by date:

```
inbox/
└── claude/
    └── 2026-01-31/           # Date folder (YYYY-MM-DD)
        ├── T001-1030.md      # Task T001 assigned at 10:30
        ├── T002-1415.md      # Task T002 assigned at 14:15
        └── T003-1622.md      # Task T003 assigned at 16:22
```

**File naming:** `T{ID}-{HHMM}.md` where HHMM is 24-hour time of assignment.

The agent reads this file, does the work, then writes a report to its outbox.

---

## Task File Format

```markdown
# Task: T001
**Assigned:** 2026-01-31 10:00:00 UTC
**Priority:** High
**Deadline:** 2026-01-31 18:00:00 UTC (optional)

## Objective
Clear, single-sentence description of what needs to be done.

## Context
- Why this task exists
- What triggered it
- Any relevant background

## Files in Scope
- `src/api/auth/register.ts`
- `src/validators/user.validator.ts`
- `tests/api/auth/register.test.ts`

## Acceptance Criteria
- [ ] Criterion 1 - specific and testable
- [ ] Criterion 2 - specific and testable
- [ ] Criterion 3 - specific and testable

## Commands to Run
```bash
npm test -- register
npm run lint
npm run typecheck
```

## Out of Scope
- Do NOT touch X
- Do NOT refactor Y
- Save Z for a separate task

## References
- See `KNOWLEDGE.md` for coding conventions
- Related risk: R003 in `RISKS.md`
- Depends on: T000 (completed)
```

---

## Key Principles

1. **Self-contained** - Agent should NOT need to ask questions
2. **Atomic** - One clear objective, completable in one session
3. **Bounded** - Explicit file list, explicit out-of-scope
4. **Testable** - Clear criteria to know when done
