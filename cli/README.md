# KodingX

**Multi-Agent Software Factory** by [Lexaplus](https://lexaplus.com)

A distributed multi-agent production system for enterprise-grade software delivery using AI agents (Cursor, Claude Code, Gemini, Codex, Kilo Code, and Playwright).

[![npm version](https://img.shields.io/npm/v/@lexaplus/kodingx.svg)](https://www.npmjs.com/package/@lexaplus/kodingx)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## What Is This?

This is not "using an AI coding assistant." This is a **complete production system** where:

- **Work** is decomposed into atomic tasks
- **State** is stored in a file-based blackboard (not chat history)
- **Agents** operate on tasks via deterministic protocols
- **Truth** is verified via automated tests + browser reality checks
- The system runs in a **self-healing loop** until "Definition of Done" is satisfied

**Key Outcome:** Software delivery becomes an orchestrated pipeline, not a single developer's session.

---

## The Core Principle: Filesystem Over Chat

**Agents never communicate directly. Everything goes through files.**

```
┌─────────────┐                    ┌─────────────────────────┐
│   Cursor    │ ── writes task ──► │inbox/claude/2026-01-31/ │
│(Orchestrator)│                    │  T001-1030.md           │
└─────────────┘                    └───────────┬─────────────┘
       ▲                                       │
       │                                       ▼
       │                              ┌─────────────┐
       │                              │ Claude Code │
       │                              │  (works)    │
       │                              └──────┬──────┘
       │                                     │
       │                                     ▼
       │                           ┌─────────────────────────┐
       └── reads report ────────── │outbox/claude/2026-01-31/│
                                   │  T001-1045.md           │
                                   └─────────────────────────┘
```

**Naming:** `T{ID}-{HHMM}.md` = Task ID + time (24hr). Organized by date folders.

### Why Files, Not Chat?

| Chat-Based Problem | File-Based Solution |
|--------------------|---------------------|
| Context window fills up | Agents read only what's needed |
| State lost when session ends | Files persist forever |
| Can't run agents in parallel | Agents read/write independently |
| No audit trail | Git tracks all changes |
| Token waste on context | Zero repetition |
| Cursor must "watch" each agent | Cursor just reads reports |

### How It Works

1. **Cursor** writes a task file to `inbox/claude/T001.md`
2. **Claude** (in a separate session) reads the task, does the work
3. **Claude** writes a report to `outbox/claude/T001-report.md`
4. **Cursor** reads the report, decides next steps
5. **Rinse and repeat** - no session coupling

Each agent run is **stateless**. All context comes from files.

---

## Quick Start

> **New to KodingX?** See [`QUICKSTART_MINIMAL.md`](QUICKSTART_MINIMAL.md) for a 5-minute setup with just the essentials.

### Install CLI

```bash
npm install -g @lexaplus/kodingx
```

### New Project

```bash
cd your-project
agency init
```

### Legacy Codebase (Safe Install)

```bash
cd existing-project
agency install
```

**What `install` does differently:**
- Detects existing `.cursorrules`, `CLAUDE.md`, etc.
- **Appends** agency rules instead of overwriting
- Respects your existing configs
- Won't break current workflows

```bash
# Minimal install (inbox/outbox/STATE only)
agency install --minimal

# Force overwrite existing .agency/
agency install --force
```

The CLI will ask you:
1. **Orchestrator?** (Cursor, Claude Code, Windsurf, Aider, etc.)
2. **Builder agents?** (Claude, Codex, Gemini, Kilo)
3. **License mode?** (LexaPlus, Community, Dual)

It creates:
- `.agency/` - The protocol folder (Single Source of Truth)
- Tool-specific adapter (e.g., `.cursor/rules/agency.mdc`)

### CLI Commands

```bash
agency init                  # Initialize .agency/ in project
agency task new              # Create a new task
agency status                # View project status
agency verify --task T0001   # Verify completed work
agency help                  # Show help
```

### Enterprise Features

```bash
# Risk-Task Governance (§21)
agency verify --task T0001 --check-risks
# → Fails if linked P0/P1 risks are OPEN

# Human Override with Audit Trail (§20)
agency verify --task T0001 --override \
  --reason "Hotfix for INC-1234" \
  --followup T0002 \
  --approver "lead@company.com"
# → Records override in verify artifact + requires DECISIONS.md entry
```

### Workflow

1. `agency task new` — Create a task (goes to builder's inbox)
2. Builder reads task, does work, writes report to outbox
3. `agency verify --task T0001` — Run DoD verification
4. Orchestrator marks DONE (only after verify passes)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (Cursor)                     │
│  • Reads outbox/ reports                                     │
│  • Writes tasks to inbox/                                    │
│  • Updates TASK_BOARD.md, STATE.md                          │
└────────────┬─────────────────────────────────────┬──────────┘
             │ writes                              │ reads
             ▼                                     ▼
┌────────────────────────┐           ┌────────────────────────┐
│        INBOX/          │           │        OUTBOX/         │
│  inbox/claude/T001.md  │           │ outbox/claude/T001.md  │
│  inbox/gemini/T002.md  │           │ outbox/gemini/T002.md  │
│  inbox/codex/T003.md   │           │ outbox/playwright/...  │
└────────────┬───────────┘           └────────────▲───────────┘
             │                                     │
             │ reads                               │ writes
             ▼                                     │
┌─────────────────────────────────────────────────────────────┐
│                  AGENTS (Independent Sessions)               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Claude  │ │ Gemini  │ │  Codex  │ │  Kilo   │           │
│  │  Code   │ │   CLI   │ │         │ │  Code   │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│       Each agent: read task → do work → write report        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERIFICATION LAYER                        │
│  CI/CD │ Tests │ Linter │ Playwright │ Security             │
└─────────────────────────────────────────────────────────────┘
```

**Key:** Agents have NO direct communication. All coordination through files.

**Full Architecture:** See `.kodingx/ARCHITECTURE.md`

---

## Core Components

### Protocol Files (Single Source of Truth)

```
.agency/
├── agency.json          # Manifest (machine-readable config)
├── STATE.md             # Canonical state (SSoT)
├── TASK_BOARD.md        # Human-friendly task board
├── RISKS.md             # Risk register
├── DECISIONS.md         # Architecture decisions
├── dod/profiles/        # Definition of Done profiles
├── inbox/{agent}/       # Tasks TO agents (by date)
├── outbox/{agent}/      # Reports FROM agents (by date)
├── verify/              # Verification artifacts
└── agents/              # Builder contracts
```

See `PROTOCOL.md` for the full specification.

### Agents & Their Roles

| Agent | Role | Best For |
|-------|------|----------|
| **Cursor** | Orchestrator | Task decomposition, quality gates, merge strategy |
| **Claude Code** | Builder | Code implementation, refactoring, unit tests |
| **Gemini CLI** | Auditor | Risk detection, dependency analysis, repo scanning |
| **Codex** | Builder | High-precision patches, test scaffolding |
| **Kilo Code** | Coordinator | Parallel execution via git worktrees |
| **Playwright** | Reality Checker | E2E verification, ground truth |

---

## Practical Workflow Example

### Step 1: Cursor Creates a Task

Cursor writes to `inbox/claude/2026-01-31/T001-1030.md`:

```markdown
# Task: T001
**Assigned:** 2026-01-31 10:30 UTC

## Objective
Add email validation to user registration.

## Files in Scope
- `src/api/auth/register.ts`
- `tests/api/auth/register.test.ts`

## Acceptance Criteria
- [ ] Invalid emails return 400 error
- [ ] Valid emails pass through
- [ ] Unit tests cover edge cases
```

### Step 2: Claude Picks Up the Task

In a **separate session**, Claude:
1. Checks `inbox/claude/2026-01-31/` for pending tasks
2. Reads `T001-1030.md`
3. Implements the changes
4. Runs tests
5. Writes report to `outbox/claude/2026-01-31/T001-1045.md`

### Step 3: Cursor Reads the Report

Cursor reads `outbox/claude/2026-01-31/T001-1045.md`:

```markdown
# Report: T001
**Status:** ✅ SUCCESS
**Completed:** 2026-01-31 10:45 UTC

## Files Modified
- `src/api/auth/register.ts` (+25 / -3)
- `tests/api/auth/register.test.ts` (+40 / -0)

## Acceptance Criteria Status
- [x] Invalid emails return 400 error
- [x] Valid emails pass through
- [x] Unit tests cover edge cases

## Commands Run
npm test -- register → PASS (8/8 tests)
npm run lint → PASS
```

### Step 4: Cursor Updates State

Cursor marks T001 as DONE in `TASK_BOARD.md`. Old date folders can be archived.

**No session coupling. No shared context. Just files organized by date.**

---

## The Self-Healing Loop

```
INTAKE → DECOMPOSE → ANALYZE → ASSIGN → BUILD → VERIFY
                                                    │
                                                    ├─ PASS → CLOSE
                                                    │
                                                    └─ FAIL → HEAL (loop back)
```

1. **Intake** - User provides work request
2. **Decompose** - Cursor breaks into atomic tasks
3. **Analyze** - Gemini identifies risks
4. **Assign** - Cursor writes task to agent's `inbox/`
5. **Build** - Agent reads task, works, writes to `outbox/`
6. **Verify** - CI + Playwright test
7. **Heal** - If fail, new task to `inbox/`
8. **Close** - If pass, mark DONE

**Details:** See `.kodingx/protocols/TASK_ASSIGNMENT.md`

---

## Quality Gates

### Pre-Assignment
- Task is atomic
- Scope is clear
- Files are explicit
- Acceptance criteria are testable

### Pre-Closure
- All acceptance criteria met
- All DoD items checked
- STATE.md shows PASS
- No critical risks open
- Playwright flows pass

**Full Checklist:** See `.kodingx/protocols/DOD_CHECKLIST.md`

---

## Cost Model (CWU → ED → Time/Cost)

### Code Work Units (CWU)
```
CWU = w_E·E + w_P·P + w_U·U + w_F·F + w_X·X + w_R·R + w_T·T
```

Where:
- E = Entity/data complexity
- P = Process/workflow complexity
- U = UI/UX surface
- F = Feature logic complexity
- X = External integrations
- R = Risk/compliance/security
- T = Testing depth

### Engineering Days (ED)
```
ED = CWU / K
```

Where K = productivity constant:
- K_manual = 50-100 (human-only)
- K_cursor = 200-400 (Cursor-only)
- K_factory = 600-3500 (Multi-agent factory)

### Calendar Time
```
CalendarDays = (ED × 8 / 14) × q / Speedup
```

Where:
- 14 = machine hours per day
- q = rework factor (1.15-1.35)
- Speedup = parallel speedup (Amdahl's Law)

**Full Math:** See `.kodingx/ARCHITECTURE.md`

---

## Tools

### Gemini Risk Analyzer

Analyze your codebase for risks using Gemini CLI:

```bash
# Analyze entire repository
./.kodingx/tools/gemini-risk-analyzer.sh repo

# Analyze specific files
./.kodingx/tools/gemini-risk-analyzer.sh files src/app.ts src/utils.ts

# Analyze dependencies
./.kodingx/tools/gemini-risk-analyzer.sh deps

# Analyze recent changes
./.kodingx/tools/gemini-risk-analyzer.sh diff
```

Output is saved to `.kodingx/LOGS/` and can be used to update `RISKS.md`.

---

## Engineering Constitution (Non-Negotiable Rules)

1. ✅ **Filesystem is the only source of truth** - Not chat, not memory, not session state
2. ✅ **Agents communicate via files only** - inbox/ for tasks, outbox/ for reports
3. ✅ **Every agent run is stateless** - Read files → Work → Write files → Exit
4. ✅ **Atomic tasks only** - One objective, explicit file boundaries
5. ✅ **DoD is hard-gated** - Tests + E2E must pass before DONE
6. ✅ **Every report is structured** - Same format, easy to parse
7. ✅ **Risk ledger is mandatory** - RISKS.md is always up to date
8. ✅ **Reality checks beat arguments** - Playwright > discussion

---

## Parallelization

### Pattern A: Git Branches (Simple)
```bash
git checkout -b task/T001
# Work on task
git checkout main && git merge task/T001
```

### Pattern B: Git Worktrees (High Parallel)
```bash
git worktree add ../worktree-T001 -b task/T001
git worktree add ../worktree-T002 -b task/T002
# Multiple agents work in parallel
# Cursor merges sequentially
```

**Kilo Code** natively supports worktree-based parallelism.

---

## Metrics

Track these in [`STATE.md`](.agency/STATE.md):

- **Task Throughput** - Tasks completed per day
- **Task Cycle Time** - Time from TODO to DONE
- **Rework Rate** - Tasks that failed verification
- **Test Pass Rate** - Percentage of tests passing
- **Risk Materialization Rate** - Risks that became issues

---

## Example Task

```markdown
### Task ID: T042
**Status:** 🟡 IN PROGRESS
**Assigned To:** Claude Code
**Priority:** High

**Scope:**
Add input validation to user registration endpoint.

**Files in Scope:**
- `src/api/auth/register.ts`
- `src/validators/user.validator.ts`
- `tests/api/auth/register.test.ts`

**Acceptance Criteria:**
- [ ] Email validation rejects invalid formats
- [ ] Password validation enforces 8+ chars, 1 uppercase, 1 number
- [ ] Username uniqueness check queries database

**Definition of Done:**
- [ ] Code implemented
- [ ] Unit tests pass (100% coverage)
- [ ] No linter errors
- [ ] Type checking passes
- [ ] API documentation updated

**Commands to Run:**
```bash
npm test -- register
npm run lint
npm run typecheck
```

**Dependencies:** None
**Out of Scope:** Email verification flow (separate task)
```

---

## Documentation

All documentation lives in `.kodingx/`:

| Document | Description |
|----------|-------------|
| `ARCHITECTURE.md` | Complete system architecture |
| `protocols/TASK_ASSIGNMENT.md` | Task creation & assignment protocol |
| `protocols/DOD_CHECKLIST.md` | Definition of Done checklist |
| `MASTER_PLAN.md` | Project goals & phases |
| `TASK_BOARD.md` | Active tasks & status |
| `STATE.md` | Current system state |
| `KNOWLEDGE.md` | Project knowledge base |
| `RISKS.md` | Risk register |

---

## Resources

- **Kilo Code:** [https://kilo.ai/](https://kilo.ai/)
- **Kilo Code VSCode Extension:** [Marketplace](https://marketplace.visualstudio.com/items?itemName=kilocode.Kilo-Code)
- **Gemini CLI:** [Google AI Docs](https://ai.google.dev/gemini-api/docs/cli)
- **Playwright:** [https://playwright.dev/](https://playwright.dev/)
- **Amdahl's Law:** [Wikipedia](https://en.wikipedia.org/wiki/Amdahl%27s_law)

---

## Contributing

KodingX is open source. Contributions welcome:

1. Fork the repository
2. Create your feature branch
3. Submit a pull request

GitHub: [github.com/parsabarati/kodingx](https://github.com/parsabarati/kodingx)

---

## License

MIT License - Copyright (c) 2026 Lexaplus

---

## Support

For questions or issues:
- Open an issue: [github.com/parsabarati/kodingx](https://github.com/parsabarati/kodingx/issues)
- Documentation: [lexaplus.com/kodingx](https://lexaplus.com/kodingx)
- Email: hello@lexaplus.com

---

**KodingX** by [Lexaplus](https://lexaplus.com) - Enterprise Software Solutions

Built with Cursor, Claude Code, Gemini CLI, and the principles of deterministic software delivery.
# KodingX
