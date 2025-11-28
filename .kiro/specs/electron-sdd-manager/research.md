# Research & Design Decisions

## Summary
- **Feature**: `electron-sdd-manager`
- **Discovery Scope**: New Feature (greenfield) - Electron版SDD Managerアプリケーションの新規開発
- **Key Findings**:
  - Electron 32.xはContext Isolation、Sandboxingがデフォルトで有効化されており、セキュリティ要件を満たす
  - electron-builderはクロスプラットフォームビルドに最適で、macOS/Windows/Linuxに対応
  - zustand + persist middlewareはElectronアプリの状態管理に適しており、既存Tauriアプリでも使用済み

## Research Log

### Electronセキュリティアーキテクチャ
- **Context**: 要件13のセキュリティ要件（Context Isolation、Node Integration無効化、preloadスクリプト）の実現方法
- **Sources Consulted**:
  - [Security | Electron](https://www.electronjs.org/docs/latest/tutorial/security)
  - [Context Isolation | Electron](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
  - [contextBridge | Electron](https://www.electronjs.org/docs/latest/api/context-bridge)
- **Findings**:
  - Context IsolationはElectron 12.0.0以降デフォルトで有効
  - レンダラープロセスでのNode.js APIへの直接アクセスはnodeIntegration: falseで防止
  - contextBridgeを使用してpreloadスクリプトから安全なAPIのみを公開
  - ipcRenderer全体を公開するのはセキュリティリスク、必要な関数のみをラップして公開
- **Implications**:
  - メインプロセス↔レンダラープロセス間の通信はすべてIPC経由
  - preloadスクリプトでAPIを限定的に公開するアーキテクチャを採用

### IPC通信パターン
- **Context**: メインプロセスとレンダラープロセス間の通信設計
- **Sources Consulted**:
  - [Inter-Process Communication | Electron](https://www.electronjs.org/docs/latest/tutorial/ipc)
  - [Electron IPC Response/Request architecture with TypeScript](https://blog.logrocket.com/electron-ipc-response-request-architecture-with-typescript/)
  - [ipcMain | Electron](https://www.electronjs.org/docs/latest/api/ipc-main)
- **Findings**:
  - `ipcMain.handle` / `ipcRenderer.invoke` パターンがリクエスト/レスポンス通信に最適
  - 非同期通信はPromiseベースで処理可能
  - ストリーミング出力には`ipcMain.on` / `webContents.send`パターンを使用
  - TypeScriptで型安全なIPC通信を実現するにはチャネル定義の型付けが必要
- **Implications**:
  - ファイル操作・コマンド実行はhandle/invokeパターン
  - ログストリーミングはイベントベースのon/sendパターン

### コマンド実行とストリーミング出力
- **Context**: 要件8の実行ログリアルタイム表示の実現方法
- **Sources Consulted**:
  - [Node.js Child Processes](https://www.freecodecamp.org/news/node-js-child-processes-everything-you-need-to-know-e69498fe970a/)
  - [Electron Adventures: Streaming Terminal Output](https://dev.to/taw/electron-adventures-episode-16-streaming-terminal-output-431g)
  - [Node.js spawn child process and get terminal output live](https://stackoverflow.com/questions/14332721/node-js-spawn-child-process-and-get-terminal-output-live)
- **Findings**:
  - `child_process.spawn`はストリームAPIを返すためリアルタイム出力に適切
  - `{ shell: true, stdio: ["ignore", "pipe", "pipe"] }`オプションでシェルコマンド実行
  - stdout/stderrイベントをIPC経由でレンダラーに送信
  - shell: trueの場合、ユーザー入力のサニタイズが必須
- **Implications**:
  - spawnを使用してコマンド実行
  - プラットフォーム固有のシェル（cmd/sh）を自動選択
  - 出力をチャンク単位でレンダラーに送信

### クロスプラットフォームビルド
- **Context**: 要件12のmacOS/Windows/Linux対応ビルド
- **Sources Consulted**:
  - [electron-builder](https://www.electron.build/index.html)
  - [Multi Platform Build](https://www.electron.build/multi-platform-build.html)
  - [Why Electron Forge?](https://www.electronforge.io/core-concepts/why-electron-forge)
- **Findings**:
  - electron-builderは成熟したツールで豊富なドキュメント
  - macOSからは全3プラットフォームへのビルドが可能
  - Dockerイメージ（electronuserland/builder:wine）でLinuxからWindowsビルド可能
  - Electron Forgeは公式推奨だがドキュメントが限定的
- **Implications**:
  - electron-builderを採用（設定の柔軟性、ドキュメント充実）
  - CI/CDでのクロスプラットフォームビルドを考慮

### 状態管理とデータ永続化
- **Context**: 最近使用したプロジェクト一覧の保存（要件1.4）
- **Sources Consulted**:
  - [Zustand](https://github.com/pmndrs/zustand)
  - [Persisting store data - Zustand](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
  - [Zutron - Electron State Management](https://github.com/goosewobbler/zutron)
- **Findings**:
  - zustandはシンプルで軽量な状態管理ライブラリ
  - persist middlewareでlocalStorage/electron-storeへの永続化が可能
  - 既存Tauriアプリでzustandを使用済み（移行容易）
  - Zutronでメイン/レンダラー間の状態同期も可能だが、今回は不要
- **Implications**:
  - 既存のzustand構造を維持
  - electron-storeでアプリ設定を永続化

### Markdownエディター
- **Context**: 要件7の成果物編集機能
- **Sources Consulted**:
  - [@uiw/react-md-editor](https://github.com/uiwjs/react-md-editor)
  - [Markdown Editor for React](https://uiwjs.github.io/react-md-editor/)
- **Findings**:
  - 既存TauriアプリでReact MD Editorを使用済み
  - textareaベースで軽量、外部コードエディター依存なし
  - 編集モード/プレビューモードの切り替えをサポート
  - rehype-sanitizeでXSS対策必須
- **Implications**:
  - 既存の@uiw/react-md-editorをそのまま移行

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Layered Architecture | Main/Preload/Renderer の3層構造 | Electron標準パターン、セキュリティ境界が明確 | 層間通信のオーバーヘッド | 採用：Electronの推奨パターン |
| Single Store (Zutron) | メイン/レンダラー間で状態共有 | 状態の一貫性 | 複雑性増加、過剰設計 | 不採用：今回はレンダラー側のみで十分 |
| Module-based | 機能ごとにモジュール分割 | 保守性、テスト容易性 | 初期設計コスト | 採用：大規模化に備える |

## Design Decisions

### Decision: Electron Forge vs electron-builder
- **Context**: クロスプラットフォームビルドツールの選定
- **Alternatives Considered**:
  1. Electron Forge - 公式推奨、first-partyツール統合
  2. electron-builder - 成熟、豊富なドキュメント、高い設定柔軟性
- **Selected Approach**: electron-builder
- **Rationale**:
  - ドキュメントが充実しており導入障壁が低い
  - NSIS対応でWindowsインストーラーサイズを削減
  - 既存プロジェクトでの実績が多く、トラブルシューティング情報が豊富
- **Trade-offs**: Electron新機能の反映がForgeより遅れる可能性
- **Follow-up**: 将来的にElectron Forgeへの移行を検討

### Decision: IPC通信パターン
- **Context**: メイン/レンダラー間の通信方式
- **Alternatives Considered**:
  1. 同期通信（ipcRenderer.sendSync） - シンプルだがブロッキング
  2. 非同期invoke/handle - Promise対応、型安全
  3. イベントベース（on/send） - ストリーミング向け
- **Selected Approach**: invoke/handle + イベントベースのハイブリッド
- **Rationale**:
  - 単発リクエスト（ファイル読み書き）はinvoke/handle
  - ストリーミング出力（コマンド実行ログ）はイベントベース
  - 同期通信は避けてUIブロックを防止
- **Trade-offs**: 2パターンの混在で複雑性が増す
- **Follow-up**: IPC APIの型定義を厳密に管理

### Decision: 状態管理アーキテクチャ
- **Context**: アプリケーション状態の管理方式
- **Alternatives Considered**:
  1. zustand（レンダラーのみ） - シンプル、既存コードベース互換
  2. Zutron（メイン/レンダラー同期） - 一貫性確保
  3. Redux - 豊富なエコシステム
- **Selected Approach**: zustand（レンダラーのみ）+ electron-store（メインプロセス設定）
- **Rationale**:
  - 既存Tauriアプリのzustand構造を移行可能
  - アプリ設定（最近のプロジェクト等）はelectron-storeで永続化
  - メイン/レンダラー間の状態同期は必要最小限に抑える
- **Trade-offs**: メインプロセスの状態変更をレンダラーに通知する仕組みが必要
- **Follow-up**: 将来の機能拡張時にZutron導入を再検討

### Decision: ディレクトリ構造
- **Context**: Electronプロジェクトのファイル構成
- **Alternatives Considered**:
  1. フラット構造 - シンプル
  2. 機能ベース構造 - スケーラブル
  3. Electronプロセスベース構造 - 明確な境界
- **Selected Approach**: プロセスベース + 機能ベースのハイブリッド
- **Rationale**:
  - src/main, src/preload, src/rendererで明確なプロセス境界
  - renderer内は機能ベースで分割（components, hooks, stores, services）
  - 既存Tauriアプリの構造を可能な限り維持
- **Trade-offs**: ディレクトリ階層が深くなる
- **Follow-up**: なし

## Risks & Mitigations
- **Risk 1**: macOSでのコード署名・公証化の複雑さ - 開発初期段階では署名なしで進め、リリース前に対応
- **Risk 2**: クロスプラットフォームでのパス処理差異 - path.joinを一貫して使用、pathモジュールのnormalize活用
- **Risk 3**: コマンド実行時のセキュリティリスク - ユーザー入力のサニタイズ、許可リスト方式でコマンド制限
- **Risk 4**: 大量ログのパフォーマンス問題 - 仮想スクロール実装（既存Tauriアプリの@tanstack/react-virtual活用）

## References
- [Security | Electron](https://www.electronjs.org/docs/latest/tutorial/security) - Electronセキュリティベストプラクティス
- [Context Isolation | Electron](https://www.electronjs.org/docs/latest/tutorial/context-isolation) - Context Isolation解説
- [Inter-Process Communication | Electron](https://www.electronjs.org/docs/latest/tutorial/ipc) - IPC通信パターン
- [electron-builder](https://www.electron.build/index.html) - ビルドツールドキュメント
- [Zustand](https://github.com/pmndrs/zustand) - 状態管理ライブラリ
- [@uiw/react-md-editor](https://github.com/uiwjs/react-md-editor) - Markdownエディター
