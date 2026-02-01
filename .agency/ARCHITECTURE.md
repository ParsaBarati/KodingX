# Autonomous Software Factory - System Architecture

**Version:** 1.0
**Last Updated:** 2026-01-30

---

## Executive Summary

The Autonomous Software Factory is a **distributed multi-agent production system** where work is decomposed into atomic tasks, state is stored in a file-based blackboard, agents operate via deterministic protocols, and truth is verified via automated tests and browser reality checks.

**Key Principle:** Software delivery becomes an orchestrated pipeline, not a single developer's session.

---

## System Goals

1. **Deterministic Execution** - Same input → same output
2. **Traceable Decisions** - All decisions recorded in files
3. **Self-Healing** - Automatic retry and recovery
4. **Parallel Execution** - Multiple agents work simultaneously
5. **Reality-Grounded** - Playwright verifies actual behavior
6. **Enterprise-Grade** - Suitable for production systems

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (Cursor)                     │
│  - Task Decomposition                                        │
│  - Agent Assignment                                          │
│  - Quality Gates                                             │
│  - Merge Strategy                                            │
└────────────┬────────────────────────────────────────────────┘
             │
             │ reads/writes
             ▼
┌─────────────────────────────────────────────────────────────┐
│              BLACKBOARD (File-Based State)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ MASTER_PLAN  │  │ TASK_BOARD   │  │   STATE      │      │
│  │    .md       │  │    .md       │  │    .md       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  KNOWLEDGE   │  │    RISKS     │  │    LOGS/     │      │
│  │    .md       │  │    .md       │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────┬────────────────────────────────────────────────┘
             │
             │ agents read/write
             ▼
┌─────────────────────────────────────────────────────────────┐
│                      AGENT LAYER                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Claude Code  │  │    Gemini    │  │    Codex     │      │
│  │  (Builder)   │  │  (Auditor)   │  │  (Builder)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Kilo Code   │  │  Playwright  │                        │
│  │ (Parallel)   │  │  (Reality)   │                        │
│  └──────────────┘  └──────────────┘                        │
└────────────┬────────────────────────────────────────────────┘
             │
             │ produces
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERIFICATION LAYER                        │
│  - CI/CD Pipeline                                            │
│  - Automated Tests (Unit, Integration, E2E)                  │
│  - Linter & Type Checker                                     │
│  - Security Scans                                            │
│  - Performance Benchmarks                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Orchestrator (Cursor)

**Role:** Project Manager / Architect / Quality Gatekeeper

**Responsibilities:**
- Decompose user requests into atomic tasks
- Assign tasks to appropriate agents
- Enforce quality gates (DoD)
- Manage merge strategy
- Adjudicate "Done" status
- Handle conflicts and blockers

**Inputs:**
- User requests
- TASK_BOARD.md
- STATE.md
- RISKS.md
- Test results
- Agent execution reports

**Outputs:**
- Task definitions in TASK_BOARD.md
- Agent assignments
- Merge decisions
- Final "Done" adjudication

**Never Does:**
- Implement large changes directly
- Skip quality gates
- Assume test results without verification

---

### 2. Blackboard (File-Based State)

**Role:** Single Source of Truth / Shared Memory

**Why Files, Not Chat:**
- **Token Efficiency** - Agents read only what's needed
- **Continuity** - Knowledge survives context resets
- **Auditability** - Decisions are explicit artifacts
- **Determinism** - Same files → same behavior

**File Structure:**

```
.agency/
├── MASTER_PLAN.md       # Immutable goals & phases
├── TASK_BOARD.md        # Kanban queue + acceptance criteria
├── STATE.md             # Current build/test/flow status
├── KNOWLEDGE.md         # Discovered truths, conventions
├── RISKS.md             # Open risks, blockers, regressions
│
├── inbox/               # Task assignments waiting for agents
│   ├── claude/
│   │   └── 2026-01-31/  # Date folder
│   │       ├── T001-1030.md
│   │       └── T002-1415.md
│   ├── codex/
│   │   └── 2026-01-31/
│   ├── gemini/
│   │   └── 2026-01-31/
│   └── kilo/
│       └── 2026-01-31/
│
├── outbox/              # Agent reports (completed work)
│   ├── claude/
│   │   └── 2026-01-31/  # Date folder
│   │       ├── T001-1045.md
│   │       └── T002-1530.md
│   ├── codex/
│   │   └── 2026-01-31/
│   ├── gemini/
│   │   └── 2026-01-31/
│   ├── kilo/
│   │   └── 2026-01-31/
│   └── playwright/
│       └── 2026-01-31/
│
├── LOGS/                # Raw logs, traces, screenshots
├── protocols/
│   ├── TASK_ASSIGNMENT.md
│   └── DOD_CHECKLIST.md
└── tools/
    └── gemini-risk-analyzer.sh
```

