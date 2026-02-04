# Lexbot Setup Guide (for Coding Agents)

Use this when you are an automated coding agent (no prompts, no UI). The goal is to initialize lexbot deterministically without interactive steps.

## Non-interactive setup

```bash
./lexbot/setup.sh --non-interactive
```

This will:
- Create `.kodingx/` layout
- Copy `lexbot/config.example.json` into `.kodingx/lexbot/config.json` if missing

### Inject Config

```bash
./lexbot/setup.sh --non-interactive --config /path/to/config.json
```

## Required edits

Update `.kodingx/lexbot/config.json` with real values:
- `telegram.token`
- `telegram.adminChatIds`
- `selector.apiKey` (optional)

## Start

```bash
node lexbot/src/index.js
```

## Optional: PM2

```bash
pm2 start lexbot/ecosystem.config.cjs
pm2 save
```

## Optional: systemd (Linux)

Copy and edit `lexbot/systemd/lexbot.service`:
- Set `WorkingDirectory` to your repo path
- Set `ExecStart` to your node path + repo path

Then:
```bash
sudo cp lexbot/systemd/lexbot.service /etc/systemd/system/lexbot.service
sudo systemctl daemon-reload
sudo systemctl enable --now lexbot
```

## Optional: launchd (macOS)

Copy and edit `lexbot/launchd/com.lexaplus.lexbot.plist`:
- Set paths to your repo and node location

Then:
```bash
cp lexbot/launchd/com.lexaplus.lexbot.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.lexaplus.lexbot.plist
```

## Agent CLI Doctor

```bash
npm --prefix lexbot run doctor
```

## Config Validation (CI)

```bash
npm --prefix lexbot run validate:config
```
