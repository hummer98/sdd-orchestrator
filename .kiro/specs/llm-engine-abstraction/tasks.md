# Implementation Plan

## 1. LLM Engine レジストリの実装

- [x] 1.1 (P) LLM Engine インターフェースと型定義を作成する
  - LLM Engine の ID 型（`claude` | `gemini`）を定義
  - `BuildArgsOptions` インターフェースを定義（prompt, skipPermissions, outputFormat, allowedTools, disallowedTools）
  - `ParsedOutput` インターフェースを定義（type, sessionId, stats, errorMessage）
  - `LLMEngine` インターフェースを定義（id, label, command, buildArgs, parseOutput）
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 1.2 (P) Claude エンジン定義を実装する
  - `buildArgs()` で `-p`, `--verbose`, `--output-format stream-json` を設定
  - `skipPermissions` が true の場合 `--dangerously-skip-permissions` を追加
  - `allowedTools` / `disallowedTools` オプションのハンドリング
  - `parseOutput()` で JSONL 出力を `ParsedOutput` に変換
  - 既存の `buildClaudeArgs()` ロジックを移植
  - _Requirements: 2.2, 2.4, 2.5, 3.2_
  - _Method: buildClaudeArgs_
  - _Verify: Grep "buildClaudeArgs" in llmEngineRegistry.ts_

- [x] 1.3 (P) Gemini エンジン定義を実装する
  - **実機検証**: Gemini CLI `--output-format stream-json` の出力形式がClaude CLIと同一か検証（差異がある場合は parseOutput() で対応）
  - **実機検証**: Gemini CLI `-p` モードでの `--allowed-tools` / `--disallowed-tools` オプション対応状況を検証（非対応の場合はsilent ignore）
  - `buildArgs()` で `-p`, `--output-format stream-json` を設定
  - `skipPermissions` が true の場合 `--yolo` を追加
  - `allowedTools` / `disallowedTools` は Gemini CLI でサポートされていない場合、無視
  - `parseOutput()` で stream-json 出力を `ParsedOutput` に変換
  - _Requirements: 2.3, 2.4, 2.5, 3.3, 3.4_

- [x] 1.4 LLM Engine Registry を実装する
  - `LLM_ENGINES` 定数で Claude と Gemini エンジンを登録
  - `getLLMEngine(id)` で ID からエンジンを取得（未登録 ID は claude にフォールバック）
  - `getAvailableLLMEngines()` で利用可能なエンジン一覧を返す
  - `DEFAULT_LLM_ENGINE` 定数を定義
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 1.5 レジストリのユニットテストを作成する
  - 各エンジンの `buildArgs()` が正しいオプションを生成することを検証
  - `parseOutput()` が JSONL を正しくパースすることを検証
  - `getLLMEngine()` のフォールバック動作を検証
  - _Requirements: 1.3, 3.5_

## 2. エンジン設定サービスの実装

- [x] 2.1 (P) EngineConfig スキーマと型定義を作成する
  - `EngineConfigPhase` 型を定義（plan, requirements, design, tasks, document-review, document-review-reply, inspection, impl）
  - `EngineConfig` インターフェースを定義（default + 各フェーズ）
  - Zod スキーマ `EngineConfigSchema` を定義
  - _Requirements: 4.2_

- [x] 2.2 projectConfigService を拡張してエンジン設定を管理する
  - `ProjectConfigSchemaV3` に `settings.engineConfig` を追加
  - `loadEngineConfig(projectPath)` を実装
  - `saveEngineConfig(projectPath, config)` を実装
  - 既存の設定読み書きパターン（`loadProjectConfigV3`）を流用
  - _Requirements: 4.1_
  - _Method: loadProjectConfigV3, ProjectConfigSchemaV3_
  - _Verify: Grep "engineConfig" in layoutConfigService.ts_

- [x] 2.3 engineConfigService を実装する
  - `resolveEngine(projectPath, specId, phase)` で優先順位に従いエンジンを解決
  - 優先順位: spec.json.engineOverride > engineConfig.{phase} > default > 'claude'
  - spec.json から `engineOverride` フィールドを読み取り
  - 設定不整合時は claude にフォールバック
  - _Requirements: 4.3, 4.4, 5.2, 5.3, 7.1_

