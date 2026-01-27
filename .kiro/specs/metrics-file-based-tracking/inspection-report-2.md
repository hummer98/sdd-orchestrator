# Inspection Report: Metrics File-Based Tracking (Document Review #2)

## 概要
本レポートは、`metrics-file-based-tracking` 機能の仕様書（Requirements, Design, Tasks）および最新の実装状況を再度レビューした結果をまとめたものである。

## レビュー結果
| 項目 | 評価 | 備考 |
|------|------|------|
| Requirements | 合格 | 設計方針に変更はなく、妥当である。 |
| Design | 合格 | Mermaid図とフローは明確。ただし、`handleAgentExit` での書き込み先が設計書（`MetricsFileWriter`）と実装（`MetricsService`）で僅かに異なるが、実装の `MetricsService` を介す方法が保守性の観点から望ましい。 |
| Tasks | 要更新 | 1.x, 2.x が完了となっているが、2.2 (startAiSession削除) の影響範囲の確認が必要。また、3.x 以降の未完了タスクが明確。 |

## 指摘事項・不一致

### 1. Requirements 3.3 との実装の乖離 (再指摘)
- **要件**: `executions` 配列が存在しない場合はメトリクス記録をスキップし警告ログを出力する。
- **現状**: レガシーな `endAiSession` へのフォールバックが残っている。
- **対応**: フォールバックを削除し、要件通り警告ログ出力とスキップに変更する。

### 2. resumeAgent の実装漏れ (Task 4.1, 4.2)
- **現状**: `resumeAgent` において `executions` への追加が行われていない。また、`metricsService.startAiSession` が依然として呼び出されている。
- **対応**: `executions` への push 実装と `startAiSession` 呼び出しの削除。

### 3. MetricsService のクリーンアップ未着手 (Task 5.x)
- **現状**: `MetricsService` 内に `activeAiSessions` Map および関連メソッド（`startAiSession`, `endAiSession` 等）が残ったまま。
- **対応**: これらを削除し、`recordAiSessionFromFile` を主力とする。

### 4. 設計書の微修正推奨
- **設計書**: `MetricsFileWriter` を直接使う記述があるが、`MetricsService.recordAiSessionFromFile` を使うように修正するか、許容範囲とする。保守性を考えればサービス経由が正解。

## 結論
仕様書の方向性は正しいが、実装において `resumeAgent` と `MetricsService` の対応が完全に漏れている。また、`handleAgentExit` のフォールバック処理も要件に合わせる必要がある。

以上の指摘事項を修正タスクとして追加し、実装フェーズ（Task 3.1 以降）を継続する。
