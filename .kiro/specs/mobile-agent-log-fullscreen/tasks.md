# Implementation Plan: Mobile Agent Log Fullscreen

## Task 1. useNavigationStackフックの拡張

- [x] 1.1 (P) AgentLogContext型とpushAgentLogメソッドを追加
  - 新しいDetailContextの型として`agent-log`タイプを定義
  - Agent情報と遷移元情報（spec/bug/agents）を保持する構造を設計
  - 既存の`pushSpecDetail`/`pushBugDetail`と同じパターンで`pushAgentLog`を実装
  - `popPage`は既存実装をそのまま利用（変更不要）
  - _Requirements: 5.4_
  - _Method: pushAgentLog, AgentLogContext_
  - _Verify: Grep "pushAgentLog|AgentLogContext" in useNavigationStack.ts_

## Task 2. AgentLogActionAreaコンポーネントの作成

- [x] 2.1 (P) 追加指示入力・送信・続行機能を持つアクションエリアを実装
  - AgentDetailDrawerからアクションエリアのロジックを抽出して独立コンポーネント化
  - 追加指示入力フィールド、送信ボタン、続行ボタンを配置
  - Agent状態（running/hang）に応じたボタン無効化ロジックを実装
  - sessionIdがない場合の無効化ロジックを実装
  - 送信中・続行中のローディング状態管理
  - 送信成功時の入力フィールドクリア
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - _Method: AgentLogActionArea, canInteract, isSending, isContinuing_
  - _Verify: Grep "AgentLogActionArea" in remote-ui/components/_

## Task 3. AgentLogPageコンポーネントの作成

- [x] 3.1 全画面Agentログページを実装
  - ナビゲーションバー（戻るボタン：ArrowLeftアイコン）を上部に固定表示
  - 2段構成ヘッダー（ナビバー + AgentLogPanelヘッダー）を実装
  - ログ表示エリアはAgentLogPanelを再利用し、スクロール可能に設定
  - アクションエリア（AgentLogActionArea）を下部に固定表示
  - 全画面レイアウト（flex column、ログエリアのみflex-1 overflow-auto）
  - 戻るボタンタップで`onBack`コールバック（popPage）を呼び出し
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_
  - _Method: AgentLogPage, AgentLogPanel, AgentLogActionArea, popPage_
  - _Verify: Grep "AgentLogPage" in remote-ui/components/_

## Task 4. MobileAppContentでのAgentLogPage統合

- [x] 4.1 detailContext判定を拡張しAgentLogPageをレンダリング
  - `detailContext.type === 'agent-log'`の分岐を追加
  - AgentLogPageに必要なprops（agent, sourceType, apiClient, onBack）を渡す
  - 既存のSpecDetailPage/BugDetailPageの条件分岐と同様のパターンで実装
  - _Requirements: 1.1_
  - _Method: MobileAppContent, detailContext, AgentLogPage_
  - _Verify: Grep "agent-log" in App.tsx_

## Task 5. 遷移元コンポーネントの変更

- [x] 5.1 (P) SpecDetailPageでAgentDetailDrawerを削除しpushAgentLog呼び出しに変更
  - AgentDetailDrawerのimportとレンダリングを削除
  - Agent選択時のハンドラを`pushAgentLog(agent, 'spec', specName)`に変更
  - SelectedAgent状態管理（useState）を削除
  - _Requirements: 1.2, 5.1, 6.1_
  - _Method: pushAgentLog, handleSelectAgent_
  - _Verify: Grep "pushAgentLog.*spec" in SpecDetailPage.tsx_

- [x] 5.2 (P) BugDetailPageでAgentDetailDrawerを削除しpushAgentLog呼び出しに変更
  - AgentDetailDrawerのimportとレンダリングを削除
  - Agent選択時のハンドラを`pushAgentLog(agent, 'bug', bugName)`に変更
  - SelectedAgent状態管理（useState）を削除
  - _Requirements: 1.2, 5.2, 6.1_
  - _Method: pushAgentLog, handleSelectAgent_
  - _Verify: Grep "pushAgentLog.*bug" in BugDetailPage.tsx_

