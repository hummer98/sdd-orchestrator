# Specification Review Report #1

**Feature**: trpc-infrastructure
**Review Date**: 2026-02-06
**Documents Reviewed**:
- `spec.json` - Spec設定
- `requirements.md` - 要件定義
- `design.md` - 技術設計
- `tasks.md` - 実装タスク
- `research.md` - 調査結果
- `steering/product.md` - プロダクト概要
- `steering/tech.md` - 技術スタック
- `steering/structure.md` - ディレクトリ構造
- `steering/design-principles.md` - 設計原則

## Executive Summary

全体として非常に高品質なSpec文書セット。Requirements→Design→Tasksの一貫性は良好で、トレーサビリティが明確に維持されている。基盤構築（Infrastructure）Specとしての性質上、ほぼ全タスクがInfrastructure/Integrationタイプであることは妥当。

- **Critical**: 2件
- **Warning**: 4件
- **Info**: 3件

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**良好な点**:
- Design.mdのRequirements Traceabilityテーブルが全32のAcceptance Criteriaを網羅（1.1〜8.5）
- 各Criterion IDに対して具体的なコンポーネント名と実装アプローチが明記されている
- Non-GoalsがRequirementsのOut of Scopeと完全に一致

**矛盾点**:

| 項目 | Requirements | Design | 深刻度 |
|------|-------------|--------|--------|
| Requirement 3.3 | 「既存の`src/preload/index.ts`に影響を与えないこと（分離された設定）」 | DD-002で「既存の`preload/index.ts`内に`exposeElectronTRPC()`呼び出しを追加」「import追加は既存APIの動作に一切影響しない」 | ⚠️ WARNING |
| Preload設定ファイル配置 | Req 3.1: `src/preload/trpc.ts`に設定が「存在すること」 | DD-002: `preload/trpc.ts`を分離モジュールとして作成し`preload/index.ts`からimport | ✅ 整合（Design側で技術的制約を反映した拡張解釈） |

**WARNING-001: Requirement 3.3と設計DD-002の解釈ギャップ**
Requirements 3.3は「既存preloadに影響を与えない」と明記しているが、Design DD-002は`preload/index.ts`に`import './trpc'`を追加する設計。Research.mdで「機能的影響を与えない」と解釈を拡大しているが、Requirement側の文言を更新すべき。Requirement側で「既存preloadの公開API（window.electronAPI）に影響を与えないこと」と明確化することを推奨。

### 1.2 Design ↔ Tasks Alignment

**良好な点**:
- Design.mdのコンポーネント表（9コンポーネント）がTasksの構成と一致
- 依存関係の順序が適切に反映されている（TRPCInit → SystemRouter → RootRouter）
- Summary-Only Componentsもタスクに含まれている

**矛盾点**:

