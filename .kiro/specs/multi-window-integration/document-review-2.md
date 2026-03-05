# Specification Review Report #2

**Feature**: multi-window-integration
**Review Date**: 2026-02-26
**Documents Reviewed**:
- `spec.json` - Spec構成（phase: tasks-generated, language: ja）
- `requirements.md` - 要件定義（8要件、32受入基準）— Review #1修正適用済み
- `design.md` - 技術設計（5コンポーネント、5 Design Decisions、3統合テスト）— Review #1修正適用済み
- `tasks.md` - 実装タスク（10タスクグループ、38サブタスク）— Review #1修正適用済み
- `research.md` - 技術調査結果
- `document-review-1.md` - Review #1レポート
- `document-review-1-reply.md` - Review #1対応結果
- `.kiro/steering/product.md` - プロダクト概要
- `.kiro/steering/tech.md` - 技術スタック
- `.kiro/steering/structure.md` - プロジェクト構造
- `.kiro/steering/design-principles.md` - 設計原則
- `.kiro/steering/logging.md` - ロギングガイドライン

**Review Context**: Review #1で指摘された7件のWarning（うち6件Fix Required）と4件のInfoのうち8件が修正適用済み。本レビューはその修正後の最新ドキュメント状態を対象とする。また、ソースコードの実態調査（EventBus emit箇所、ContextServicesインターフェース、selectProject呼び出しパターン）を実施し、設計の実現可能性を検証した。

## Executive Summary

| 種別 | 件数 |
|------|------|
| Critical | 0 |
| Warning | 2 |
| Info | 4 |

Review #1の修正が適切に適用されており、ドキュメント間の主要な一貫性は確保されている。本レビューではソースコードの実態調査に基づく2件のWarning（EventBusイベント実態との不一致、selectProject windowIdバインディングパターンの未記述）と4件のInfoを検出した。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

Review #1で指摘されたW-1（Decision Log「再設計」→「拡張」の不一致）が修正済み。現在のrequirements.md Decision Logはdesign.md/research.mdの方針と整合している。

Open Questionsの3件もすべて「解決済み」ステータスに更新されており、設計フェーズへの未解決課題の持ち越しはない。

**追加検出事項なし** ✅

### 1.2 Design ↔ Tasks Alignment

5コンポーネントとWiring Points 12箇所のタスクカバレッジは良好。Review #1後に追加された修正（Task 6.3の22イベントチェックリスト、Task 6.4のBrowserWindow.getAllWindows()[0]修正）も適切に反映されている。

**追加検出事項なし** ✅

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| Services（WindowContextFactory） | Service Interface定義あり | Task 2.1 | ✅ |
| Services（EventBusFilter） | Event Contract定義あり | Task 4.1-4.3 | ✅ |
| Types/Models（PerWindowContext, PerWindowServices） | 型定義あり | Task 1.1-1.2 | ✅ |
| Data Models（webContentsToWindowId Map） | Logical Data Model定義あり | Task 1.2 | ✅ |
| ContextServices.windowId追加 | Task 2.3で記載 | Task 2.3 | ⚠️ I2-1 |

### 1.4 Acceptance Criteria → Tasks Coverage

Review #1で全32基準のマッピングが検証済み。追加の漏れなし。

**Validation Results**:
- [x] 全criterion ID（1.1-8.4）がマッピング済み
- [x] ユーザー向け基準にFeature Implementationタスクが存在
- [x] Infrastructureタスクのみに依存する基準なし

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tRPCコンテキスト分離 | "Test 1: tRPCコンテキスト分離" | 9.1 | ✅ |
| EventBusフィルタリング | "Test 2: EventBusフィルタリング" | 9.2 | ✅ |
| プロジェクト選択→サービスライフサイクル | "Test 3: プロジェクト選択とサービスライフサイクル" | 9.3 | ✅ |

Design.md E2E Testsセクションの「状態復元」はReview #1対応で削除済み。ユニットテスト（Task 8.1/8.2）でカバーされる旨の注記が追加されている。

**テストヘルパーに関する懸念**:

Design.md Integration Test Strategy の Test 1 Prerequisites に「テスト用に`createTestContextWithWindow(windowId)`ヘルパーが必要」と記載されているが、このヘルパーの作成が明示的タスクとして定義されていない（**I2-2**）。

### 1.6 Cross-Document Contradictions

Review #1で検出されたW-1（再設計 vs 拡張）は解消済み。

新たな矛盾の検出: **なし** ✅

## 2. Gap Analysis

### 2.1 Technical Considerations

#### Task 6.3のEventBusイベント実態との不一致（WARNING-1）

ソースコード調査により、Task 6.3の22プロジェクトスコープイベントチェックリストのうち**3件が既存コードでEventBus.emitされていない**ことを確認した。

