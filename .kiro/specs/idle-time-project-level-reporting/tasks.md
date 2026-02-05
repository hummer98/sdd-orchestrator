# Implementation Plan

## Task 1. useWindowFocusTracker フックの実装

- [x] 1.1 (P) ウィンドウフォーカス状態を追跡するフックを作成する
  - `isFocused` と `getLastActivityTime` を返却するフックを実装
  - フォーカス取得時に現在時刻を `lastActivityTime` として記録
  - フォーカス喪失時は `lastActivityTime` を保持（更新しない）
  - フォーカス中は10秒間隔で `lastActivityTime` を更新
  - クリーンアップ時にイベントリスナーとインターバルを解除
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.2 (P) useWindowFocusTracker のユニットテストを作成する
  - フォーカス取得時の `lastActivityTime` 更新を検証
  - フォーカス喪失時の値保持を検証
  - フォーカス中の10秒間隔更新を検証（fake timers使用）
  - クリーンアップ時のイベントリスナー解除を検証
  - _Requirements: 5.2_

## Task 2. useIdleTimeSync フックの拡張

- [x] 2.1 useIdleTimeSync にオプションパラメータとプロジェクト選択条件を追加する
  - `UseIdleTimeSyncOptions` インタフェースを追加（`projectPath: string | null`）
  - `projectPath` が null の場合は報告をスキップする条件分岐を追加
  - プロジェクト変更時も継続して報告できるようフックを常時マウント維持
  - 依存: 1.1 で作成した useWindowFocusTracker を使用
  - _Requirements: 1.1, 1.2, 1.3_
  - _Method: useIdleTimeSync, UseIdleTimeSyncOptions_
  - _Verify: Grep "UseIdleTimeSyncOptions|projectPath.*null" in useIdleTimeSync.ts_

- [x] 2.2 Spec追跡とフォーカス追跡の優先度制御を実装する
  - HumanActivityTracker.isActive=true かつ getLastActivityTime() が非nullの場合はSpec追跡の時刻を使用
  - 上記以外の場合は useWindowFocusTracker の時刻を使用
  - Spec選択/解除時の自動切り替えを確認
  - 既存のIPCチャネル `SCHEDULE_TASK_REPORT_IDLE_TIME` を継続使用
  - 依存: 1.1 で作成した useWindowFocusTracker を使用
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_
  - _Method: HumanActivityTracker.isActive, getLastActivityTime, useWindowFocusTracker_
  - _Verify: Grep "HumanActivityTracker.*isActive|getLastActivityTime" in useIdleTimeSync.ts_

## Task 3. useIdleTimeSync のテスト拡張

- [x] 3.1 (P) useIdleTimeSync のテストケースを追加する
  - `projectPath=null` 時の報告スキップを検証
  - HumanActivityTracker.isActive=true 時のSpec追跡優先を検証
  - HumanActivityTracker非アクティブ時のフォーカス追跡フォールバックを検証
  - Spec選択/解除時の切り替えを検証
  - Vitestのfake timersを使用してタイミング依存を排除
  - _Requirements: 5.1, 5.3_

## Task 4. App.tsx への統合

- [x] 4.1 App.tsx で useIdleTimeSync フックを呼び出す
  - useProjectStore から projectPath を取得
  - useIdleTimeSync に projectPath オプションを渡す
  - プロジェクト選択状態に応じた自動有効化/無効化を確認
  - _Requirements: 1.1, 1.2, 1.3_
  - _Method: useIdleTimeSync, useProjectStore_
  - _Verify: Grep "useIdleTimeSync" in App.tsx_

## Task 5. hooks/index.ts のエクスポート更新

- [x] 5.1 useWindowFocusTracker を hooks/index.ts からエクスポートする
  - 新規フックのエクスポート追加
  - 依存: 1.1 完了後
  - _Requirements: 2.1_

## Task 6. 統合テスト（オプション）

- [x]* 6.1 Main Process側でのアイドル時間計算を検証する統合テストを作成する
  - Renderer側から報告されたlastActivityTimeがIdleTimeTrackerに正しく反映されることを検証
  - IPC通信の正常性を確認
  - 本タスクはオプション（ユニットテストで主要なロジックはカバー済み）
  - _Requirements: 5.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | プロジェクト選択時にuseIdleTimeSync有効化 | 2.1, 4.1 | Feature |
| 1.2 | プロジェクト未選択時は報告しない | 2.1, 4.1 | Feature |
| 1.3 | プロジェクト変更時も継続 | 2.1, 4.1 | Feature |
| 2.1 | フォーカス取得時にlastActivityTime記録 | 1.1, 5.1 | Feature |
| 2.2 | フォーカス喪失時は値保持 | 1.1 | Feature |
| 2.3 | フォーカス中10秒間隔で更新 | 1.1 | Feature |
| 2.4 | バックグラウンド時のアイドル計算 | 1.1 | Feature |
| 3.1 | HAT.isActive=true優先 | 2.2 | Feature |
| 3.2 | HAT非アクティブ時フォールバック | 2.2 | Feature |
| 3.3 | Spec選択時切り替え | 2.2 | Feature |
| 3.4 | Spec解除時切り替え | 2.2 | Feature |
| 4.1 | 10秒間隔同期 | 2.2 | Feature |
| 4.2 | 既存IPCチャネル使用 | 2.2 | Feature |
| 4.3 | エラー時ログ出力と再試行 | 2.2 | Feature |
| 5.1 | Spec追跡優先ロジックテスト | 3.1 | Testing |
| 5.2 | フォーカス状態テスト | 1.2 | Testing |
| 5.3 | プロジェクト未選択テスト | 3.1 | Testing |
| 5.4 | 統合テスト（オプション） | 6.1 | Testing |
