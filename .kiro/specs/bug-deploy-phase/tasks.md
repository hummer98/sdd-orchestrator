# Implementation Plan

## Task 1. 型定義の拡張

- [x] 1.1 (P) BugPhase型にdeployedを追加
  - BugPhase型の値に`deployed`を追加
  - BUG_PHASES配列の末尾に`deployed`を追加
  - PHASE_LABELSに`deployed: 'デプロイ完了'`を追加
  - PHASE_COLORSに`deployed: 'bg-purple-100 text-purple-700'`を追加
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 1.2 (P) BugJsonインターフェースにphaseフィールドを追加
  - BugJsonインターフェースにオプショナルな`phase?: BugPhase`フィールドを追加
  - 既存bug.jsonとの後方互換性を維持（フィールド未存在時はundefined）
  - _Requirements: 2.1_

- [x] 1.3 getNextAction関数をdeployed対応に修正
  - `verified`の戻り値を`null`に変更（deployは手動トリガー）
  - `deployed`ケースを追加して`null`を返す（ワークフロー完了）
  - タスク1.1のBugPhase拡張に依存
  - _Requirements: 8.4_

## Task 2. BugServiceのphaseフィールド対応

- [x] 2.1 bug.json読込時のphaseフィールド優先ロジック追加
  - readSingleBug関数でbug.json.phaseを優先的に使用
  - phaseフィールドが未存在の場合はdetermineBugPhaseFromFilesでフォールバック判定
  - タスク1.1, 1.2の型定義拡張に依存
  - _Requirements: 1.3, 2.2, 2.3_

- [x] 2.2 bug.json phaseフィールド更新メソッドの実装
  - updateBugJsonPhaseメソッドを新規追加
  - phase更新と同時にupdated_atも更新
  - Result型でエラーハンドリング
  - タスク2.1に依存
  - _Requirements: 2.4_

## Task 3. 楽観的更新による/commit処理

- [x] 3.1 /commit実行前のphase楽観的更新
  - commit処理開始時にphaseを`deployed`に更新
  - BugServiceのupdateBugJsonPhaseを使用
  - タスク2.2に依存
  - _Requirements: 4.1, 5.1_

- [x] 3.2 /commit失敗時のロールバック処理
  - try-catch-finallyパターンでエラーをキャッチ
  - 失敗時にphaseを`verified`にロールバック
  - ロールバック時にトースト通知「デプロイ失敗：ロールバックしました」を表示
  - _Requirements: 4.3, 4.4, 5.3_

- [x] 3.3 /commit成功時のphase維持確認
  - 成功時はphaseを`deployed`のまま維持（追加処理なし）
  - 既存の成功フローが正しく動作することを確認
  - _Requirements: 4.2, 5.2_

## Task 4. 楽観的更新によるmerge処理

- [x] 4.1 merge実行前のphase楽観的更新
  - merge処理開始時にphaseを`deployed`に更新
  - BugServiceのupdateBugJsonPhaseを使用
  - タスク2.2に依存
  - _Requirements: 6.1_

- [x] 4.2 merge失敗時のロールバック処理
  - try-catch-finallyパターンでエラーをキャッチ
  - 失敗時にphaseを`verified`にロールバック
  - worktreeは削除せず保持（再試行可能）
  - ロールバック時にトースト通知を表示
  - _Requirements: 6.3_

- [x] 4.3 merge成功時のworktree削除順序の確保
  - 処理順序: phase更新 → merge → worktree削除
  - merge成功後にworktree削除を実行
  - タスク4.1, 4.2に依存
  - _Requirements: 6.2, 6.4_

## Task 5. UI表示の更新

- [x] 5.1 (P) BugListItemのデプロイ完了タグ表示
  - PHASE_LABELSとPHASE_COLORSの参照で自動的に対応
  - deployed時に「デプロイ完了」紫色タグが表示されることを確認
  - bugStore変更時の自動再レンダリングを確認
  - タスク1.1の型定義拡張に依存
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5.2 (P) BugProgressIndicatorの5フェーズ対応
  - PHASE_CONFIGSにdeployedフェーズを追加
  - deployed時に全フェーズ完了表示
  - deploy実行中（phase=deployed, Agent実行中）時はexecuting表示
  - タスク1.1の型定義拡張に依存
  - _Requirements: 8.2, 8.3_

- [x] 5.3 BugWorkflowViewの実行状態表示
  - calculatePhaseStatus関数でdeployedフェーズの状態を正しく計算
  - /commit実行中はdeploy phaseをexecutingとして表示
  - タスク5.2に依存
  - _Requirements: 5.4, 8.3_

## Task 6. Remote UI同期

- [x] 6.1 WebSocket通知によるphase変更の伝播
  - bugsWatcherServiceがbug.json変更を検知
  - 既存のBUGS_CHANGEDイベントでRemote UIに通知
  - Remote UIのbugStoreが更新を受信して状態を反映
  - _Requirements: 7.1, 7.2_

- [x] 6.2 Remote UIでのデプロイ完了表示
  - 共有BugListItemコンポーネントを使用（Desktop UIと同一）
  - 「デプロイ完了」ラベルがDesktop UIと同じ紫色で表示
  - タスク5.1に依存
  - _Requirements: 7.3_