| イベント名 | 実態 | 影響 |
|-----------|------|------|
| `METRICS_UPDATED` | EVENT_NAMESに定義あり、events.tsにSubscriptionあり。しかしEventBus.emitする箇所が**プロダクションコードに存在しない** | 実装者がprojectPath追加対象としてgrepしても見つからない。新規emit作成が必要 |
| `BUG_AUTO_EXECUTION_EXECUTE_PHASE` | テストファイルのみ。プロダクションコードにemitなし | 同上 |
| `GIT_CHANGES_DETECTED` | `webSocketHandler.ts`のWebSocketブロードキャストで使用。EventBus経由のemitではない可能性 | EventBusイベントとしてprojectPath追加が必要か、WebSocket独立パスかの判断が必要 |

残り19件のイベント発火元ファイルの実態:

| 発火元ファイル | イベント数 | 対象イベント |
|-------------|---------|------------|
| `projectSetup.ts` | 14件 | Agent系5件、AutoExecution系5件、BugAutoExecution系4件（registerEventCallbacks, registerAutoExecutionEvents, registerBugAutoExecutionEvents内） |
| `watcherUtils.ts` | 3件 | SPECS_CHANGED, BUGS_CHANGED, AGENT_RECORD_CHANGED |
| `projectFileUtils.ts` | 1件 | PROJECT_FILE_CHANGED |

Task 6.3の説明文では発火元として4ファイル（watcherUtils.ts、projectSetup.ts、projectFileUtils.ts、GitFileWatcherService）を列挙しているが、`projectSetup.ts`の対象範囲が「Auto-Execution EventBus bridge」のみの記載で、実際には**Agent系イベントもprojectSetup.ts内で発火**されている。

#### selectProjectの「Router側コード変更不要」の実現メカニズム未記述（WARNING-2）

design.md Interface Changes（line 659-663）:
```
selectProject(projectPath) -> selectProject(projectPath, windowId?)
影響: tRPCコンテキスト経由の呼び出しはWindowContextFactoryがwindowIdを自動注入するため、Router側のコード変更は不要
```

ソースコード調査の結果:
- `selectProject`はContextServicesのプロパティとして公開されている（context.ts line 333）
- project router（project.ts line 82）は`ctx.services.selectProject(input.projectPath)`で呼び出している
- 現在のproductionServices.tsでは、`selectProject`をContextServicesに直接参照として設定

「Router側コード変更不要」は、WindowContextFactory側でselectProjectをwindowId付きのクロージャとしてバインドすることで実現可能:

```typescript
// WindowContextFactory内（推定される実装パターン）
selectProject: (path) => selectProject(path, windowId),
```

しかし、このバインディングパターンがdesign.mdのどこにも明示的に記述されていない。Task 2.1（createWindowContextFactory）の説明にも、このパターンの記載がない。実装者が「Router側コード変更不要」の根拠を理解できず、誤ってRouter側にwindowId引き渡しを追加する、あるいは逆にバインディングを実装せずデフォルト（フォーカスウィンドウ）に頼る実装になるリスクがある。

### 2.2 Operational Considerations

Review #1 I-1（Steering文書更新計画）は「実装完了後対応」として据え置き。現時点での対応不要。

## 3. Ambiguities and Unknowns

### ContextServices.windowId追加の設計文書未反映（I2-1）

Task 2.3で「ContextServicesインターフェースに`windowId`フィールドを追加」と記載されているが、design.md Components & InterfacesセクションのWindowContextFactory Service Interface定義には、ContextServicesの変更内容（windowId追加）が反映されていない。

ContextServicesは70以上のプロパティを持つ大規模インターフェースであり、windowIdの追加位置と用途の明確化が望ましい。

### createTestContextWithWindowヘルパーの暗黙的作成（I2-2）

Design.md Integration Test Strategy Test 1:
```
Prerequisites: テスト用に`createTestContextWithWindow(windowId)`ヘルパーが必要
```

Task 9.1:
```
テスト用ヘルパー`createTestContextWithWindow(windowId)`が必要な場合は作成
```

ヘルパー作成が「必要な場合は」という条件付きで記載されており、Prerequisitesの「必要」との温度差がある。既存の`createTestContext(overrides)`を拡張する形で対応可能だが、明示的なサブタスクとしての記載がない。

### Requirements Coverage Matrix 5.2のTask Type不一致（I2-3）

tasks.md Appendix Coverage Matrix:
```
| 5.2 | 最小化ウィンドウの復元フォーカス | 1.5 | Implementation |
```

Task 1.5は「WindowManager拡張のユニットテスト」であり、Task Typeは「Implementation」ではなく「Test（既存実装の検証）」が正確。design.mdのRequirements Traceabilityでも「既存」と記載されており、新規実装は不要。

### Remote UI WebSocketハンドラの挙動変化（I2-4）

本specの実装後、EventBusイベントにprojectPathメタデータが追加される。Remote UIのWebSocketハンドラ（webSocketHandler.ts）は現在EventBusイベントをフィルタなしで全件ブロードキャストしている。

マルチウィンドウ環境では、複数プロジェクトのイベントがRemote UIに配信される新たな状況が発生する。design.mdではRemote UI対応をNon-Goalsとしており、WebSocketハンドラのフィルタリングは将来specに委譲する方針だが、この挙動変化について明示的なドキュメントがない。

