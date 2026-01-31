# Definition of Done (DoD) Checklist

**Version:** 1.0
**Last Updated:** YYYY-MM-DD

---

## Purpose

This checklist defines the non-negotiable criteria that must be met before any task can be marked as DONE. It serves as the quality gate for the Autonomous Software Factory.

---

## Universal DoD (Applies to ALL Tasks)

### Code Quality
- [ ] **Code implemented** - All acceptance criteria met
- [ ] **No syntax errors** - Code parses successfully
- [ ] **No linter errors** - Linter passes with 0 errors
- [ ] **No linter warnings** (for critical paths)
- [ ] **Type checking passes** - TypeScript/Flow/etc. shows 0 errors
- [ ] **Code follows project conventions** - Matches KNOWLEDGE.md standards
- [ ] **No commented-out code** - Remove dead code
- [ ] **No debug statements** - Remove console.logs, debuggers, etc.
- [ ] **No hardcoded values** - Use constants/config
- [ ] **Error handling present** - All error paths handled

### Testing
- [ ] **Unit tests written** - For all new functions/methods
- [ ] **Unit tests pass** - 100% pass rate
- [ ] **Integration tests pass** (if applicable)
- [ ] **E2E tests pass** (if applicable)
- [ ] **Test coverage meets threshold** - Per project standards
- [ ] **Edge cases tested** - Boundary conditions covered
- [ ] **Error paths tested** - Failure scenarios covered
- [ ] **No flaky tests** - Tests are deterministic

### Documentation
- [ ] **Code comments added** - For complex logic
- [ ] **API documentation updated** - If public APIs changed
- [ ] **README updated** - If user-facing changes
- [ ] **CHANGELOG updated** - If versioned release
- [ ] **KNOWLEDGE.md updated** - If new patterns/conventions

### Version Control
- [ ] **Commits are atomic** - One logical change per commit
- [ ] **Commit messages are clear** - Follow conventional commits
- [ ] **No merge conflicts** - Clean merge to target branch
- [ ] **Branch is up to date** - Rebased on latest main/develop

### Security & Compliance
- [ ] **No secrets in code** - API keys, passwords externalized
- [ ] **No PII exposure** - Personal data properly handled
- [ ] **Security scan passes** - No critical vulnerabilities
- [ ] **Compliance requirements met** - HIPAA/GDPR/etc. if applicable

### Performance
- [ ] **No performance regressions** - Benchmarks maintained
- [ ] **No memory leaks** - Memory profiling clean
- [ ] **No N+1 queries** - Database queries optimized
- [ ] **Bundle size acceptable** - If frontend changes

### Risk Management
- [ ] **RISKS.md reviewed** - No new critical risks
- [ ] **Existing risks addressed** - Related risks mitigated
- [ ] **Ripple effects assessed** - Impact on other components known

---

## Task-Specific DoD Extensions

### For Feature Implementation
- [ ] **Feature flag added** (if applicable)
- [ ] **Analytics/logging added** (if applicable)
- [ ] **User documentation written**
- [ ] **Demo/screenshots prepared**
- [ ] **Accessibility requirements met** (WCAG 2.1 AA)
- [ ] **Mobile responsiveness verified** (if UI)
- [ ] **Cross-browser testing done** (if UI)

### For Bug Fixes
- [ ] **Root cause identified** - Documented in task notes
- [ ] **Regression test added** - Prevents recurrence
- [ ] **Related bugs checked** - No similar issues exist
- [ ] **Fix verified in production-like environment**

### For Refactoring
- [ ] **Behavior unchanged** - No functional changes
- [ ] **All existing tests still pass**
- [ ] **Code complexity reduced** - Measurable improvement
- [ ] **No new dependencies added** (unless justified)

### For Database Changes
- [ ] **Migration script written**
- [ ] **Migration tested** - Up and down migrations work
- [ ] **Rollback plan documented**
- [ ] **Data integrity verified**
- [ ] **Indexes added** (if needed for performance)
- [ ] **Backup taken** (for production)

### For API Changes
- [ ] **API contract documented** - OpenAPI/Swagger
- [ ] **Backward compatibility maintained** (or version bumped)
- [ ] **Rate limiting considered**
- [ ] **Authentication/authorization verified**
- [ ] **Input validation comprehensive**
- [ ] **Error responses standardized**

### For Infrastructure Changes
- [ ] **Infrastructure as Code updated** - Terraform/CloudFormation
- [ ] **Environment variables documented**
- [ ] **Secrets rotated** (if applicable)
- [ ] **Monitoring/alerting configured**
- [ ] **Disaster recovery tested**
- [ ] **Cost impact assessed**

### For Third-Party Integrations
- [ ] **API credentials secured**
- [ ] **Rate limits understood**
- [ ] **Error handling for API failures**
- [ ] **Webhook signatures verified** (if applicable)
- [ ] **Retry logic implemented**
- [ ] **Circuit breaker pattern** (if critical)

---

## Reality Check (Playwright Verification)

### Critical User Flows
- [ ] **Login flow passes**
- [ ] **Registration flow passes**
- [ ] **Core feature flow passes**
- [ ] **Payment flow passes** (if applicable)
- [ ] **Data submission flow passes**

### Visual Verification
- [ ] **Screenshots captured** - For visual regression
- [ ] **No layout breaks** - UI renders correctly
- [ ] **No console errors** - Browser console clean
- [ ] **No network errors** - All API calls succeed

### Trace Analysis
- [ ] **Playwright trace saved** - For debugging if needed
- [ ] **Performance metrics acceptable** - Page load times
- [ ] **No accessibility violations** - Axe scan passes

