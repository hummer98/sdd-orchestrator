# Specification Review Report #3

**Feature**: multi-window-integration
**Review Date**: 2026-02-26
**Documents Reviewed**:
- `spec.json` - Spec構成（phase: tasks-generated, language: ja）
- `requirements.md` - 要件定義（8要件、32受入基準）— Review #1, #2修正適用済み
- `design.md` - 技術設計（5コンポーネント、5 Design Decisions、3統合テスト）— Review #1, #2修正適用済み
- `tasks.md` - 実装タスク（10タスクグループ、38サブタスク）— Review #1, #2修正適用済み
- `research.md` - 技術調査結果
- `document-review-1.md` / `document-review-1-reply.md` - Review #1レポートと対応結果
- `document-review-2.md` / `document-review-2-reply.md` - Review #2レポートと対応結果
- `.kiro/steering/product.md` - プロダクト概要
- `.kiro/steering/tech.md` - 技術スタック
- `.kiro/steering/structure.md` - プロジェクト構造
- `.kiro/steering/design-principles.md` - 設計原則
- `.kiro/steering/logging.md` - ロギングガイドライン

**Review Context**: Review #1で7件Warning + 4件Info、Review #2で2件Warning + 4件Infoが検出され、全件修正適用済み。本レビューは修正完了後の最終ドキュメント状態を対象とし、実装開始前の最終確認として実施する。

## Executive Summary

| 種別 | 件数 |
|------|------|
| Critical | 0 |
| Warning | 0 |
| Info | 5 |

Review #1, #2の全修正が適切に適用されており、ドキュメント間の一貫性は高い水準で確保されている。本レビューでは残存する5件のInfo（いずれも実装上のリスクは低い）を検出した。仕様は実装開始可能な状態にある。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

Review #1 W-1（Decision Log不一致）解消済み。Open Questions 3件すべて「解決済み」ステータス。requirements.md / design.md / research.md間の方針は完全に整合している。

**検出事項なし** ✅

### 1.2 Design ↔ Tasks Alignment

5コンポーネント、Wiring Points 12箇所、廃止ファイル1箇所のタスクカバレッジは良好。Review #2で追加されたTask 6.3の22イベントチェックリスト詳細化、Task 2.1のクロージャバインディングパターン記述も正しく反映されている。

**検出事項なし** ✅

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| Services（WindowManager拡張） | Service Interface定義あり | Task 1.1-1.4 | ✅ |
| Services（WindowContextFactory） | Service Interface定義あり | Task 2.1 | ✅ |
| Services（EventBusFilter） | Event Contract定義あり | Task 4.1-4.3 | ✅ |
| Services（ProjectStateCompat） | Summary-only | Task 3.1 | ✅ |
| Services（MenuFocusTracker） | Summary-only | Task 5.1-5.2 | ✅ |
| Types/Models（PerWindowContext, PerWindowServices） | 型定義あり | Task 1.1-1.2 | ✅ |
| Data Models（webContentsToWindowId Map） | Logical Data Model定義あり | Task 1.2 | ✅ |
| ContextServices.windowId追加 | PostconditionsにI2-1修正反映済み | Task 2.3 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

全32基準（1.1-8.4）のマッピングはReview #1, #2で検証済み。Coverage Matrix I2-3修正（5.2 Task Type → Test）も適用済み。

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

Review #2 I2-2修正により、Task 9.1のcreateTestContextWithWindowヘルパー作成が明示化されている。

**Validation Results**:
- [x] 全シーケンス図に対応する統合テストが存在
- [x] IPCチャネルの配信検証テストが存在（9.1）
- [x] Store同期フローの状態伝播テストが存在（9.3）

### 1.6 Refactoring Integrity Check

