# Implementation Plan

## 1. Artifact存在チェック機能の実装

- [x] 1.1 (P) `createSpecDetailProvider`でartifact存在チェックを実装する
  - `FileService.getArtifactInfo()`を使用して各アーティファクトの存在をチェックするヘルパー関数を作成
  - 5種類のアーティファクト（requirements, design, tasks, research, inspection）をチェック
  - `getArtifactInfo()`の戻り値（`ArtifactInfo | null`）を`{ exists: boolean }`に変換
  - `Promise.all()`で5つのチェックを並列実行してパフォーマンスを確保
  - 既存のハードコード（`exists: false`）を動的チェック結果で置き換え
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2_
  - _Method: FileService.getArtifactInfo, Promise.all_
  - _Verify: Grep "getArtifactInfo|Promise\\.all" in remoteAccessHandlers.ts_

## 2. ユニットテスト

- [x] 2.1 (P) `createSpecDetailProvider`のartifact存在チェックをテストする
  - 全artifactが存在する場合に正しい`exists: true`を返すことを検証
  - 一部artifactのみ存在する場合に正しい`exists`値を返すことを検証
  - 全artifactが存在しない場合に全て`exists: false`を返すことを検証
  - `FileService.getArtifactInfo`が`null`を返す場合のマッピングを確認
  - 5つのチェックが並列実行されることを検証
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2_

## 3. 統合テスト

- [x] 3.1 WebSocket経由のGET_SPEC_DETAILで正しいartifactsが返ることをテストする
  - テスト用Specディレクトリをセットアップ
  - 一部のartifactファイル（requirements.md, design.md）のみ作成
  - WebSocket経由でGET_SPEC_DETAILを呼び出し
  - 存在するartifactの`exists`が`true`、存在しないartifactの`exists`が`false`であることを検証
  - テスト用Specディレクトリをクリーンアップ
  - `waitFor`パターンでWebSocketレスポンスを待機（固定スリープを避ける）
  - _Requirements: 1.1, 1.2, 1.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | GET_SPEC_DETAIL時にartifacts存在チェック | 1.1, 2.1, 3.1 | Feature, Test |
| 1.2 | 存在するartifactのexistsをtrueに設定 | 1.1, 2.1, 3.1 | Feature, Test |
| 1.3 | 存在しないartifactのexistsをfalseに設定 | 1.1, 2.1, 3.1 | Feature, Test |
| 1.4 | FileServiceの既存メソッドを使用 | 1.1, 2.1 | Feature, Test |
| 1.5 | 並列実行でパフォーマンス確保 | 1.1, 2.1 | Feature, Test |
| 2.1 | document-reviewタブ表示に影響なし | - | 既存ロジック維持（変更なし） |
| 2.2 | inspectionタブ表示に影響なし | - | 既存ロジック維持（変更なし） |
| 2.3 | markdownFilesタブ表示に影響なし | - | 既存ロジック維持（変更なし） |
| 3.1 | inspection.md存在時にexists: true | 1.1, 2.1 | Feature, Test |
| 3.2 | inspection.md非存在時にexists: false | 1.1, 2.1 | Feature, Test |
