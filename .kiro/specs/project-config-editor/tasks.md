# Implementation Plan

## 1. 共有基盤の実装

- [x] 1.1 (P) ProjectFileInfo型とIPCチャンネル定義を追加
  - `ProjectFileInfo`型（relativePath, fileName, group, exists）を`shared/api/types.ts`に追加
  - `PROJECT_FILE_CHANNELS`定数（LIST/READ/WRITE/CHANGED）を`main/ipc/channels.ts`に追加
  - `DocsTab`型に`'project'`を追加
  - _Requirements: 2.2, 2.3_

- [x] 1.2 (P) projectEditorStoreを実装
  - `shared/stores/projectEditorStore.ts`を新規作成
  - 現在のファイルパス、コンテンツ、dirty状態を管理
  - loadFile, setContent, save, clearEditorアクションを実装
  - 外部変更検知フラグ（externalChangeDetected）を管理
  - _Requirements: 4.1, 4.4, 5.2_

## 2. Main Process サービスの実装

- [x] 2.1 ProjectFileWatcherServiceを実装
  - `main/services/ProjectFileWatcherService.ts`を新規作成
  - chokidarで`.kiro/steering/*.md`とCLAUDE.mdを監視
  - 変更検知時にRendererへイベント通知（300ms debounce）
  - start/stopメソッドでプロジェクト切り替え対応
  - _Requirements: 5.1_
  - _Method: chokidar.watch_
  - _Verify: Grep "chokidar" in ProjectFileWatcherService.ts_

