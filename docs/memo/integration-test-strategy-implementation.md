# 統合テスト戦略の実装とSDDプロセスの強化

**実施日**: 2026年1月25日

## 背景

`docs/memo/integration-test-gap-analysis.md` において、プロセス間通信（IPC）などのモジュール間連携におけるテスト欠落が、機能不全（ボタンを押しても動かない等）を引き起こすリスクが指摘された。特に人間が介入しないAI自律開発環境においては、この「連携の検証」を機械的に保証する仕組みが不可欠である。

本レポートは、このギャップを解消するために実施したSDD（Spec-Driven Development）プロセスの改修内容をまとめたものである。

## 実施内容概要

SDDの全フェーズ（設計、タスク生成、レビュー）に対し、統合テストを強制するためのルール改定とプロンプト修正を行った。また、AIが陥りやすい「Flaky Test（不安定なテスト）」の生成を防ぐための具体的な技術指針も組み込んだ。

### 1. Designフェーズ：戦略の明文化

**修正ファイル**:
- `.claude/commands/kiro/spec-design.md`
- `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-design.md`

**変更点**:
設計書（`design.md`）生成プロンプトに、以下の `CRITICAL` 指示を追加。
*   **Integration Test Strategyセクションの必須化**: IPC、Store同期、イベント連携がある場合、必ず記載する。
*   **Mock Boundariesの定義**: どこをモックし、どこを実体で動かすか（例:「IPC通信層のみモックする」）を明記させる。
*   **Robustness Strategy（堅牢性戦略）**: `setTimeout` などの固定待機を禁止し、`waitFor` パターンや状態監視を用いるよう指示。

### 2. Taskフェーズ：テストタスクの独立と規格化

**修正ファイル**:
- `.kiro/settings/rules/tasks-generation.md`
- `electron-sdd-manager/resources/templates/settings/rules/tasks-generation.md`

**変更点**:
タスクリスト（`tasks.md`）生成ルールに以下を追加。
*   **新カテゴリ `Integration Test Tasks`**: 実装タスクとは別に、連携検証タスクを独立カテゴリとして定義。
*   **Testing Best Practices**: テストコード実装時の禁止事項（固定sleep禁止）と推奨事項（テスト基盤タスクの先行）を明文化。

### 3. Reviewフェーズ：欠落の検出と阻止

**修正ファイル**:
- `.claude/commands/kiro/document-review.md`
- `.kiro/settings/rules/design-review.md`
- `electron-sdd-manager/resources/templates/commands/document-review/document-review.md`
- `electron-sdd-manager/resources/templates/settings/rules/design-review.md`

**変更点**:
ドキュメントレビュー時に以下の項目を `CRITICAL`（修正必須）としてチェックするよう変更。
*   **Integration Test Coverage**: シーケンス図やIPC定義があるにもかかわらず、対応する統合テストタスクが存在しない場合をエラーとする。
*   **Fallback Strategy**: 技術的にテストが困難な場合、代替手段（E2Eテストや手動検証ログ）が定義されているか確認。

## 構成管理に関する考察

今回の修正において、ルールの読み込み方式（`.claude/rules` による常時読み込み vs コマンドごとの動的読み込み）について再確認を行った。

*   **現状の方式**: `.kiro/settings/rules/` にルールを配置し、各コマンド定義（`.md`）内で必要なファイルのみを指定して読み込んでいる。
*   **評価**: この方式はClaude Codeのコンテキストウィンドウを節約しつつ、必要な場面でのみ強力な制約を適用できるため、現状の運用において最適であると判断した。

## 今後の展望

*   **初期導入時の監視**: 次回の機能開発において、AIがこれらの指示に従って適切に統合テスト戦略を立案できるか監視する。
*   **テスト基盤の整備**: AIに統合テストを書かせる前提として、プロジェクト側にIPCモックヘルパーなどが不足している場合、AIがスタックする可能性がある。必要に応じて `test-utils` の拡充タスクを優先するようAIを誘導する必要があるかもしれない。