実用上、Remote UIは単一プロジェクトセッション前提で動作するため、受信した無関係なイベントは無視される（Rendererが処理しない）。ただし、不要なイベント転送によるWebSocket帯域の微小な増加は発生する。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **structure.md Electron Process Boundary Rules**: WindowManagerがMain ProcessでPerWindowStateを管理する設計は、「セッション状態はMain Processが保持」ルールに準拠 ✅
- **structure.md State Management Rules**: WindowManagerがウィンドウ別ドメイン状態のSSOTとなり、shared/storesのRendererキャッシュはtRPC Subscription経由で同期 ✅
- **design-principles.md SSOT**: WindowManagerがウィンドウライフサイクルのSSOT ✅
- **design-principles.md 循環依存禁止**: WindowManager → ConfigStore → （なし）で循環なし ✅
- **tech.md tRPC IPC設計パターン**: Context DI、EventBus Subscriptionパターンを活用・拡張 ✅
- **logging.md**: `[WindowManager]`プレフィックスのログ設計がガイドラインに準拠 ✅

### 4.2 Integration Concerns

- **Remote UI**: Non-Goalsとして明確に除外。EventBusフィルタリングのSubscription側実装により、WebSocketハンドラへの将来的なフィルタ追加が容易 ✅
- **既存テスト互換性**: Task 1.5で既存26件のユニットテスト全パスを確認 ✅
- **electron-trpc依存**: Research.mdで0.7.1のソースコード調査完了。attachWindow/detachWindow/createContextの動作確認済み ✅
- **productionServices.ts影響**: 70以上のサービスプロパティを持つContextServicesの変更。互換レイヤー（DD-003）による段階的移行で大規模破壊を回避 ✅

### 4.3 Migration Requirements

- **windowFactory.ts廃止**: Task 7.3で物理削除と全参照更新。Verify項目に`Grep "windowFactory" in src/ (結果0件を確認)`あり ✅
- **handler.ts API変更**: `setupTRPCHandler` → `initializeTRPCHandler`。テストファイル更新も記載 ✅
- **projectState.ts互換レイヤー**: DD-003にKnown Limitations追記済み（Review #1 W-7対応） ✅

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| ID | Issue | Description | Affected Documents |
|----|-------|-------------|-------------------|
| W2-1 | EventBusイベント実態との不一致 | 22イベントチェックリストのうち3件（METRICS_UPDATED、BUG_AUTO_EXECUTION_EXECUTE_PHASE、GIT_CHANGES_DETECTED）がプロダクションコードでEventBus.emitされていない。Agent系イベントの発火元ファイル（projectSetup.ts）もタスク説明に不足 | tasks.md |
| W2-2 | selectProject windowIdバインディング未記述 | 「Router側コード変更不要」の実現メカニズム（WindowContextFactoryでのselectProjectクロージャバインディング）がdesign.mdおよびtasks.mdに明示されていない | design.md, tasks.md |

### Suggestions (Nice to Have)

| ID | Issue | Description |
|----|-------|-------------|
| I2-1 | ContextServices.windowId未反映 | Task 2.3で追加するwindowIdフィールドがdesign.md Components & Interfacesに未反映 |
| I2-2 | createTestContextWithWindow暗黙的 | Design Prerequisitesで「必要」と記載されたヘルパーがTask 9.1で「必要な場合は」と条件付き |
| I2-3 | Coverage Matrix 5.2 Task Type | Task Type「Implementation」→「Test（既存実装）」が正確 |
| I2-4 | Remote UI挙動変化 | マルチウィンドウ後にWebSocketハンドラが全プロジェクトイベントを受信する新挙動が未ドキュメント |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Medium | W2-1 | Task 6.3に以下を追記: (1) METRICS_UPDATED、BUG_AUTO_EXECUTION_EXECUTE_PHASE、GIT_CHANGES_DETECTEDの実態確認ステップ（emit箇所が存在しない場合はスキップまたは新規作成を判断）、(2) Agent系イベント5件の発火元が`projectSetup.ts`の`registerEventCallbacks()`内であることを明記 | tasks.md |
| Medium | W2-2 | design.md WindowContextFactory Implementation Notesまたはtasks.md Task 2.1に「ContextServicesのselectProject等のper-windowプロパティは、WindowContextFactory内でwindowIdバインド済みクロージャとして生成する。これによりRouter側のコード変更は不要」の明記を追加 | design.md or tasks.md |
| Low | I2-1 | design.md Components & InterfacesのWindowContextFactory Service Interface定義に、ContextServicesへの`windowId: number`追加を反映 | design.md |
| Low | I2-2 | Task 9.1内の「必要な場合は作成」を「既存createTestContextをwindowId対応に拡張する」に具体化 | tasks.md |
| Low | I2-3 | Coverage Matrix 5.2のTask Typeを「Test（既存実装）」に修正 | tasks.md |
| Low | I2-4 | design.md Non-GoalsセクションまたはDD-004 Consequencesに「WebSocketハンドラは全イベントを受信し続けるが、単一プロジェクトセッションのため実用上影響なし」を追記 | design.md |

---

_This review was generated by the document-review command._