- [x] 5.3 (P) AgentsTabViewでAgentDetailDrawerを削除しpushAgentLog呼び出しに変更
  - AgentDetailDrawerのimportとレンダリングを削除
  - Agent選択時のハンドラを`pushAgentLog(agent, 'agents')`に変更
  - SelectedAgent状態管理（useState）を削除
  - _Requirements: 5.3_
  - _Method: pushAgentLog, handleSelectAgent_
  - _Verify: Grep "pushAgentLog.*agents" in AgentsTabView.tsx_

## Task 6. エクスポートの更新

- [x] 6.1 remote-ui/components/index.tsにAgentLogPageとAgentLogActionAreaを追加
  - 新規コンポーネントのexportを追加
  - import pathの整合性を確認
  - _Requirements: 1.3_

## Task 7. 統合テスト

- [x] 7.1 ナビゲーションフローの統合テストを実装
  - SpecDetailPage → AgentLogPage → 戻る → SpecDetailPageのフロー検証
  - BugDetailPage → AgentLogPage → 戻る → BugDetailPageのフロー検証
  - AgentsTabView → AgentLogPage → 戻る → AgentsTabViewのフロー検証
  - pushAgentLog呼び出し後のdetailContext.type === 'agent-log'を確認
  - popPage呼び出し後のdetailContext === nullを確認
  - _Requirements: 2.3, 5.1, 5.2, 5.3_
  - _Method: waitFor, pushAgentLog, popPage_

- [x] 7.2 AgentLogActionAreaの統合テストを実装
  - 送信ボタンクリック時のsendAgentInput呼び出しを検証
  - 続行ボタンクリック時のresumeAgent呼び出しを検証
  - Agent実行中の無効化状態を検証
  - sessionIdなしの無効化状態を検証
  - 送信成功後の入力フィールドクリアを検証
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_
  - _Method: waitFor, fireEvent, ApiClient mock_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Agentタップで全画面遷移 | 3.1, 4.1 | Feature |
| 1.2 | AgentDetailDrawer廃止（モバイル） | 5.1, 5.2 | Feature |
| 1.3 | AgentLogPage配置 | 3.1, 6.1 | Feature |
| 2.1 | ナビバー表示 | 3.1 | Feature |
| 2.2 | 戻るボタン表示 | 3.1 | Feature |
| 2.3 | 戻るボタンで遷移元に戻る | 3.1, 7.1 | Feature |
| 2.4 | 2段構成ヘッダー | 3.1 | Feature |
| 3.1 | ログエリアのみスクロール | 3.1 | Feature |
| 3.2 | ナビバー・アクション固定 | 3.1 | Feature |
| 3.3 | AgentLogPanel再利用 | 3.1 | Feature |
| 3.4 | 自動スクロール | 3.1 | Feature (既存機能) |
| 4.1 | アクションエリア固定 | 2.1, 3.1 | Feature |
| 4.2 | 追加指示入力 | 2.1, 7.2 | Feature |
| 4.3 | 送信ボタン | 2.1, 7.2 | Feature |
| 4.4 | 続行ボタン | 2.1, 7.2 | Feature |
| 4.5 | 実行中の無効化 | 2.1, 7.2 | Feature |
| 4.6 | sessionId無しの無効化 | 2.1, 7.2 | Feature |
| 5.1 | SpecDetailPageから遷移 | 5.1, 7.1 | Feature |
| 5.2 | BugDetailPageから遷移 | 5.2, 7.1 | Feature |
| 5.3 | AgentsTabViewから遷移 | 5.3, 7.1 | Feature |
| 5.4 | useNavigationStack拡張 | 1.1 | Infrastructure |
| 6.1 | モバイル版でDrawer不使用 | 5.1, 5.2, 5.3 | Feature |
| 6.2 | Desktop版影響なし | - | (変更なし) |
