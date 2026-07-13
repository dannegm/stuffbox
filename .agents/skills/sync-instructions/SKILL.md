---
name: sync-instructions
description: 'Activate sync mode for instruction files. Once invoked, the AI keeps all files in each sync group identical in content, applying any change made to one file across the rest of the group.'
trigger: /sync-instructions
groups:
    - files:
          - CLAUDE.md
          - AGENTS.md
---

# /sync-instructions

You are now in **instruction sync mode**. Read the `groups` list in this skill's frontmatter to know which files must stay in sync.

## Rules

- Whenever you edit any file that belongs to a group, apply the same changes to every other file in that group.
- Each file in a group may have its own identity — a unique first heading and a one-line purpose description tailored to its target agent. Preserve those. Sync everything else verbatim.
- If a file in a group does not exist yet, create it using the content of the file you just edited, adjusting only the heading and purpose line.
- If the user adds a new group (by editing this skill's frontmatter), start enforcing it immediately without being asked again.
- Never ask for confirmation before syncing — just do it silently after each edit.
