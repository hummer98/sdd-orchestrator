# Specification Review Report #10

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, document-review-9.md, document-review-9-reply.md, product.md, tech.md, structure.md, design-principles.md + 実装済みコードベース検証（router.ts, context.ts, handler.ts, routers/system.ts, routers/config.ts, routers/project.ts, routers/file.ts, routers/spec.ts, routers/bug.ts, helpers/test-helpers.ts, shared/trpc/vanillaClient.ts, shared/hooks/useConfigTrpc.ts, shared/hooks/useSystemInfo.ts, preload/index.ts, channels.ts, handlers.ts, Renderer側window.electronAPI残存状況）

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 1 |
| WARNING | 2 |
| INFO | 2 |

レビュー#9の修正は**全3件のFix Required項目が正しく適用済み**（design.mdにvanillaClientパターンとReactフック層が追記、Components and Interfacesテーブルに反映済み）。

本レビュー#10では、**Task 5.1/5.2完了後の中間状態**における以下の観点を検証した:

主要な発見:
- **CRITICAL**: Task 5.3（Spec/Bug Renderer差し替え）が未着手のまま、specRouter/bugRouterは実装済み。しかしtasks.mdのTask 5.3のRequirements参照が`4.2`（Spec/Bug全チャンネル移行）のみで、**Renderer側の具体的な差し替え対象ファイル一覧がタスク記述に不足**している。specStore/bugStore等の影響範囲が不明確なまま実装に入ると漏れが生じるリスクが高い
- **WARNING**: handlers.ts内の`registerUnmigratedFileHandlers`/`registerUnmigratedProjectHandlers`という新規内部関数名がdesign.mdの移行戦略と不整合。design.mdでは「レガシーハンドラは各ドメイン移行完了時に削除」と定義しているが、handlers.ts内にtRPC移行済みドメインの残存ハンドラを"unmigrated"名で集約する中間パターンが出現している
- **WARNING**: requirements.md Req 2のAcceptance Criteria 2.4で「config routerに統合される全22プロシージャの元ハンドラが削除されていること」と定義しているが、handlers.ts内の`VCS_SCHEME_GET`/`VCS_SCHEME_SET`の2チャンネルはhandlers.ts内の`registerSteeringHandlers`に属しており、handlers.ts自体はTask 11.2まで残存する。この2チャンネルがReq 2.4の「削除」基準を満たすかが曖昧

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**全体評価**: 良好。レビュー#9で指摘された不整合は全て修正済み。新規の重大な不整合なし。

### 1.2 Design ↔ Tasks Alignment

**全体評価**: 概ね良好だが、Renderer差し替えタスクの詳細度に課題あり。

| # | 不整合 | design.md | tasks.md | 重要度 |
|---|--------|-----------|----------|--------|
| 1 | Task 5.3のRenderer差し替え対象が不明確 | design.mdのImpact Analysis Contractに約88ファイル・693箇所の`window.electronAPI`参照更新が必要と記載 | Task 5.3は「Spec一覧/詳細画面、Bug一覧/詳細画面、ワークフロー操作UI…shared/stores/specStore, bugStore内の呼び出しを全て置換」と記載するが、具体的なファイル一覧（specListStore.ts, specDetailStore.ts, specStoreFacade.ts, bugStore.ts等）が未列挙 | CRITICAL |
| 2 | handlers.ts内の"unmigrated"パターンがdesign.mdに未記載 | 「各ドメイン移行完了時にそのドメインのレガシーコードを削除」 | 実装ではhandlers.ts内にtRPC移行済みチャンネルの残存分を`registerUnmigratedXxxHandlers`として集約する中間パターンが出現 | WARNING |

**詳細（不整合#1）**: Task 5.3は以下のファイルの差し替えが必要だが、タスク記述に具体名がない:
- `src/renderer/stores/spec/specListStore.ts` — `window.electronAPI.readSpecs()`等
- `src/renderer/stores/spec/specDetailStore.ts` — `window.electronAPI.readSpecJson()`等
- `src/renderer/stores/spec/specStoreFacade.ts` — spec関連のStore統合
- `src/renderer/services/specSyncService.ts` — Spec同期サービス
- `src/renderer/services/specWatcherService.ts` — Spec監視サービス
- `src/shared/stores/bugStore.ts`（存在する場合）
- `src/renderer/components/ArtifactEditor.tsx` — ファイル読み書き
- `src/renderer/App.tsx` — Spec/Bug関連イベントリスナー（ただしSubscription移行はTask 9で実施）

