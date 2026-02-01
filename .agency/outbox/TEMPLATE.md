# Outbox Report Template

When an agent completes work, it writes a report organized by date:

```
outbox/
└── claude/
    └── 2026-01-31/           # Date folder (YYYY-MM-DD)
        ├── T001-1045.md      # T001 completed at 10:45
        ├── T002-1530.md      # T002 completed at 15:30
        └── T003-1705.md      # T003 completed at 17:05
```

**File naming:** `T{ID}-{HHMM}.md` where HHMM is 24-hour time of completion.

Cursor reads these reports to track progress and make decisions.

---

## Execution Report Format

```markdown
# Report: T001
**Agent:** Claude Code
**Started:** 2026-01-31 10:05:00 UTC
**Completed:** 2026-01-31 10:45:00 UTC
**Status:** ✅ SUCCESS | ❌ FAILED | ⚠️ PARTIAL

## Summary
One-paragraph summary of what was done.

## Files Modified
| File | Changes | Notes |
|------|---------|-------|
| `src/api/auth/register.ts` | +45 / -12 | Added validation logic |
| `src/validators/user.validator.ts` | +80 / -0 | New file |
| `tests/api/auth/register.test.ts` | +120 / -5 | 15 new test cases |

## Commands Run
```bash
$ npm test -- register
PASS  tests/api/auth/register.test.ts
  ✓ validates email format (5ms)
  ✓ rejects invalid emails (3ms)
  ...
Tests: 15 passed, 15 total

$ npm run lint
No errors

$ npm run typecheck
No errors
```

## Acceptance Criteria Status
- [x] Criterion 1 - done
- [x] Criterion 2 - done  
- [x] Criterion 3 - done

## Risks Identified
- None
(or)
- **NEW RISK:** Found that `oldFunction()` is deprecated, may break in v2.0
  - Severity: MEDIUM
  - Affected: `src/utils/legacy.ts`
  - Suggest: Create follow-up task to migrate

## Blockers Encountered
- None
(or)
- **BLOCKED:** Could not complete criterion 3 - missing API key
  - Need: `STRIPE_API_KEY` environment variable
  - Action: Task remains partial until unblocked

## Notes
- Used existing pattern from `src/validators/common.ts`
- Consider adding rate limiting (out of scope for this task)

## Next Steps (Suggestions)
- Task T002: Add email verification flow
- Task T003: Add rate limiting to auth endpoints
```

---

## Report Types by Agent

### Claude/Codex Reports
- Execution reports (code changes, test results)
- Located in: `outbox/claude/`, `outbox/codex/`

### Gemini Reports  
- Risk analysis, dependency analysis, ripple effects
- Located in: `outbox/gemini/`

### Playwright Reports
- E2E test results, traces, screenshots
- Located in: `outbox/playwright/`

### Kilo Reports
- Parallel execution summaries, worktree status
- Located in: `outbox/kilo/`

---

## Key Principles

1. **Structured** - Same format every time for easy parsing
2. **Complete** - Everything Cursor needs to make decisions
3. **Honest** - Report failures and blockers clearly
4. **Actionable** - Include specific next steps
