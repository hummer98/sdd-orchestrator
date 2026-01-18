---
description: Generate .kiro/steering/verification.md with project-specific verification commands
allowed-tools: Read, Task, Glob
---

# Kiro Steering Verification

## Check Prerequisites

**Before invoking Subagent**:

1. Use Glob to check `.kiro/steering/` directory exists
2. If not exists, inform user to run `/kiro:steering` first

## Invoke Subagent

Delegate verification.md generation to steering-verification-agent:

Use the Task tool to invoke the Subagent with file path patterns:

```
Task(
  subagent_type="steering-verification-agent",
  description="Generate verification.md",
  prompt="""
File patterns to read:
- .kiro/steering/*.md
- .kiro/settings/templates/steering/verification.md
- package.json (if exists)
- Cargo.toml (if exists)
- Makefile (if exists)
- .github/workflows/*.yml (if exists)

JIT Strategy: Analyze only necessary files based on project type
"""
)
```

## Display Result

Show Subagent summary to user:

### Success:
- Generated verification.md with detected commands
- List of detected sources and commands

### Skipped:
- verification.md already exists, user declined overwrite

## Notes

- verification.md defines commands for spec-inspection
- Commands are project-specific based on tech stack analysis
- Template provides format reference
