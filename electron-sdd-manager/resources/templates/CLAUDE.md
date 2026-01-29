# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines

- **Timestamps**: Always generate UTC timestamps using `date -u +"%Y-%m-%dT%H:%M:%SZ"` for ISO 8601 fields (spec.json, bug.json, inspection reports, etc.). Never use local time with Z suffix.

## Minimal Workflow

### Feature Development (Full SDD)

- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

### Bug Fix (Lightweight Workflow)

For small bug fixes, the full SDD process is not required. Use the lightweight workflow:

```
Report -> Analyze -> Fix -> Verify
```

| Command | Description |
|---------|------|
| `/kiro:bug-create <name> "description"` | Create bug report |
| `/kiro:bug-analyze [name]` | Investigate root cause |
| `/kiro:bug-fix [name]` | Implement fix |
| `/kiro:bug-verify [name]` | Verify fix |
| `/kiro:bug-status [name]` | Check progress |

**Usage guidelines**:
- **Small bugs**: Bug Fix workflow (lightweight, fast)
- **Complex bugs requiring design changes**: Full SDD workflow

## Design Principles

Follow these principles during design and implementation:

- **DRY** (Don't Repeat Yourself): Avoid duplication, extract common logic
- **SSOT** (Single Source of Truth): Manage state/data from a single source
- **KISS** (Keep It Simple): Prefer simple solutions
- **YAGNI** (You Aren't Gonna Need It): Don't implement features not currently needed
- **Separation of Concerns**: Each module should have a single responsibility

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration

### Core Steering（常時参照）

| ファイル | 内容 |
|----------|------|
| `product.md` | プロダクト概要 |
| `tech.md` | 技術スタック、ビルド・検証コマンド |
| `design-principles.md` | AI設計判断の原則 |
| `structure.md` | ディレクトリ構造、State管理ルール |

### Extended Steering（タスク内容に応じて読み込み）

| 状況 | 読み込むファイル |
|------|-----------------|
| デバッグ・ログ調査 | `debugging.md` |
| ログ実装 | `logging.md` |

Custom files are supported (managed via `/kiro:steering-custom`)