- [x] 2.4 spec.json の型定義を拡張する
  - `SpecJson` インターフェースに `engineOverride` フィールドを追加
  - `SpecJsonEngineOverride` 型を定義
  - 各フェーズごとのオプショナルなエンジン ID を許可
  - _Requirements: 5.1_

- [x] 2.5 エンジン設定サービスのユニットテストを作成する
  - `resolveEngine()` の優先順位ロジックを検証
  - フォールバック動作を検証
  - spec.json エラー時のハンドリングを検証
  - _Requirements: 4.3, 4.4, 5.2, 5.3_

## 3. specManagerService の統合

- [x] 3.1 specManagerService でエンジン解決を使用するよう修正する
  - `execute()` 内で `engineConfigService.resolveEngine()` を呼び出し
  - 取得したエンジンの `command` と `buildArgs()` を使用してコマンドを構築
  - 既存の `buildClaudeArgs()` 呼び出しを置換
  - `startAgent()` 呼び出し前にエンジン情報をログ出力
  - _Requirements: 7.1, 7.2, 7.4_
  - _Method: resolveEngine, buildArgs, getLLMEngine_
  - _Verify: Grep "resolveEngine|getLLMEngine" in specManagerService.ts_

- [x] 3.2 後方互換性を維持する
  - 設定がない場合は従来どおり claude を使用
  - 既存のワークフロー実行が動作することを確認
  - _Requirements: 7.3_

- [x] 3.3 統合テストを作成する
  - `specManagerService.execute()` でのエンジン解決フローを検証
  - 各種設定パターン（プロジェクト設定、Spec オーバーライド、デフォルト）を検証
  - _Requirements: 7.1, 7.2, 7.3_
  - _Integration Point: Design.md "Engine Resolution Flow"_

## 4. IPC ハンドラの追加

- [x] 4.1 (P) エンジン設定用の IPC チャンネルを定義する
  - `loadEngineConfig` チャンネルを定義
  - `saveEngineConfig` チャンネルを定義
  - `getAvailableLLMEngines` チャンネルを定義
  - _Requirements: 6.1_
  - _Verify: Grep "loadEngineConfig|saveEngineConfig|getAvailableLLMEngines" in channels.ts_

- [x] 4.2 (P) IPC ハンドラを実装する
  - `loadEngineConfig` ハンドラで `engineConfigService.loadEngineConfig()` を呼び出し
  - `saveEngineConfig` ハンドラで `engineConfigService.saveEngineConfig()` を呼び出し
  - `getAvailableLLMEngines` ハンドラで `getAvailableLLMEngines()` を呼び出し
  - _Requirements: 6.1_
  - _Method: loadEngineConfig, saveEngineConfig_
  - _Verify: Grep "loadEngineConfig|saveEngineConfig" in handlers.ts_

- [x] 4.3 (P) preload で API を公開する
  - `electron.d.ts` に型定義を追加
  - `preload/index.ts` で IPC を Renderer に公開
  - _Requirements: 6.1_

## 5. 設定 UI の実装

- [x] 5.1 EngineConfigSection コンポーネントを作成する
  - 3 セクション（生成/検査/実装）のレイアウトを構築
  - 各セクションに対応するフェーズのマッピング定義
  - セクション表示名を日本語で表示（生成、検査、実装）
  - _Requirements: 6.1, 6.2_

- [x] 5.2 デフォルトエンジン選択 UI を実装する
  - 「デフォルト」ドロップダウンを上部に配置
  - 利用可能なエンジン一覧（Claude, Gemini）を選択肢として表示
  - _Requirements: 6.4_

- [x] 5.3 セクション別エンジン選択 UI を実装する
  - 各セクションにドロップダウンを配置
  - 選択肢: Claude, Gemini, デフォルトを使用
  - 「デフォルトを使用」選択時は default エンジンを使用
  - _Requirements: 6.3, 6.5_

