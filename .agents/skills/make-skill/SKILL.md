---
name: make-skill
description: >
  Create a new Claude Code skill following the project convention:
  SKILL.md in .agents/skills/<name>/ and a symlink in ~/.claude/skills/<name>.
  Use when the user wants to add a new slash command or skill to the project.
  Invoke as: /make-skill <name>
---

# /make-skill

Scaffold a new skill for this project using the established convention.

## Convention

Skills live in `.agents/skills/<name>/SKILL.md` inside the project repo, then get symlinked to `.claude/skills/<name>` (local to the project, not `$HOME`) so Claude Code can discover them.

## Steps

1. **Gather intent** — if the user only provided a name, ask what the skill should do (one sentence is enough). If args already describe the purpose, proceed directly.

2. **Design the SKILL.md** — write the file with:
   - Frontmatter: `name`, `description` (shown in skill list — should also describe when to auto-trigger), optional `trigger`
   - Body: clear instructions for Claude on what to do when invoked, including usage examples and step-by-step behavior

3. **Create the file** at `.agents/skills/<name>/SKILL.md` in the current project root.

4. **Create the symlink** (relative, so it works on any machine):
   ```bash
   mkdir -p .claude/skills
   cd .claude/skills && ln -sfn "../../.agents/skills/<name>" "<name>"
   ```

5. **Confirm** — show the skill name, its description, and that the symlink is live.

## SKILL.md format

```markdown
---
name: <kebab-case-name>
description: >
  One or two sentences. First sentence: what it does.
  Second sentence: when to auto-trigger or usage hint.
  Invoke as: /<name> <args>
---

# /<name>

[Instructions for Claude — what to do, step by step]

## Usage

\`\`\`
/<name> example args
/<name> other example
\`\`\`
```

## Notes

- Name must be kebab-case, matches the folder and trigger
- Description is what appears in the skill list AND drives auto-trigger — be specific about when Claude should invoke it automatically
- Body is instructions to Claude, not documentation for the user — write imperatively ("Read the file", "Run the command", not "This skill reads...")
- Keep it focused: one skill, one job
