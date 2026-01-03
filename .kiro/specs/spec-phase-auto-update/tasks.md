# Implementation Plan

## Task Format Template

- [x] 1. SpecPhase型とCompletedPhase型を拡張する
- [x] 1.1 (P) SpecPhase型に新しいphase値を追加する
  - `inspection-complete` と `deploy-complete` をSpecPhase型定義に追加
  - 型定義がrenderer/types/index.tsに正しく反映されることを確認
  - 既存のphase値との互換性を維持
  - _Requirements: 1.1, 1.2_

- [x] 1.2 (P) CompletedPhase型にphase値を追加する
  - FileServiceで使用するCompletedPhase型に `inspection-complete` と `deploy-complete` を追加
  - 既存の型定義との整合性を確認
  - _Requirements: 1.3_

- [x] 2. SpecListのステータス表示を拡張する
- [x] 2.1 (P) SpecList.tsx内のPHASE_LABELS（SpecPhase用マッピング）とPHASE_COLORSに新しいphaseを追加する
  - **更新対象ファイル**: `electron-sdd-manager/src/renderer/components/SpecList.tsx`
  - **注意**: workflow.ts内のPHASE_LABELS（WorkflowPhase用）ではなく、SpecList.tsx内のPHASE_LABELS（SpecPhase用）を更新する
  - `inspection-complete` に対して「検査完了」ラベルを設定
  - `deploy-complete` に対して「デプロイ完了」ラベルを設定
  - 他のステータスと視覚的に区別できる色を設定
  - 既存のフォールバック処理と整合するか確認
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. FileServiceのupdateSpecJsonFromPhaseメソッドを拡張する
  - switch文に `inspection-complete` と `deploy-complete` のケースを追加
  - 新しいphase値に対してspec.jsonのphaseフィールドを正しく更新する
  - approvals構造は変更せず、phaseフィールドのみを更新
  - ユニットテストで各ケースの動作を検証
  - _Requirements: 2.1, 3.1_

- [x] 4. phase遷移バリデーション機能を実装する
  - `inspection-complete` は `implementation-complete` 以降のみ許可する遷移ルールを実装
  - `deploy-complete` は `inspection-complete` 以降のみ許可する遷移ルールを実装
  - 無効な遷移が試行された場合は警告ログを出力し、遷移を拒否
  - ユニットテストで許可/拒否パターンを網羅的に検証
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 5. specsWatcherServiceにInspection完了検出機能を追加する
- [x] 5.1 Inspection GO判定検出ロジックを実装する
  - spec.json変更時にinspectionフィールドを解析
  - roundDetailsの最新ラウンドの `passed=true` を検出してGO判定と判断
  - NO-GO判定（passed=false）の場合はphase更新をスキップ
  - inspection未完了やフィールド未定義の場合もスキップ
  - _Requirements: 2.1, 2.2, 6.2, 6.5_

- [x] 5.2 Inspection完了時のphase更新処理を実装する
  - GO判定検出時にphase遷移バリデーションを実行
  - バリデーション成功時にFileServiceを呼び出してphaseを更新
  - 解析失敗時はエラーログを出力し、phase更新をスキップ
  - ユニットテストでGO/NO-GO/未完了の各パターンを検証
  - _Requirements: 2.3, 2.4, 6.1_

- [x] 6. specsWatcherServiceにデプロイ完了検出機能を追加する
  - spec.json変更時に `deploy_completed` フラグを検出
  - `deploy_completed=true` の場合にphase遷移バリデーションを実行
  - バリデーション成功時にFileServiceを呼び出してphaseを更新
  - 検出失敗時はエラーログを出力し、phase更新をスキップ
  - 既存のデバウンス設定（300ms）を維持して2秒以内の検出を実現
  - ユニットテストで検出成功/失敗のパターンを検証
  - _Requirements: 3.1, 3.2, 3.3, 6.3, 6.4_

- [x] 7. WebSocket経由でRemote UIにphase変更を通知する
- [x] 7.1 phase変更時のWebSocket通知を実装する
  - `inspection-complete` 更新時にbroadcastSpecUpdatedを呼び出し
  - `deploy-complete` 更新時にbroadcastSpecUpdatedを呼び出し
  - 通知メッセージに正しいspecIdとphaseを含める
  - _Requirements: 5.1, 5.2_

- [x] 7.2 Remote UI側のステータス表示を確認する
  - Remote UIがWebSocket通知を受信してSpec一覧を更新することを確認
  - Desktop UIと同じ「検査完了」「デプロイ完了」ラベルが表示されることを確認
  - WebSocket切断後の再接続時に正しい状態が表示されることを確認
  - _Requirements: 5.3, 5.4, 5.5_

- [x] 8. WorkflowViewの完了状態表示を対応する
  - `deploy-complete` phaseのSpecを「完了」状態として表示
  - ワークフロー全体が完了したことを視覚的に示す
  - 既存のワークフロー表示との整合性を維持
  - _Requirements: 7.3_

- [x] 9. SpecListのリアクティブ更新を確認する
  - phase変更時に手動リフレッシュなしでステータスが更新されることを確認
  - ファイル監視によるリアクティブ更新が正しく動作することを検証
  - `inspection-complete` から `deploy-complete` への遷移が即座に反映されることを確認
  - _Requirements: 4.4_

- [x] 10. 統合テストを実装する
- [x] 10.1 specsWatcherServiceとFileServiceの連携テスト
  - spec.json変更イベントからGO判定解析、phase更新までの一連フローを検証
  - spec.json変更イベントからdeploy_completed検出、phase更新までの一連フローを検証
  - 異常系（JSON不正、フィールド欠落）の挙動を検証
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10.2 WebSocket通知の統合テスト
  - phase更新時にRemote UIへSPEC_UPDATEDメッセージが送信されることを検証
  - メッセージに正しいspecIdとphaseが含まれることを検証
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 10.3 SpecList表示の統合テスト
  - `inspection-complete` のSpecに「検査完了」が表示されることを検証
  - `deploy-complete` のSpecに「デプロイ完了」が表示されることを検証
  - phase変更時の自動更新動作を検証
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 11. symbol-semantic-map.mdを更新する
  - 新しいSpecPhase値（`inspection-complete`, `deploy-complete`）をドキュメントに追加
  - 各phase値の意味と遷移条件を記載
  - UIラベル（「検査完了」「デプロイ完了」）との対応を記載
  - _Requirements: 運用タスク（S-2）_