- [x] 2.2 projectFileHandlersを実装
  - `main/ipc/projectFileHandlers.ts`を新規作成
  - LIST_PROJECT_FILES: CLAUDE.mdとsteering/*.mdの一覧を返す
  - READ_PROJECT_FILE: 指定ファイルの内容を返す
  - WRITE_PROJECT_FILE: 指定ファイルに内容を書き込む
  - PROJECT_FILE_CHANGED: 外部変更イベントをRendererに転送
  - ProjectFileWatcherServiceを初期化・開始
  - _Requirements: 3.1, 4.1, 5.4_
  - _Depends on: 2.1_

- [x] 2.3 IPCハンドラをMainプロセスに登録
  - `main/ipc/index.ts`でprojectFileHandlersを登録
  - preload/index.tsにprojectFile系APIを追加
  - _Requirements: 3.1, 4.1_
  - _Depends on: 2.2_

## 3. Electron UIコンポーネントの実装

- [x] 3.1 (P) ProjectFileListコンポーネントを実装
  - `renderer/components/ProjectFileList.tsx`を新規作成
  - CLAUDE.mdセクションとSteering Filesセクションの2グループ表示
  - ファイルが存在しない場合の空状態表示
  - 選択ファイルのハイライト表示
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.2_

- [x] 3.2 (P) ProjectFileEditorコンポーネントを実装
  - `renderer/components/ProjectFileEditor.tsx`を新規作成
  - MDEditorを使用したMarkdown編集機能
  - Cmd+S/Ctrl+Sでの保存キーボードショートカット
  - 未保存インジケーター（ファイル名横のドット）表示
  - 保存成功時のトースト通知
  - _Requirements: 3.4, 4.1, 4.2, 4.3, 4.4_
  - _Method: MDEditor, useKeyboardShortcuts_
  - _Verify: Grep "onKeyDown.*Cmd\+S|Ctrl\+S" in ProjectFileEditor.tsx_

- [x] 3.3 ExternalChangeDialogコンポーネントを実装
  - `renderer/components/ExternalChangeDialog.tsx`を新規作成
  - 「リロード」「無視」の2択を提供するダイアログ
  - projectEditorStoreのexternalChangeDetected状態と連携
  - _Requirements: 5.2, 5.3, 5.4, 5.5_
  - _Depends on: 1.2_

- [x] 3.4 ProjectPaneコンポーネントを実装
  - `renderer/components/ProjectPane.tsx`を新規作成
  - ProjectFileListとProjectFileEditorを組み合わせたレイアウト
  - ファイル選択時にprojectEditorStore.loadFileを呼び出し
  - 外部変更イベントのリスナー設定
  - _Requirements: 3.1, 3.3_
  - _Depends on: 3.1, 3.2, 3.3_

## 4. Electron版タブ統合

- [x] 4.1 DocsTabsコンポーネントを拡張
  - `renderer/components/DocsTabs.tsx`に「Project」タブボタンを追加
  - タブ選択時のアクティブ状態スタイル適用
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 4.2 App.tsxにProjectビュー統合
  - `activeTab === 'project'`の条件分岐を追加
  - ProjectPane表示時に右サイドバー（RightSidebar）を非表示
  - タブ切り替え時のエディタ状態リセット
  - _Requirements: 1.2, 3.3_
  - _Depends on: 3.4, 4.1_

## 5. Remote UI共有基盤の実装

- [x] 5.1 (P) WebSocketApiClientにprojectFile系メソッドを追加
  - `shared/api/WebSocketApiClient.ts`にlistProjectFiles, readProjectFile, writeProjectFileメソッドを追加
  - onProjectFileChangedイベントリスナー追加
  - _Requirements: 3.1, 4.1, 6.2_

- [x] 5.2 (P) IpcApiClientにprojectFile系メソッドを追加
  - `shared/api/IpcApiClient.ts`にlistProjectFiles, readProjectFile, writeProjectFileメソッドを追加
  - onProjectFileChangedイベントリスナー追加
  - _Requirements: 3.1, 4.1_

- [x] 5.3 WebSocketハンドラにprojectFile操作を追加
  - `main/services/webSocketHandler.ts`にprojectFile系リクエストのハンドリングを追加
  - PROJECT_FILE_CHANGEDイベントのRemote UIへのブロードキャスト
  - _Requirements: 5.2, 6.2_
  - _Depends on: 2.2_

## 6. Remote UI コンポーネントの実装

- [x] 6.1 (P) ProjectViewコンポーネントを実装
  - `remote-ui/views/ProjectView.tsx`を新規作成
  - ファイル一覧表示（CLAUDE.md / Steering Filesの2グループ）
  - ファイル選択時にnavigationStackでProjectDetailPageへ遷移
  - _Requirements: 6.2_

- [x] 6.2 (P) RemoteProjectEditorコンポーネントを実装
  - `remote-ui/components/RemoteProjectEditor.tsx`を新規作成
  - WebSocketApiClient経由でファイル読み書き
  - MDEditorを使用したMarkdown編集機能
  - 保存ショートカットと通知
  - _Requirements: 6.3_

- [x] 6.3 ProjectDetailPageコンポーネントを実装
  - `remote-ui/components/ProjectDetailPage.tsx`を新規作成
  - モバイル詳細ページとして戻るボタンを配置
  - RemoteProjectEditorをラップ
  - _Requirements: 6.3, 6.4_
  - _Depends on: 6.2_

## 7. Remote UI レイアウト統合

- [x] 7.1 MobileLayoutにProjectタブを追加
  - `remote-ui/layouts/MobileLayout.tsx`のTAB_CONFIGに`project`タブを追加
  - アイコンとラベル設定
  - _Requirements: 6.1_

- [x] 7.2 Remote UI App.tsxにProjectビュー統合
  - `remote-ui/App.tsx`でactiveTab === 'project'時にProjectViewを表示
  - navigationStackに`project`コンテキスト対応を追加
  - _Requirements: 6.1, 6.2, 6.3_
  - _Depends on: 6.1, 6.3, 7.1_

## 8. DesktopLayout（Remote UI）の対応

- [x] 8.1 DesktopLayoutにProjectタブを追加
  - `remote-ui/layouts/DesktopLayout.tsx`の左サイドバータブにProject追加
  - Electron版と同等のレイアウト構成を維持
  - _Requirements: 6.1, 6.2_

- [x] 8.2 DesktopLayout用ProjectViewの統合
  - activeTab === 'project'時にProjectViewとRemoteProjectEditorを表示
  - 右サイドバー非表示の適用
  - _Requirements: 3.3, 6.2_
  - _Depends on: 6.1, 6.2, 8.1_

## 9. 統合テスト

- [x] 9.1 projectEditorStoreのユニットテスト
  - loadFile、save、setContent、dirty状態遷移のテスト
  - externalChangeDetectedフラグのテスト
  - _Requirements: 4.1, 4.4, 5.2_

- [x] 9.2 projectFileHandlersの統合テスト
  - IPC経由のファイル一覧取得テスト
  - ファイル読み書きフローのテスト
  - _Requirements: 3.1, 4.1_
  - _Integration Point: Design.md "ファイル選択から編集・保存フロー"_

- [x] 9.3 ProjectFileWatcherServiceのユニットテスト
  - start/stop、変更検知、debounceのテスト
  - _Requirements: 5.1_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 左サイドバーに3タブ表示 | 4.1 | Feature |
| 1.2 | Projectタブクリックで切り替え | 4.1, 4.2 | Feature |
| 1.3 | アクティブ状態の視覚表示 | 4.1 | Feature |
| 2.1 | ファイル一覧表示 | 3.1 | Feature |
| 2.2 | 2グループ表示 | 1.1, 3.1 | Infrastructure, Feature |
| 2.3 | ファイル名表示 | 1.1, 3.1 | Infrastructure, Feature |
| 2.4 | CLAUDE.md不在時の表示 | 3.1 | Feature |
| 2.5 | Steeringファイル不在時の表示 | 3.1 | Feature |
| 3.1 | ファイル選択でエディタ表示 | 2.2, 2.3, 3.4, 5.1, 5.2, 9.2 | Feature, Infrastructure |
| 3.2 | 選択ファイルのハイライト | 3.1 | Feature |
| 3.3 | 右パネル非表示 | 4.2, 8.2 | Feature |
| 3.4 | エディタで編集可能 | 3.2 | Feature |
| 4.1 | Cmd+S保存 | 1.2, 2.2, 2.3, 3.2, 5.1, 5.2, 9.1, 9.2 | Infrastructure, Feature |
| 4.2 | 保存成功トースト | 3.2 | Feature |
| 4.3 | 保存失敗エラー表示 | 3.2 | Feature |
| 4.4 | 未保存インジケーター | 1.2, 3.2, 9.1 | Infrastructure, Feature |
| 5.1 | 外部変更監視 | 2.1, 9.3 | Infrastructure |
| 5.2 | 外部変更通知 | 1.2, 3.3, 5.3, 9.1 | Infrastructure, Feature |
| 5.3 | リロード/無視選択 | 3.3 | Feature |
| 5.4 | リロード時の再読み込み | 2.2, 3.3 | Feature |
| 5.5 | 無視時の現状維持 | 3.3 | Feature |
| 6.1 | Mobile版タブ追加 | 7.1, 7.2, 8.1 | Feature |
| 6.2 | Mobileファイル一覧 | 5.1, 6.1, 7.2, 8.1, 8.2 | Infrastructure, Feature |
| 6.3 | Mobile詳細ページ | 6.2, 6.3, 7.2 | Feature |
| 6.4 | Mobile戻るボタン | 6.3 | Feature |