**Naming Convention:**
- Date folders: `YYYY-MM-DD` (e.g., `2026-01-31`)
- Task files: `T{ID}-{HHMM}.md` (e.g., `T001-1030.md` = Task 001 at 10:30)
- Easy to find today's work, easy to archive old folders

**Archiving Old Work:**
```bash
# Move completed date folders to archive
mkdir -p .agency/archive/inbox .agency/archive/outbox
mv .agency/inbox/claude/2026-01-* .agency/archive/inbox/claude/
mv .agency/outbox/claude/2026-01-* .agency/archive/outbox/claude/

# Or just delete old folders (they're in git history)
rm -rf .agency/inbox/*/2026-01-*
rm -rf .agency/outbox/*/2026-01-*
```

**Retention Policy:** Keep last 7 days active, archive or delete older.

---

## The Filesystem-First Principle

**Core Rule:** Agents NEVER communicate directly. All coordination happens through files.

### Why Filesystem, Not Chat?

| Problem with Chat | Solution with Files |
|-------------------|---------------------|
| Context window limits | Agents read only what they need |
| Session state lost on restart | Files persist across sessions |
| Can't parallelize | Multiple agents read/write independently |
| No audit trail | Git tracks every change |
| Token waste | No repeating context |

### How Agents Communicate

```
┌─────────────┐     writes to      ┌──────────────────────────────┐
│   Cursor    │ ─────────────────► │  inbox/claude/2026-01-31/    │
│(Orchestrator)│                    │  T001-1030.md                │
└─────────────┘                    └──────────────────────────────┘
                                           │
                                           │ Claude reads
                                           ▼
                                   ┌─────────────────┐
                                   │  Claude Code    │
                                   │   (Builder)     │
                                   └─────────────────┘
                                           │
                                           │ writes to
                                           ▼
┌─────────────┐     reads from     ┌──────────────────────────────┐
│   Cursor    │ ◄───────────────── │  outbox/claude/2026-01-31/   │
│(Orchestrator)│                    │  T001-1045.md                │
└─────────────┘                    └──────────────────────────────┘
```

### Agent Workflow (No Session Dependency)

1. **Agent starts** → Checks its `inbox/` folder
2. **Finds task file** → Reads assignment, reads relevant source files
3. **Does work** → Implements, tests, etc.
4. **Writes report** → Creates file in `outbox/` folder
5. **Agent exits** → No state to preserve

**Key insight:** Each agent run is stateless. All context comes from files.

### Access Pattern
- Agents read specific files based on task needs
- Agents write updates immediately after changes
- No agent maintains separate state
- Cursor is the only agent that can mark tasks DONE
- Agents poll their inbox or are triggered externally

---

### 3. Agent Layer

#### 3.1 Claude Code (Specialist Builder)

**Role:** Code Implementation Specialist

**Best For:**
- Small, explicit tasks
- Tight file boundaries
- Code refactoring
- Unit test creation
- Bug fixes
- Migrations

**Inputs:**
- Task from TASK_BOARD.md
- Files in scope
- Acceptance criteria
- Commands to run

**Outputs:**
- Code changes
- Unit tests
- Execution report:
  - Files modified
  - Commands run
  - Test results
  - Risks identified

**Limitations:**
- Struggles with vague tasks
- Context window limits for large files
- Cannot do repo-wide analysis

---

#### 3.2 Gemini CLI (Architect / Auditor)

**Role:** Risk Detection & Analysis Engine

**Best For:**
- Repo-scale scanning
- Dependency analysis
- Ripple effect detection
- Risk identification
- Log digestion
- Large file analysis

**Inputs:**
- Entire codebase (via scanning)
- package.json / dependencies
- Git diffs
- Specific files for analysis

**Outputs:**
- Updated RISKS.md
- Updated KNOWLEDGE.md
- Dependency notes
- Test surface recommendations
- Regression risk areas

**Never Does:**
- Direct code implementation
- Task execution
- Merge decisions

**Integration:**
- Called via `.agency/tools/gemini-risk-analyzer.sh`
- Runs on-demand or scheduled
- Outputs saved to `.agency/LOGS/`

---

#### 3.3 OpenAI Codex (Alternative Builder)

**Role:** High-Precision Patcher / Tool-First Agent

**Best For:**
- Targeted diffs
- Test scaffolding
- Refactor slices
- When Claude gets stuck
- Tool-first workflows
- Broad test coverage