| Check | Validation | Status |
|-------|------------|--------|
| Deletion Tasks | Task 7.3で`windowFactory.ts`を物理削除 | ✅ |
| Consumer Updates | Task 7.3で全参照箇所をWindowManager APIに更新、Verify: `Grep "windowFactory" in src/ (結果0件)` | ✅ |
| No Parallel Implementation | windowFactory.ts削除後、WindowManagerが唯一のウィンドウ管理 | ✅ |

### 1.7 Cross-Document Contradictions

Review #1 W-1（再設計 vs 拡張）解消済み。Review #2で追加された修正（DD-004 Consequences、WindowContextFactory Postconditions）も整合している。

#### Requirement 6.3 と Task 5.1 の表現差異（I3-1）

requirements.md 6.3:
> When メニューから「最近使ったプロジェクト」を選択した場合, the system shall **フォーカス中のウィンドウ**でそのプロジェクトを開く（未選択ウィンドウがある場合）、または新しいウィンドウを作成する

tasks.md Task 5.1:
> 「最近使ったプロジェクト」選択時、**プロジェクト未選択のウィンドウ**があればそこで開き、なければ新規ウィンドウ作成

要件は「フォーカス中のウィンドウで開く」（フォーカスウィンドウが未選択の場合）、タスクは「任意の未選択ウィンドウで開く」と解釈可能。例えば、フォーカスウィンドウにプロジェクトが設定済みで別ウィンドウが未選択の場合、要件文面では新規ウィンドウ作成だがタスクでは既存の未選択ウィンドウを使用する。design.md Requirements Traceability 6.3もタスク側の解釈を採用している。

UX観点ではタスク側の解釈（未選択ウィンドウを再利用）がより合理的であり、実用上問題なし。

## 2. Gap Analysis

### 2.1 Technical Considerations

#### context.ts Wiring Points記述とWindowContextFactory設計の微妙な不一致（I3-2）

design.md Integration & Deprecation Strategy（line 626）:
```
src/main/trpc/context.ts | createContextにeventパラメータを受け取るオーバーロード追加。ContextServicesのgetterをウィンドウ別対応 | 3.1-3.3
```

しかし、実際の設計ではコンテキスト生成ロジックはWindowContextFactory（Task 2.1）に集約されており、context.tsの変更はContextServicesインターフェースへの`windowId`フィールド追加（Task 2.3）が主である。「createContextにeventパラメータを受け取るオーバーロード追加」はWindowContextFactoryの`createWindowContextFactory`が返す関数が担う役割であり、context.ts自体にオーバーロードが追加されるわけではない。

実装者がcontext.tsにオーバーロードを実装しようとする可能性は低い（Task 2.1-2.3の記述が明確なため）が、Wiring Points表の記述が実際の設計意図と若干乖離している。

#### PerWindowServices生成の責務所在の曖昧さ（I3-3）

design.md Flow 2（line 161-162）:
```
tRPC->>WM: setWindowProject(windowId, path)
WM->>Svc: createWindowServices(windowId, path)
```

このシーケンスはWindowManager.setWindowProject内部でcreateWindowServicesを呼ぶように描かれている。

一方、tasks.md Task 6.1では:
```
WindowManager.setWindowProject(windowId, path)で重複チェックとプロジェクト紐づけを実行
ウィンドウ別のSpecManagerService、各Watcher、MetricsService、AutoExecutionCoordinatorを初期化
```

これらを別個のステップとして記述しており、サービス初期化が`setWindowProject`の外で行われるように読める。

既存WindowManagerの実装ではcreateWindowServicesは独立メソッドとして存在する可能性が高く、setWindowProjectからの内部呼び出しか外部からのシーケンシャル呼び出しかは実装時に自然に解決される。設計の意図自体は明確（プロジェクト設定後にサービスを生成）であり、実装上の問題にはならない。

### 2.2 Operational Considerations

Review #1 I-1（Steering文書更新計画）は「実装完了後対応」として据え置き。現時点での対応不要。

## 3. Ambiguities and Unknowns

### handler-context.test.ts / main-integration.test.ts の更新タスク不明確（I3-4）