---

## Pre-Closure Verification (Cursor's Responsibility)

Before marking any task DONE, Cursor must verify:

### 1. Acceptance Criteria
- [ ] **All criteria met** - Every checkbox in task is checked
- [ ] **No scope creep** - Only what was specified was done

### 2. State Verification
- [ ] **STATE.md shows PASS** - All tests passing
- [ ] **No active failures** - Build is green
- [ ] **No blockers** - Nothing preventing deployment

### 3. Risk Verification
- [ ] **RISKS.md reviewed** - No new critical risks
- [ ] **Open risks addressed** - Related risks mitigated or accepted

### 4. Artifact Verification
- [ ] **Execution report complete** - Builder provided all artifacts
- [ ] **Diff summary reviewed** - Changes are as expected
- [ ] **Test output reviewed** - Coverage is adequate

### 5. Integration Verification
- [ ] **No breaking changes** - Dependent code still works
- [ ] **No regression** - Existing features unaffected
- [ ] **Merge is clean** - No conflicts

---

## DoD Enforcement Rules

### Rule 1: No Exceptions
- DoD is non-negotiable
- If a criterion cannot be met, the task is not DONE
- If a criterion is not applicable, it must be explicitly marked N/A with justification

### Rule 2: Automated Enforcement
- CI/CD pipeline enforces automated checks
- Manual checks are documented in task notes
- Failed checks block task closure

### Rule 3: Continuous Improvement
- DoD is reviewed quarterly
- New failure patterns trigger DoD updates
- Team feedback incorporated

### Rule 4: Visibility
- DoD status is visible in TASK_BOARD.md
- Incomplete DoD items are highlighted
- Cursor cannot mark DONE until all items checked

---

## DoD Templates by Task Type

### Template: Feature Task
```markdown
**Definition of Done:**
- [ ] Code implemented
- [ ] Unit tests pass (coverage ≥ 80%)
- [ ] Integration tests pass
- [ ] E2E tests pass (critical flows)
- [ ] No linter errors
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Feature flag added
- [ ] Analytics added
- [ ] Accessibility verified (WCAG 2.1 AA)
- [ ] Mobile responsive
- [ ] Cross-browser tested (Chrome, Firefox, Safari)
- [ ] No new critical risks
- [ ] STATE.md shows PASS
```

### Template: Bug Fix Task
```markdown
**Definition of Done:**
- [ ] Root cause identified and documented
- [ ] Fix implemented
- [ ] Regression test added
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] No linter errors
- [ ] Type checking passes
- [ ] Fix verified in staging
- [ ] Related bugs checked
- [ ] No new risks introduced
- [ ] STATE.md shows PASS
```

### Template: Refactoring Task
```markdown
**Definition of Done:**
- [ ] Refactoring complete
- [ ] Behavior unchanged (verified by tests)
- [ ] All existing tests pass
- [ ] Code complexity reduced (measurable)
- [ ] No new dependencies
- [ ] No linter errors
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] Performance maintained or improved
- [ ] STATE.md shows PASS
```

### Template: Infrastructure Task
```markdown
**Definition of Done:**
- [ ] Infrastructure changes implemented
- [ ] IaC updated (Terraform/CloudFormation)
- [ ] Environment variables documented
- [ ] Secrets secured
- [ ] Monitoring configured
- [ ] Alerting configured
- [ ] Disaster recovery tested
- [ ] Cost impact assessed
- [ ] Rollback plan documented
- [ ] Changes verified in staging
- [ ] STATE.md shows PASS
```

---

## DoD Metrics

Track these metrics to improve DoD compliance:

| Metric | Target | Current |
|--------|--------|---------|
| Tasks passing DoD first time | ≥ 90% | - |
| Average DoD completion time | ≤ 2 hours | - |
| DoD violations per sprint | ≤ 2 | - |
| Rework due to incomplete DoD | ≤ 5% | - |
| Critical bugs from incomplete DoD | 0 | - |

---

## DoD Failure Handling

### When DoD Cannot Be Met
1. **Document the blocker** - Add to RISKS.md
2. **Create remediation task** - Address the blocker
3. **Update task status** - Mark as BLOCKED
4. **Notify stakeholders** - If timeline impact

### When DoD Is Partially Met
1. **Do NOT mark as DONE** - Task remains IN PROGRESS
2. **Update task notes** - Document what's complete
3. **Create follow-up tasks** - For remaining items
4. **Re-estimate completion** - Update timeline

### When DoD Is Bypassed (Emergency Only)
1. **Document the exception** - In task notes and RISKS.md
2. **Create technical debt task** - To address later
3. **Get explicit approval** - From project lead
4. **Set deadline for remediation** - No more than 1 sprint

---

## Quick Reference Card

**Before marking any task DONE, ask:**

1. ✅ Does the code work? (Tests pass)
2. ✅ Is the code clean? (Linter, types, conventions)
3. ✅ Is the code tested? (Unit, integration, E2E)
4. ✅ Is the code documented? (Comments, API docs, README)
5. ✅ Is the code safe? (No secrets, security scan)
6. ✅ Is the code fast? (No performance regression)
7. ✅ Is the code integrated? (No breaking changes)
8. ✅ Is the code verified? (Playwright flows pass)
9. ✅ Are risks addressed? (RISKS.md reviewed)
10. ✅ Is STATE.md green? (All checks pass)

**If any answer is NO → Task is NOT DONE**

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-30 | Initial DoD checklist | System |
