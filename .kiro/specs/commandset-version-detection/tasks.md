# Implementation Plan

## Task Summary

- **Total**: 6 major tasks, 16 sub-tasks
- **Requirements Coverage**: 1.1-1.4, 2.1-2.5, 3.1-3.4, 4.1-4.3, 5.1-5.4, 6.1-6.4

---

## Tasks

- [x] 1. sdd-orchestrator.jsonスキーマのv3拡張
- [x] 1.1 (P) ProjectConfigServiceにv3スキーマ定義を追加
  - v3スキーマ用Zodスキーマを定義（version: 3, commandsetsフィールド追加）
  - CommandsetVersionRecordスキーマを定義（version, installedAt）
  - 既存v2フィールド（profile, layout）との後方互換性を維持
  - commandsetsフィールドをオプショナルとして定義
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 1.2 (P) v2からv3へのマイグレーション処理を実装
  - loadProjectConfig内でv2→v3自動マイグレーションを追加
  - commandsetsフィールドがない場合もエラーにしない
  - 保存時はversion: 3として書き込み
  - 既存のprofile/layoutデータを維持
  - _Requirements: 6.3, 6.4_

- [x] 1.3 loadCommandsetVersions/saveCommandsetVersionsメソッドを追加
  - loadCommandsetVersionsでcommandsetsフィールドを読み込み
  - レガシーフォーマットの場合はundefinedを返す
  - saveCommandsetVersionsでcommandsetsフィールドを保存
  - 既存のprofile/layoutは上書きせず保持
  - _Requirements: 1.1, 1.2, 1.3, 6.2_

- [x] 2. CommandsetDefinitionManagerのバージョンSSO化
- [x] 2.1 (P) getVersion/getAllVersionsメソッドを追加
  - getVersionで指定コマンドセットのバージョンを取得
  - getAllVersionsで全コマンドセットのバージョンマップを取得
  - 未知のコマンドセットには"0.0.0"を返す
  - 既存のgetDefinitionを活用
  - _Requirements: 5.1, 5.3_

- [x] 2.2 (P) UpdateManagerのLATEST_VERSIONS定数を削除
  - UpdateManagerからLATEST_VERSIONS定数を削除
  - バージョン参照をCommandsetDefinitionManager経由に変更
  - 既存のdetectVersion機能がある場合は整理
  - isNewerVersionメソッドをCommandsetDefinitionManagerに追加
  - _Requirements: 5.2, 5.4_

- [x] 3. UnifiedCommandsetInstallerのバージョン記録機能
- [x] 3.1 インストール完了時にバージョン情報を記録
  - installByProfile/installCommandset完了後にバージョン記録
  - CommandsetDefinitionManagerからバージョン取得
  - ProjectConfigService.saveCommandsetVersionsを呼び出し
  - インストール成功したコマンドセットのみ記録
  - 各コマンドセットにinstalledAtタイムスタンプを付与
  - 1.1, 1.3依存: スキーマとメソッドが必要
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. CommandsetVersionServiceの実装
- [x] 4.1 CommandsetVersionServiceを新規作成
  - checkVersionsメソッドでプロジェクトのバージョン状態をチェック
  - compareVersionsメソッドでセマンティックバージョン比較
  - VersionCheckResult型を定義
  - CommandsetVersionInfo型を定義
  - 1.3依存: loadCommandsetVersionsが必要
  - _Requirements: 2.1, 2.5_

- [x] 4.2 レガシープロジェクトの0.0.1扱い処理
  - commandsetsフィールドがない場合はバージョン0.0.1として扱う
  - sdd-orchestrator.json自体がない場合はhasCommandsets: falseを返す
  - JSONパースエラー時もレガシーとして扱う
  - _Requirements: 2.3, 2.4_

- [x] 4.3 更新必要判定ロジックの実装
  - インストール済みバージョン < 期待バージョンで更新必要と判定
  - anyUpdateRequiredフラグを適切に設定
  - 不正なバージョン形式は0.0.0として扱い更新必要と判定
  - 4.1, 4.2依存: 基盤実装後
  - _Requirements: 2.2_

- [x] 4.4 IPCハンドラにcheckCommandsetVersionsを追加
  - IPCチャンネル定義を追加
  - RendererからVersionServiceを呼び出せるようにする
  - 4.3依存: サービス完成後
  - _Requirements: 2.1_

- [x] 5. VersionStatusStoreとUI警告表示
- [x] 5.1 VersionStatusStoreを新規作成
  - プロジェクトパス→VersionCheckResultのマップを管理
  - checkProjectVersionsアクションを実装
  - isCheckingフラグで読み込み状態を管理
  - clearVersionStatusアクションを実装
  - versionStatusStore.ts作成済み
  - _Requirements: 3.1_

- [x] 5.2 RecentProjectsに警告アイコンを追加
  - anyUpdateRequired時にAlertTriangleアイコンを表示
  - VersionStatusStoreから状態を取得
  - プロジェクト一覧読み込み時にバージョンチェックを実行
  - UpdateBanner.tsxコンポーネント作成済み
  - 5.1, 4.4依存: Storeとサービスが必要
  - _Requirements: 3.1, 3.2_

- [x] 5.3 ホバー時ツールチップを実装
  - 更新が必要なコマンドセット名を表示
  - 現在バージョンと期待バージョンを表示
  - Lucide Reactのコンポーネントを使用
  - UpdateBanner.tsxに詳細表示実装済み
  - _Requirements: 3.3_

- [x] 5.4 詳細パネルにバージョン状態を表示
  - プロジェクト選択時に詳細パネルでバージョン情報を表示
  - 各コマンドセットのインストール状態を一覧表示
  - LegacyProjectBannerコンポーネント作成済み
  - _Requirements: 3.4_

- [x] 6. 再インストール促進UIと統合テスト
- [x] 6.1 更新ボタンとインストールダイアログ連携
  - 更新が必要なプロジェクト選択時に更新促進UIを表示
  - 更新ボタンクリックでコマンドセットインストールダイアログを開く
  - UpdateBannerにonUpdateコールバック実装済み
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6.2 ユニットテストの追加
  - CommandsetVersionService.compareVersionsのテスト
  - CommandsetVersionService.checkVersionsのテスト（レガシー/v3両対応）
  - ProjectConfigService.loadCommandsetVersionsのマイグレーションテスト
  - CommandsetDefinitionManager.getVersion/getAllVersionsのテスト
  - commandsetVersionService.test.ts, commandsetDefinitionManager.test.ts, layoutConfigService.test.tsに追加済み
  - _Requirements: 2.5, 5.1_

- [x] 6.3 統合フローの検証
  - インストール→バージョン記録→読み込みの一連フロー確認
  - v2→v3マイグレーション時のデータ保持確認
  - 複数プロジェクトの並列バージョンチェック確認
  - unifiedCommandsetInstaller.test.tsに統合テスト追加済み
  - _Requirements: 1.1, 1.4, 2.1, 6.3_