各ドメインでRenderer差し替えの影響範囲は大きいため、**タスク記述で対象ファイルを明示化**すべきである。Task 3.2（Config差し替え）では正常に完了しているが、Spec/Bug/Agent等のより複雑なドメインでは漏れリスクが高まる。

**詳細（不整合#2）**: handlers.tsに`registerUnmigratedFileHandlers`/`registerUnmigratedProjectHandlers`が存在する。これはTask 4.4でprojectHandlers.ts/fileHandlers.tsを物理削除した際に、一部のチャンネル（projectHandlers.ts内のsystem系チャンネル等）がまだtRPC移行途中であったため handlers.ts内に残した中間措置と推察される。design.mdの「並行存在の方針」セクションで「各ドメイン移行完了時にそのドメインのレガシーコードを削除」とあるが、「ドメイン別ハンドラファイルは削除しても、handlers.ts内に移行残分を残す」という中間パターンは記載されていない。

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| tRPC Routers（system, config, project, file, spec, bug） | 6ルーター定義済み | Task 1〜5で対応 | ✅ 実装済み |
| tRPC Routers（agent〜misc） | 9ルーター定義 | Task 6〜10で対応 | ✅ タスク定義済み |
| vanillaClient | design.md記載済み | Task 3.2で暗黙実装 | ✅ |
| Reactフック層（useSystemInfo, useConfigTrpc） | design.md Components記載済み | Task 2.2, 3.2 | ✅ |
| eventsRouter（Subscription） | design.md定義済み | Task 9で対応 | ✅ タスク定義済み |
| レガシー撤廃 | design.mdに詳細記載 | Task 11で対応 | ✅ タスク定義済み |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1〜1.6 | パイロット移行（system） | 2.1〜2.3 | Feature/Cleanup | ✅ 完了 |
| 2.1〜2.5 | Config/Settings移行 | 3.1〜3.3 | Feature/Cleanup | ✅ 完了 |
| 3.1〜3.6 | Project/File移行 | 4.1〜4.4 | Feature/Cleanup | ✅ 完了 |
| 4.1〜4.3 | Spec/Bug router作成・Zodスキーマ | 5.1, 5.2 | Feature | ✅ 完了 |
| 4.4〜4.6 | specHandlers/bugHandlers削除・統合テスト | 5.4 | Cleanup/Test | ⬜ 未着手 |
| 5.1〜5.5 | Agent移行 | 6.1〜6.3 | Feature/Cleanup | ⬜ 未着手 |
| 6.1〜6.5 | AutoExecution移行 | 7.1〜7.3 | Feature/Cleanup | ⬜ 未着手 |
| 7.1〜7.5 | Git/Worktree移行 | 8.1〜8.3 | Feature/Cleanup | ⬜ 未着手 |
| 8.1〜8.5 | Subscription移行 | 9.1〜9.3 | Feature/Cleanup | ⬜ 未着手 |
| 9.1〜9.4 | その他ドメイン移行 | 10.1〜10.7 | Feature/Cleanup | ⬜ 未着手 |
| 10.1〜10.8 | レガシーIPC撤廃 | 11.1〜11.5 | Cleanup/Test | ⬜ 未着手 |
| 11.1〜11.3 | E2Eテスト | 12.1〜12.2 | Feature/Test | ⬜ 未着手 |
| 12.1〜12.4 | ドキュメント更新 | 13.1〜13.4 | Infrastructure | ⬜ 未着手 |

