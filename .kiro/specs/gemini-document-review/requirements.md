# Requirements: Gemini CLI Document Review Integration

## Decision Log

### 1. Gemini CLI コマンドのインストール方法
- **Discussion**: Commandsetインストールの一部とするか、既存の「実験的ツール」メニューに追加するかを検討
- **Conclusion**: 「実験的ツール」メニューに追加
- **Rationale**: 既存パターン（Plan/Debug/Commit）と一貫性を保ち、実験的機能として段階的に導入可能

### 2. scheme 切り替え時の動作
- **Discussion**: 即座にspec.json保存 vs 次回実行時に反映 vs 確認ダイアログ表示
- **Conclusion**: 即座にspec.json保存
- **Rationale**: シンプルで直感的なUX。ユーザーがタグをクリックした意図を即座に反映

### 3. Gemini CLI コマンドの格納場所
- **Discussion**: `.gemini/commands/kiro/` vs `.gemini/commands/` (ルート直下)
- **Conclusion**: `.gemini/commands/kiro/` サブディレクトリを使用
- **Rationale**: Claude Codeの `/kiro:document-review` との対応関係を維持。Gemini CLI の Custom Commands 仕様に準拠

### 4. document-review 実行時のフロー
- **Discussion**: scheme タグ表示のみ (将来課題) vs Gemini CLI 呼び出しも実装
- **Conclusion**: Gemini CLI 呼び出しも実装
- **Rationale**: scheme切り替えを有効活用するため、実行時に適切なCLIを選択して起動する完全な機能を提供

## Introduction

本機能は、SDD Orchestratorのドキュメントレビューワークフローに Gemini CLI サポートを追加する。ユーザーは Claude Code と Gemini CLI を選択してドキュメントレビューを実行でき、プロジェクトや状況に応じて最適なAIツールを使い分けられる。

## Requirements

### Requirement 1: Experimental Tools Installer 拡張

**Objective:** As a 開発者, I want 「実験的ツール」メニューからGemini CLI用のdocument-reviewコマンドをインストールできる, so that プロジェクトでGemini CLIによるドキュメントレビューを利用できる

#### Acceptance Criteria

1.1 ツールメニューの「実験的ツール」サブメニューに「Gemini document-review をインストール」項目が存在すること

1.2 メニュー項目クリック時、`.gemini/commands/kiro/document-review.toml` がプロジェクトにインストールされること

1.3 メニュー項目クリック時、`.gemini/commands/kiro/document-review-reply.toml` がプロジェクトにインストールされること

1.4 インストール先ディレクトリ（`.gemini/commands/kiro/`）が存在しない場合、自動的に作成されること

1.5 既存ファイルが存在する場合、上書き確認ダイアログを表示すること

1.6 Force オプション有効時、確認なしで上書きすること

1.7 インストール成功時、成功通知を表示すること

1.8 インストール失敗時、エラー詳細を含む通知を表示すること

### Requirement 2: TOML テンプレートファイル

**Objective:** As a システム, I want Gemini CLI Custom Commands 形式のテンプレートファイルを保持する, so that インストール時に正しい形式のコマンドファイルを提供できる

#### Acceptance Criteria

2.1 `resources/templates/experimental/gemini/kiro/document-review.toml` が存在すること

2.2 `resources/templates/experimental/gemini/kiro/document-review-reply.toml` が存在すること

2.3 document-review.toml は Gemini CLI Custom Commands 形式（description, prompt フィールド）に準拠すること

2.4 document-review.toml は `{{args}}` でフィーチャー名を受け取り、`@{path}` でファイル内容を展開すること

2.5 document-review-reply.toml は同様に Gemini CLI 形式に準拠し、reply機能を提供すること

2.6 コマンド内容は既存の `.claude/commands/kiro/document-review.md` の機能と同等であること

### Requirement 3: spec.json の documentReview.scheme フィールド

**Objective:** As a システム, I want spec.json の documentReview セクションに reviewer scheme 情報を保持する, so that どのCLIツールでレビューを実行するか記録・参照できる

#### Acceptance Criteria

3.1 `spec.json` の `documentReview` オブジェクトに `scheme` フィールドを追加できること

3.2 `scheme` フィールドの値は `"claude-code"`, `"gemini-cli"`, または `"debatex"` であること

3.3 `scheme` フィールドが未指定の場合、`"claude-code"` をデフォルト値とすること

3.4 `scheme` フィールドは SpecsWatcherService によって正しく読み込まれること

3.5 `scheme` フィールドの変更が検出された場合、UIに反映されること

### Requirement 4: DocumentReviewPanel の scheme タグ表示

