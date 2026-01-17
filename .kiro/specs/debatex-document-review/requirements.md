# Requirements: Debatex Document Review Integration

## Decision Log

### 1. debatex との統合方式
- **Discussion**: sdd-orchestrator 内でロール議論をシミュレートするか、debatex を外部プロセスとして呼び出すか
- **Conclusion**: debatex を外部プロセスとして呼び出す（`npx debatex`）
- **Rationale**: debatex は既に複数エージェント議論の機能を持っている。車輪の再発明を避け、専門ツールに委譲する

### 2. reply プロセスの扱い
- **Discussion**: debatex の議論形式なら reply 不要か、従来通り必要か
- **Conclusion**: reply プロセスは維持
- **Rationale**: 議論結果に対しても人間の判断・修正指示が必要。既存ワークフローとの一貫性を保つ

### 3. 出力ファイルの配置
- **Discussion**: debatex デフォルト出力（`.debatex/`）を使うか、`.kiro/specs/` に統合するか
- **Conclusion**: `.kiro/specs/<feature>/document-review-{n}.md` に出力
- **Rationale**: spec-status や他の Kiro Skill との連携がシンプル。debatex 側に出力パス指定オプションを追加依頼

### 4. レビュー番号の決定方式
- **Discussion**: sdd-orchestrator 側で決定するか、debatex 側で自動決定するか
- **Conclusion**: sdd-orchestrator 側で番号を決定して debatex に渡す
- **Rationale**: sdd-orchestrator が spec の状態管理を担当しており、番号決定ロジックを集約する方が整合性が保てる

### 5. 出力フォーマット
- **Discussion**: debatex 独自フォーマット（summary.md）か、既存 document-review.md 互換か
- **Conclusion**: 既存 document-review.md と互換性のある形式。議論過程は付録として含める
- **Rationale**: document-review-reply との互換性を維持。議論過程は人間のレビュー時の参考として残す

### 6. プロジェクトデフォルト設定
- **Discussion**: spec 単位のみか、プロジェクトデフォルトも設定可能にするか
- **Conclusion**: プロジェクトデフォルトを `.kiro/sdd-orchestrator.json` に保存可能に
- **Rationale**: 同じプロジェクト内で一貫したレビューエンジンを使いたい場合に便利。spec 単位設定が優先

### 7. gemini-document-review との関係
- **Discussion**: 同一 spec にマージするか、別 spec として管理するか
- **Conclusion**: 別 spec として管理
- **Rationale**: gemini-document-review は既に deploy-complete。debatex 固有の要件を独立して管理

## Introduction

本機能は、SDD Orchestrator のドキュメントレビューワークフローに debatex（マルチエージェント議論ツール）サポートを追加する。debatex は複数の専門家ロール（要件アナリスト、アーキテクト、実装エンジニア、QAエンジニア）による議論形式でドキュメントをレビューし、単一 AI では得られない多角的な視点を提供する。

前提条件として、gemini-document-review spec で実装された scheme 切り替え基盤（UI ドロップダウン、エンジン定義オブジェクト等）を活用する。

## Requirements

### Requirement 1: debatex エンジン定義の追加

**Objective:** As a システム, I want debatex をレビューエンジンとして定義する, so that scheme 選択時に debatex が利用可能になる

#### Acceptance Criteria

1.1 エンジン定義オブジェクトに `debatex` エントリを追加すること

1.2 debatex エンジンの実行コマンドは `npx debatex sdd-document-review` であること

1.3 debatex エンジンに必要な引数（spec 名、出力パス、レビュー番号）を定義すること

1.4 debatex エンジンの出力形式（互換フォーマット）を定義すること

### Requirement 2: debatex 実行時の引数指定

**Objective:** As a システム, I want debatex 実行時に必要な引数を渡す, so that 正しい場所に正しい形式で出力される

#### Acceptance Criteria

2.1 debatex 実行時に `--output <path>` オプションで出力先を指定すること

2.2 出力先は `.kiro/specs/<feature-name>/document-review-{n}.md` 形式であること

2.3 レビュー番号 `{n}` は sdd-orchestrator 側で既存ファイルを走査して決定すること

2.4 debatex 実行時に spec 名を引数として渡すこと

### Requirement 3: debatex 出力のパース

**Objective:** As a システム, I want debatex の出力を正しくパースしてログ表示する, so that ユーザーが実行状況を確認できる

#### Acceptance Criteria

3.1 debatex の標準出力をリアルタイムでログパネルに表示すること

3.2 debatex の終了コードを検出し、成功/失敗を判定すること

3.3 debatex がエラーで終了した場合、エラー内容をユーザーに通知すること

3.4 debatex が出力した `document-review-{n}.md` を検出し、UI に反映すること

### Requirement 4: プロジェクトデフォルト scheme 設定

**Objective:** As a ユーザー, I want プロジェクト全体のデフォルトレビューエンジンを設定できる, so that 新規 spec 作成時に毎回 scheme を設定する手間を省ける

#### Acceptance Criteria

4.1 `.kiro/sdd-orchestrator.json` に `defaults.documentReview.scheme` フィールドを追加できること

4.2 spec 作成時、`spec.json` に `documentReview.scheme` が未設定の場合、プロジェクトデフォルトを適用すること

4.3 spec 単位の scheme 設定がプロジェクトデフォルトより優先されること

4.4 プロジェクトデフォルトも未設定の場合、`"claude-code"` をデフォルト値とすること

4.5 UI からプロジェクトデフォルト scheme を変更できること（設定画面または専用 UI）

### Requirement 5: document-review-reply との互換性

**Objective:** As a システム, I want debatex の出力が document-review-reply で処理可能であること, so that 既存のレビュー対応ワークフローがそのまま使える

#### Acceptance Criteria

5.1 debatex が出力する `document-review-{n}.md` は既存フォーマットと互換性があること

5.2 互換フォーマットには以下のセクションが含まれること：
- Executive Summary
- Document Consistency Analysis
- Gap Analysis
- Ambiguities and Unknowns
- Steering Alignment
- Recommendations (Critical/Warnings/Suggestions)
- Action Items

5.3 議論過程は「Appendix: Discussion Log」として折りたたみセクションに含めること

5.4 document-review-reply コマンドが debatex 出力を正しく解析できること

### Requirement 6: debatex 利用不可時の動作

**Objective:** As a システム, I want debatex が利用できない場合に適切なエラーを表示する, so that ユーザーが問題を理解できる

#### Acceptance Criteria

6.1 `npx debatex` 実行時に debatex が見つからない場合、明確なエラーメッセージを表示すること

6.2 エラーメッセージには debatex のインストール方法（`npm install -g debatex` 等）を含めること

6.3 debatex 実行がタイムアウトした場合、適切なエラーを表示すること

6.4 debatex 実行中にユーザーがキャンセルした場合、プロセスを適切に終了すること

## Out of Scope

- debatex のインストール・セットアップ支援
- debatex のカスタムプリセット作成 UI
- debatex の議論パラメータ（最大ターン数、時間制限等）の UI 設定
- debatex 以外の新規レビューエンジン追加（既存の claude-code, gemini-cli は gemini-document-review でカバー済み）
- レビュー結果の品質比較・評価機能

## Open Questions

1. debatex の `sdd-document-review` プリセットが互換フォーマットを出力するための改修が必要（依頼書で対応）
2. debatex の出力パス指定オプション（`--output`）の実装が必要（依頼書で対応）

## External Dependencies

本 spec の実装には、debatex 側の改修が必要です。詳細は `docs/debatex-integration-request.md` を参照してください。
