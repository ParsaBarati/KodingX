# Lexbot Simple Setup

## Quick Start

```bash
./lexbot/setup.sh
```

## Non-interactive Setup

```bash
./lexbot/setup.sh --non-interactive
```

This copies `lexbot/config.example.json` to `.kodingx/lexbot/config.json` if it doesn’t exist.

### Inject Config

```bash
./lexbot/setup.sh --non-interactive --config /path/to/config.json
```

## Configure

Edit `.kodingx/lexbot/config.json` and set:
- `telegram.token`
- `telegram.adminChatIds`
- `selector.apiKey` (optional)

Example template: `lexbot/config.example.json`

## Run

```bash
node lexbot/src/index.js
```

## Doctor (Optional)

In Telegram:
```
/doctor
```

From CLI:
```
npm --prefix lexbot run doctor
```

## Config Validation (CI)

```bash
npm --prefix lexbot run validate:config
```

## PM2 (Optional)

```bash
pm2 start lexbot/ecosystem.config.cjs
pm2 save
```

## systemd (Linux, Optional)

Edit `lexbot/systemd/lexbot.service` and update paths, then:

```bash
sudo cp lexbot/systemd/lexbot.service /etc/systemd/system/lexbot.service
sudo systemctl daemon-reload
sudo systemctl enable --now lexbot
```

## launchd (macOS, Optional)

Edit `lexbot/launchd/com.lexaplus.lexbot.plist` and update paths, then:

```bash
cp lexbot/launchd/com.lexaplus.lexbot.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.lexaplus.lexbot.plist
```