- [x] 5.4 設定変更時の自動更新を実装する
  - セクション変更時に対応するすべてのフェーズを更新
  - 例: 「生成」セクションを変更すると plan, requirements, design, tasks を一括更新
  - IPC 経由で `saveEngineConfig` を呼び出し
  - _Requirements: 6.6_
  - _Method: saveEngineConfig_
  - _Verify: Grep "saveEngineConfig" in EngineConfigSection.tsx_

- [x] 5.5 ProjectSettingsDialog に EngineConfigSection を統合する
  - 既存の設定パネルに新しいセクションとして追加
  - 設定読み込み時に `loadEngineConfig` を呼び出し
  - _Requirements: 6.1_

- [x] 5.6 設定 UI のテストを作成する
  - セクション↔フェーズの変換ロジックを検証
  - 設定変更時のコールバック動作を検証
  - _Requirements: 6.2, 6.3, 6.6_

## 6. 結合・検証

- [x] 6.1 エンドツーエンドの動作確認を行う
  - プロジェクト設定でエンジンを変更し、ワークフロー実行でそのエンジンが使用されることを確認
  - Spec 単位オーバーライドが正しく機能することを確認
  - 設定がない場合のデフォルト動作を確認
  - _Requirements: 4.4, 5.2, 5.3, 7.1, 7.2, 7.3_

- [x] 6.2 ログ出力の確認を行う
  - `startAgent` ログにエンジン情報が含まれることを確認
  - _Requirements: 7.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | LLMEngine インターフェース定義 | 1.1 | Infrastructure |
| 1.2 | LLMEngineRegistry 実装 | 1.4 | Infrastructure |
| 1.3 | エンジン追加時のバリデーション | 1.4, 1.5 | Infrastructure |
| 1.4 | Claude/Gemini エンジン定義 | 1.2, 1.3, 1.4 | Infrastructure |
| 2.1 | BuildArgsOptions 定義 | 1.1 | Infrastructure |
| 2.2 | Claude skipPermissions フラグ | 1.2 | Feature |
| 2.3 | Gemini --yolo フラグ | 1.3 | Feature |
| 2.4 | output-format stream-json | 1.2, 1.3 | Feature |
| 2.5 | 未サポートオプションの無視 | 1.2, 1.3 | Feature |
| 3.1 | ParsedOutput 構造定義 | 1.1 | Infrastructure |
| 3.2 | Claude JSONL パース | 1.2 | Feature |
| 3.3 | Gemini stream-json パース | 1.3 | Feature |
| 3.4 | 正規化レイヤー | 1.3 | Feature |
| 3.5 | パースエラーハンドリング | 1.5 | Feature |
| 4.1 | engineConfig 保存場所 | 2.2 | Infrastructure |
| 4.2 | engineConfig 構造 | 2.1 | Infrastructure |
| 4.3 | フェーズ未設定時のフォールバック | 2.3, 2.5 | Feature |
| 4.4 | デフォルト claude | 2.3, 6.1 | Feature |
| 5.1 | spec.json engineOverride 定義 | 2.4 | Infrastructure |
| 5.2 | engineOverride 優先 | 2.3, 2.5, 6.1 | Feature |
| 5.3 | オーバーライド未設定時のフォールバック | 2.3, 2.5, 6.1 | Feature |
| 6.1 | 設定パネル UI | 4.1, 4.2, 4.3, 5.1, 5.5 | Feature |
| 6.2 | 3セクション表示 | 5.1, 5.6 | Feature |
| 6.3 | セクション別エンジン選択 | 5.3, 5.6 | Feature |
| 6.4 | デフォルトドロップダウン | 5.2 | Feature |
| 6.5 | デフォルトを使用オプション | 5.3 | Feature |
| 6.6 | セクション変更時の自動更新 | 5.4, 5.6 | Feature |
| 7.1 | startAgent エンジン解決 | 3.1, 3.3, 6.1 | Feature |
| 7.2 | LLMEngineRegistry 使用 | 3.1, 3.3, 6.1 | Feature |
| 7.3 | 後方互換性 | 3.2, 3.3, 6.1 | Feature |
| 7.4 | エンジン使用ログ | 3.1, 6.2 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
