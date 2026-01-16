# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project Context

### Paths
- Steering: `{{KIRO_DIR}}/steering/`
- Specs: `{{KIRO_DIR}}/specs/`

### Steering vs Specification

**Steering** (`{{KIRO_DIR}}/steering/`) - Guide AI with project-wide rules and context
**Specs** (`{{KIRO_DIR}}/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `{{KIRO_DIR}}/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines

- **Timestamps**: Always generate UTC timestamps using `date -u +"%Y-%m-%dT%H:%M:%SZ"` for ISO 8601 fields (spec.json, bug.json, inspection reports, etc.). Never use local time with Z suffix.

{{DEV_GUIDELINES}}

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
- Load entire `{{KIRO_DIR}}/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- **`logging.md`**: ロギング設計/実装の観点・ガイドライン
- **`debugging.md`**: デバッグ手順、ログ保存場所、トラブルシューティング情報
- Custom files are supported (managed via `/kiro:steering-custom`)
