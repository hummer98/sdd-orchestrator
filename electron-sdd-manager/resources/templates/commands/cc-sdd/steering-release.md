---
description: Generate .claude/commands/release.md with project-specific release workflow
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Kiro Steering Release

<background_information>
**Role**: Generate release.md with project-specific release workflow.

**Mission**:
- Analyze project's build configuration (package.json, electron-builder, CI configs)
- Generate appropriate release workflow as Slash Command
- Handle existing release.md with user confirmation

**Success Criteria**:
- release.md is generated with valid Slash Command format
- Commands are appropriate for the project's tech stack
</background_information>

<instructions>
## Step 1: Check for Existing release.md

Check if `.claude/commands/release.md` already exists:

1. Use Glob to check for `release.md` in `.claude/commands/`
2. If exists, read content and **ask user**: "release.md already exists. Overwrite? (yes/no)"
3. If user declines, show current content and exit

## Step 2: Detect Project Type

Analyze project type in priority order:

1. **Electron**: Check for `electron-builder.yml` or `electron-builder.json`
2. **npm**: Check for `package.json`
3. **Cargo**: Check for `Cargo.toml`
4. **Make**: Check for `Makefile`
5. **Unknown**: None detected

## Step 3: Extract Project Information

**From package.json:**
- `name`: Package name
- `version`: Current version
- `scripts.build`: Build command
- `scripts.test`: Test command

**From electron-builder:**
- Build targets
- Publish configuration

**From CI config (.github/workflows/*.yml):**
- Release workflow patterns

## Step 4: Create Directory if Needed

If `.claude/commands/` doesn't exist:
```bash
mkdir -p .claude/commands
```

## Step 5: Generate release.md

Generate content based on project type with these sections:
- Prerequisites (git clean, main branch, tests pass)
- Version Decision (semantic versioning)
- CHANGELOG Update
- Build & Package
- Commit & Tag
- Publish

Use `allowed-tools: Bash, Read, Write, Glob, Grep` in frontmatter.

Write to `.claude/commands/release.md`.

</instructions>

## Tool guidance

- `Glob`: Find config files (package.json, electron-builder, CI configs)
- `Read`: Read config files and templates
- `Grep`: Search patterns
- `Write`: Write release.md
- `AskUserQuestion`: Confirm overwrite

**JIT Strategy**: Analyze only necessary files.

## Output description

Chat summary only (files updated directly).

### Success:
```
release.md 生成完了

## プロジェクトタイプ:
[Electron/npm/Cargo/Make/Unknown]

## 検出された情報:
- package.json: [detected scripts]
- [other sources]

## 生成先:
.claude/commands/release.md
```

### Skipped:
```
release.md は既に存在します。上書きがキャンセルされました。
```

## Safety & Fallback

- **No tech stack**: Generate template with TODO comments
- **Parse errors**: Skip invalid files, continue with others