| 項目 | Design | Tasks | 深刻度 |
|------|--------|-------|--------|
| Vite設定変更の粒度 | Design: 3つの個別設定（vite.config.ts, vite.config.remote.ts, vite.config.preload.ts） | Tasks 3.3: 3つを1タスクに集約 | ✅ 許容範囲 |
| createIPCHandlerの配置 | Design DD-005: `createWindow()`内 | Tasks 5.1: `createWindow()`内でBrowserWindow作成後 | ✅ 整合 |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|------------------|---------------|--------|
| UI Components | なし（基盤Specのため） | - | ✅ N/A |
| Services | TRPCInit, TRPCContext, RootRouter, SystemRouter, TRPCPreload, TRPCClient, TRPCProvider, MainIntegration | Tasks 2.1〜5.1 | ✅ 網羅 |
| Types/Models | HealthCheckResponse, AppRouter, RouterInputs, RouterOutputs, Context | Tasks 2.1〜2.3 | ✅ 網羅 |
| Tests | RouterTest（統合テスト） | Task 6.1 | ✅ 網羅 |
| Config Changes | package.json, vite.config.ts, vite.config.remote.ts | Tasks 1, 3.3 | ✅ 網羅 |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | electron-trpc devDependencies | 1 | Infrastructure | ✅ |
| 1.2 | @trpc/server dependencies | 1 | Infrastructure | ✅ |
| 1.3 | @trpc/client dependencies | 1 | Infrastructure | ✅ |
| 1.4 | @trpc/react-query dependencies | 1 | Infrastructure | ✅ |
| 1.5 | @tanstack/react-query dependencies | 1 | Infrastructure | ✅ |
| 1.6 | zod 既存確認 | 1 | Infrastructure | ✅ |
| 1.7 | npm install 正常完了 | 1 | Infrastructure | ✅ |
| 1.8 | TypeScriptコンパイル成功 | 1 | Infrastructure | ✅ |
| 2.1 | tRPCインスタンス定義 | 2.1 | Infrastructure | ✅ |
| 2.2 | Root Router定義 | 2.3 | Infrastructure | ✅ |
| 2.3 | 空ネームスペース構造 | 2.3 | Infrastructure | ✅ |
| 2.4 | Context型定義 | 2.1 | Infrastructure | ✅ |
| 2.5 | Router型のexport | 2.3 | Infrastructure | ✅ |
| 3.1 | tRPC Preload設定 | 3.1 | Infrastructure | ✅ |
| 3.2 | exposeElectronTRPC設定 | 3.1 | Infrastructure | ✅ |
| 3.3 | 既存preloadへの非影響 | 3.2 | Integration | ⚠️ 解釈ギャップ（1.1参照） |
| 3.4 | Vite Preloadビルド | 3.3 | Infrastructure | ✅ |
| 4.1 | tRPCクライアント設定 | 4.1 | Infrastructure | ✅ |
| 4.2 | createTRPCReact設定 | 4.1 | Infrastructure | ✅ |
| 4.3 | TRPCProvider | 4.2 | Infrastructure | ✅ |
| 4.4 | QueryClientProvider統合 | 4.2 | Infrastructure | ✅ |
| 4.5 | Electron版Provider統合 | 5.2 | Integration | ✅ |
| 4.6 | Remote UI版Provider統合 | 5.3 | Integration | ✅ |
| 5.1 | Electron Renderer Vite設定 | 3.3 | Infrastructure | ✅ |
| 5.2 | Remote UI Vite設定 | 3.3 | Infrastructure | ✅ |
| 5.3 | Preload Vite設定 | 3.3 | Infrastructure | ✅ |
| 5.4 | HMR動作確認 | 6.2 | Feature | ✅ |
| 5.5 | 本番ビルド成功 | 6.2 | Feature | ✅ |
| 6.1 | system router作成 | 2.2 | Feature | ✅ |
| 6.2 | healthCheck procedure | 2.2 | Feature | ✅ |
| 6.3 | healthCheck応答内容 | 2.2 | Feature | ✅ |
| 6.4 | Zod入出力スキーマ | 2.2 | Feature | ✅ |
| 6.5 | Renderer useQuery呼び出し | 7 | Feature | ✅ |
| 6.6 | Remote UI呼び出し | 7 | Feature | ⚠️ 下記参照 |
| 7.1 | 統合テスト存在 | 6.1 | Integration Test | ✅ |
| 7.2 | Electronプロセス不要 | 6.1 | Integration Test | ✅ |
| 7.3 | healthCheck動作検証 | 6.1 | Integration Test | ✅ |
| 7.4 | 型安全性検証 | 6.1 | Integration Test | ✅ |
| 7.5 | テスト全pass | 6.2 | Integration Test | ✅ |
| 8.1 | tRPCハンドラ登録 | 5.1 | Integration | ✅ |
| 8.2 | createIPCHandler設定 | 5.1 | Integration | ✅ |
| 8.3 | アプリ起動時自動有効化 | 5.1 | Integration | ✅ |
| 8.4 | 既存IPCとの共存 | 5.1 | Integration | ✅ |
| 8.5 | エラーログ出力 | 5.1 | Integration | ✅ |

**Validation Results**:
- [x] 全Criterion ID（1.1〜8.5）がマッピング済み
- [x] Feature Implementationタスクが適切に割り当てられている
- [x] Infrastructure-onlyに依存するCriterionは技術的に妥当（基盤構築Spec）

**WARNING-002: Criterion 6.6 Remote UI呼び出しの検証方法が曖昧**
Task 7で「Remote UI側で同様の呼び出し構造が利用可能であることを確認する（ipcLinkの制約により実行時の動作確認はスコープ外）」と記載。Requirementは「Remote UIから同様に呼び出せること」と明記。実際にはipcLinkが動作しないため、検証方法がTypeScriptコンパイルのみに限定される。Requirementの期待値と実際の検証可能範囲にギャップがある。

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tRPC callerパターン（Router直接呼び出し） | Testing Strategy | 6.1 | ✅ |
| IPC Transport層（electron-trpc） | Architecture Pattern | なし（意図的にスコープ外） | ✅ 妥当 |
| Provider統合（Renderer） | TRPCProvider | なし | ⚠️ WARNING |
| Provider統合（Remote UI） | TRPCProvider | なし | ⚠️ WARNING |

**Validation Results**:
- [x] callerパターンでRouter/Procedureの統合テストが網羅
- [ ] Provider統合（React Componentレベル）のテストは対象外
- [x] IPC層はelectron-trpcの責務として意図的にスコープ外

