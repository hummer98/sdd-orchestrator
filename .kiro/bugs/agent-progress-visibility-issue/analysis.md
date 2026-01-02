# Bug Analysis: agent-progress-visibility-issue

## Summary
Agent起動時の`--output-format stream-json`オプション付与が統一されておらず、呼び出し元によって進捗表示の有無が異なる。

## Root Cause

### Technical Details
- **Location**: `specManagerService.startAgent`および各呼び出し元
- **Component**: 複数コンポーネント → agentStore/electronAPI → IPC → specManagerService.startAgent
- **Trigger**: Agent起動時の引数構築が呼び出し元ごとにバラバラ

### 問題の本質
`buildClaudeArgs`という共通関数が存在するにも関わらず、呼び出し元ごとに異なる方法で引数を構築している。

### 現状の呼び出しパターン

| 呼び出し元 | args | stream-json |
|-----------|------|-------------|
| `PhaseExecutionPanel.tsx` | `['-p', '--output-format', 'stream-json', '--verbose', cmd]` | ✓ |
| `BugActionButtons.tsx` | `[bug.name]` | ❌ |
| `BugWorkflowView.tsx` | `['-p', fullCommand]` | ❌ |
| `BugAutoExecutionService.ts` | `['-p', fullCommand]` | ❌ |
| `handlers.ts` (spec-init) | `['-p', '--verbose', '--output-format', 'stream-json', cmd]` | ✓ |
| `handlers.ts` (bug-create) | `['-p', '--verbose', '--output-format', 'stream-json', cmd]` | ✓ |
| `specManagerService.ts` 内部メソッド | `buildClaudeArgs()` | ✓ |

### 設計上の問題
- ベースフラグの付与責任が明確でない
- 各呼び出し元が独自にフラグを構築（または省略）
- `buildClaudeArgs`がmain側にあり、renderer側から利用できない

## Impact Assessment
- **Severity**: Medium
- **Scope**: Bug系ワークフローUI全体（Analyze/Fix/Verify）、一部のSpec系操作
- **Risk**: ユーザーが処理状況を把握できず、フリーズと誤解する可能性

## Proposed Solution

### 採用方針: specManagerService.startAgentで統一処理

`specManagerService.startAgent`でベースフラグを強制付与し、呼び出し元はコマンド内容のみを渡す設計に統一する。

### 変更箇所

#### 1. specManagerService.startAgent (main)
argsを受け取った際に`buildClaudeArgs`相当の処理を適用し、ベースフラグを保証。

```typescript
// specManagerService.startAgent内で
// 渡されたargsからコマンド部分を抽出し、buildClaudeArgsで再構築
```

#### 2. 呼び出し元から重複フラグを削除

| ファイル | 変更内容 |
|---------|---------|
| `PhaseExecutionPanel.tsx` | `['-p', '--output-format', 'stream-json', '--verbose', cmd]` → `[cmd]` |
| `BugActionButtons.tsx` | `[bug.name]` → `[`${config.command} ${bug.name}`]` |
| `BugWorkflowView.tsx` | `['-p', fullCommand]` → `[fullCommand]` |
| `BugAutoExecutionService.ts` | `['-p', fullCommand]` → `[fullCommand]` |
| `handlers.ts` (spec-init) | ハードコードフラグ削除 |
| `handlers.ts` (bug-create) | ハードコードフラグ削除 |

### メリット
- **SSOT (Single Source of Truth)**: ベースフラグの定義が`specManagerService`に集約
- **将来の変更に強い**: フラグ変更時に1箇所修正で済む
- **バグの再発防止**: 新しい呼び出し元を追加しても自動的に正しく動作

### 互換性
- 既存のフラグ重複は無害（同じオプションの重複は無視される）
- 段階的な移行が可能

## Dependencies
- [specManagerService.ts](electron-sdd-manager/src/main/services/specManagerService.ts) - 統一処理の実装箇所
- [PhaseExecutionPanel.tsx](electron-sdd-manager/src/renderer/components/PhaseExecutionPanel.tsx)
- [BugActionButtons.tsx](electron-sdd-manager/src/renderer/components/BugActionButtons.tsx)
- [BugWorkflowView.tsx](electron-sdd-manager/src/renderer/components/BugWorkflowView.tsx)
- [BugAutoExecutionService.ts](electron-sdd-manager/src/renderer/services/BugAutoExecutionService.ts)
- [handlers.ts](electron-sdd-manager/src/main/ipc/handlers.ts)

## Testing Strategy
1. Bug系ワークフロー（Analyze/Fix/Verify）でリアルタイム出力確認
2. Spec系ワークフロー（Requirements/Design/Tasks/Impl）が影響を受けていないこと確認
3. spec-init、bug-createが正常動作すること確認
4. 既存のユニットテストが通ること確認
