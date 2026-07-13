---
name: notify
description: >
  Send a push notification via ntfy to the current project's topic.
  Reads NTFY_TOPIC from the project's .env file.
  Use when the user wants to send a notification, alert, or reminder to their phone/device.
  Invoke as: /notify or /ntfy — both trigger this skill.
  Examples: /notify <message>, /ntfy <message> [--title "Title"] [--priority low|default|high|urgent] [--tags emoji,emoji]
---

# /notify

Send a push notification using the `ntfy` CLI to the project's configured topic.

## Steps

1. Read `NTFY_TOPIC` from the `.env` file in the current working directory. If not found, tell the user and stop.
2. Check if `ntfy` is installed by running `which ntfy`. If not found:
   - Try `brew install ntfy` (macOS/Linux with Homebrew).
   - If `brew` is also unavailable, try `curl -sSfL https://ntfy.sh/install.sh | sh`.
   - If installation fails, tell the user and stop.
3. Build the `ntfy` CLI command using the topic and the provided message.
4. Run the command and report the result (message ID and timestamp on success, error on failure).

## Usage

```
/notify Deploy finished
/notify "Tests passed ✅" --title "CI" --priority high
/notify "Review this PR" --tags loudspeaker,eyes
```

## Command construction

Base: `ntfy send <NTFY_TOPIC> "<message>"`

Optional flags (only include if provided by the user):
- `--title "..."` → `-t "..."`  or use `ntfy publish --title`
- `--priority <level>` → `-p <level>`
- `--tags <emoji,emoji>` → `--tags <emoji,emoji>`

Use `ntfy publish` form when adding extra options:

```bash
ntfy publish --title "CI" --priority high --tags white_check_mark <NTFY_TOPIC> "Tests passed"
```

## Output

On success: confirm with message ID. On error: show the error and suggest checking that the topic is correct.