**Inputs:**
- Task from TASK_BOARD.md
- Specific patch requirements
- Test templates

**Outputs:**
- Precise patches
- Test scaffolds
- Execution report

**Use Cases:**
- Claude is unavailable
- Need surgical precision
- Tool-calling workflows
- Parallel execution with Claude

---

#### 3.4 Kilo Code (Multi-Agent Manager)

**Role:** Parallel Execution Coordinator

**Best For:**
- Running multiple agents in parallel
- Git worktree management
- Coordinating independent tasks
- PR-like output generation

**Architecture:**
```
Main Repo
├── worktree-T001/ (Claude working on Task 1)
├── worktree-T002/ (Codex working on Task 2)
└── worktree-T003/ (Claude working on Task 3)
```

**Workflow:**
1. Kilo creates isolated worktrees
2. Assigns tasks to agents in each worktree
3. Agents work independently
4. Kilo collects outputs as patches
5. Cursor merges sequentially

**Benefits:**
- True parallelism
- No merge conflicts during work
- Clean isolation
- Easy rollback

---

#### 3.5 Playwright (Reality Checker)

**Role:** Ground-Truth Verification

**Best For:**
- E2E user flow testing
- Visual regression detection
- Browser behavior verification
- Reality checks

**Outputs:**
- Test pass/fail status
- Traces (for debugging)
- Screenshots (for visual verification)
- Console logs
- Network logs
- Performance metrics

**Non-Negotiable Principle:**
> "Done" only happens when real flows pass.

**Integration:**
- Runs after every build
- Results written to STATE.md
- Traces saved to .agency/LOGS/
- Failures trigger self-healing loop

---

## Operating Protocol (The Self-Healing Loop)

### State Machine

```
┌─────────────┐
│   INTAKE    │  User request arrives
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  DECOMPOSE  │  Cursor breaks into atomic tasks
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   ANALYZE   │  Gemini identifies risks
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   ASSIGN    │  Cursor assigns to builders
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    BUILD    │  Claude/Codex implements
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   VERIFY    │  CI + Playwright test
└──────┬──────┘
       │
       ├─ PASS ──────────────┐
       │                     ▼
       │              ┌─────────────┐
       │              │    CLOSE    │
       │              └─────────────┘
       │
       └─ FAIL ──────────────┐
                             ▼
                      ┌─────────────┐
                      │    HEAL     │  Loop back to BUILD
                      └─────────────┘
```

### Detailed Flow

#### Phase 1: Intake
1. User provides work request
2. Cursor analyzes scope and complexity
3. Cursor checks MASTER_PLAN.md for alignment

#### Phase 2: Decompose
1. Cursor breaks request into atomic tasks
2. Each task gets:
   - Clear scope
   - File boundaries
   - Acceptance criteria
   - Definition of Done
3. Tasks written to TASK_BOARD.md

#### Phase 3: Analyze
1. Cursor assigns Gemini to analyze
2. Gemini scans:
   - Affected files
   - Dependencies
   - Ripple effects
   - Regression risks
3. Gemini updates:
   - RISKS.md
   - KNOWLEDGE.md

#### Phase 4: Assign
1. Cursor reviews risks
2. Cursor selects appropriate builder:
   - Claude for standard implementation
   - Codex for precision patches
   - Kilo for parallel execution
3. Cursor updates TASK_BOARD.md with assignment

#### Phase 5: Build
1. Builder reads task from TASK_BOARD.md
2. Builder implements changes
3. Builder runs specified commands
4. Builder produces execution report
5. Builder updates TASK_BOARD.md status

#### Phase 6: Verify
1. CI runs automated tests
2. Playwright runs E2E flows
3. Results written to STATE.md
4. If FAIL → Phase 7 (Heal)
5. If PASS → Phase 8 (Close)

#### Phase 7: Heal (Self-Healing Loop)
1. Builder reads failure logs from .agency/LOGS/
2. Builder identifies root cause
3. Builder patches
4. Builder re-runs tests
5. Loop until PASS or max retries

#### Phase 8: Close
1. Cursor verifies:
   - All acceptance criteria met
   - All DoD items checked
   - STATE.md shows PASS
   - No critical risks open
2. Cursor marks task DONE
3. Cursor archives task in TASK_BOARD.md

---

## Quality Gates

### Gate 1: Pre-Assignment
**Enforced by:** Cursor
**Checks:**
- Task is atomic
- Scope is clear
- Files are explicit
- Acceptance criteria are testable
- DoD is complete

### Gate 2: Pre-Execution
**Enforced by:** Builder
**Checks:**
- All dependencies resolved
- No blocking risks
- Agent has all required context

