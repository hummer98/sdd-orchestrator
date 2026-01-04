---
description: Execute a custom prompt with project steering context
allowed-tools: Read, Glob, Bash
argument-hint: <prompt>
---

# Project Ask

## Parse Arguments
- Prompt: `$ARGUMENTS`

## Validate
If prompt is empty:
- Display error: "プロンプトを指定してください。"
- Exit

## Load Context

Read all steering files to understand project context:
- `.kiro/steering/*.md`

Use Glob to find all steering files, then Read each file.

## Execute

With the loaded steering context, process the user's prompt:

**User Prompt**: $ARGUMENTS

Respond to the user's request using the project steering context as background knowledge.
