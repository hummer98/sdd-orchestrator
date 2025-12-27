# Bug Analysis: internal-webserver-bug-create-missing

## Summary
内蔵WebServer（remote-ui）にBug新規作成機能が実装されていない。Bugの閲覧・フェーズ実行（analyze/fix/verify）は可能だが、モバイル端末からBugを新規作成することができない。

## Root Cause

### 設計時のスコープ外
`internal-webserver-sync` 仕様（[requirements.md](.kiro/specs/internal-webserver-sync/requirements.md)）において、Bug新規作成は要件に含まれていなかった。

**Requirement 1（バグ管理機能の同期）の範囲:**
- ✅ バグ一覧の閲覧
- ✅ バグワークフロー実行（analyze/fix/verify）
- ❌ バグ新規作成（未定義）

同様に、Spec新規作成機能もremote-uiには存在しない。

### Technical Details
- **Location**:
  - [webSocketHandler.ts:101](electron-sdd-manager/src/main/services/webSocketHandler.ts#L101) - `BugAction`型は`'analyze' | 'fix' | 'verify'`のみ
  - [webSocketHandler.ts:127](electron-sdd-manager/src/main/services/webSocketHandler.ts#L127) - `executeBugPhase`メソッドのみ、`createBug`なし
  - [remote-ui/components.js:288-408](electron-sdd-manager/src/main/remote-ui/components.js#L288-L408) - `BugList`に作成ボタンなし
- **Component**: WebSocketHandler, WorkflowController, remote-ui (BugList, BugDetail)
- **Trigger**: モバイル端末からBugを新規作成しようとした場合

## Impact Assessment
- **Severity**: Medium
- **Scope**: Remote Access（モバイルUI）ユーザーのみ。Electron本体では`/kiro:bug-create`で作成可能
- **Risk**: 機能追加のみのため、既存機能への影響は低い

## Related Code

### 現在のBugAction型定義
```typescript
// webSocketHandler.ts:101
export type BugAction = 'analyze' | 'fix' | 'verify';
// 'create'が含まれていない
```

### WorkflowController インターフェース
```typescript
// webSocketHandler.ts:127
executeBugPhase?(bugName: string, phase: BugAction): Promise<WorkflowResult<AgentInfo>>;
// createBug メソッドが存在しない
```

## Proposed Solution

### Option 1: Bug作成UIとAPIを追加
- Description: remote-uiにBug作成フォーム、WebSocketHandlerにCREATE_BUGハンドラを追加
- Pros: 完全な機能パリティ、モバイルからのバグ報告が可能に
- Cons: 実装工数が必要、テンプレート処理のサーバーサイド実装が必要

### Option 2: 現状維持（ドキュメント化のみ）
- Description: Bug作成はElectron本体で行い、remote-uiは閲覧・実行のみと明記
- Pros: 追加実装不要
- Cons: 機能制限が残る

### Recommended Approach
**Option 1** を推奨。理由：
1. Spec作成機能も同様に不足しているため、両方を同時に対応する仕様として計画すべき
2. モバイルからのバグ報告はユースケースとして妥当

## Dependencies
- `BugService` - バグディレクトリ・ファイル作成ロジック
- `templates/bugs/report.md` - レポートテンプレート
- `WorkflowController` - 新規メソッド追加
- `remote-ui` - 作成フォームUI追加

## Testing Strategy
1. **Unit Tests**: WebSocketHandler.handleCreateBugのテスト追加
2. **Integration Tests**: WebSocket経由でのBug作成E2Eテスト
3. **Manual Tests**: モバイル端末からBug作成フロー確認