### Gate 3: Post-Execution
**Enforced by:** CI/CD
**Checks:**
- All commands ran successfully
- Execution report is complete
- No new critical risks introduced

### Gate 4: Pre-Closure
**Enforced by:** Cursor
**Checks:**
- All acceptance criteria met
- All DoD items checked
- STATE.md shows PASS
- No critical risks open
- Playwright flows pass

---

## Parallelization Strategy

### Pattern A: Git Branches (Simple)
```bash
# Sequential execution
git checkout -b task/T001
# Claude works on T001
git checkout main
git merge task/T001

git checkout -b task/T002
# Claude works on T002
git checkout main
git merge task/T002
```

**Pros:** Simple, familiar
**Cons:** Sequential, slower

### Pattern B: Git Worktrees (High Parallel)
```bash
# Parallel execution
git worktree add ../worktree-T001 -b task/T001
git worktree add ../worktree-T002 -b task/T002
git worktree add ../worktree-T003 -b task/T003

# Claude works in worktree-T001
# Codex works in worktree-T002
# Claude works in worktree-T003

# All work in parallel, no conflicts

# Cursor merges sequentially
cd main-repo
git merge task/T001
git merge task/T002
git merge task/T003
```

**Pros:** True parallelism, clean isolation
**Cons:** More complex setup

**Kilo Code Support:**
Kilo Code natively supports worktree-based parallelism and can coordinate multiple agents automatically.

---

## Cost Model (CWU → ED → Time/Cost)

### Code Work Units (CWU)

**Formula:**
```
CWU_module = w_E·E + w_P·P + w_U·U + w_F·F + w_X·X + w_R·R + w_T·T
```

**Where:**
- E = Entity/data complexity
- P = Process/workflow complexity
- U = UI/UX surface
- F = Feature logic complexity
- X = External integrations
- R = Risk/compliance/security
- T = Testing depth

**Default Weights:**
- w_E = 1.0
- w_P = 1.2
- w_U = 0.8
- w_F = 1.3
- w_X = 1.5
- w_R = 1.6
- w_T = 1.0

### Engineering Days (ED)

**Formula:**
```
ED = CWU / K
```

**Where K = productivity constant:**
- K_manual = 50-100 (human-only)
- K_cursor = 200-400 (Cursor-only)
- K_factory = 600-3500 (Multi-agent factory)

**Calibration:**
Track P10/P50/P90 values from real projects.

### Calendar Time

**Formula:**
```
MachineDays = (ED × 8) / 14
CalendarDays = MachineDays × q / Speedup
```

**Where:**
- 14 = machine hours per day
- q = rework factor (1.15-1.35)
- Speedup = Amdahl's Law parallel speedup

### Cost

**Subscription Model:**
```
Cost = Σ (N_tool × Price_tool)
N_tool = ⌈CalendarDays / d_tool⌉
```

**Where:**
- N_tool = number of accounts needed
- d_tool = effective days per account
- Price_tool = subscription price

---

## Engineering Constitution (Non-Negotiable Rules)

1. **Single source of truth = files**, not chat
2. **Atomic tasks only** (small boundaries)
3. **DoD is hard-gated** (tests + e2e)
4. **No large refactors without explicit task**
5. **Every agent report is short & structured**
6. **Risk ledger is mandatory** (RISKS.md never lies)
7. **Parallelism uses isolation** (branches/worktrees)
8. **Reality checks beat arguments** (Playwright > discussion)

---

## Metrics & Monitoring

### Task Metrics
- Task throughput (tasks/day)
- Task cycle time (TODO → DONE)
- Rework rate (failed verifications)
- DoD compliance rate

### Quality Metrics
- Test pass rate
- Code coverage
- Linter error rate
- Type error rate
- Security vulnerability count

### Risk Metrics
- Open risks by severity
- Risk materialization rate
- Time to risk resolution
- Blocker count

### Agent Metrics
- Agent utilization
- Agent success rate
- Average task completion time per agent
- Agent error rate

### System Metrics
- Build success rate
- Deployment frequency
- Mean time to recovery (MTTR)
- Change failure rate

---

## Failure Modes & Recovery

### Failure Mode 1: Task Fails Verification
**Symptoms:** STATE.md shows FAIL
**Recovery:**
1. Builder reads failure logs
2. Builder patches
3. Builder re-runs
4. Loop until PASS or max retries
5. If max retries → escalate to Cursor

### Failure Mode 2: Risk Materializes
**Symptoms:** Expected behavior breaks
**Recovery:**
1. Update RISKS.md with actual impact
2. Create remediation task (high priority)
3. Assign to appropriate builder
4. Update affected tasks