design.md Interface Changes（line 656-657）:
```
テスト: handler-context.test.ts, main-integration.test.ts -- テスト用のsetupTRPCHandler呼び出しを新APIに更新
```

この2ファイルの更新がdesign.mdで明示されているが、tasks.md内のどのサブタスクがこれらの更新を担当するかが不明確。

- Task 2.4（WindowContextFactoryとtRPCハンドラのユニットテスト）が最も近いが、記述は「新規テスト作成」に焦点を当てており、「既存テストファイルの更新」を明示していない
- Task 7.3（windowFactory.ts廃止）のVerifyステップで`Grep "windowFactory"`を実行するが、`setupTRPCHandler`のGrepは含まれていない

実務上、`setupTRPCHandler` → `initializeTRPCHandler`の変更によりTypeScriptコンパイルエラーが即座に検出されるため、更新漏れのリスクは極めて低い。

### タスクグループ間の依存関係が暗黙的（I3-5）

tasks.md先頭の注記でグループ内の並列実行（`(P)`マーカー）は明確に定義されているが、グループ間の依存関係は番号順序からの暗黙的推論に委ねられている。

具体的な依存チェーン:
- Task 1（WindowManager基盤）→ Task 2-5（並列可能）→ Task 6（統合）→ Task 7（起動フロー）→ Task 8（永続化）→ Task 9-10（テスト）

10タスクグループの実装順序は番号順で自然に解決されるため、実装上の問題にはならない。ただし、parallel batch execution（`/kiro:spec-auto-impl`）を使用する場合、グループ間の依存関係が自動で考慮されるかは実装ツール側の仕様に依存する。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

| Steering Rule | Compliance | Evidence |
|---------------|------------|----------|
| structure.md: セッション状態はMain Processが保持 | ✅ | WindowManagerがMain ProcessでPerWindowStateを管理 |
| structure.md: Domain State SSOT | ✅ | WindowManagerがウィンドウ状態のSSOT |
| structure.md: 循環依存禁止 | ✅ | WindowManager → ConfigStore → （なし） |
| design-principles.md: SSOT | ✅ | WindowManagerがウィンドウライフサイクルのSSOT |
| design-principles.md: 根本原因への対処 | ✅ | グローバル変数を構造的に解消（互換レイヤーは段階的移行のため） |
| tech.md: tRPC IPC設計パターン | ✅ | Context DI、EventBus Subscriptionパターンを活用・拡張 |
| tech.md: テストパターン | ✅ | createTestContext拡張、Vitest使用 |
| logging.md: loggerの使用 | ✅ | `[WindowManager]`プレフィックスのlogger使用を設計 |

### 4.2 Integration Concerns

- **Remote UI**: Non-Goalsとして明確に除外。DD-004にWebSocketハンドラの挙動変化が追記済み ✅
- **既存テスト互換性**: Task 1.5で既存26件全パスを確認。IPCHandler null時のguard（Task 1.3「存在時に」）で既存テスト破壊を防止 ✅
- **electron-trpc依存**: Research.mdで0.7.1のソースコード調査完了 ✅
- **productionServices.ts影響**: DD-003の互換レイヤーと段階的移行。Known Limitationsも追記済み ✅

### 4.3 Migration Requirements

- **windowFactory.ts廃止**: Task 7.3で物理削除とGrep検証 ✅
- **handler.ts API変更**: `setupTRPCHandler` → `initializeTRPCHandler`。design.mdにテストファイル更新記載 ✅
- **projectState.ts互換レイヤー**: DD-003にKnown Limitations追記済み ✅

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

なし

### Suggestions (Nice to Have)

