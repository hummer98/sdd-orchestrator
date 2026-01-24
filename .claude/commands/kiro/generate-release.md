---
description: Generate .claude/commands/release.md with project-specific release workflow
allowed-tools: Read, Task, Glob
---

# Kiro Steering Release

## Check Prerequisites

**Before invoking Subagent**:

1. Use Glob to check `.claude/commands/` directory exists
2. If not exists, it will be created by the agent

## Invoke Subagent

Delegate release.md generation to steering-release-agent:

Use the Task tool to invoke the Subagent with file path patterns:

```
Task(
  subagent_type="steering-release-agent",
  description="Generate release.md",
  prompt="""
File patterns to read:
- package.json (if exists)
- electron-builder.yml (if exists)
- electron-builder.json (if exists)
- Cargo.toml (if exists)
- Makefile (if exists)
- .github/workflows/*.yml (if exists)
- .kiro/settings/templates/commands/release.md (template reference)

JIT Strategy: Analyze only necessary files based on project type
"""
)
```

## Display Result

Show Subagent summary to user:

### Success:
- Generated release.md with project-specific workflow
- List of detected project type and sources

### Skipped:
- release.md already exists, user declined overwrite

## Notes

- release.md is a Slash Command for release workflow
- Commands are project-specific based on tech stack analysis
- Can be invoked with `/release` after generation
