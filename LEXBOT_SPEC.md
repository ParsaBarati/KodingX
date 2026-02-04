# Lexbot Deterministic Orchestration Spec (v1)

## Goal

Build a deterministic, debuggable orchestration layer for multi-agent software work.

Primary input: Telegram polling.

LLM usage is minimal:
- Inside agent CLIs only (codex/claude/gemini/...).
- Optional Groq Selector for routing/classification with tiny context.

All decisions are traceable via an append-only event journal. Lexbot never executes a command that comes from an LLM string. It only builds commands from fixed templates.

## Principles

- Deterministic orchestration and state transitions.
- No hidden decisions: every action writes to the journal.
- Locks and policies enforce safe, repeatable parallelism.
- LLM only for agents and optional selector.
- Risky actions require explicit approval files.
- Filesystem is the system API.

## Modules

1) Telegram Ingress (Polling)
- Reads messages, checks allowlist, converts to TaskDraft.
- No LLM required.

2) Task Normalizer (Deterministic)
- Extracts keywords, path hints, and risk signals.
- Produces task.json and task.md drafts.
- Calls Groq Selector only if confidence is low or mode is safe.

3) Groq Selector (Tiny Context)
- Routing and classification only.
- Returns task_type, risk_class, pipeline_id, primary_agent, verify/heal preferences.

4) Scheduler + Dispatcher
- Maintains queue, picks runnable tasks, enforces locks and concurrency.
- Spawns agents using fixed command templates.

5) Agent Runner (Subprocess Supervisor)
- Executes agent CLIs, captures stdout/stderr, enforces timeouts.

6) Outbox Watcher + Report Processor
- Validates report schema, updates state, decides verify/heal/close.

7) Approval Gate
- For risky tasks, writes approval request and blocks dispatch until signed.

8) Observability
- Heartbeat file, structured logs, local health endpoint (optional), append-only journal.

## Filesystem Layout (Authoritative)

All runtime state lives under `.kodingx/`.

```
.kodingx/
  state/
    STATE.json            # canonical machine state
    STATE.md              # optional human mirror
    TASK_BOARD.md         # human board
    INDEX.json            # fast task index

  queue/
    incoming/             # raw telegram ingests
    ready/                # normalized, ready to schedule
    running/              # active tasks
    blocked/              # waiting for approval/deps
    done/                 # completed metadata

  inbox/{agent}/{task_id}/
    task.json
    task.md
    context.refs.json     # refs only, no heavy data

  outbox/{task_id}/
    report.json
    report.md
    artifacts/

  agents/
    {agent}.md            # agent guides (optional)

  approval/
    REQ-xxxx.json
    REQ-xxxx.sig

  locks/
    task/{task_id}.lock
    agent/{agent}.lock
    state.lock

  logs/
    lexbot/lexbot.log
    lexbot/telegram.log
    lexbot/groq.log
    agents/{agent}/{task_id}.stdout.log
    agents/{agent}/{task_id}.stderr.log
    agents/{agent}/{task_id}.meta.json

  lexbot/
    heartbeat.json
    config.json
    health.txt
    counters.json
    selector_cache.json
    status.json
    agent_scorecard.json

  journal/
    events.ndjson
```

## Schemas (Canonical)

- Task JSON: `.kodingx/inbox/{agent}/{task_id}/task.json`
- Task MD: `.kodingx/inbox/{agent}/{task_id}/task.md`
- Report JSON: `.kodingx/outbox/{task_id}/report.json`
- Approval Request JSON: `.kodingx/approval/REQ-xxxx.json`

Schemas live in `lexbot/schemas/` and are validated by lexbot before any state transition.

## Task JSON (Summary)

Fields:
- task_id, created_at, source, requestor
- title, description, raw_text_ref
- repo_root, task_type, risk_class, pipeline_id, priority
- constraints (no_destructive_without_approval, max_time_minutes, max_retries)
- inputs (paths_hint, keywords, refs)
- dispatch (primary_agent, verify_agent, heal_agent, concurrency_group)
- status (state, attempt, last_error_signature)

## Report JSON (Summary)

Fields:
- task_id, agent, started_at, ended_at
- status (success|fail|needs_approval|blocked)
- summary, actions_taken, files_changed
- tests_run, test_results
- artifacts, error_signature, next_suggestion, confidence