### Failure Mode 3: Agent Gets Stuck
**Symptoms:** No progress after N attempts
**Recovery:**
1. Cursor reassigns to different agent
2. Or: Cursor decomposes into smaller tasks
3. Or: Cursor marks as blocked, creates blocker in RISKS.md

### Failure Mode 4: Merge Conflict
**Symptoms:** Git merge fails
**Recovery:**
1. Cursor reviews both branches
2. Cursor resolves conflicts manually
3. Cursor re-runs full test suite
4. If tests fail → create fix task

### Failure Mode 5: Critical Bug in Production
**Symptoms:** Production incident
**Recovery:**
1. Create emergency fix task (critical priority)
2. Bypass normal flow (with documentation)
3. Fix and deploy
4. Create technical debt task for proper fix
5. Update RISKS.md with lessons learned

---

## Scaling Considerations

### Horizontal Scaling (More Agents)
- Add more builder accounts (Claude/Codex)
- Use Kilo Code for coordination
- Increase worktree parallelism
- Monitor merge bottleneck

### Vertical Scaling (Bigger Tasks)
- Increase CWU weights for complex domains
- Adjust K values based on calibration
- Add more specialized agents
- Enhance risk detection

### Team Scaling (Multiple Orchestrators)
- Partition TASK_BOARD.md by module
- Each Cursor owns a module
- Cross-module tasks require coordination
- Shared RISKS.md and KNOWLEDGE.md

---

## Security & Compliance

### Secrets Management
- No secrets in code
- Use environment variables
- Rotate secrets regularly
- Audit secret access

### Data Protection
- PII handling documented in KNOWLEDGE.md
- Encryption at rest and in transit
- Access controls enforced
- Audit logs maintained

### Compliance
- HIPAA/GDPR requirements in RISKS.md
- Compliance checks in DoD
- Regular audits
- Documentation maintained

---

## Future Enhancements

### Planned
- [ ] Automated CWU estimation from task descriptions
- [ ] Real-time risk detection during coding
- [ ] Predictive test failure analysis
- [ ] Automated merge conflict resolution
- [ ] Multi-repo coordination
- [ ] Cost optimization engine

### Under Consideration
- [ ] Natural language task creation
- [ ] Visual task board UI
- [ ] Real-time collaboration dashboard
- [ ] Agent performance benchmarking
- [ ] Automated calibration system

---

## References

### Internal Documents
- [TASK_ASSIGNMENT.md](.agency/protocols/TASK_ASSIGNMENT.md)
- [DOD_CHECKLIST.md](.agency/protocols/DOD_CHECKLIST.md)
- [MASTER_PLAN.md](.agency/MASTER_PLAN.md)
- [TASK_BOARD.md](.agency/TASK_BOARD.md)
- [STATE.md](.agency/STATE.md)
- [KNOWLEDGE.md](.agency/KNOWLEDGE.md)
- [RISKS.md](.agency/RISKS.md)

### External Resources
- [Kilo Code](https://kilo.ai/)
- [Kilo Code VSCode Extension](https://marketplace.visualstudio.com/items?itemName=kilocode.Kilo-Code)
- [Playwright Documentation](https://playwright.dev/)
- [Amdahl's Law](https://en.wikipedia.org/wiki/Amdahl%27s_law)

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-30 | Initial architecture document | System |

---

## Quick Start Guide

### For New Projects

1. **Initialize Structure**
   ```bash
   mkdir -p .agency/{LOGS,protocols,tools}
   ```

2. **Create Blackboard Files**
   - Copy templates from this repo
   - Fill in MASTER_PLAN.md with project goals

3. **Configure Agents**
   - Set up Claude Code access
   - Install Gemini CLI
   - Configure Playwright
   - (Optional) Set up Kilo Code

4. **Create First Task**
   - Cursor creates task in TASK_BOARD.md
   - Gemini analyzes risks
   - Builder implements
   - Playwright verifies

5. **Iterate**
   - Follow the self-healing loop
   - Update blackboard files
   - Track metrics
   - Improve continuously

### For Existing Projects

1. **Audit Current State**
   - Run Gemini risk analyzer
   - Document in RISKS.md and KNOWLEDGE.md

2. **Decompose Backlog**
   - Break existing work into atomic tasks
   - Populate TASK_BOARD.md

3. **Establish Baseline**
   - Run full test suite
   - Document in STATE.md
   - Capture current metrics

4. **Gradual Adoption**
   - Start with new features
   - Migrate existing work incrementally
   - Refine protocols based on learnings

---

**End of Architecture Document**
