# Specification Review Report #2

**Feature**: trpc-infrastructure
**Review Date**: 2026-02-06
**Previous Review**: Review #1（全6件の修正が適用済み）
**Documents Reviewed**:
- `spec.json` - Spec設定
- `requirements.md` - 要件定義（Review #1修正適用済み）
- `design.md` - 技術設計（Review #1修正適用済み）
- `tasks.md` - 実装タスク（Review #1修正適用済み）
- `research.md` - 調査結果（Review #1修正適用済み）
- `document-review-1.md` - Review #1レポート
- `document-review-1-reply.md` - Review #1リプライ（修正適用記録）
- `steering/product.md` - プロダクト概要
- `steering/tech.md` - 技術スタック
- `steering/structure.md` - ディレクトリ構造
- `steering/design-principles.md` - 設計原則

## Executive Summary

Review #1で指摘された6件の修正（Critical 2件、Warning 4件）は全て適切に適用されている。修正後の文書セットは高品質で、Requirements→Design→Tasksの一貫性が良好に維持されている。Review #2では、Review #1で検出されなかった新たな観点からの分析を実施した。

- **Critical**: 0件
- **Warning**: 2件
- **Info**: 4件

## Review #1 修正適用状況

| Issue | Status | 確認結果 |
|-------|--------|---------|
| C1: spec.json タイムスタンプ不整合 | ✅ 適用済み | `created_at: 2026-02-05T20:35:29.957Z`に修正、`updated_at`より前 |
| C2: Req 5.3 vite.config.preload.ts | ✅ 適用済み | `vite.config.ts`のelectronプラグインpreloadエントリー設定に修正 |
| W1: Req 3.3 文言ギャップ | ✅ 適用済み | 「公開API（`window.electronAPI`）に機能的影響を与えないこと（import文追加のみ許容）」 |
| W2: Req 6.6 検証範囲 | ✅ 適用済み | 型レベルでの呼び出し構造、ipcLink非動作のため実行時検証はスコープ外 |
| W3: Task 7 検証手順 | ✅ 適用済み | TypeScriptコンパイル + ビルド成功の検証方法追記 |
| W4: @tanstack/react-query v4 | ✅ 適用済み | design.md、research.md両方で^4.xに修正 |

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**良好な点**:
- Review #1で指摘されたReq 3.3, 5.3, 6.6の修正により、RequirementsとDesignの整合性が向上
- Design Requirements Traceability表の全32 Criterion IDが正確にマッピングされている
- Non-GoalsとOut of Scopeが完全に一致

**新たな発見**:

| 項目 | Requirements | Design | 深刻度 |
|------|-------------|--------|--------|
| DD-002表現の一貫性 | Req 3: preload/trpc.tsにtRPC専用設定が存在 | DD-002冒頭: 「既存の`preload/index.ts`内に`exposeElectronTRPC()`呼び出しを追加する」 | ℹ️ INFO |

**INFO-001: DD-002の冒頭表現と結論の微妙なずれ**
DD-002のDecision文は「既存の`preload/index.ts`内に`exposeElectronTRPC()`呼び出しを追加する」と記載しているが、実際の結論は「`preload/trpc.ts`を分離モジュールとして作成し、`preload/index.ts`から`import './trpc'`」。冒頭のDecision文が結論を正確に反映しておらず、初見では「preload/index.tsに直接コードを追加する」と誤読される可能性がある。しかし、DD-002の後続テキストで方式を明確に説明しているため、実装上の問題にはならない。

### 1.2 Design ↔ Tasks Alignment

**良好な点**:
- Design 9コンポーネント（TRPCInit, TRPCContext, RootRouter, SystemRouter, TRPCPreload, TRPCClient, TRPCProvider, MainIntegration, RouterTest）がTasks全体で網羅
- 依存関係の順序が適切（Task 2.1→2.2→2.3、Task 4.1→4.2等）
- Summary-Only Components（App.tsx統合、Vite Config更新）もタスクに含まれている

