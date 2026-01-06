# Implementation Plan

## Task Format Template

- [x] 1. specManagerService に spec-plan コマンドマッピングを追加
- [x] 1.1 (P) SPEC_PLAN_COMMANDS マッピングの定義
  - kiro プレフィックス用のコマンドマッピングを追加
  - spec-manager プレフィックス用は将来対応として未定義エントリを追加
  - _Requirements: 1.1, 1.2_

- [x] 1.2 (P) PHASE_ALLOWED_TOOLS に spec-plan エントリを追加
  - spec-plan フェーズで許可するツールリストを定義
  - ツールリスト: Read, Write, Glob, Grep, WebSearch, WebFetch, Task
  - _Requirements: 1.3_

- [x] 2. IPC チャンネルとハンドラの追加
- [x] 2.1 (P) EXECUTE_SPEC_PLAN チャンネル定数の定義
  - channels.ts に新しいチャンネル定数を追加
  - _Requirements: 2.1_

- [x] 2.2 EXECUTE_SPEC_PLAN ハンドラの実装
  - handlers.ts に新しいハンドラを追加
  - specManagerService.startAgent を呼び出して spec-plan エージェントを起動
  - グローバルエージェント（specId: ''）として起動
  - phase を 'spec-plan' に設定
  - group を 'doc' に設定
  - エラー時は説明的なメッセージを含む Error を throw
  - **spec-manager プレフィックス時のエラーハンドリング**: `SPEC_PLAN_COMMANDS[commandPrefix]` が undefined の場合、`throw new Error('spec-manager:plan is not yet implemented. Use kiro prefix.')` とする（DD-002 参照）
  - Requires: 1.1, 1.2, 2.1
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 3. Preload API の追加
- [x] 3.1 (P) electron.d.ts に型定義を追加
  - executeSpecPlan 関数の型定義を追加
  - 引数: projectPath, description, commandPrefix（オプショナル）
  - 戻り値: Promise<AgentInfo>
  - JSDoc コメントを追加
  - _Requirements: 3.2_

- [x] 3.2 preload/index.ts に executeSpecPlan 関数を追加
  - contextBridge 経由で executeSpecPlan を公開
  - EXECUTE_SPEC_PLAN チャンネルを invoke
  - Requires: 2.1
  - _Requirements: 3.1_

- [x] 4. CreateSpecDialog の変更
  - handlePlanStart 関数を追加（handleCreate とは別に「プランニングで開始」ボタン用）
  - currentProject、description、commandPrefix を引数として渡す
  - 成功時: addAgent、selectForProjectAgents、selectAgent を呼び出し、ProjectAgentPanel に遷移
  - 成功メッセージを「プランニングを開始しました」に変更
  - エラー時はダイアログにエラーメッセージを表示
  - Requires: 3.1, 3.2
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. (P) コマンドセットテンプレートの追加
  - resources/templates/commands/cc-sdd/ に spec-plan.md を追加
  - resources/templates/commands/cc-sdd-agent/ に spec-plan.md を追加
  - 既存の .claude/commands/kiro/spec-plan.md をテンプレートとしてコピー
  - _Requirements: 5.1, 5.2_

- [x] 6. CreateSpecDialog テストの更新
  - executeSpecPlan のモックを追加
  - executeSpecPlan が正しい引数で呼び出されることを検証
  - 「プランニングで開始」ボタンのテストを追加
  - Requires: 4
  - _Requirements: 6.1, 6.2_

- [x] 7. (P) spec-plan コマンドの出力状態を確認
  - spec-plan.md コマンド定義が spec.json を正しい状態で出力することを確認
  - phase: "requirements-generated"
  - approvals.requirements.generated: true, approved: false
  - requirements.md に Decision Log セクションが含まれることを確認
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8. (P) steering/skill-reference.md への spec-plan 追記
  - `.kiro/steering/skill-reference.md` の cc-sdd セクションに spec-plan コマンドを追加
  - cc-sdd-agent セクションにも同様に追加（cc-sdd と同一動作）
  - 追記内容: `| spec-plan | spec.json, requirements.md | - | 説明文提供 | phase: requirements-generated, approvals.requirements.generated: true, approved: false | 変更なし | Claude |`
  - _Post-implementation task (実装完了後に実施)_
