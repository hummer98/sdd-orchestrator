---
description: Execute a custom prompt with spec and steering context
allowed-tools: Read, Glob, Bash
argument-hint: <feature-name> <prompt>
---

# Spec Ask

## Parse Arguments
- Feature: `$1`
- Prompt: `$2` (remaining arguments after feature name)

## Validate

### Check feature name
If feature name is empty:
- Display error: "Spec名を指定してください。Usage: /kiro:spec-ask <feature-name> <prompt>"
- Exit

### Check prompt
If prompt is empty:
- Display error: "プロンプトを指定してください。Usage: /kiro:spec-ask <feature-name> <prompt>"
- Exit

### Verify spec exists
Check that spec directory exists:
- `.kiro/specs/$1/` must exist

If spec directory does not exist:
- Display error: "Spec not found: $1"
- Exit

## Load Context

Read all context files:

### Steering files (project context)
- `.kiro/steering/*.md`

### Spec files (feature context)
- `.kiro/specs/$1/*.md`

Use Glob to find all files, then Read each file.

## Execute

With the loaded steering and spec context, process the user's prompt:

**Feature**: $1
**User Prompt**: $2

Respond to the user's request using the loaded context as background knowledge.