**新たな発見なし** ✅

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|------------------|---------------|--------|
| UI Components | なし（基盤Spec） | - | ✅ N/A |
| Services | TRPCInit, TRPCContext, RootRouter, SystemRouter, TRPCPreload, TRPCClient, TRPCProvider, MainIntegration | Tasks 2.1〜5.1 | ✅ 網羅 |
| Types/Models | HealthCheckResponse, AppRouter, RouterInputs, RouterOutputs, Context | Tasks 2.1〜2.3 | ✅ 網羅 |
| Tests | RouterTest（統合テスト） | Task 6.1 | ✅ 網羅 |
| Config Changes | package.json, vite.config.ts, vite.config.remote.ts | Tasks 1, 3.3 | ✅ 網羅 |
| Wiring Points | main/index.ts, preload/index.ts, renderer/App.tsx, remote-ui/App.tsx | Tasks 3.2, 5.1, 5.2, 5.3 | ✅ 網羅 |

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
| 3.3 | 既存preload公開APIへの非影響 | 3.2 | Integration | ✅ 修正済み |
| 3.4 | Vite Preloadビルド | 3.3 | Infrastructure | ✅ |
| 4.1 | tRPCクライアント設定 | 4.1 | Infrastructure | ✅ |
| 4.2 | createTRPCReact設定 | 4.1 | Infrastructure | ✅ |
| 4.3 | TRPCProvider | 4.2 | Infrastructure | ✅ |
| 4.4 | QueryClientProvider統合 | 4.2 | Infrastructure | ✅ |
| 4.5 | Electron版Provider統合 | 5.2 | Integration | ✅ |
| 4.6 | Remote UI版Provider統合 | 5.3 | Integration | ✅ |
| 5.1 | Electron Renderer Vite設定 | 3.3 | Infrastructure | ✅ |
| 5.2 | Remote UI Vite設定 | 3.3 | Infrastructure | ✅ |
| 5.3 | Preload Viteビルド設定 | 3.3 | Infrastructure | ✅ 修正済み |
| 5.4 | HMR動作確認 | 6.2 | Feature | ✅ |
| 5.5 | 本番ビルド成功 | 6.2 | Feature | ✅ |
| 6.1 | system router作成 | 2.2 | Feature | ✅ |
| 6.2 | healthCheck procedure | 2.2 | Feature | ✅ |
| 6.3 | healthCheck応答内容 | 2.2 | Feature | ✅ |
| 6.4 | Zod入出力スキーマ | 2.2 | Feature | ✅ |
| 6.5 | Renderer useQuery呼び出し | 7 | Feature | ✅ |
| 6.6 | Remote UI型レベル呼び出し | 7 | Feature | ✅ 修正済み |
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
- [x] 全Criterion ID（1.1〜8.5、計32件）がマッピング済み
- [x] User-facingのFeature Implementationタスクが適切に割り当て（healthCheck API、Provider統合、ビルド検証）
- [x] Infrastructure-onlyに依存するCriterionは基盤構築Specとして技術的に妥当

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tRPC callerパターン（Router直接呼び出し） | Testing Strategy | 6.1 | ✅ |
| IPC Transport層（electron-trpc） | Architecture Pattern | なし（意図的にスコープ外） | ✅ 妥当 |
| Main Process createIPCHandler統合 | MainIntegration, DD-005 | なし（ビルド検証のみ） | ⚠️ WARNING |
| Provider統合（Renderer） | TRPCProvider | なし（Task 7で型チェック+ビルド検証） | ✅ 修正済み |
| Provider統合（Remote UI） | TRPCProvider | なし（Task 7で型チェック+ビルド検証） | ✅ 修正済み |

**Validation Results**:
- [x] callerパターンでRouter/Procedureの統合テストが網羅
- [x] IPC層はelectron-trpcの責務として意図的にスコープ外
- [x] Provider統合はTask 7でTypeScriptコンパイル+ビルド成功で検証（Review #1 W3で対応済み）
- [ ] Main Process createIPCHandler統合のテストは対象外（下記WARNING参照）

**WARNING-001: Main Process統合（createIPCHandler）のテスト・検証手段が限定的**
Task 5.1でcreateIPCHandler統合を実装するが、この統合が正しく機能することの自動テストが存在しない。callerパターンテスト（Task 6.1）はRouter/Procedure層のみを検証し、createIPCHandlerの呼び出し正当性（引数の正確性、呼び出しタイミング、ウィンドウ参照の有効性）は対象外。ビルド成功（Task 6.2）で構造的な正しさは担保されるが、ランタイムの動作検証はアプリ起動による手動確認に依存する。

