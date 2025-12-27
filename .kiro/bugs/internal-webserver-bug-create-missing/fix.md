# Bug Fix: internal-webserver-bug-create-missing

## Summary
**修正延期** - 本件はバグ修正ではなく新機能追加であり、Full SDDワークフローで対応すべき。

## Decision: Escalate to Full SDD

### 理由
1. **スコープ**: 複数ファイルにまたがる新機能実装（WebSocketHandler, WorkflowController, remote-ui）
2. **設計が必要**: API設計、UIデザイン、テンプレート処理の設計検討が必要
3. **関連機能**: Spec新規作成も同様に不足しており、両方を同時に設計すべき
4. **CLAUDE.md指針**: 「設計変更を伴う複雑なバグ」はFull SDDワークフローを使用

### 推奨アクション
新規仕様として `remote-ui-create-features` を作成し、以下を実装：
- Bug新規作成機能（CREATE_BUG WebSocket API + UI）
- Spec新規作成機能（CREATE_SPEC WebSocket API + UI）

```bash
/kiro:spec-init "remote-uiにBug/Spec新規作成機能を追加"
```

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| N/A | 本バグでは実装変更なし |

### Code Changes
なし（仕様策定へエスカレーション）

## Implementation Notes
- 軽量Bug Fixワークフローでは対応範囲外
- Full SDDワークフロー（requirements → design → tasks → impl）で実装すべき

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
N/A（変更なし）

## Related Commits
- なし