## Approval Request JSON (Summary)

Fields:
- req_id, task_id, risk_class, reason
- diff_summary_ref, requested_at, requested_by
- approve_instructions, approved_at, approved_by

## Telegram Protocol

Allowlist: static `ADMIN_CHAT_IDS`.

Commands:
- /task
- /status
- /queue
- /pause, /resume
- /approve REQ-xxxx CODE
- /cancel Txxxx
- /logs Txxxx 200
- /set concurrency 4
- /set mode fast|safe
- /doctor
- /goal list
- /goal add P2 <text>
- /goal done <index>

Idempotency:
- `telegram_offset` stored in `.kodingx/lexbot/counters.json`
- dedupe cache in `.kodingx/lexbot/dedupe.json`

## Groq Selector

Input: tiny JSON with task_id, title, text_hint (sanitized), keywords, paths_hint, risk_signals, available_agents, mode, policy_flags.

Output (strict JSON):
- task_type, risk_class, pipeline_id
- primary_agent, verify_agent, heal_agent
- confidence, needs_clarification, clarification_question

Gating rules:
- Call only if heuristics confidence < 0.85, risk signals are sensitive, or mode is safe.
- Otherwise skip for zero LLM cost.

## Pipelines

- code_execute_verify: execute -> verify -> heal
- code_execute_only_fast: execute only, verify on failure or sensitive files
- safe_read_analysis: no apply, report only
- risky_two_phase: propose patch -> approval -> apply -> verify
  - Enforcement: if `safe_read_analysis` and report has `files_changed`, task is blocked.

## Agent Scorecard

`agent_scorecard.json` tracks per-agent success and runtime by task type and domain. Routing prefers agents with higher success rate for the inferred domain.

## Self-Task Mode

Self-tasking is deterministic and gated:

- Source file: `.kodingx/GOAL.md` (unchecked checklist items become candidates)
- Maintenance autopilot (no LLM): tests/lint tasks when idle
- Optional Groq ranking (top 10 candidates) if enabled

Policy controls in config:
- `selfTask.enabled`
- `selfTask.minIdleMinutes`
- `selfTask.maxPerDay`
- `selfTask.allowPipelines`

## Scheduler and Locks

- globalMaxConcurrency + perAgentMaxConcurrency.
- concurrency_group prevents conflicts across tasks.
- Locks are file-based and required for task, agent, and state writes.
- Atomic writes: write temp -> fsync -> rename.

## Agent Runner

Commands are built from fixed templates, never from LLM strings.

Examples:
- Claude: `claude -p "Read agent guide then execute task at PATH"`
- Codex: `codex -q "Read agent guide then execute task at PATH"`
- Gemini: `gemini -p "Read agent guide then execute task at PATH"`

Policies:
- timeout per task (default 20-45m)
- SIGTERM -> grace -> SIGKILL
- stdout/stderr captured to logs

## Outbox Processing

- Validate report.json schema
- Ensure task_id matches
- Block risky changes without approval
- Compute error_signature for retries
- Update STATE.json and INDEX.json

## Observability

- Heartbeat updated every 15s
- Local health.txt for watchdogs
- Append-only journal events.ndjson
- Telegram notifications on start/done/blocked/approval
- PM2 ecosystem config for 24/7 restarts
- systemd + launchd service templates
- /doctor for environment checks

## Configuration (Required)

- globalMaxConcurrency
- perAgentMaxConcurrency
- mode: fast|safe
- selector.enabled
- selector.maxCallsPerMinute
- selector.maxAttempts
- selector.cooldownSeconds
- selector.logEnabled
- selector.modelPreferences
- selector.fallbackModels
- selector.rateLimits
- selector.tierA_models, selector.tierB_models (legacy)
- selfTask.enabled
- selfTask.minIdleMinutes
- selfTask.maxPerDay
- locks.ttlSeconds
- safeRead.allowPaths
- runner.commandPaths
- approval.requiredRiskClasses
- timeouts.defaultPerType
- telegram.pollIntervalMs
- adminChatIds
- notifications.enabled
- CI: `npm --prefix lexbot run validate:config`

## Migration Notes

This spec is the authoritative evolution of `.kodingx/`. Any previous layout should migrate to the new structure. The legacy CLI can remain in the repo, but runtime state is defined by this spec.
