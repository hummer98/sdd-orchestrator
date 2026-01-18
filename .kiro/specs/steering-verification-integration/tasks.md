# Implementation Plan

## Tasks

- [x] 1. verification.mdテンプレート作成
  - steering-verification-agentが参照するテンプレートファイルを作成
  - Markdownテーブル形式でType, Command, Workdir, Descriptionの列を定義
  - サンプルコマンド（build, typecheck, test, lint）を含める
  - 配置場所: `.kiro/settings/templates/steering/verification.md`
  - _Requirements: 1.4, 2.1, 2.2, 2.3_

- [x] 2. steering-verification-agent作成
- [x] 2.1 (P) cc-sdd-agent用サブエージェント定義
  - プロジェクトの技術スタックを分析するロジックを記述
  - tech.md, package.json, CI設定ファイル等から検証コマンドを推測
  - テンプレートを読み込み、検証コマンドを生成
  - `.kiro/steering/verification.md`への書き出し処理
  - 配置場所: `.kiro/settings/agents/kiro/steering-verification-agent.md`
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2.2 (P) cc-sdd用エージェント定義
  - cc-sdd-agentと同等のロジックを直接実行型として定義
  - 配置場所: `.kiro/settings/agents/direct/steering-verification-agent.md`
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 3. steering-verificationコマンド作成
- [x] 3.1 (P) cc-sdd-agent用Slashコマンド
  - Task toolでsteering-verification-agentに委譲
  - steeringディレクトリの存在確認
  - 配置場所: `.claude/commands/kiro/steering-verification.md`（cc-sdd-agentテンプレート）
  - _Requirements: 1.1, 1.5_

- [x] 3.2 (P) cc-sdd用Slashコマンド
  - 直接実行型としてエージェントロジックを呼び出し
  - 配置場所: `.claude/commands/kiro/steering-verification.md`（cc-sddテンプレート）
  - _Requirements: 1.1, 1.5_

- [x] 4. UIコンポーネント: SteeringSection作成
- [x] 4.1 SteeringSectionコンポーネント実装
  - ProjectValidationPanel内に配置するセクションコンポーネント
  - verification.mdの存在状態を表示（チェックアイコン/警告アイコン）
  - 不足時に「verification.mdを生成」ボタンを表示
  - ボタンクリックで`/kiro:steering-verification`エージェントを起動
  - 他のsteeringファイル（product.md, tech.md, structure.md）はチェック対象外
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4.2 ProjectValidationPanelへの統合
  - SteeringSectionをProjectValidationPanelに追加
  - 既存セクション（kiro, spec-manager, permissions）と同様の構造で配置
  - _Requirements: 3.1_

- [x] 5. projectStore拡張: Steering状態管理
- [x] 5.1 steeringCheck状態とアクション追加
  - `steeringCheck: SteeringCheckResult | null`状態を追加
  - `steeringGenerateLoading: boolean`状態を追加
  - `checkSteeringFiles`アクション: IPCでverification.md存在確認
  - `generateVerificationMd`アクション: エージェント起動
  - _Requirements: 3.2, 3.4_

- [x] 5.2 既存の初期化フローへの統合
  - プロジェクト選択時にcheckSteeringFilesを呼び出し
  - verification.md生成後の状態再取得
  - _Requirements: 3.2_

- [x] 6. IPCハンドラ: Steering操作
- [x] 6.1 CHECK_STEERING_FILESハンドラ実装
  - verification.mdの存在確認ロジック
  - SteeringCheckResult型のレスポンス返却
  - _Requirements: 3.2_

- [x] 6.2 GENERATE_VERIFICATION_MDハンドラ実装
  - executeProjectAgentを使用してエージェント起動
  - エラー時のハンドリング
  - _Requirements: 3.4_

- [x] 7. spec-inspection-agent拡張: VerificationCommandsChecker
- [x] 7.1 verification.md読み込みとパース
  - verification.mdの存在確認
  - 不存在時はスキップし「Verification Commands: skipped」を記録
  - Markdownテーブルの正規表現パース
  - _Requirements: 4.1, 4.2_

- [x] 7.2 検証コマンド実行ロジック
  - 各コマンドを指定されたworkdirで実行
  - 終了コードの判定（非ゼロで失敗）
  - 実行結果の記録（PASS/FAIL）
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 7.3 Inspection Reportへの結果出力
  - 「Verification Commands」セクションの追加
  - 各コマンドの実行結果を表形式で記載
  - 失敗時はCriticalとしてNOGO判定に反映
  - _Requirements: 4.5, 4.6_

- [x] 8. 統合テスト
- [x] 8.1 steering-verification-agentの動作確認
  - tech.mdからのコマンド推測が正しく動作すること
  - package.jsonからのコマンド推測が正しく動作すること
  - verification.mdが正しいフォーマットで生成されること
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 8.2 SteeringSectionの動作確認
  - verification.md存在時は緑チェック表示
  - verification.md不存在時は警告アイコンと生成ボタン表示
  - 生成ボタンクリックでエージェント起動
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8.3 spec-inspection統合の動作確認
  - verification.md存在時にコマンドが実行されること
  - verification.md不存在時はスキップされること
  - コマンド失敗時にNOGO判定となること
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 8.4 skill-reference.md更新
  - cc-sdd-agentセクションのkiroサブエージェント一覧に`steering-verification-agent`を追加
  - steering-verificationコマンドの動作仕様を追記
  - _Requirements: 1.1, 1.5_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | steering-verificationコマンドでagent起動 | 3.1, 3.2 | Feature |
| 1.2 | tech.md, package.json, CI config分析 | 2.1, 2.2, 8.1 | Feature |
| 1.3 | verification.md生成 | 2.1, 2.2, 8.1 | Feature |
| 1.4 | テンプレート参照 | 1 | Infrastructure |
| 1.5 | コマンドプリセット同梱 | 3.1, 3.2 | Feature |
| 2.1 | verification.mdフォーマット（type, command, workdir, description） | 1, 2.1, 2.2, 8.1 | Feature |
| 2.2 | パーサーで抽出可能なフォーマット | 1, 2.1, 2.2, 7.1, 8.1 | Feature |
| 2.3 | 複数コマンド定義 | 1, 2.1, 2.2, 8.1 | Feature |
| 3.1 | ProjectValidationPanelにSteeringセクション追加 | 4.1, 4.2, 8.2 | Feature |
| 3.2 | verification.md存在チェック | 4.1, 5.1, 5.2, 6.1, 8.2 | Feature |
| 3.3 | 生成ボタン表示 | 4.1, 8.2 | Feature |
| 3.4 | ボタンクリックでエージェント起動 | 4.1, 5.1, 6.2, 8.2 | Feature |
| 3.5 | 他steeringファイルはチェック対象外 | 4.1, 8.2 | Feature |
| 3.6 | Remote UI対応 | 4.1, 8.2 | Feature |
| 4.1 | spec-inspectionがverification.md読み込み | 7.1, 8.3 | Feature |
| 4.2 | 不存在時はスキップ | 7.1, 8.3 | Feature |
| 4.3 | コマンド実行 | 7.2, 8.3 | Feature |
| 4.4 | workdir移動 | 7.2, 8.3 | Feature |
| 4.5 | 失敗時Critical/NOGO | 7.2, 7.3, 8.3 | Feature |
| 4.6 | Inspection Reportに記載 | 7.3, 8.3 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 7.1), not container tasks (e.g., 7)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
