## Tasks

- [x] 1. Slash Commandとサブエージェントの基盤構築
- [x] 1.1 (P) spec-inspection Slash Commandの作成
  - コマンド引数（feature name、--fix、--autofix）のパース処理
  - 対象featureのSpec文書存在確認（requirements.md, design.md, tasks.md）
  - 存在しない場合のエラーメッセージ表示と中止処理
  - Subagentへの検査委譲とTask tool呼び出し
  - _Requirements: 1.1, 1.4_

- [x] 1.2 (P) spec-inspection-agent Subagentの作成
  - Subagentプロンプト構造の定義（feature, spec directory, options）
  - 検査開始時に使用するSpec文書とsteeringファイル一覧のログ出力
  - 全Checkerの実行オーケストレーションロジック
  - Issue集約と重大度（Critical/Major/Minor/Info）カウント
  - _Requirements: 1.1, 1.5_

- [x] 2. 検査エンジン群の実装（Spec文書検査）
- [x] 2.1 (P) RequirementsCheckerの実装
  - requirements.mdからAcceptance Criteriaを抽出
  - 実装コードとの照合ロジック
  - 未達成項目の特定と問題詳細の生成
  - _Requirements: 2.1, 2.4_

- [x] 2.2 (P) DesignCheckerの実装
  - design.mdのコンポーネント構成を解析
  - アーキテクチャ設計と実装の整合性検証
  - 乖離箇所の検出と推奨修正の生成
  - _Requirements: 2.2, 2.5_

- [x] 2.3 (P) TaskCheckerの実装
  - tasks.mdのチェックリスト形式（`[x]`/`[ ]`）を解析
  - 未完了タスクの特定
  - タスク完了状態のサマリ生成
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 3. 検査エンジン群の実装（steering・Design Principles検査）
- [x] 3.1 (P) SteeringCheckerの実装
  - `.kiro/steering/`配下の全ファイル読み込み
  - product.mdとの機能的矛盾検出
  - tech.mdとの技術スタック・パターン違反検出
  - structure.mdとのディレクトリ構造・命名規則違反検出
  - steeringとSpec文書の重複記載検出と統合推奨
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3.2 (P) PrincipleCheckerの実装
  - CLAUDE.mdからDesign Principlesセクションを読み込み
  - DRY（Don't Repeat Yourself）違反検出（重複コード検出）
  - SSOT（Single Source of Truth）違反検出（複数の真実の源検出）
  - 関心の分離違反検出（単一責務原則違反）
  - 違反内容と改善提案の生成
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. 検査エンジン群の実装（コード品質・統合検査）
- [x] 4.1 (P) DeadCodeCheckerの実装
  - 未使用のexport（関数、クラス、変数）検出
  - 到達不能コードブロック検出
  - 今回の機能実装で追加されたがどこからも参照されていないファイル検出
  - 削除候補としてのリスク評価と報告
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4.2 (P) IntegrationCheckerの実装
  - 既存IPC channels、services、storesとの連携検証
  - 既存型定義との互換性検証
  - 統合問題の検出と推奨修正の生成
  - 新規追加public APIの一覧化
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. GO/NOGO判定と報告書生成
- [x] 5.1 GO/NOGO判定エンジンの実装
  - 全受入基準達成かつCritical=0かつMajor=0でGO判定
  - いずれかの受入基準未達、Critical>0、Major>0でNOGO判定
  - 問題をCritical/Major/Minor/Infoの4段階で分類
  - NOGO時の改修必要項目を優先度順にソート
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 5.2 ReportGeneratorの実装
  - inspection-{n}.mdファイル生成（連番管理）
  - GO/NOGO判定の明記
  - Issue Summaryテーブル（Severity別カウント）
  - Issues詳細セクション（Category, Location, Description, Recommendation）
  - Next Stepsガイダンスの生成
  - _Requirements: 1.2, 1.3, 7.2, 7.4_

- [x] 6. spec.json管理と自動修正機能
- [x] 6.1 InspectionStateManagerの実装
  - GO判定時のspec.jsonへのinspectionフィールド追加
  - passed, inspected_at, report_file, version（オプション）の管理
  - 再検査時のinspectionオブジェクト更新
  - _Requirements: 10.1, 10.2, 10.3, 7.4_

