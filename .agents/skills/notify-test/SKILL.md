---
name: notify-test
description: >
    Sends a secret test push notification via the /notify skill to verify one-way
    delivery to the owner's device, without ever writing the secret in plain text
    anywhere visible (the tool call, this chat's text). The owner should only learn
    the secret by checking their ntfy app. Invoke as: /notify-test
---

# /notify-test

This is a delivery-verification game, not a real security mechanism (base64 is an
encoding, not encryption — anyone who decodes the string can read it). The goal is
just to keep the secret off the visible tool call and out of your own narration, so
the owner's only source of truth is the actual notification on their device.

## Steps

1. **Make up a short secret phrase.** 2-4 words, no numbers, no dashes — a real
   (if silly/funny) phrase, e.g. `tacos al pastor`. Not derivable from recent
   conversation context (so it can't be guessed). Keep it ASCII (no accents) to
   avoid base64/UTF-8 edge cases.

2. **Base64-encode it yourself, mentally.** Do not run a bash command that pipes
   the plaintext into `base64` (e.g. `echo "secret" | base64`) — that would print
   the plaintext directly in a visible tool call, defeating the whole point.
   Compute the encoding as part of your own reasoning instead.

3. **Invoke the `/notify` skill** to actually send it — don't hand-roll the `ntfy`
   command yourself, reuse that skill. Pass the message as a shell command
   substitution that decodes the base64 inline, so the plaintext never appears
   literally anywhere, including in this tool call's arguments:

    ```
    /notify $(echo '<base64>' | base64 -d) --title "🔒 Secreto"
    ```

    `/notify` will read `NTFY_TOPIC` from `.env` and build a command like
    `ntfy publish --title "🔒 Secreto" "$NTFY_TOPIC" "$(echo '<base64>' | base64 -d)"`
    — the substitution still evaluates inside double quotes, so the real phrase is
    what actually gets sent, even though only the base64 form was ever written out.

4. **Filter the command's own output before it ever reaches you** — don't rely on
   just not repeating it afterward. The `ntfy publish` JSON response echoes the
   decoded message back (`"message": "..."`), and that shows up in the raw tool
   result regardless of what you say in the chat. When actually running the final
   `ntfy publish ...` command (in place of `/notify`'s own bare command), pipe it
   through a filter that only lets the `id` through, e.g.:

    ```bash
    ntfy publish --title "🔒 Secreto" "$NTFY_TOPIC" "$(echo '<base64>' | base64 -d)" \
      | python3 -c "import json,sys; print('id:', json.load(sys.stdin)['id'])"
    ```

    That way the plaintext never lands in the tool result at all, not even for a
    moment you'd have to remember to avoid repeating.

5. **Never quote or hint at the content anywhere in your reply.** Confirm
   generically that it sent (the `id` only), and ask the owner to check their
   ntfy app and report back what they saw.

6. **Wait for the owner's report.** When they tell you what arrived, compare it to
   the actual secret you generated and confirm the match (or mismatch) explicitly.

## Usage

```
/notify-test
```

No arguments — the secret is generated fresh each time.