**Validation Results**:
- [x] 全criterion IDがRequirements Coverage Matrixに含まれている
- [x] User-facing criteriaにFeature Implementation tasksが存在する
- [x] Infrastructure tasksのみに依存するcriterionは存在しない

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| system router | System Router | system-router.test.ts | ✅ 実装済み |
| config router | Config Router | config-router.test.ts | ✅ 実装済み |
| project router | Project Router | project-router.test.ts | ✅ 実装済み |
| file router | File Router | file-router.test.ts | ✅ 実装済み |
| spec router | Spec Router | spec-router.test.ts | ✅ 実装済み |
| bug router | Bug Router | bug-router.test.ts | ✅ 実装済み |
| Context DI | DD-006 | context.test.ts, handler-context.test.ts | ✅ 実装済み |
| テストヘルパー | Testing Strategy | test-helpers.test.ts | ✅ 実装済み |
| agent router | Agent Router | Task 6.3で予定 | ⬜ 未着手 |
| autoExecution router | AutoExecution Router | Task 7.3で予定 | ⬜ 未着手 |
| git router | Git Router | Task 8.3で予定 | ⬜ 未着手 |
| events router (Subscription) | Events Router | Task 9.3で予定 | ⬜ 未着手 |
| Subscription lifecycle | DD-003 | Task 9.1で予定 | ⬜ 未着手 |

**Validation Results**:
- [x] 実装済みルーターに対応する統合テストが全て存在する
- [x] Context DI テストが存在する
- [ ] Subscription lifecycle（BrowserWindowクローズ時cleanup）テストは未作成（Task 9.1スコープ）

### 1.6 Refactoring Integrity Check

| Check | Validation | Status |
|-------|------------|--------|
| configHandlers.ts削除 | 物理削除済み（git status: D） | ✅ |
| projectHandlers.ts削除 | 物理削除済み（git status: D） | ✅ |
| fileHandlers.ts削除 | 物理削除済み（git status: D） | ✅ |
| projectFileHandlers.ts削除 | 物理削除済み（git status: D） | ✅ |
| handlers.ts内の残存チャンネル | `registerUnmigratedFileHandlers`, `registerUnmigratedProjectHandlers`として残存 | ⚠️ 中間状態 |
| specHandlers.ts削除 | 未削除（Task 5.4で予定） | ⬜ 予定通り |
| Consumer Updates（Renderer側） | Task 4.3で完了（project/file）、Task 3.2で完了（config）、Task 5.3が次の対象 | ⬜ 進行中 |

### 1.7 Cross-Document Contradictions

| # | 矛盾 | Document A | Document B | 重要度 |
|---|------|-----------|-----------|--------|
| 1 | VCS_SCHEME チャンネルの「削除」定義 | requirements.md Req 2.4: 「handlers.ts由来2チャンネル〔VCS_SCHEME_GET, VCS_SCHEME_SET〕」が削除対象 | design.md: handlers.tsはTask 11.2で削除。VCS_SCHEMEの2チャンネルはhandlers.ts内`registerSteeringHandlers`に所属 | WARNING |

**詳細（矛盾#1）**: requirements.md Req 2.4は「config routerに統合される全22プロシージャの元ハンドラが削除されていること（`handlers.ts`由来2チャンネル〔VCS_SCHEME_GET, VCS_SCHEME_SET〕）」と定義している。しかしVCS_SCHEME_GET/SETはhandlers.ts内の`registerSteeringHandlers()`に含まれており、handlers.ts自体はTask 11.2（レガシー基盤完全撤廃）まで削除されない。

config routerにVCS_SCHEMEプロシージャが実装され、Renderer側がtRPC経由で呼び出していれば、handlers.ts内のレガシーチャンネルは「使用されていない死コード」として残存するが、「元ハンドラが削除されていること」というReq 2.4の文言を厳密に解釈すると、config移行完了（Task 3.3）時点では未達成となる。これはTask 11.2での一括削除で解決するため実質的な問題はないが、要件の文言と実装戦略の不整合として記録する。

## 2. Gap Analysis

### 2.1 Technical Considerations

| # | Gap | 影響 | 重要度 |
|---|-----|------|--------|
| 1 | Subscription lifecycle cleanup検証が未実施 | BrowserWindowクローズ時にEventEmitterリスナーがleak可能性 | INFO（Task 9.1で対応予定） |
| 2 | vanillaClientのRemote UI非対応が明示的に制御されていない | Remote UIバンドルで`ipcLink()`が呼ばれた場合のエラーハンドリング | INFO（design.md記載済み、Electron専用と明記） |