**Fallback Strategy**: Design Verification ContractのUJ-001で「E2E Not Required」としており、統合テスト + ビルド検証での品質担保方針は明記されている。ただし、createIPCHandlerの呼び出し失敗はアプリ起動時に初めて検出されるため、実装後のスモークテスト（手動でのアプリ起動確認）をTask 6.2に明記することを推奨。

### 1.6 Cross-Document Contradictions

| 文書1 | 文書2 | 矛盾内容 | 深刻度 |
|-------|-------|---------|--------|
| design.md TRPCPreload Implementation Notes | design.md DD-002 | TRPCPreloadのImplementation Notesが未決定口調（「選択する」）だが、DD-002で既に決定済み | ℹ️ INFO |
| research.md パッケージインストール | design.md Technology Stack | 両方とも@tanstack/react-query ^4.xで整合（Review #1 W4修正済み） | ✅ |
| design.md DD-002 Decision文 | design.md DD-002 Rationale | DD-002のDecision冒頭「既存のpreload/index.ts内に追加する」とRationaleの「分離モジュールとして定義しimport」が微妙にずれている | ℹ️ INFO (INFO-001) |

**Review #1で指摘されたspec.jsonタイムスタンプ不整合は完全に解消** ✅

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | 深刻度 | 説明 |
|-----|--------|------|
| Remote UI TRPCProvider初期化時のエラーハンドリング | ⚠️ WARNING | ipcLink未対応環境でTRPCProvider/QueryClientProviderを初期化した場合のエラー挙動が不明。Design DD-003で「Provider配置のみで呼び出しは行わない」方針だが、Provider初期化自体でipcLinkの接続試行が発生する可能性がある。初期化時にエラーが発生する場合、Remote UI版App.tsxのレンダリングに影響する |
| exposeElectronTRPCのimport元サブパス | ℹ️ INFO | Research.mdで`electron-trpc/main`からimportと記載。electron-trpc v0.7.1では`exposeElectronTRPC`はpreloadスクリプトで呼ばれるが、import元が`/main`サブパスで正しいか実装時に確認要。公式ドキュメントでは`electron-trpc/main`を使用しているが、パッケージのexportmap次第でpreload環境での動作が異なる可能性 |

### 2.2 Operational Considerations

| Gap | 深刻度 | 説明 |
|-----|--------|------|
| 実装後のスモークテスト手順 | ℹ️ INFO | Task 6.2で「npm run build成功」を検証するが、実際にアプリを起動してtRPC通信が動作することの手動検証手順が明示されていない。基盤構築Specでは、ビルド成功後にアプリ起動でhealthCheck APIの動作を確認するワンステップが品質保証として有効 |

## 3. Ambiguities and Unknowns

| 項目 | 説明 | 関連文書 |
|------|------|---------|
| TRPCProvider初期化の副作用 | `trpc.createClient({ links: [ipcLink()] })`を実行した時点でIPCチャネルへの接続が試行されるか、最初のhook呼び出し時に遅延されるかが未調査。前者の場合、Remote UI環境でProvider初期化がエラーになる可能性 | design.md DD-003, research.md |
| createIPCHandlerのウィンドウライフサイクル | ウィンドウが閉じられ再作成された場合、createIPCHandlerの再登録が必要か。Design DD-005では初回作成時の呼び出しのみ記載 | design.md DD-005 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**良好な点**:
- `src/main/trpc/`の配置はstructure.mdのディレクトリパターンに準拠（main/services/、main/ipc/と同レベルの新ディレクトリ）
- `src/shared/trpc/`の配置はSSOT原則に準拠（Electron版/Remote UI版共有コード）
- Preload統合方式はstructure.mdのElectron構造パターン（preloadディレクトリ）に整合
- テストの配置（`src/main/trpc/__tests__/router.test.ts`）はtech.mdの「テストファイルは`*.test.ts(x)`命名」パターンに準拠

**Review #1 CRITICAL-002（vite.config.preload.ts）は修正済み** ✅

### 4.2 Integration Concerns

