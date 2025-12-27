# Requirements Document

## Introduction

Specに対する生産性指標を計測する機能を実装する。AI実行時間、人間消費時間、総所要時間の3種類の指標を計測し、可視化することで、SDD（Spec-Driven Development）ワークフローの効率を定量的に把握できるようにする。

## Scope

- **対象環境**: Desktop UI専用（Electronアプリ）
- **Remote UI対応**: 不要（後回し）
- **Deploymentコマンド**: スコープ外（別Specで対応）

## Requirements

### Requirement 1: AI実行時間の計測

**Objective:** 開発者として、各フェーズにおけるAIエージェントの実行時間を自動計測したい。ワークフローのボトルネックを特定するため。

#### Acceptance Criteria

1. When Agent実行が開始されたとき, the Metrics Service shall Agentの開始タイムスタンプを記録する
2. When Agent実行が完了したとき, the Metrics Service shall Agentの終了タイムスタンプを記録し、実行時間を算出する
3. When AI実行時間を記録するとき, the Metrics Service shall `spec`（Spec名）と`phase`（フェーズ名）を含めて記録する
4. The Metrics Service shall AI実行時間を`.kiro/metrics.jsonl`に追記形式で保存する

### Requirement 2: 人間消費時間の計測

**Objective:** 開発者として、Spec関連の操作に費やした時間を計測したい。レビューや承認作業にかかる実際の時間を把握するため。

#### Acceptance Criteria

1. When Spec選択操作が発生したとき, the Metrics Service shall 操作イベントとして記録を開始する
2. When Artifactタブ切替操作が発生したとき, the Metrics Service shall 操作イベントとして記録する
3. When ドキュメントスクロール操作が発生したとき, the Metrics Service shall 操作イベントとして記録する
4. When Agentログスクロール・展開操作が発生したとき, the Metrics Service shall 操作イベントとして記録する
5. When 承認・修正ボタン操作が発生したとき, the Metrics Service shall 操作イベントとして記録する
6. When リンククリック操作が発生したとき, the Metrics Service shall 操作イベントとして記録する
7. When テキスト選択操作が発生したとき, the Metrics Service shall 操作イベントとして記録する
8. While 操作イベントから45秒以内, the Metrics Service shall その時間を「アクティブ」として計上する
9. When 45秒間操作がなかったとき, the Metrics Service shall 現在のセッションを終了し、人間消費時間として記録する
10. When 別のSpecが選択されたとき, the Metrics Service shall 現在のセッションを終了し、人間消費時間として記録する
11. When ウィンドウフォーカスが離脱したとき, the Metrics Service shall 現在のセッションを終了し、人間消費時間として記録する
12. The Metrics Service shall 人間消費時間を`.kiro/metrics.jsonl`に追記形式で保存する

### Requirement 3: 総所要時間の計測

**Objective:** 開発者として、Specの開始から完了までの総所要時間を把握したい。プロジェクト全体の開発期間を見積もるため。

#### Acceptance Criteria

1. When spec-initが実行されたとき, the Metrics Service shall Specの開始タイムスタンプを記録する
2. When implementation-completeフェーズに到達したとき, the Metrics Service shall Specの完了タイムスタンプを記録し、総所要時間を算出する
3. The Metrics Service shall 総所要時間を`.kiro/metrics.jsonl`に追記形式で保存する

### Requirement 4: メトリクスデータの保存形式

**Objective:** 開発者として、計測データを一貫した形式で保存したい。後から集計・分析しやすくするため。

#### Acceptance Criteria

1. The Metrics Service shall `.kiro/metrics.jsonl`をSSOT（Single Source of Truth）として使用する
2. The Metrics Service shall 各レコードを1行のJSON形式で追記する
3. When AI実行時間を記録するとき, the Metrics Service shall `{"type":"ai","spec":"...","phase":"...","start":"...","end":"...","ms":...}`形式で保存する
4. When 人間消費時間を記録するとき, the Metrics Service shall `{"type":"human","spec":"...","start":"...","end":"...","ms":...}`形式で保存する
5. The Metrics Service shall タイムスタンプをISO8601形式で記録する
6. The Metrics Service shall 経過時間をミリ秒単位（`ms`フィールド）で記録する

### Requirement 5: メトリクスの集計と表示

**Objective:** 開発者として、計測された指標を集計して確認したい。ワークフローの効率を視覚的に把握するため。

#### Acceptance Criteria

1. When Spec詳細画面を表示するとき, the Desktop UI shall 該当Specのメトリクスサマリーを表示する
2. When メトリクスサマリーを表示するとき, the Desktop UI shall AI実行時間の合計を表示する
3. When メトリクスサマリーを表示するとき, the Desktop UI shall 人間消費時間の合計を表示する
4. When メトリクスサマリーを表示するとき, the Desktop UI shall 総所要時間（経過時間）を表示する
5. When implementation-completeフェーズに到達したとき, the Desktop UI shall 最終的なメトリクスを集計する
6. The Desktop UI shall 時間をユーザーフレンドリーな形式（例: "1h 23m", "45m 30s"）で表示する

### Requirement 6: フェーズ別メトリクスの表示

**Objective:** 開発者として、各フェーズごとの指標を確認したい。どのフェーズに時間がかかっているかを特定するため。

#### Acceptance Criteria

1. When Spec詳細画面を表示するとき, the Desktop UI shall フェーズ別のAI実行時間を表示する
2. When Spec詳細画面を表示するとき, the Desktop UI shall フェーズ別の人間消費時間を表示する
3. The Desktop UI shall requirements, design, tasks, implの各フェーズを個別に表示する
4. The Desktop UI shall 各フェーズの進行状況（未開始/実行中/完了）をアイコンで示す

### Requirement 7: メトリクスデータの整合性

**Objective:** 開発者として、不完全なセッションや予期しない終了時にもデータを失いたくない。計測の信頼性を確保するため。

#### Acceptance Criteria

1. When アプリケーションが予期せず終了したとき, the Metrics Service shall 次回起動時に未完了セッションを検出し、終了処理を行う
2. If 未完了のAIセッションが検出されたとき, the Metrics Service shall アプリ終了時刻を終了タイムスタンプとして使用する
3. If 未完了の人間セッションが検出されたとき, the Metrics Service shall 最後の操作から45秒後を終了タイムスタンプとして使用する
4. When メトリクスデータを読み込むとき, the Metrics Service shall 不正なJSONLエントリをスキップし、エラーをログに記録する

### Requirement 8: プロジェクト横断メトリクス（オプショナル）

**Objective:** 開発者として、複数のSpecにまたがるメトリクスを集計したい。プロジェクト全体の生産性傾向を把握するため。

#### Acceptance Criteria

1. Where プロジェクトメトリクス機能が有効な場合, the Desktop UI shall 全Specの総AI実行時間を表示する
2. Where プロジェクトメトリクス機能が有効な場合, the Desktop UI shall 全Specの総人間消費時間を表示する
3. Where プロジェクトメトリクス機能が有効な場合, the Desktop UI shall Spec完了数と進行中Spec数を表示する
