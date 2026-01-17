# Research & Design Decisions: Gemini CLI Document Review Integration

## Summary
- **Feature**: `gemini-document-review`
- **Discovery Scope**: Extension
- **Key Findings**:
  - Gemini CLI Custom Commands はTOML形式で定義、`{{args}}` と `@{path}` プレースホルダをサポート
  - 出力形式は `--output-format stream-json` でJSONL形式（Claude CLIと同等）
  - `--yolo` フラグで自動承認モードを提供
  - 既存のExperimentalToolsInstallerServiceパターンを拡張可能

## Research Log

### Gemini CLI Custom Commands 仕様調査
- **Context**: Gemini CLIでdocument-reviewコマンドを実装するためのTOML形式仕様を確認
- **Sources Consulted**:
  - [Custom Commands | Gemini CLI](https://geminicli.com/docs/cli/custom-commands/)
  - [GitHub: google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/custom-commands.md)
  - [Gemini CLI Tutorial Series Part 7](https://medium.com/google-cloud/gemini-cli-tutorial-series-part-7-custom-slash-commands-64c06195294b)
- **Findings**:
  - **ファイル形式**: TOML (`.toml` 拡張子)
  - **必須フィールド**: `prompt` (String)
  - **オプションフィールド**: `description` (String)
  - **プレースホルダ構文**:
    - `{{args}}`: ユーザー引数を展開
    - `@{path}`: ファイル内容を埋め込み（画像、PDF、音声、動画もサポート）
    - `!{command}`: シェルコマンド出力を埋め込み
  - **ディレクトリ配置**:
    - グローバル: `~/.gemini/commands/`
    - プロジェクト: `<project>/.gemini/commands/`
  - **ネームスペース**: サブディレクトリ名がコロン区切りで変換（例: `kiro/document-review.toml` → `/kiro:document-review`）
- **Implications**:
  - Claude Codeの `.claude/commands/kiro/*.md` と同等の機能を `.gemini/commands/kiro/*.toml` で実現可能
  - `@{path}` 構文でファイル内容を直接埋め込むため、`argument-hint` や `allowed-tools` の概念は不要

### Gemini CLI Headless Mode 調査
- **Context**: SDD OrchestratorからGemini CLIをバックグラウンド実行する方法を確認
- **Sources Consulted**:
  - [Headless mode | Gemini CLI](https://geminicli.com/docs/cli/headless/)
  - プロジェクト内ドキュメント: `docs/future-concepts/gemini-cli-document-review-delegation.md`
- **Findings**:
  - **出力形式**: `--output-format stream-json` でJSONL形式出力
  - **イベントタイプ**: `init`, `message`, `tool_use`, `tool_result`, `error`, `result`
  - **自動承認**: `--yolo` フラグでツール実行確認をスキップ
  - **Rate Limits**: 60 req/min, 1000 req/day（無料枠）
- **Implications**:
  - Claude CLI (`claude -p --output-format stream-json`) と同等のストリーミング出力が可能
  - 既存のLogParserServiceで一部パース可能だが、イベント形式の差異を吸収する必要あり

### 既存実装パターン調査
- **Context**: ExperimentalToolsInstallerService の拡張方法を確認
- **Sources Consulted**:
  - `electron-sdd-manager/src/main/services/experimentalToolsInstallerService.ts`
  - `electron-sdd-manager/src/main/ipc/handlers.ts`
  - `electron-sdd-manager/src/main/ipc/channels.ts`
- **Findings**:
  - **既存パターン**: `ExperimentalToolsInstallerService` はDebugエージェントのインストールを担当
  - **テンプレート管理**: `resources/templates/experimental/` にテンプレートファイル格納
  - **IPC連携**: `IPC_CHANNELS.INSTALL_EXPERIMENTAL_*` でメニューとサービスを接続
  - **メニュー統合**: `menu.ts` の「実験的ツール」サブメニューに項目追加
- **Implications**:
  - 同様のパターンで `installGeminiDocumentReview()` メソッドを追加可能
  - テンプレートは `resources/templates/experimental/gemini/kiro/` に配置

### DocumentReviewPanel 拡張調査
- **Context**: scheme切り替えUIの追加方法を確認
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/components/DocumentReviewPanel.tsx`
  - `electron-sdd-manager/src/renderer/types/documentReview.ts`
  - `electron-sdd-manager/src/remote-ui/views/SpecDetailView.tsx`
- **Findings**:
  - **現在の構造**: ヘッダー（左: 進捗インジケータ+タイトル、右: 自動実行フラグ）
  - **タグ表示**: 同様のトグルボタンパターン（`autoExecutionFlag`）が参考になる
  - **Remote UI**: `SpecDetailView` でspec詳細を表示、ワークフローフェーズを管理
- **Implications**:
  - schemeタグはヘッダー領域のタイトル右隣に配置が自然
  - 既存の `autoExecutionFlag` トグルと同様のクリックハンドラパターンを採用

### spec.json スキーマ拡張調査
- **Context**: documentReview.scheme フィールドの追加方法を確認
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/types/documentReview.ts`
  - `electron-sdd-manager/src/main/services/specsWatcherService.ts`
- **Findings**:
  - **現在のスキーマ**: `DocumentReviewState` は `status`, `currentRound`, `roundDetails` を持つ
  - **SpecsWatcherService**: spec.json変更を監視し、UIに通知
- **Implications**:
  - `DocumentReviewState` に `scheme?: 'claude-code' | 'gemini-cli'` フィールドを追加
  - デフォルト値は `'claude-code'` で後方互換性を維持

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Single Installer Extension | ExperimentalToolsInstallerServiceにメソッド追加 | 既存パターン踏襲、コード変更最小 | サービスの責務が曖昧化 | 採用 |
| Separate GeminiInstallerService | 新規サービスクラス作成 | 明確な責務分離 | 重複コードの発生 | 不採用 |

## Design Decisions

### Decision: ExperimentalToolsInstallerService 拡張
- **Context**: Gemini CLIコマンドのインストール機能をどこに実装するか
- **Alternatives Considered**:
  1. ExperimentalToolsInstallerServiceにメソッド追加
  2. 新規GeminiInstallerServiceを作成
- **Selected Approach**: ExperimentalToolsInstallerServiceを拡張
- **Rationale (Why)**:
  - 既存の「実験的ツール」カテゴリの一貫性を維持
  - テンプレート管理・IPCハンドラ・メニュー統合の既存パターンを再利用
  - コード変更量を最小化
- **Trade-offs**: サービスの責務が若干曖昧化するが、機能の性質上許容範囲
- **Follow-up**: 将来的にGeminiコマンドが増えた場合は分離を検討

### Decision: scheme フィールドの配置
- **Context**: reviewerのscheme情報をspec.jsonのどこに保持するか
- **Alternatives Considered**:
  1. `documentReview.scheme` として既存オブジェクトに追加
  2. `reviewerScheme` としてルートレベルに追加
  3. `autoExecution.documentReviewScheme` としてautoExecutionに追加
- **Selected Approach**: `documentReview.scheme` に追加
- **Rationale (Why)**:
  - ドキュメントレビューに関する設定は `documentReview` オブジェクトに集約すべき（関心の分離）
  - 既存の `documentReview.status`, `documentReview.roundDetails` と同じ階層で一貫性維持
- **Trade-offs**: 後方互換性のためデフォルト値処理が必要
- **Follow-up**: 型定義の更新時に `scheme?: ReviewerScheme` を追加

### Decision: CLIコマンド構築方式
- **Context**: Gemini CLI呼び出し時のコマンド構築方法
- **Alternatives Considered**:
  1. 既存の `buildClaudeArgs()` を汎用化
  2. 専用の `buildGeminiArgs()` 関数を新規作成
- **Selected Approach**: `buildGeminiArgs()` を新規作成
- **Rationale (Why)**:
  - Claude CLIとGemini CLIのフラグ体系が異なる（`--yolo` vs 暗黙の許可）
  - 専用関数により各CLIの特性を明確化
  - 将来的な他CLIサポートへの拡張性
- **Trade-offs**: 若干のコード重複
- **Follow-up**: 共通ロジックがあれば抽出を検討

## Execution Model Decision

### Considered Approaches

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| CLI Invocation | `gemini -p --output-format stream-json --yolo` | Claude CLIと同等の実行モデル | Gemini CLI固有の出力形式への対応必要 |
| API Direct Call | Google AI API直接呼び出し | 細かい制御可能 | 大幅な実装変更、認証管理の複雑化 |

### Selected Approach

**Choice**: CLI Invocation

**Rationale**:
- 既存のClaude CLI実行基盤を最大限活用
- `--output-format stream-json` によりストリーミングログ表示が可能
- `--yolo` フラグで自動実行モードに対応
- 実装変更量を最小化

**Implications for design.md**:
- `createProviderAgentProcess` に `gemini-cli` プロバイダを追加
- LogParserServiceでGemini CLI出力形式をパース（JSONL形式は共通）
- scheme切り替え時にコマンドと引数を動的に変更

## Risks & Mitigations
- **Risk 1**: Gemini CLI出力形式がClaude CLIと異なりログパースに失敗 → LogParserServiceでイベントタイプを正規化するアダプタ層を追加
- **Risk 2**: Gemini CLIがインストールされていない環境でのエラー → CLI存在チェックを実装し、適切なエラーメッセージを表示
- **Risk 3**: Rate Limit (60 req/min) による自動実行の中断 → Rate Limitエラーを検出し、UIに警告表示

## References
- [Custom Commands | Gemini CLI](https://geminicli.com/docs/cli/custom-commands/) - TOML形式の仕様
- [Headless mode | Gemini CLI](https://geminicli.com/docs/cli/headless/) - stream-json出力仕様
- [GitHub: google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) - 公式リポジトリ
- `docs/future-concepts/gemini-cli-document-review-delegation.md` - 事前調査ドキュメント
