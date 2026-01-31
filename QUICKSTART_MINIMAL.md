# KodingX — Quick Start (Minimal)

Get running in **5 minutes** with just the essentials.

---

## For Legacy Codebases

```bash
npm install -g @lexaplus/kodingx
agency install --minimal
```

This safely adds KodingX without touching your existing configs.

---

## Manual Setup (No CLI)

### What You Need (Minimal)

```
.kodingx/
├── STATE.md          # What's happening now
├── inbox/            # Tasks TO agents
│   └── {agent}/
└── outbox/           # Reports FROM agents
    └── {agent}/
```

That's it. Everything else is optional.

---

## Step 1: Create Structure

```bash
mkdir -p .kodingx/inbox/claude .kodingx/outbox/claude
```

## Step 2: Create STATE.md

```markdown
# State

## Current Focus
Nothing yet.

## Active Tasks
- None
```

## Step 3: Create a Task

Create `.kodingx/inbox/claude/2026-01-31/T001-fix-bug.md`:

```markdown
---
id: T001
title: "Fix login bug"
status: NEW
assignee: claude
---

## Problem
Users can't log in with email containing +

## Files
- src/auth/login.ts
- tests/auth/login.test.ts

## Done When
- [ ] Email with + works
- [ ] Tests pass
```

## Step 4: Agent Works

Agent reads task → does work → writes report.

Create `.kodingx/outbox/claude/2026-01-31/T001-report.md`:

```markdown
---
task_id: T001
status: READY_FOR_REVIEW
---

## Summary
Fixed regex in email validation.

## Files Modified
- src/auth/login.ts (+5 / -2)

## Tests
All passing.
```

## Step 5: Verify & Done

1. Read the report
2. Run tests: `npm test`
3. If pass → mark DONE in STATE.md

---

## The Core Loop

```
You create task → Agent works → Agent writes report → You verify → DONE
      (inbox)                        (outbox)           (tests)
```

---

## When to Upgrade

Add more protocol features when you need:

| Need | Add |
|------|-----|
| Multiple agents | More inbox/outbox folders |
| Risk tracking | RISKS.md |
| Decision audit | DECISIONS.md |
| Automated verify | DoD profiles + `agency verify` |
| Scope control | YAML frontmatter with `scope` |
| Tool adapters | `.cursor/rules/agency.mdc` etc. |

---

## Full Protocol

See `PROTOCOL.md` for the complete specification.

---

## Install CLI (Optional)

```bash
npm install -g @lexaplus/kodingx
agency init    # Full setup
```

---

**KodingX** by [Lexaplus](https://lexaplus.com)