**WARNING-003: Provider統合のテスト・検証手段が未定義**
TRPCProviderをrenderer/App.tsxとremote-ui/App.tsxに統合するが、この統合が正しく動作することの検証方法が明確でない。ビルド成功（Task 6.2）で構造的な正しさは担保されるが、ランタイムの動作検証（Providerが正しくマウントされ、子コンポーネントからhooksが使用可能か）は手動確認に依存する。Task 7が「確認する」と記載しているが、具体的な検証手順が不明。

### 1.6 Cross-Document Contradictions

| 文書1 | 文書2 | 矛盾内容 | 深刻度 |
|-------|-------|---------|--------|
| requirements.md Req 3 | design.md DD-002 | Preload分離 vs import追加（1.1で詳述） | ⚠️ WARNING |
| requirements.md Req 4.1 | design.md TRPCClient | Req: `src/shared/trpc/client.ts`。Design: 同一パス。整合。 | ✅ |
| spec.json `created_at` | spec.json `updated_at` | created_at: 2026-02-06T12:00:00Z, updated_at: 2026-02-05T20:45:48.631Z。updated_atがcreated_atより前。 | ❌ CRITICAL |
| design.md Architecture | research.md Preload | Design: 「既存の`preload/index.ts`内に追加」。Research: 「`preload/index.ts`から`import './trpc'`」。整合。 | ✅ |

**CRITICAL-001: spec.jsonのタイムスタンプ不整合**
`created_at`が`2026-02-06T12:00:00Z`、`updated_at`が`2026-02-05T20:45:48.631Z`。updated_atがcreated_atより前の時刻になっている。created_atが不正確（手動設定の可能性）。

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | 深刻度 | 説明 |
|-----|--------|------|
| Remote UI TRPCProvider のフォールバック | ⚠️ WARNING | Design DD-003でipcLinkが動作しないことを認識しているが、Remote UIでtRPC hookを呼び出した場合のエラーハンドリング/フォールバック設計が未定義。Provider配置のみで呼び出しを行わない方針だが、開発者が誤ってhookを呼び出した場合の挙動が不明 |
| electron-trpc `exposeElectronTRPC` のimport元 | ℹ️ INFO | Design: `electron-trpc/main`からimport。Research: 同様。ただし、electron-trpc v0.7.1のexport構造がpreloadスクリプトで`electron-trpc/main`を使用する点は要確認（通常preloadでは`electron-trpc/preload`を使用するケースもある） |
| @tanstack/react-query v5とtRPC v10の互換性 | ℹ️ INFO | Design: `@tanstack/react-query ^5.x`。tRPC v10の`@trpc/react-query`がReact Query v5に対応しているか確認が必要。tRPC v10は元々React Query v4向けに設計されている |

### 2.2 Operational Considerations

| Gap | 深刻度 | 説明 |
|-----|--------|------|
| ロールバック戦略 | ℹ️ INFO | tRPC基盤導入のロールバック手順が未定義だが、新規追加のみ（既存削除なし）のため、パッケージ削除と新規ファイル削除で完全にロールバック可能。明記は不要だが留意事項として記録 |

## 3. Ambiguities and Unknowns

| 項目 | 説明 | 関連文書 |
|------|------|---------|
| `vite.config.preload.ts`の存在 | Requirements 5.3で「vite.config.preload.ts」を参照するが、Design DD-002で「Viteのelectron pluginでpreloadエントリーを追加」としている。実際の設定ファイル名がRequirementsとDesignで異なる可能性 | requirements.md Req 5.3, design.md DD-002 |
| Remote UI でのTRPC呼び出しの挙動 | ipcLinkが動作しない環境でTRPCProviderをマウントした場合、初期化時にエラーが発生するか、hookの呼び出し時にエラーが発生するかが未調査 | design.md DD-003, research.md |
| `createIPCHandler`のwindows引数 | Design DD-005: `createIPCHandler({ router: appRouter, windows: [mainWindow] })`。electron-trpc v0.7.1のAPIシグネチャの正確な確認が必要。APIがwindowsを配列で受け取るか、単一windowか | design.md DD-005 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**良好な点**:
- `src/main/trpc/`の配置はstructure.mdのディレクトリパターンに準拠（main/services/と同レベルの新ディレクトリ）
- `src/shared/trpc/`の配置はSSOT原則（structure.md）に準拠
- preload統合方式はstructure.mdのElectron構造パターンに整合

**CRITICAL-002: Vite設定ファイル名の不一致**
Requirements 5.3で`vite.config.preload.ts`を参照しているが、tech.mdでは`vite.config.ts`（Electron Renderer + Preload）と`vite.config.remote.ts`（Remote UI）の2ファイル体制。`vite.config.preload.ts`という独立ファイルは現在のプロジェクト構成に存在しない可能性がある。Designではelectron pluginのpreloadエントリー追加と記載しており、Requirementsの「vite.config.preload.ts」は誤認の可能性。