**Objective:** As a ユーザー, I want DocumentReviewPanelで現在のreview schemeを確認できる, so that どのCLIツールが使用されるかを把握できる

#### Acceptance Criteria

4.1 DocumentReviewPanel のヘッダー領域に scheme を示すタグが表示されること

4.2 タグは `Claude`, `Gemini`, または `Debatex` のラベルを表示すること

4.3 タグの色はschemeによって区別されること（例: Claude=青系、Gemini=紫系、Debatex=緑系）

4.4 scheme が未設定の場合、`Claude` タグがデフォルト表示されること

### Requirement 5: scheme 切り替え機能

**Objective:** As a ユーザー, I want DocumentReviewPanelでschemeタグをクリックしてレビューエンジンを選択できる, so that 使用するCLIツールを簡単に変更できる

#### Acceptance Criteria

5.1 scheme タグをクリックすると、ドロップダウンメニューが表示され、利用可能なエンジン一覧から選択できること

5.2 切り替え後、即座に spec.json の `documentReview.scheme` が更新されること

5.3 切り替え後、UI のタグ表示が即座に更新されること

5.4 ファイル書き込みエラー時、エラー通知を表示しUIを元の状態に戻すこと

5.5 切り替え時にはIPC経由でmainプロセスにspec.json更新を依頼すること

### Requirement 6: scheme に基づくレビュー実行

**Objective:** As a システム, I want scheme設定に基づいて適切なCLIツールを起動する, so that ユーザーの設定通りにドキュメントレビューが実行される

#### Acceptance Criteria

6.1 `scheme: "claude-code"` の場合、Claude Code CLI (`claude -p`) でレビューを実行すること

6.2 `scheme: "gemini-cli"` の場合、Gemini CLI (`gemini -p`) でレビューを実行すること

6.3 `scheme: "debatex"` の場合、debatex CLI (`npx debatex sdd-document-review`) でレビューを実行すること

6.4 Gemini CLI 実行時は `--yolo` フラグを付与すること（自動承認モード）

6.5 Gemini CLI 実行時は `--output-format stream-json` を使用すること

6.6 Gemini CLI の出力形式（JSONL）を正しくパースしてログ表示すること

6.7 各 CLI が見つからない場合、適切なエラーメッセージを表示すること

6.8 scheme が未設定の場合、Claude Code をデフォルトで使用すること

### Requirement 7: Remote UI 対応

**Objective:** As a Remote UI ユーザー, I want Remote UIでもscheme表示・切り替えができる, so that モバイル端末からもscheme管理ができる

#### Acceptance Criteria

7.1 SpecDetailView (Remote UI) に scheme タグが表示されること

7.2 scheme タグクリックで切り替えができること

7.3 切り替え結果がAPI経由でメインプロセスに送信されること

7.4 切り替え結果が他のクライアントにリアルタイム同期されること

### Requirement 8: 自動実行時の考慮

**Objective:** As a システム, I want 自動実行モード時にもscheme設定が尊重される, so that 手動実行と同じCLIツールで自動レビューが行われる

#### Acceptance Criteria

8.1 自動実行（auto execution）時、spec.jsonのscheme設定に従ってCLIを選択すること

8.2 並列実行（parallel spec execution）時、各specの個別scheme設定が尊重されること

8.3 scheme変更はspec単位で保持され、他のspecに影響しないこと

### Requirement 9: 複数レビューエンジンの拡張性

**Objective:** As a 開発者, I want 新しいレビューエンジンを最小限のコード変更で追加できる, so that 将来のエンジン追加が容易になる

#### Acceptance Criteria

9.1 サポートするエンジンとして `"claude-code"`, `"gemini-cli"`, `"debatex"` を定義すること

9.2 各エンジンの設定（コマンド、引数、出力形式）をエンジン定義オブジェクトとして集約すること

9.3 新規エンジン追加時は、エンジン定義オブジェクトへの追加と型定義の更新のみで対応できること

9.4 エンジン選択UIは、エンジン定義オブジェクトから動的にメニュー項目を生成すること

9.5 未知のscheme値が指定された場合、デフォルトエンジン（claude-code）にフォールバックすること

## Out of Scope

- Gemini CLI / debatex のインストール・セットアップ支援
- Gemini API キーの管理
- 現在サポートする3エンジン（claude-code, gemini-cli, debatex）以外のCLIツールサポート
- レビュー結果の品質比較・評価機能
- セッション管理（resume）を活用したマルチターン実行（将来課題）

## Open Questions

1. Gemini CLI の出力形式と Claude Code の出力形式の差異がログパーサーに与える影響の詳細調査が必要
2. Gemini CLI の rate limit（60 req/min, 1000 req/day）が自動実行ワークフローに与える制約の検討