| ID | Issue | Description |
|----|-------|-------------|
| I3-1 | Req 6.3表現差異 | requirements.md「フォーカス中のウィンドウで開く」とtasks.md「未選択ウィンドウで開く」の解釈差異。design.md/tasks.mdのタスク側解釈がUX的に合理的 |
| I3-2 | context.ts Wiring Points記述 | Wiring Points表の「createContextオーバーロード追加」がWindowContextFactory設計と微妙に乖離。Task 2.1-2.3の記述は明確 |
| I3-3 | PerWindowServices生成の責務所在 | Flow 2ダイアグラムとTask 6.1でサービス生成の呼び出し階層が若干異なる描写。実装時に自然に解決 |
| I3-4 | テストファイル更新の暗黙性 | handler-context.test.ts / main-integration.test.tsの更新がdesign.mdに記載あるがtasks.mdのサブタスクとしては未明示。コンパイルエラーで検知可能 |
| I3-5 | グループ間依存の暗黙性 | タスクグループ間の実行順序依存が番号順序からの暗黙推論に依存。sequential実行では問題なし |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Low | I3-1 | 対応不要（タスク側解釈がUX的に合理的で、design.mdも同様の解釈を採用済み）。必要に応じてrequirements.md 6.3の表現を「プロジェクト未選択のウィンドウがあればそこで開く」に更新 | requirements.md (optional) |
| Low | I3-2 | 対応不要（Task 2.1-2.3の記述が実装指針として十分明確）。必要に応じてWiring Points表のcontext.ts行を更新 | design.md (optional) |
| Low | I3-3 | 対応不要（実装時にsetWindowProjectとcreateWindowServicesの呼び出し関係が自然に決定） | - |
| Low | I3-4 | 対応不要（コンパイルエラーで即座に検知可能）。必要に応じてTask 2.4に「既存handler-context.test.ts、main-integration.test.tsの新API対応更新」を追記 | tasks.md (optional) |
| Low | I3-5 | 対応不要（番号順の暗黙的依存で実務上問題なし）。必要に応じてtasks.md先頭の注記にグループ間依存の説明を追記 | tasks.md (optional) |

## 7. Review #2 Fix Verification

Review #2で指摘された全6件の修正適用状況を確認:

| ID | Issue | 修正状況 | 確認箇所 |
|----|-------|---------|---------|
| W2-1 | EventBusイベント実態不一致 | ✅ 適用済み | tasks.md Task 6.3: 発火元詳細化、emit実態3イベント判断ステップ追加 |
| W2-2 | selectProjectバインディング未記述 | ✅ 適用済み | design.md WindowContextFactory Implementation Notes + tasks.md Task 2.1 |
| I2-1 | ContextServices.windowId未反映 | ✅ 適用済み | design.md WindowContextFactory Postconditions |
| I2-2 | createTestContextWithWindow暗黙的 | ✅ 適用済み | tasks.md Task 9.1: 「作成する」に具体化 |
| I2-3 | Coverage Matrix 5.2 Task Type | ✅ 適用済み | tasks.md: 「Test（既存実装の検証）」に修正 |
| I2-4 | Remote UI挙動変化 | ✅ 適用済み | design.md DD-004 Consequences |

## 8. Overall Assessment

本仕様は3回のレビューを通じて以下の品質レベルに到達している:

- **ドキュメント間整合性**: 高い。Requirements（32基準）→ Design（5コンポーネント、5 DD）→ Tasks（38サブタスク）の三段階トレーサビリティが確立
- **技術的実現可能性**: 高い。research.mdによるelectron-trpc 0.7.1の詳細調査、既存WindowManager実装の分析に基づく設計
- **リファクタリング安全性**: 高い。windowFactory.ts廃止のGrep検証、互換レイヤーのKnown Limitations文書化
- **テスト戦略**: 十分。ユニット（Task 1.5, 2.4, 3.2, 4.4）、統合（Task 9.1-9.3）、E2E（Task 10.1-10.4）の三層カバレッジ

**結論: 仕様は実装開始可能な状態にある。** 残存するInfo 5件はいずれも実装時に自然に解決されるか、コンパイルエラーで即座に検知可能な項目であり、実装を阻害するものではない。

---

_This review was generated by the document-review command._