### 4.2 Integration Concerns

| 観点 | 分析 |
|------|------|
| 既存IPC（219チャンネル）との共存 | Design.mdで「完全に独立したチャネル」と明記。tech.mdのIPC設計パターンに追加的変更のみで整合 |
| State管理 | structure.mdのState Management Rulesに準拠。tRPC自体はReact Queryで状態管理するため、Zustand storeとの役割分担は明確 |
| ApiClient抽象化層 | tech.mdのApiClient層（IpcApiClient/WebSocketApiClient）とtRPCクライアントの並行運用は設計上問題なし |

### 4.3 Migration Requirements

- 本Specは新規追加のみで削除・移行なし
- 後続`trpc-full-migration`でIPCチャンネルの移行を実施（related_specsで参照済み）
- data-migrationの必要なし

## 5. Recommendations

### Critical Issues (Must Fix)

**CRITICAL-001: spec.jsonのタイムスタンプ不整合**
- `created_at`（2026-02-06T12:00:00Z）が`updated_at`（2026-02-05T20:45:48.631Z）より後。created_atを正しい値に修正する必要がある。

**CRITICAL-002: Vite設定ファイル名の不一致**
- Requirements 5.3で`vite.config.preload.ts`を参照しているが、実際のプロジェクト構成ではelectron pluginのpreloadエントリーとして`vite.config.ts`内で設定する可能性が高い。Requirementsの文言を修正するか、実際のファイル構成を確認して整合させる必要がある。

### Warnings (Should Address)

**WARNING-001: Requirement 3.3の文言とDesign DD-002の矛盾**
- Req 3.3「既存preloadに影響を与えない」→ Design「import文1行追加」。Requirementsの文言を「既存preloadの公開API（window.electronAPI）に機能的影響を与えないこと」に修正推奨。

**WARNING-002: Criterion 6.6 Remote UI検証方法の曖昧さ**
- Remote UIからのhealthCheck呼び出しはipcLink非動作のため実行時検証不可。Requirementを「型レベルでの呼び出し構造が利用可能であること」に明確化するか、スコープを再検討。

**WARNING-003: Provider統合の検証手段未定義**
- Task 7の「確認する」の具体的な手順を定義。TypeScriptコンパイル成功 + ビルド成功で構造的正しさを担保し、手動確認項目としてアプリ起動後のdevtools確認を追記。

**WARNING-004: @tanstack/react-query v5 と tRPC v10 の互換性**
- tRPC v10の`@trpc/react-query`がReact Query v5を正式サポートしているか要確認。v4が必要な場合、バージョン指定の修正が必要。

### Suggestions (Nice to Have)

**INFO-001: electron-trpcのimport元の確認**
- `exposeElectronTRPC`のimport元が`electron-trpc/main`か`electron-trpc/preload`かを実装前に確認。

**INFO-002: createIPCHandler APIシグネチャの確認**
- electron-trpc v0.7.1の`createIPCHandler`が`windows`配列を受け取るか、他の形式かを実装前に確認。

**INFO-003: Remote UIでのipcLink初期化エラーの調査**
- ipcLink未対応環境でTRPCProviderを初期化した場合の挙動を調査し、必要であれば条件分岐を設計に追加。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|--------------------|
| CRITICAL | spec.jsonタイムスタンプ不整合 | `created_at`を正しい値に修正 | spec.json |
| CRITICAL | vite.config.preload.tsの参照 | 実際のファイル構成に合わせてReq 5.3の文言を修正 | requirements.md |
| WARNING | Req 3.3の文言ギャップ | 「公開APIに機能的影響を与えない」に修正 | requirements.md |
| WARNING | Criterion 6.6の曖昧さ | 検証範囲を「型レベルでの利用可能性」に明確化 | requirements.md |
| WARNING | Provider統合の検証手順 | Task 7に具体的な検証手順を追記 | tasks.md |
| WARNING | React Query v5互換性 | tRPC v10 + React Query v5の互換性を確認し、必要に応じてバージョン修正 | design.md, research.md |
| INFO | exposeElectronTRPCのimport元 | 実装開始前にelectron-trpc v0.7.1のexport構造を確認 | research.md |
| INFO | createIPCHandler APIシグネチャ | 実装開始前にAPI仕様を確認 | research.md |
| INFO | Remote UI ipcLink初期化挙動 | TRPCProvider初期化時のエラー有無を調査 | research.md |

---

_This review was generated by the document-review command._
