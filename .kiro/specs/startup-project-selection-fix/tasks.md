# Implementation Plan: 起動時プロジェクト選択シーケンス修正

## Tasks

- [x] 1. Main Process: selectProject結果キャッシュ管理
- [x] 1.1 (P) 結果キャッシュ変数と管理関数を追加
  - handlers.tsに`initialSelectResult`変数を追加
  - `setInitialSelectResult`関数でキャッシュ設定
  - `getInitialSelectResult`関数でキャッシュ取得
  - `clearInitialSelectResult`関数でキャッシュクリア
  - 起動時パス検出後、`selectProject`実行結果をキャッシュに保存
  - _Requirements: 1.1_
  - _Method: setInitialSelectResult, getInitialSelectResult, clearInitialSelectResult_
  - _Verify: Grep "initialSelectResult|setInitialSelectResult|getInitialSelectResult" in handlers.ts_

- [x] 2. IPC/Preload: PROJECT_SELECTEDチャネル追加
- [x] 2.1 (P) IPCチャネル定義を追加
  - channels.tsに`PROJECT_SELECTED`チャネル名を定義
  - _Requirements: 1.2_
  - _Verify: Grep "PROJECT_SELECTED" in channels.ts_

- [x] 2.2 onProjectSelectedリスナーAPIをpreloadに追加
  - preload/index.tsに`onProjectSelected`関数を実装
  - 既存の`onAgentStatusChange`と同様のパターンでコールバック登録
  - クリーンアップ関数を返却してリスナー解除を可能に
  - _Requirements: 1.3_
  - _Depends on: 2.1 (PROJECT_SELECTEDチャネル定義)_
  - _Method: onProjectSelected, ipcRenderer.on_
  - _Verify: Grep "onProjectSelected" in preload/index.ts_

- [x] 2.3 (P) electronAPI型定義を更新
  - electron.d.tsに`onProjectSelected`の型を追加
  - コールバックは`SelectProjectResult`を受け取る
  - 戻り値はクリーンアップ関数`() => void`
  - _Requirements: 1.3_
  - _Verify: Grep "onProjectSelected" in electron.d.ts_

- [x] 3. Renderer Store: 統一結果適用処理の実装
- [x] 3.1 applySelectProjectResultアクションをprojectStoreに追加
  - `SelectProjectResult`を受け取りストアを更新する処理を抽出
  - 成功時: `currentProject`、`kiroValidation`等を設定
  - specs/bugsストアの同期処理を含める
  - _Requirements: 2.1, 2.4_
  - _Method: applySelectProjectResult_
  - _Verify: Grep "applySelectProjectResult" in projectStore.ts_

- [x] 3.2 既存のselectProjectアクションをリファクタリング
  - IPC呼び出し後の更新処理を`applySelectProjectResult`呼び出しに置換
  - 外部インターフェースは変更しない
  - _Requirements: 2.3, 3.3_
  - _Depends on: 3.1 (applySelectProjectResult実装)_
  - _Method: selectProject, applySelectProjectResult_
  - _Verify: Grep "applySelectProjectResult" in projectStore.ts_

- [x] 4. Main Process: 起動時ブロードキャスト実装
- [x] 4.1 ウィンドウready-to-show後にブロードキャストを送信
  - index.tsでウィンドウ`ready-to-show`イベントをハンドル
  - `getInitialSelectResult()`でキャッシュされた結果を取得
  - 結果が存在する場合、`webContents.send(PROJECT_SELECTED, result)`でブロードキャスト
  - `window.isDestroyed()`チェックで安全性を確保
  - ブロードキャスト後にキャッシュをクリア
  - _Requirements: 1.2, 4.1, 4.3_
  - _Depends on: 1.1 (キャッシュ管理), 2.1 (チャネル定義)_
  - _Method: webContents.send, getInitialSelectResult, clearInitialSelectResult_
  - _Verify: Grep "PROJECT_SELECTED|ready-to-show" in index.ts_

- [x] 5. Renderer: 起動時リスナー登録
- [x] 5.1 App.tsxにonProjectSelectedリスナーを登録
  - 既存の`setupEventListeners` useEffectパターンを踏襲
  - `window.electronAPI.onProjectSelected`でリスナー登録
  - コールバック内で`projectStore.applySelectProjectResult`を呼び出し
  - useEffect cleanup でリスナー解除
  - _Requirements: 1.3, 1.4, 2.2_
  - _Depends on: 2.2 (preload API), 3.1 (applySelectProjectResult)_
  - _Method: onProjectSelected, applySelectProjectResult_
  - _Verify: Grep "onProjectSelected|applySelectProjectResult" in App.tsx_

- [x] 6. テスト実装
- [x] 6.1 (P) handlers.tsキャッシュ管理のユニットテスト
  - `setInitialSelectResult`で結果がキャッシュされることを検証
  - `getInitialSelectResult`で結果が取得できることを検証
  - `clearInitialSelectResult`でキャッシュがクリアされることを検証
  - _Requirements: 1.1_

- [x] 6.2 (P) applySelectProjectResultのユニットテスト
  - 成功結果でストアが正しく更新されることを検証
  - 失敗結果でエラー状態が設定されることを検証
  - _Requirements: 2.1, 2.4, 3.3_

- [x] 6.3 E2Eテストで起動時フローを検証
  - `SDD_PROJECT_PATH`環境変数を設定してアプリを起動
  - 起動後、指定プロジェクトが選択された状態であることを確認
  - Spec一覧が表示されることを確認
  - _Requirements: 3.1, 3.2, 3.3_
  - _Depends on: 5.1 (全実装完了後)_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 環境変数指定時にMain processがselectProject実行しキャッシュ | 1.1 | Implementation |
| 1.2 | ウィンドウ作成後にブロードキャスト | 2.1, 4.1 | Implementation |
| 1.3 | Rendererがブロードキャスト受信時にストア更新 | 2.2, 2.3, 5.1 | Implementation |
| 1.4 | ストア更新完了時にUI表示 | 5.1 | Implementation |
| 2.1 | SelectProjectResultを受け取る単一処理 | 3.1 | Implementation |
| 2.2 | 起動時ブロードキャスト受信時に統一処理使用 | 5.1 | Integration |
| 2.3 | UIからのプロジェクト選択時に統一処理使用 | 3.2 | Implementation |
| 2.4 | 統一処理がspecs/bugsストア更新等を行う | 3.1 | Implementation |
| 3.1 | E2EテストがSDD_PROJECT_PATH指定起動 | 6.3 | E2E Test |
| 3.2 | E2EテストがselectProjectViaStore使用 | 6.3 | E2E Test |
| 3.3 | 起動時とUI選択で同じ最終状態を保証 | 3.2, 6.2 | Test |
| 4.1 | 起動時ブロードキャストはElectron Rendererのみ対象 | 4.1 | Implementation |
| 4.2 | Remote UIは従来通りWebSocket経由 | - | No change required |
| 4.3 | 起動時ブロードキャストとRemote UI通信を独立処理 | 4.1 | Implementation |
