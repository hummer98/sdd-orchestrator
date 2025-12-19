# Research & Design Decisions

## Summary
- **Feature**: multi-window-support
- **Discovery Scope**: Complex Integration
- **Key Findings**:
  - Electronの`BrowserWindow.getAllWindows()`と`BrowserWindow.getFocusedWindow()`を活用したウィンドウ管理が基本戦略
  - electron-storeを既に使用中のため、マルチウィンドウ状態永続化も同ライブラリで対応可能
  - 既存の単一ウィンドウ設計からの移行にはWindowManagerサービスの導入が必要

## Research Log

### Electron マルチウィンドウ管理パターン
- **Context**: 複数ウィンドウの管理方法とベストプラクティスの調査
- **Sources Consulted**:
  - [Electron BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window)
  - [Multiple Windows in Electron apps](https://blog.bloomca.me/2025/07/21/multi-window-in-electron.html)
  - [How to Handle Multiple Windows in an Electron App](https://spin.atomicobject.com/multiple-windows-electron-app/)
- **Findings**:
  - `BrowserWindow.getAllWindows()`: 全ウィンドウの配列を取得
  - `BrowserWindow.getFocusedWindow()`: フォーカス中のウィンドウを取得
  - `BrowserWindow.fromWebContents()`: WebContentsからウィンドウを特定
  - ウィンドウIDはアプリケーション全体でユニーク
  - メモリ消費: 各ウィンドウあたり150-250MB程度（Chromiumプロセス分離モデル）
  - Setを使ったウィンドウ管理が削除時に効率的
- **Implications**:
  - WindowManagerサービスで`Map<windowId, WindowState>`構造を採用
  - プロジェクトパスをキーとした重複チェック機構が必要

### ウィンドウ状態永続化
- **Context**: アプリ再起動時のウィンドウ復元方法の調査
- **Sources Consulted**:
  - [electron-window-state](https://github.com/mawie81/electron-window-state)
  - [electron-store](https://github.com/sindresorhus/electron-store)
  - [Electron RFC: Save/Restore Window-State API](https://github.com/electron/rfcs/blob/main/text/0016-save-restore-window-state.md)
- **Findings**:
  - electron-window-stateは複数ウィンドウ対応（異なるファイル名でインスタンス作成）
  - 既存実装でelectron-storeを使用中（configStore.ts）
  - 保存対象: x, y, width, height, isMaximized, isMinimized
  - マルチディスプレイ対応: `screen.getDisplayMatching()`で有効なディスプレイを確認
- **Implications**:
  - 既存のconfigStore.tsを拡張してマルチウィンドウ状態を保存
  - ディスプレイ存在チェックを復元時に実施

### macOS アプリライフサイクル
- **Context**: macOSでの正しいアプリ終了動作の確認
- **Sources Consulted**:
  - Electron公式ドキュメント
  - 既存実装（index.ts）
- **Findings**:
  - 現在の実装: `window-all-closed`イベントでmacOS以外は`app.quit()`
  - `activate`イベント: ドックアイコンクリック時にウィンドウ再作成
  - マルチウィンドウでも同じパターンを維持可能
- **Implications**: 既存のライフサイクル管理ロジックは大きな変更不要

### メニューコンテキスト切替
- **Context**: フォーカスウィンドウに応じたメニュー動作の実装方法
- **Sources Consulted**:
  - 既存実装（menu.ts）
  - Electron Menu/BrowserWindow API
- **Findings**:
  - 現在: `currentProjectPathForMenu`変数でメニュー状態管理
  - `focus`イベントでウィンドウ検出可能
  - `BrowserWindow.getFocusedWindow()`で操作対象ウィンドウ特定
  - メニューは動的に再構築可能（`createMenu()`）
- **Implications**:
  - WindowManagerがフォーカス変更を監視
  - メニュー状態を各ウィンドウのプロジェクトパスに同期

### IPC通信パターン
- **Context**: 複数ウィンドウ間でのIPC通信の設計
- **Sources Consulted**:
  - 既存実装（handlers.ts, preload/index.ts）
  - Electron IPC ドキュメント
- **Findings**:
  - 現在: 単一のspecManagerService、specsWatcherServiceインスタンス
  - `BrowserWindow.fromWebContents(event.sender)`で送信元ウィンドウ特定
  - 各ウィンドウに独立したWatcher/Serviceが必要
  - Broadcast Channel APIはウィンドウ間同期に有効
- **Implications**:
  - ウィンドウごとに独立したサービスインスタンス管理
  - WindowManagerがウィンドウ-プロジェクト-サービスのマッピングを保持

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Centralized WindowManager | Main processに単一のWindowManagerサービス | 状態の一元管理、重複チェック容易 | 複雑度増加 | **採用** |
| Window-per-Project Map | プロジェクトパスをキーにウィンドウ管理 | 重複防止が自然 | 異なるパス表記の正規化必要 | WindowManager内で使用 |
| Service Instance Pool | ウィンドウごとにサービスインスタンス保持 | 独立性確保 | リソース消費増 | 必須パターン |

## Design Decisions

### Decision: WindowManager サービスの導入
- **Context**: 複数ウィンドウの作成・管理・状態追跡を一元化する必要がある
- **Alternatives Considered**:
  1. 既存のindex.tsにマルチウィンドウロジックを追加
  2. 新規WindowManagerサービスを作成
- **Selected Approach**: WindowManagerサービスを新規作成し、ウィンドウのライフサイクル管理を担当
- **Rationale**:
  - 単一責任の原則に従う
  - テスタビリティの向上
  - 既存コードへの影響最小化
- **Trade-offs**:
  - 新規ファイル追加による複雑度増加
  - main/index.tsとの連携が必要
- **Follow-up**: ウィンドウ作成/破棄のテストケース作成

### Decision: プロジェクトパスをキーとした重複防止
- **Context**: 同一プロジェクトの複数オープン防止（Requirement 3）
- **Alternatives Considered**:
  1. ファイルパス文字列の直接比較
  2. 正規化（realpath）後の比較
  3. inode等のファイルシステムレベル比較
- **Selected Approach**: `path.resolve()`で正規化後、Map<projectPath, windowId>で管理
- **Rationale**:
  - シンボリックリンク解決には`fs.realpath`が必要だが、通常ケースでは`path.resolve`で十分
  - パフォーマンスと信頼性のバランス
- **Trade-offs**: シンボリックリンク経由の同一プロジェクト検出は非対応
- **Follow-up**: 必要に応じてrealpathオプション追加

### Decision: ウィンドウごとのサービスインスタンス
- **Context**: 各ウィンドウが独立したプロジェクトを操作するため、サービスの分離が必要
- **Alternatives Considered**:
  1. 単一サービス + プロジェクトパスパラメータ
  2. ウィンドウごとに独立したサービスインスタンス
- **Selected Approach**: ウィンドウごとに独立したSpecManagerService、Watcherインスタンスを保持
- **Rationale**:
  - 既存のサービス設計を大きく変更せずに対応可能
  - エージェントプロセスの独立管理が容易
- **Trade-offs**: メモリ消費増加（ウィンドウ数に比例）
- **Follow-up**: ウィンドウクローズ時のリソース解放確認

### Decision: 状態永続化の拡張
- **Context**: 複数ウィンドウの状態をアプリ再起動後に復元（Requirement 4）
- **Alternatives Considered**:
  1. electron-window-stateライブラリの採用
  2. 既存のelectron-store（configStore）を拡張
- **Selected Approach**: 既存のconfigStoreを拡張し、`multiWindowStates`配列として保存
- **Rationale**:
  - 既存の依存関係を増やさない
  - electron-storeのスキーマ機能を活用可能
- **Trade-offs**: 自前実装のため、ライブラリほどの機能網羅性はない
- **Follow-up**: マルチディスプレイ環境でのテスト

## Risks & Mitigations
- **メモリ消費増加** — ウィンドウ数の上限設定（推奨: 10ウィンドウ）、閉じられたウィンドウのリソース即時解放
- **IPC競合** — ウィンドウIDによるルーティング、サービスインスタンスの分離
- **復元時のプロジェクト不存在** — 存在チェック後にスキップ、ユーザー通知
- **メニュー状態の不整合** — フォーカス変更イベントでの即座な同期

## References
- [Electron BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window) - ウィンドウ管理の公式ドキュメント
- [Multiple Windows in Electron apps](https://blog.bloomca.me/2025/07/21/multi-window-in-electron.html) - マルチウィンドウ実装のベストプラクティス
- [electron-window-state](https://github.com/mawie81/electron-window-state) - ウィンドウ状態永続化ライブラリ（参考）
- [electron-store](https://github.com/sindresorhus/electron-store) - 使用中の永続化ライブラリ
- [How to Handle Multiple Windows in an Electron App](https://spin.atomicobject.com/multiple-windows-electron-app/) - Atomic Objectのガイド
