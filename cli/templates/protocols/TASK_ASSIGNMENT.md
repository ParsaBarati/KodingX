# Task Assignment Protocol

**Version:** 1.0
**Last Updated:** YYYY-MM-DD

---

## Purpose

This protocol defines how tasks are created, assigned, and executed in the Autonomous Software Factory. It ensures deterministic, traceable, and efficient work distribution across AI agents.

---

## Roles & Responsibilities

### Cursor (Orchestrator)
- **Primary Role:** Task decomposition, assignment, quality gates, merge strategy
- **Never:** Implement large changes directly
- **Inputs:** TASK_BOARD.md, STATE.md, RISKS.md, test results
- **Outputs:** Task creation/updates, assignments, final "Done" adjudication

### Claude Code (Specialist Builder)
- **Primary Role:** Code implementation, refactoring, unit tests, migrations, fixes
- **Best For:** Small, explicit tasks with tight file boundaries
- **Outputs:** Code changes, unit tests, execution report

### Gemini CLI (Architect/Auditor)
- **Primary Role:** Repo-scale scanning, dependency analysis, risk detection
- **Not For:** Direct code implementation
- **Outputs:** RISKS.md updates, KNOWLEDGE.md updates, test surface recommendations

### OpenAI Codex (Alternative Builder)
- **Primary Role:** High-precision patching, tool-first workflows, test scaffolding
- **Use When:** Claude gets stuck, need targeted diffs, broad test coverage
- **Outputs:** Patches, test scaffolds, refactor slices

### Kilo Code (Multi-Agent Manager)
- **Primary Role:** Parallel agent coordination via git worktrees
- **Use For:** Parallel execution, multi-agent harness
- **Outputs:** PR-like chunks from parallel agents

### Playwright (Reality Checker)
- **Primary Role:** Ground-truth verification of user workflows
- **Outputs:** Traces, screenshots, failure logs

---

## Task Creation Contract

Every task MUST include:

### 1. Task Metadata
```markdown
**Task ID:** T###
**Status:** 🔵 TODO | 🟡 IN PROGRESS | 🟢 DONE | 🔴 BLOCKED
**Assigned To:** [Agent/Tool Name]
**Priority:** High | Medium | Low
**Created:** YYYY-MM-DD
```

### 2. Scope Definition
```markdown
**Scope:**
Clear, atomic description of what needs to be done.
Must be completable in one focused session.
```

### 3. File Boundaries
```markdown
**Files in Scope:**
- `path/to/file1.ts`
- `path/to/file2.ts`
```

### 4. Acceptance Criteria
```markdown
**Acceptance Criteria:**
- [ ] Specific, testable criterion 1
- [ ] Specific, testable criterion 2
- [ ] Specific, testable criterion 3
```

### 5. Definition of Done
```markdown
**Definition of Done:**
- [ ] Code implemented
- [ ] Unit tests pass
- [ ] Integration tests pass (if applicable)
- [ ] E2E tests pass (if applicable)
- [ ] No linter errors
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] Code reviewed
```

### 6. Execution Commands
```markdown
**Commands to Run:**
```bash
npm test
npm run lint
npm run typecheck
```
```

### 7. Expected Artifacts
```markdown
**Expected Artifacts:**
- Diff summary
- Test output summary
- Updated risks (if any)
```

### 8. Dependencies
```markdown
**Dependencies:**
- Depends on: [Task IDs]
- Blocks: [Task IDs]
```

### 9. Out of Scope
```markdown
**Out of Scope:**
Explicitly state what is NOT included to prevent scope creep.
```

---

## Assignment Rules

### Rule 1: Atomic Tasks Only
- Tasks must be completable in one focused session
- If a task requires >3 files or >200 lines of changes, decompose it
- Each task should have a single, clear objective

### Rule 2: Explicit Boundaries
- File scope must be explicit
- No "and related files" or vague boundaries
- If ripple effects are expected, create separate tasks

### Rule 3: Agent Selection Criteria

**Assign to Claude Code when:**
- Task is well-defined and scoped
- Requires code implementation or refactoring
- File boundaries are clear
- Unit tests are needed

**Assign to Gemini when:**
- Need repo-wide analysis
- Dependency impact assessment required
- Risk identification needed
- Large-scale scanning required

**Assign to Codex when:**
- Claude is stuck or unavailable
- Need high-precision patches
- Test scaffolding required
- Tool-first workflow needed

**Assign to Kilo Code when:**
- Multiple independent tasks can run in parallel
- Need worktree-based isolation
- Coordinating multiple agents

### Rule 4: No Chat Sprawl
- All task information must be in TASK_BOARD.md
- Agents read only what's needed from blackboard files
- No synchronization via chat history

### Rule 5: Single Source of Truth
- TASK_BOARD.md is the canonical task state
- STATE.md is the canonical build/test state
- RISKS.md is the canonical risk state
- Agents never maintain separate state

---

## Task Lifecycle

### Phase 1: Intake
1. Cursor receives work request
2. Cursor analyzes scope and complexity
3. Cursor decomposes into atomic tasks
4. Cursor writes tasks to TASK_BOARD.md

### Phase 2: Risk Analysis
1. Cursor assigns Gemini to analyze
2. Gemini scans repo and identifies:
   - Ripple effects
   - Regression risks
   - Dependency constraints
3. Gemini updates RISKS.md and KNOWLEDGE.md

### Phase 3: Assignment
1. Cursor reviews risks
2. Cursor assigns tasks to appropriate builders
3. Cursor updates TASK_BOARD.md with assignments