### 2.2 Operational Considerations

**No new gaps detected.** 前回レビューで指摘されたgapは全て対処済み。

## 3. Ambiguities and Unknowns

| # | 曖昧点 | 関連ドキュメント | 重要度 |
|---|--------|-----------------|--------|
| 1 | Task 5.3（Renderer差し替え）の対象ファイル範囲が不明確 | tasks.md Task 5.3 | CRITICAL（上記1.2で詳述） |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- design.mdのアーキテクチャはsteering/structure.mdのElectron Process Boundary Rules（Main/Renderer分離）に準拠している
- tRPC Context DIパターン（DD-006）はMain Processでサービスを管理する原則と整合
- vanillaClientはElectron専用であり、Remote UIへの影響なし（steering/tech.mdのRemote UIアーキテクチャと整合）

### 4.2 Integration Concerns

- steering/tech.mdの「IPC設計パターン」セクションはまだレガシーIPC（channels.ts + handlers.ts + preload）の記述のまま。ただしTask 13.1でtRPC更新が計画されているため、移行完了まで更新を保留するのは妥当
- steering/structure.mdの「IPC Pattern」セクション（`main/ipc/`構造の記載）も同様にTask 13.2で更新予定

### 4.3 Migration Requirements

移行中の並行存在は計画通り進行中。現時点で:
- 6ルーターが実装済み（system, config, project, file, spec, bug）
- 4レガシーハンドラファイルが削除済み（configHandlers, projectHandlers, fileHandlers, projectFileHandlers）
- 25レガシーハンドラファイルが残存（handlers.ts含む）
- window.electronAPI参照が約696箇所残存（81ファイル）
- preload/index.tsは2,774行のまま（大部分が未移行）

## 5. Recommendations

### Critical Issues (Must Fix)

| # | Issue | Recommended Action |
|---|-------|-------------------|
| C1 | Task 5.3のRenderer差し替え対象が不明確 | tasks.md Task 5.3の記述に具体的な対象ファイル一覧を追加する。最低限、specListStore.ts, specDetailStore.ts, specStoreFacade.ts, specSyncService.ts, specWatcherService.ts、およびbug関連Storeファイルを列挙する |

### Warnings (Should Address)

| # | Issue | Recommended Action |
|---|-------|-------------------|
| W1 | handlers.ts内の"unmigrated"パターンがdesign.mdに未記載 | design.mdの「Integration & Deprecation Strategy > 並行存在の方針」セクションに「ドメイン別ハンドラファイル削除後、handlers.ts内に移行残分を`registerUnmigratedXxxHandlers`として一時的に集約する中間パターンがある」旨を追記する |
| W2 | Req 2.4のVCS_SCHEMEチャンネル「削除」定義とhandlers.ts残存の不整合 | requirements.md Req 2.4の注釈に「handlers.ts内の`registerSteeringHandlers()`由来チャンネルはTask 11.2（handlers.ts物理削除）で完全削除される。config移行完了時点ではtRPC経由に切り替え済みだが、handlers.ts内のレガシーコードは残存する」を追記する |

### Suggestions (Nice to Have)

| # | Issue | Recommended Action |
|---|-------|-------------------|
| S1 | Subscription lifecycle cleanup検証 | Task 9.1のタスク記述に含まれており対応予定。特に追加アクション不要 |
| S2 | Task 6以降のRenderer差し替えタスクも同様に対象ファイルを明示化 | Task 6.2, 7.2, 8.2, 9.2のタスク記述にも具体的な対象ファイル一覧を追加することを推奨 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| CRITICAL | Task 5.3の対象ファイル不明確 | タスク記述に具体的ファイル一覧を追加 | tasks.md |
| WARNING | "unmigrated"パターン未文書化 | 並行存在の方針に中間パターンを追記 | design.md |
| WARNING | Req 2.4のVCS_SCHEME削除定義 | 注釈追加 | requirements.md |
| INFO | 今後のRenderer差し替えタスクも明示化 | Task 6.2〜9.2に対象ファイル追加 | tasks.md |

---

_This review was generated by the document-review command._