| 観点 | 分析 |
|------|------|
| 既存IPC（219チャンネル）との共存 | Design.mdで「完全に独立したチャネル」と明記。tech.mdのIPC設計パターンに追加的変更のみ ✅ |
| State管理 | tRPCはReact Queryで状態管理。structure.mdのZustand stores（Domain State SSOT）とは独立したキャッシュ層として共存 ✅ |
| ApiClient抽象化層 | tech.mdのApiClient層（IpcApiClient/WebSocketApiClient）とtRPCクライアントの並行運用は設計上問題なし ✅ |
| Remote UI DesktopLayout設計原則 | tech.mdの「DesktopLayoutはElectron版に準拠」原則。tRPC基盤自体はUI変更を含まないため影響なし ✅ |
| ロギング | design.md Error HandlingでprojectLogger.error()使用を明記。steering/logging.mdのロギングパターンに準拠 ✅ |

### 4.3 Migration Requirements

- 本Specは新規追加のみで削除・移行なし ✅
- 後続`trpc-full-migration`でIPCチャンネルの移行を実施（spec.json `related_specs`で参照済み）✅
- データマイグレーション不要 ✅
- ロールバック: パッケージ削除 + 新規ファイル削除で完全復元可能 ✅

## 5. Recommendations

### Critical Issues (Must Fix)

なし。Review #1の修正が全て適切に適用されており、新たなCritical issueは発見されなかった。

### Warnings (Should Address)

**WARNING-001: Main Process統合（createIPCHandler）の検証手段が限定的**
- Task 5.1で実装するcreateIPCHandler統合のテストがcallerパターンの範囲外。ランタイム動作の検証は手動に依存する。Task 6.2に「アプリ起動によるスモークテスト」を明記することを推奨。
- **推奨アクション**: Task 6.2の検証項目に「アプリ起動後、devtoolsのConsoleでtRPC関連エラーが出力されないことを確認」を追記

**WARNING-002: Remote UI TRPCProvider初期化時のエラーハンドリング**
- ipcLink未対応環境でProvider初期化時にエラーが発生する可能性が未調査。Design DD-003で「Provider配置のみ」方針だが、初期化自体の副作用が不明。
- **推奨アクション**: Task 5.3（Remote UI Provider統合）の実装時に、ipcLink初期化がエラーを発生させないことを確認。エラーが発生する場合、try-catchまたは条件分岐でipcLink生成を抑制する設計をDesignに追記

### Suggestions (Nice to Have)

**INFO-001: DD-002のDecision文の表現改善**
- DD-002のDecision冒頭「既存の`preload/index.ts`内に`exposeElectronTRPC()`呼び出しを追加する」は、実際の結論（分離モジュール + import）と微妙にずれている。明確化のためDecision文を「`preload/trpc.ts`を分離モジュールとして作成し、既存の`preload/index.ts`から`import './trpc'`で読み込む」に更新することを推奨。

**INFO-002: TRPCPreload Implementation Notesの更新**
- Design TRPCPreloadのImplementation Notesが「選択する」という未決定口調のままだが、DD-002で方式は決定済み。Implementation Notesを決定後の内容に更新することを推奨。

**INFO-003: createIPCHandlerのウィンドウ再作成時の挙動**
- ウィンドウが閉じられ再作成される場合（macOSでのdock再起動等）、createIPCHandlerの再登録が必要かを実装時に確認。Design DD-005では初回作成時の記述のみ。

**INFO-004: Task 4.1の並行実行可能性の注記**
- Task 4.1はParallel(P)マークだが、AppRouter型のimport（`import type`）のためにTask 2.3完了後にファイルが存在する必要がある。TDD実装パターンでは先に型定義ファイルを作成する場合もあるため問題にはならないが、依存関係の注記があるとより明確。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|--------------------|
| WARNING | Main Process統合の検証手段 | Task 6.2にアプリ起動スモークテスト項目を追記 | tasks.md |
| WARNING | Remote UI TRPCProvider初期化 | Task 5.3実装時にipcLink初期化エラーの確認事項を追記 | tasks.md, design.md (DD-003) |
| INFO | DD-002 Decision文の表現 | Decision文を分離モジュール+import方式に更新 | design.md |
| INFO | TRPCPreload Implementation Notes | 決定済みの方式に更新 | design.md |
| INFO | createIPCHandlerウィンドウ再作成 | 実装時の確認事項として留意 | - |
| INFO | Task 4.1並行実行の依存関係 | Task 2.3との依存関係を注記 | tasks.md |

---

_This review was generated by the document-review command._
