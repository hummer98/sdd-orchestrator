---
description: Generate .kiro/steering/verification-commands.md with project-specific verification commands
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Kiro Steering Verification

<background_information>
**Role**: Generate verification-commands.md with project-specific verification commands.

**Mission**:
- Analyze project's technical stack
- Generate appropriate verification commands for spec-inspection
- Handle existing verification-commands.md with user confirmation

**Success Criteria**:
- verification-commands.md is generated with valid Markdown table format
- Commands are appropriate for the project's tech stack
</background_information>

<instructions>
## Step 1: Check for Existing verification-commands.md

Check if `.kiro/steering/verification-commands.md` already exists:

1. Use Glob to check for `verification-commands.md`
2. If exists, read content and **ask user**: "verification-commands.md already exists. Overwrite? (yes/no)"
3. If user declines, show current content and exit

## Step 2: Analyze Project Tech Stack

Analyze sources in priority order:

1. **tech.md**: Extract verification commands if defined
2. **package.json**: Detect npm scripts (build, test, typecheck, lint)
3. **Cargo.toml**: Detect Rust project commands
4. **Makefile**: Detect make targets
5. **CI config**: `.github/workflows/*.yml`, `.gitlab-ci.yml`

## Step 3: Extract Verification Commands

**From package.json:**
- `scripts.build` -> Type: build
- `scripts.typecheck` -> Type: typecheck
- `scripts.test` or `scripts.test:run` -> Type: test
- `scripts.lint` -> Type: lint

**From Cargo.toml:**
- `cargo build --release` -> Type: build
- `cargo test` -> Type: test
- `cargo clippy` -> Type: lint

## Step 4: Merge Strategy

When multiple sources provide same type:
1. **tech.md** definition takes priority
2. Otherwise, use first detected source
3. Different types are all included (union)

## Step 5: Generate verification-commands.md

Read template from `.kiro/settings/templates/steering/verification-commands.md`.

Generate content:

```markdown
# Verification Commands

spec-inspection 実行時に自動実行される検証コマンドを定義します。

## Commands

| Type | Command | Workdir | Description |
|------|---------|---------|-------------|
| build | npm run build | . | プロダクションビルド |
| typecheck | npm run typecheck | . | TypeScript 型チェック |
| test | npm run test:run | . | ユニットテスト |
| lint | npm run lint | . | ESLint 検証 |

## Notes
...
```

Write to `.kiro/steering/verification-commands.md`.

</instructions>

## Tool guidance

- `Glob`: Find config files
- `Read`: Read config files and templates
- `Grep`: Search patterns
- `Write`: Write verification-commands.md

**JIT Strategy**: Analyze only necessary files.

## Output description

Chat summary only (files updated directly).

### Success:
```
verification-commands.md 生成完了

## 検出されたソース:
- package.json: build, typecheck, test, lint

## 生成されたコマンド:
| Type | Command | Workdir |
|------|---------|---------|
| build | npm run build | . |
| typecheck | npm run typecheck | . |
| test | npm run test:run | . |
| lint | npm run lint | . |
```

### Skipped:
```
verification-commands.md は既に存在します。上書きがキャンセルされました。
```

## Safety & Fallback

- **No tech stack**: Generate minimal template with TODO
- **Parse errors**: Skip invalid files, continue with others