- [x] 6.2 FixEngineの実装（--fixオプション）
  - 仕様書（requirements.md, design.md, tasks.md）の軽微な不整合修正
  - コード修正が必要な場合のtasks.mdへの追加タスク追記
  - `/kiro:spec-impl {feature}` 再実行の案内メッセージ表示
  - 自動修正不可能な項目の明示
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 6.3 AutofixEngineの実装（--autofixオプション）
  - NOGO判定時の自動修正開始
  - 仕様書修正 → tasks.md追記 → spec-impl実行のサイクル管理
  - GO判定になるまでの繰り返し実行
  - 最大3回のリトライ制限と手動介入要求
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 7. プロファイル配布とテンプレート配置
- [x] 7.1 テンプレートファイルの配置
  - cc-sdd用テンプレート配置（Slash Command形式）
  - cc-sdd-agent用テンプレート配置（Agent Command形式）
  - kiro用テンプレート配置（Slash Command + Agent形式）
  - spec-manager用テンプレート配置（`/spec-manager:inspection`形式）
  - 全プロファイルで同一の検査ロジックを使用することを確認
  - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [x] 7.2 インストーラーへの登録
  - ccSddWorkflowInstaller.ts の CC_SDD_COMMANDS に `spec-inspection` を追加
  - ccSddWorkflowInstaller.ts の CC_SDD_AGENTS に `spec-inspection` を追加
  - _Requirements: 11.4_

- [x] 8. 統合とエンドツーエンドテスト
- [x] 8.1 コマンド→サブエージェント→検査エンジン→報告書生成の統合
  - 全Checkerの連携実行確認
  - 報告書生成フローの動作確認
  - spec.json更新フローの動作確認
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 8.2 オプション機能の統合テスト
  - --fixオプション付き実行の動作確認
  - --autofixオプション付き実行の動作確認
  - 自動修正サイクルの終了条件確認
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 8.3 エラーハンドリングとエッジケーステスト
  - Spec文書不存在時のエラーメッセージ確認
  - ファイル読み取りエラー時のWarning記録と部分継続確認
  - GO/NOGO判定不能時のNOGO扱い確認
  - _Requirements: 1.4, 1.5_

- [x] 9. 検査報告書のUI表示
- [x] 9.1 型定義の拡張
  - types/index.ts の SpecDetail.artifacts に inspection フィールドを追加
  - types/index.ts の SpecJson に inspection オブジェクト型を追加
  - editorStore.ts の ArtifactType に `inspection-${number}` パターンを追加
  - _Requirements: 12.4, 12.5_

- [x] 9.2 specStore の検査報告書読み込み対応
  - selectSpec 関数に getInspectionArtifact ヘルパーを追加
  - spec.json の inspection.report_file からファイルパスを構築
  - artifacts オブジェクトに inspection フィールドを設定
  - _Requirements: 12.5_

- [x] 9.3 ArtifactEditor の検査報告書タブ対応
  - inspectionTabs の useMemo 追加（report_file から番号を抽出）
  - allTabs に inspectionTabs を結合
  - getArtifactContent で `inspection-` プレフィックスをハンドリング
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 9.4 ユニットテスト
  - specStore: inspection フィールドありの spec.json 読み込みテスト
  - ArtifactEditor: inspection タブの動的生成テスト
  - _Requirements: 12.1, 12.3, 12.5_

- [x] 10. 検査ボタン統合
- [x] 10.1 (P) PHASE_COMMANDS_BY_PREFIXの変更
  - specManagerService.ts の kiro.inspection を `/kiro:spec-inspection` に変更
  - specManagerService.ts の spec-manager.inspection を `/spec-manager:inspection` に変更
  - 関連するユニットテストの更新
  - _Requirements: 13.1, 13.3_

- [x] 10.2 検査ボタン動作確認
  - WorkflowViewの検査ボタンクリック時に `/kiro:spec-inspection` が実行されることを確認
  - 自動実行（Auto Execute）でinspectionフェーズ到達時に同様に実行されることを確認
  - _Requirements: 13.2, 13.4_