## Task 7. BugWorkflowPhaseとの整合性確認

- [x] 7.1 BugWorkflowPhase deployとBugPhase deployedの対応確認
  - 既存のBUG_WORKFLOW_PHASESに`deploy`が含まれることを確認
  - BugPhase `deployed`との対応関係を検証
  - タスク1.1の型定義拡張に依存
  - _Requirements: 8.1_

## Task 8. テスト

- [x] 8.1 (P) 型定義のユニットテスト
  - getNextAction('deployed')がnullを返すことを確認
  - getNextAction('verified')がnullを返すことを確認
  - PHASE_LABELSにdeployedが含まれることを確認
  - タスク1.1, 1.3に依存
  - _Requirements: 1.1, 1.2, 8.4_

- [x] 8.2 (P) BugService phaseフィールドのユニットテスト
  - updateBugJsonPhaseでphaseとupdated_atが更新されることを確認
  - readSingleBugでphaseフィールド優先判定を確認
  - phaseフィールド未存在時のアーティファクトフォールバックを確認
  - タスク2.1, 2.2に依存
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 8.3 (P) 楽観的更新の統合テスト
  - commit成功フロー: phase=deployed維持を確認
  - commit失敗フロー: phase=verifiedロールバックを確認
  - merge成功フロー: phase=deployed＋worktree削除を確認
  - merge失敗フロー: phase=verifiedロールバック＋worktree保持を確認
  - タスク3.1-3.3, 4.1-4.3に依存
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4_

- [x] 8.4 (P) UI表示のE2Eテスト
  - BugListItemで「デプロイ完了」タグが紫色で表示されることを確認
  - deploy実行後にphaseがdeployedに変わることを確認
  - deploy失敗時にロールバック通知が表示されることを確認
  - タスク5.1, 5.2, 5.3に依存
  - _Requirements: 3.1, 3.2, 4.4_

- [x] 8.5 Remote UI同期のE2Eテスト
  - phase変更時のWebSocket通知を確認
  - Remote UIで「デプロイ完了」が同期表示されることを確認
  - タスク6.1, 6.2に依存
  - _Requirements: 7.1, 7.2, 7.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | BugPhaseに`deployed`追加 | 1.1, 8.1 | Infrastructure, Testing |
| 1.2 | BUG_PHASESに`deployed`追加 | 1.1, 8.1 | Infrastructure, Testing |
| 1.3 | bug.json読込時のphase検証 | 2.1 | Infrastructure |
| 2.1 | BugJsonにphaseフィールド追加 | 1.2 | Infrastructure |
| 2.2 | phaseフィールド優先使用 | 2.1, 8.2 | Infrastructure, Testing |
| 2.3 | phaseフィールド未存在時のフォールバック | 2.1, 8.2 | Infrastructure, Testing |
| 2.4 | phase更新時のupdated_at同時更新 | 2.2, 8.2 | Infrastructure, Testing |
| 3.1 | deployed時の「デプロイ完了」表示 | 5.1, 8.4 | Feature, Testing |
| 3.2 | deployed時の紫色タグ | 1.1, 5.1, 8.4 | Infrastructure, Feature, Testing |
| 3.3 | phase変更時の自動更新 | 5.1 | Feature |
| 4.1 | deploy前のphase楽観的更新 | 3.1, 8.3 | Feature, Testing |
| 4.2 | 成功時のphase維持 | 3.3, 8.3 | Feature, Testing |
| 4.3 | 失敗時のphaseロールバック | 3.2, 8.3 | Feature, Testing |
| 4.4 | ロールバック時のトースト通知 | 3.2, 8.4 | Feature, Testing |
| 5.1 | /commit実行前のphase更新 | 3.1, 8.3 | Feature, Testing |
| 5.2 | /commit成功時のphase維持 | 3.3, 8.3 | Feature, Testing |
| 5.3 | /commit失敗時のロールバック | 3.2, 8.3 | Feature, Testing |
| 5.4 | 実行中のBugProgressIndicator表示 | 5.3 | Feature |
| 6.1 | merge前のphase更新 | 4.1, 8.3 | Feature, Testing |
| 6.2 | merge成功時のworktree削除 | 4.3, 8.3 | Feature, Testing |
| 6.3 | merge失敗時のロールバックとworktree保持 | 4.2, 8.3 | Feature, Testing |
| 6.4 | 処理順序の保証 | 4.3, 8.3 | Feature, Testing |
| 7.1 | phase更新時のWebSocket通知 | 6.1, 8.5 | Feature, Testing |
| 7.2 | Remote UIのBug一覧更新 | 6.1, 8.5 | Feature, Testing |
| 7.3 | Remote UIの「デプロイ完了」表示 | 6.2, 8.5 | Feature, Testing |
| 8.1 | BugWorkflowPhase deployとBugPhase deployedの対応 | 7.1 | Infrastructure |
| 8.2 | deployed時のBugProgressIndicator完了表示 | 5.2 | Feature |
| 8.3 | deploy実行中のexecuting表示 | 5.2, 5.3 | Feature |
| 8.4 | deployed時のgetNextAction null返却 | 1.3, 8.1 | Infrastructure, Testing |
