# KodingX

**Multi-Agent Software Factory** by [Lexaplus](https://lexaplus.com)

A distributed multi-agent production system for enterprise-grade software delivery using AI agents (Cursor, Claude Code, Gemini, Codex, Kilo Code, Aider, Windsurf, and Playwright).

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

1. **Orchestrator** (e.g., Cursor) writes a task file to `.kodingx/inbox/claude/T001.md`
2. **Builder** (e.g., Claude Code) reads the task, does the work
3. **Builder** writes a report to `.kodingx/outbox/claude/T001-report.md`
4. **Orchestrator** reads the report, runs verification
5. **Rinse and repeat** - no session coupling

Each agent run is **stateless**. All context comes from files.

---

## Quick Start

### Install

```bash
npm install -g @lexaplus/kodingx
```

### Initialize Your Project

**For a new project (Full Setup):**

```bash
cd your-project
agency init
```

The CLI will ask you:
1. **Orchestrator?** (Cursor, Claude Code, Windsurf, Aider, etc.)
2. **Builder agents?** (Claude, Codex, Gemini, Kilo, Aider)
3. **License mode?** (LexaPlus, Community, Dual)

**For an existing project (Safe Install):**

```bash
agency install
# OR for just the essentials:
agency install --minimal
```

This creates:
- `.kodingx/` - The protocol folder (Single Source of Truth)
- Tool-specific adapter (e.g., `.cursor/rules/kodingx.mdc`, `CLAUDE.md`, `.windsurfrules`)

### CLI Commands

```bash
agency task new              # Create a new task interactively
agency status                # View project status (inbox/outbox/state)
agency verify --task T0001   # Verify completed work (DoD check)
agency verify --task T0001 --check-risks  # Verify with risk governance
agency help                  # Show help
```

### Enterprise Features

```bash
# Risk-Task Governance (§21)
# Fails if linked P0/P1 risks are OPEN in RISKS.md
agency verify --task T0001 --check-risks

# Human Override with Audit Trail (§20)
# Use when business needs override technical checks
agency verify --task T0001 --override \
  --reason "Hotfix for INC-1234" \
  --followup T0002 \
  --approver "lead@company.com"
```

--- 

## Architecture: The Event-Driven Flow

The system is **event-driven, asynchronous, and parallel**. The Orchestrator (Cursor) reacts to file system events and uses the Terminal to spawn independent agents.

```
┌─────────────────────────────────────────────────────────────────┐
│  User: "Build auth system"                                      │
│                           ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CURSOR (Orchestrator)                                  │    │
│  │  1. Update TASK_BOARD.md                                │    │
│  │  2. Decompose → atomic tasks                            │    │
│  │  3. Write tasks to inbox/claude/, inbox/codex/...       │    │
│  │  4. SPAWN agents via Terminal MCP (THIS IS KEY)         │    │
│  │     `claude -p "Read task at inbox/..."`                │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │ (spawns async processes)            │
│          ┌────────────────┴───────────────┐                     │
│          ▼                                ▼                     │
│  ┌──────────────┐                  ┌──────────────┐             │
│  │ Claude Code  │                  │    Codex     │             │
│  │ (Terminal 1) │                  │ (Terminal 2) │             │
│  │ reads inbox  │                  │ reads inbox  │             │
│  │ works...     │                  │ works...     │             │
│  │ → outbox/    │                  │ → outbox/    │             │
│  └───────┬──────┘                  └───────┬──────┘             │
│          │                                 │                    │
│          └────────────────┬────────────────┘                    │
│                           ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  OUTBOX MCP WATCHER                                     │    │
│  │  1. Detects new report file                             │    │
│  │  2. Triggers Cursor                                     │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  CURSOR (Orchestrator)                                  │    │
│  │  1. Calls Gemini (Auditor)                              │    │
│  │  2. Dispatches Playwright (E2E)                         │    │
│  │  3. Updates STATE.md                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### The "Secret Sauce": MCPs

1.  **Terminal MCP:** Allows Cursor to spawn agents (Claude, Codex, etc.) in separate terminal tabs/background processes. This enables true parallelism.
2.  **Outbox File Watcher MCP:** A small server that watches `.kodingx/outbox/` and notifies Cursor when a report arrives, triggering the verification loop.

**Result:** You don't "wait" for an agent. You dispatch it and move on. The system notifies you when it's done.

--- 

## Core Components

### Protocol Files (Single Source of Truth)

All files live in `.kodingx/`:

| File/Folder | Description |
|-------------|-------------|
| `kodingx.json` | Manifest (machine-readable config) |
| `STATE.md` | Canonical state (SSoT) |
| `TASK_BOARD.md` | Human-friendly task board |
| `RISKS.md` | Risk register |
| `DECISIONS.md` | Architecture decisions (ADR) |
| `dod/profiles/` | Definition of Done profiles (Node, Python, etc.) |
| `inbox/{agent}/` | Tasks TO agents (by date) |
| `outbox/{agent}/` | Reports FROM agents (by date) |
| `verify/` | Verification artifacts (JSON) |
| `agents/` | Builder contracts |

### Agents & Their Roles

| Agent | Role | Best For |
|---|---|---|
| **Cursor** | Orchestrator | Task decomposition, quality gates, merge strategy |
| **Windsurf** | Orchestrator | Flow-based orchestration |
| **Claude Code** | Builder | Code implementation, refactoring, unit tests |
| **Gemini CLI** | Auditor | Risk detection, dependency analysis, repo scanning |
| **Codex** | Builder | High-precision patches, test scaffolding |
| **Kilo Code** | Builder | Parallel execution via git worktrees |
| **Aider** | Builder | Git-aware changes, small fixes |
| **Playwright** | Reality Checker | E2E verification, ground truth |

--- 

## Practical Workflow Example

### Step 1: Cursor Creates a Task

Cursor writes to `.kodingx/inbox/claude-code/2026-01-31/T0001-1030-login-fix.md`:

```markdown
---
id: T0001
title: "Fix login bug"
priority: P1
status: NEW
assignee: claude-code
scope:
  must_touch: ["src/auth/login.ts"]
---

## Problem
Users can't log in with email containing + 

## Expected Outcome
- [ ] Email with + works
- [ ] Tests pass
```

### Step 2: Claude Picks Up the Task

In a **separate session** (e.g., terminal):
```bash
claude --print "Read .kodingx/inbox/claude-code/ and execute."
```

Claude:
1. Reads `T0001...md`
2. Implements the changes
3. Runs tests
4. Writes report to `.kodingx/outbox/claude-code/2026-01-31/T0001-...-report.md`

### Step 3: Verification

Orchestrator runs:
```bash
agency verify --task T0001
```

This runs the DoD profile (e.g., `npm test`, `npm lint`) and generates a verify artifact in `.kodingx/verify/`.

### Step 4: State Update

If verify passes, Orchestrator updates `STATE.md` and marks task **DONE**.

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

## Resources

- **Kilo Code:** [https://kilo.ai/](https://kilo.ai/)
- **Gemini CLI:** [Google AI Docs](https://ai.google.dev/gemini-api/docs/cli)
- **Playwright:** [https://playwright.dev/](https://playwright.dev/)

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

**KodingX** by [Lexaplus](https://lexaplus.com) - Enterprise Software Solutions

Built with Cursor, Claude Code, Gemini CLI, and the principles of deterministic software delivery.