### Phase 4: Execution
1. Builder reads task from TASK_BOARD.md
2. Builder implements changes
3. Builder runs specified commands
4. Builder produces execution report
5. Builder updates TASK_BOARD.md status

### Phase 5: Verification
1. CI runs automated tests
2. Playwright runs E2E flows
3. Results written to STATE.md
4. If FAIL → loop back to Phase 4 (heal)
5. If PASS → proceed to Phase 6

### Phase 6: Closure
1. Cursor reviews:
   - All acceptance criteria met
   - All DoD items checked
   - No critical risks open
   - STATE.md shows PASS
2. Cursor marks task DONE
3. Cursor archives task in TASK_BOARD.md

---

## Execution Report Format

Every builder must produce a structured report:

```markdown
### Execution Report: Task T###
**Agent:** [Agent Name]
**Completed:** YYYY-MM-DD HH:MM:SS

**Files Modified:**
- `path/to/file1.ts` (+50 / -20 lines)
- `path/to/file2.ts` (+10 / -5 lines)

**Commands Run:**
```bash
npm test
npm run lint
```

**Test Results:**
- Unit Tests: ✅ PASS (25/25)
- Linter: ✅ PASS (0 errors)
- Type Check: ✅ PASS (0 errors)

**Risks Identified:**
- None

**Notes:**
- Brief notes on implementation decisions
```

---

## Parallel Execution (Worktree Pattern)

When using Kilo Code or manual worktrees:

### Setup
```bash
# Create worktree for task
git worktree add ../worktree-T001 -b task/T001

# Agent works in isolation
cd ../worktree-T001
# ... make changes ...

# Produce PR-like output
git diff main > task-T001.patch
```

### Merge Strategy
1. Cursor reviews all parallel outputs
2. Cursor resolves conflicts
3. Cursor merges sequentially
4. Cursor runs full test suite after each merge

---

## Quality Gates

### Gate 1: Pre-Assignment
- [ ] Task is atomic
- [ ] Scope is clear
- [ ] Files are explicit
- [ ] Acceptance criteria are testable
- [ ] DoD is complete

### Gate 2: Pre-Execution
- [ ] All dependencies resolved
- [ ] No blocking risks
- [ ] Agent has all required context

### Gate 3: Post-Execution
- [ ] All commands ran successfully
- [ ] Execution report is complete
- [ ] No new critical risks introduced

### Gate 4: Pre-Closure
- [ ] All acceptance criteria met
- [ ] All DoD items checked
- [ ] STATE.md shows PASS
- [ ] No critical risks open
- [ ] Playwright flows pass

---

## Error Handling

### When a Task Fails
1. Builder updates STATE.md with failure details
2. Builder logs error output to .agency/LOGS/
3. Cursor reviews failure
4. Cursor decides:
   - **Retry:** Same agent, same task
   - **Reassign:** Different agent
   - **Decompose:** Break into smaller tasks
   - **Block:** Mark as blocked, create blocker in RISKS.md

### When a Risk Materializes
1. Update RISKS.md with actual impact
2. Create remediation task
3. Assign high priority
4. Update affected tasks

### When Tests Fail
1. Playwright saves trace and screenshots
2. Builder reads only relevant logs
3. Builder patches
4. Builder re-runs
5. Loop until PASS

---

## Metrics & Monitoring

Track these metrics in STATE.md:

- **Task Throughput:** Tasks completed per day
- **Task Cycle Time:** Time from TODO to DONE
- **Rework Rate:** Tasks that failed verification
- **Risk Materialization Rate:** Risks that became issues
- **Test Pass Rate:** Percentage of tests passing
- **Agent Utilization:** Time each agent is active

---

## Best Practices

### DO
✅ Keep tasks atomic and focused
✅ Make file boundaries explicit
✅ Write testable acceptance criteria
✅ Update blackboard files immediately
✅ Run tests after every change
✅ Document risks as soon as identified
✅ Use Playwright for reality checks

### DON'T
❌ Create vague or large tasks
❌ Allow scope creep
❌ Skip quality gates
❌ Synchronize via chat
❌ Assume test results without verification
❌ Ignore risks
❌ Mark tasks DONE without DoD verification

---

## Example Task

```markdown
### Task ID: T042
**Status:** 🟡 IN PROGRESS
**Assigned To:** Claude Code
**Priority:** High
**Created:** 2026-01-30

**Scope:**
Add input validation to user registration endpoint. Validate email format, password strength, and username uniqueness.

**Files in Scope:**
- `src/api/auth/register.ts`
- `src/validators/user.validator.ts`
- `tests/api/auth/register.test.ts`

**Acceptance Criteria:**
- [ ] Email validation rejects invalid formats
- [ ] Password validation enforces 8+ chars, 1 uppercase, 1 number
- [ ] Username uniqueness check queries database
- [ ] All validation errors return 400 with clear messages
- [ ] Unit tests cover all validation paths

**Definition of Done:**
- [ ] Code implemented
- [ ] Unit tests pass (100% coverage for validators)
- [ ] Integration tests pass
- [ ] No linter errors
- [ ] Type checking passes
- [ ] API documentation updated

**Commands to Run:**
```bash
npm test -- register
npm run lint
npm run typecheck
```

**Expected Artifacts:**
- Diff summary
- Test output (expect 15+ new tests)
- No new risks

**Dependencies:**
- None

**Out of Scope:**
- Email verification flow (separate task)
- Password reset (separate task)
- OAuth integration (separate task)

**Notes:**
Use existing validator patterns from `src/validators/common.ts`
```

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-30 | Initial protocol | System |
