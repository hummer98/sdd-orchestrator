# 仕様レビューレポート #2

**Feature**: commandset-unified-installer
**Review Date**: 2025-12-17
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- document-review-1.md (前回レビュー)
- document-review-1-reply.md (対応レポート)
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md

## Executive Summary

**レビュー結果サマリー**: Critical: 0件、Warning: 8件、Info: 2件

前回レビュー（document-review-1.md）で指摘された8件のWarningのうち、**修正が未完了**のまま残っています。document-review-1-reply.mdでは7件が"Fix Required"と判定され、1件が"No Fix Needed"とされましたが、実際のドキュメントへの反映は確認できていません。

本レビューでは、前回の未修正項目を再度指摘するとともに、Steeringとの整合性、既存コードベースとの統合可能性を重点的に検証しました。

**主要な課題**:
1. ✅ **前回レビューの修正未適用**: W1-W8の指摘が未修正
2. ⚠️ **Steering整合性**: design.mdがsteering/structure.mdのService Patternに準拠しているが、一部不明確
3. ⚠️ **既存コードベース統合**: CcSddWorkflowInstaller/BugWorkflowInstallerの実装形態に依存するリスク
4. ℹ️ **パフォーマンス**: 並列処理戦略が曖昧

---

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**Status**: ⚠️ フェーズ情報の不整合が残存

**前回指摘（W2, W3）の修正状況**:
- ❌ **未修正**: Requirements 14（アップデート機能）に"**Implementation Phase**: Phase 2"の明記なし
- ❌ **未修正**: Requirements 6.5（インタラクティブ競合解決）にフェーズ情報の追加なし

**現状の問題**:
- Requirements 14: 6つの受け入れ基準で詳細に定義されているが、Design L22では"将来対応"、Tasks 12.1では"スケルトン実装"
- Requirements 6.5: "ユーザーに競合内容を通知し、選択を求めること"と記載されているが、Design L587では"Requirement 6.5のインタラクティブ確認は将来実装"

**Impact**: 実装スコープが不明確で、初回リリースでどこまで実装するかが曖昧

---

### 1.2 Design ↔ Tasks Alignment

**Status**: ⚠️ コンポーネント定義不足が残存

**前回指摘（W1）の修正状況**:
- ❌ **未修正**: DependencyResolverがDesignのComponents and Interfacesセクション（L194-207）に正式定義されていない
- ❌ **未修正**: CommandsetDefinitionManagerが同セクションに正式定義されていない

**現状の問題**:
- Design L228で"Outbound: DependencyResolver — 依存関係解決 (P0)"として依存関係に記載されているが、コンポーネントサマリー（L194-207）に含まれていない
- Design L358-407でDependencyResolverとCommandsetDefinitionManagerのService Interfaceは定義されているが、コンポーネントサマリーに記載がない

**新規発見**:
- **ProfileManagerのコンポーネントサマリー記載**: L194-207のComponent Summaryには存在しないが、L346-407で詳細定義されている（不整合）

**Impact**: 実装時にコンポーネント構成が不明確で、設計ミスのリスク

---

### 1.3 Design ↔ Tasks Completeness

**Status**: ⚠️ UI実装詳細が不足（前回指摘の一部未修正）

**前回指摘（W4）の修正状況**:
- ❌ **未修正**: Tasks 10.1に"projectStoreの状態監視とメニュー項目のenable/disable制御ロジック"の追加なし
- ❌ **未修正**: Tasks 10.3に"エラーダイアログにロールバックボタンを追加し、RollbackManager.rollback呼び出し処理を実装"の追加なし

**現状の問題**:
- Design L948-951で"プロジェクト未選択時はメニュー項目を無効化（既存の`projectStore`を参照）"と記載
- Tasks 10.1では"プロジェクト未選択時のメニュー無効化"と記載はあるが、projectStore連携の具体的な実装手順が不明

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| UI Components | InstallDialog (L928-951) | 10.2, 10.3 | ⚠️ ロールバックUI詳細なし |
| Services | UnifiedCommandsetInstaller (L211-343) | 1.1 | ✅ |
| Services | ProfileManager (L346-407) | 2.1, 2.2 | ⚠️ Component Summaryに記載なし |
| Services | StatusAggregator (L409-455) | 3.1, 3.2 | ✅ |
| Services | ClaudeMdMerger (L457-517) | 4.1, 4.2 | ✅ |
| Services | SettingsFileManager (L519-588) | 5.1, 5.2 | ✅ |
| Services | PermissionsAggregator (L590-643) | 6.1, 6.2 | ✅ |
| Services | RollbackManager (L645-718) | 7.1, 7.2 | ✅ |
| Services | ValidationService (L720-791) | 8.1, 8.2 | ⚠️ テンプレート安全性チェック未追加 |
| Services | UpdateManager (L793-865) | 12.1 | ⚠️ スケルトンのみ |
| Services | LoggingService (L867-924) | 9.1, 9.2 | ✅ |
| Services | DependencyResolver (L358-407) | 1.2 | ⚠️ Component Summaryに記載なし |
| Services | CommandsetDefinitionManager (L399-455) | 2.3 | ⚠️ Component Summaryに記載なし |
| IPC | IPC Handlers (L955-983) | 11.1 | ✅ |

---

### 1.4 Cross-Document Contradictions

**Status**: ⚠️ 前回指摘の矛盾が未解決

**アップデート機能のスコープ（W2）**:
- Requirements 14: 6つの受け入れ基準で完全な機能定義
- Design Non-Goals: "Requirement 14の完全実装は将来対応"
- Tasks 12.1: "スケルトン実装"
- **矛盾継続**: フェーズ分けの明記がない

**設定ファイル競合解決のインタラクティブモード（W3）**:
- Requirements 6.5: 必須機能として記載
- Design L587: "将来実装"
- Tasks: 該当タスクなし
- **矛盾継続**: 優先度が不明確

---

## 2. Gap Analysis

### 2.1 Technical Considerations

**セキュリティ: ⚠️ テンプレートファイル検証が未追加**

**前回指摘（W6）の修正状況**:
- ❌ **未修正**: ValidationService（Design L720-791）にテンプレートファイルの安全性チェック機能が追加されていない
- ❌ **未修正**: Tasks 8.1に"テンプレートファイルの安全性チェック（危険なコマンドパターンの検出: `rm -rf`、`eval`等）"の追加なし

**現状の問題**:
- Design L727-730のValidationService責務に"テンプレートファイルの安全性チェック"が含まれていない
- 悪意あるスクリプトやコマンドの含有チェックが未定義

**Impact**: セキュリティリスク（ただし、テンプレートファイルは内部管理されているため、リスクは限定的）

---

**パフォーマンス: ⚠️ 数値目標が未追加**

**前回指摘（W7）の修正状況**:
- ❌ **未修正**: Design L1090-1095のPerformance/Load Testsに具体的な数値目標が追加されていない

**現状の問題**:
- "大量のファイルインストール時の処理時間（100ファイル規模）"と記載されているが、許容時間の定義なし
- テストの合否判定基準が不明確

**推奨数値目標**（前回提案の再掲）:
- 100ファイルのインストールを30秒以内に完了すること
- 並列ステータスチェックが10秒以内に完了すること
- プログレスコールバックのUI更新が100ms以内に反映されること

---

### 2.2 Operational Considerations

**デプロイ手順: ⚠️ 未定義**

**前回指摘（W8）の修正状況**:
- ❌ **未修正**: DesignのOptional SectionsにDeployment Strategyセクションが追加されていない
- ❌ **未修正**: Tasks 14.1に"README.mdに統合インストーラーの使用方法を追加"の明記なし
- ❌ **未修正**: Tasks 14.1に"CLAUDE.mdのDevelopment Commandsセクションに統合インストーラー関連コマンドを追加"の明記なし

**現状の問題**:
- 統合インストーラーのElectronアプリへの組み込み方法が未定義
- リリースパッケージング手順が不明
- アプリ更新時の統合インストーラーバージョン管理が未定義

**Impact**: リリース時の運用手順が不明確で、デプロイエラーのリスク

---

## 3. Ambiguities and Unknowns

### 前回指摘の曖昧性が残存

**DependencyResolverの実装形態（W1関連）**:
- Design L228で依存関係として記載されているが、独立したクラスなのかUnifiedCommandsetInstallerのメソッドなのか不明確
- **現状**: L358-407でService Interfaceは定義されているため、独立クラスであることは推測できるが、Component Summaryに記載がない

**CommandsetDefinitionManagerの実装詳細（W1関連）**:
- Design L39-44, L358で言及されているが、Component Summary（L194-207）に含まれていない
- **現状**: L399-455でService Interfaceが定義されているため、独立クラスと推測できるが、正式な位置づけが不明

---

### 新規発見の曖昧性

**ProfileManagerのコンポーネント分類**:
- Design L346-407で詳細定義されているが、Component Summary（L194-207）に記載がない
- Service層コンポーネントとして扱うべきだが、リストに含まれていない

**テンプレートディレクトリのパス解決方法**:
- Design L34で`electron-sdd-manager/resources/templates/`と記載
- しかし、実装時のパス解決方法（相対パス、絶対パス、環境変数）が不明確
- **推奨**: パス解決戦略をDesignに追加（前回指摘の再掲）

---

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**Status**: ✅ 基本的に準拠

**Steering/tech.md整合性**:
- ✅ TypeScript 5.8+の使用（tech.md L19に準拠）
- ✅ Zodバリデーションの使用（tech.md L35に準拠）
- ✅ Vitestによるテスト（tech.md L50に準拠）

**Steering/structure.md整合性**:
- ✅ Service Patternの踏襲（structure.md L115-122に準拠）
- ✅ `.kiro/settings/`での設定管理（structure.md L50-59に準拠）
- ✅ Barrel Exportsパターン（structure.md L86-92に準拠）

**推奨事項**:
- Design L96-102のTechnology Stackに、structure.md L115-122のService Patternに合わせ、統合インストーラーサービスの配置場所（`electron-sdd-manager/src/main/services/`）を明記すべき

---

### 4.2 Integration Concerns

**Status**: ⚠️ 既存サービス統合の具体的パスが不明確（前回W5の再評価）

**前回判定の再検討**:
- 前回レビューのW5では"No Fix Needed"と判定されたが、**実際には既存サービスのファイルパスとAPIがDesignに記載されていない**
- document-review-1-reply.md L102-112で"既存コードを確認した結果、ファイルパスとAPIが存在することを確認"とあるが、**Design文書自体には反映されていない**

**現状の問題**:
1. **CcSddWorkflowInstallerとの統合**:
   - Design L37, L341-343で使用を前提としているが、ファイルパス不明
   - 既存実装: `electron-sdd-manager/src/main/services/ccSddWorkflowInstaller.ts`（前回確認済み）
   - **問題**: Designにファイルパスが記載されていないため、実装時に調査が必要

2. **BugWorkflowInstallerとの統合**:
   - Design L37, L341-343で使用を前提
   - 既存実装: `electron-sdd-manager/src/main/services/bugWorkflowInstaller.ts`（前回確認済み）
   - **問題**: 同上

3. **permissionsServiceとの統合**:
   - Design L604で使用を前提
   - 既存実装: `electron-sdd-manager/src/main/services/permissionsService.ts` - `addPermissionsToProject`関数（前回確認済み）
   - **問題**: APIシグネチャがDesignに記載されていない

4. **projectCheckerとの統合**:
   - Design L604で`projectChecker.REQUIRED_PERMISSIONS`を参照
   - 既存実装: `electron-sdd-manager/src/main/services/projectChecker.ts` - `REQUIRED_PERMISSIONS`定数（前回確認済み）
   - **問題**: このモジュールの役割と構造がDesignに不明

**Impact**: 実装時に既存コード調査が必要で、設計ドキュメントとしての完全性が不足

**推奨事項**（前回W5の再評価）:
- DesignのTechnology StackセクションまたはArchitecture PatternセクションにExisting Servicesサブセクションを追加し、依存する既存サービスのファイルパスと主要APIを列挙
- 特にpermissionsServiceとprojectCheckerのAPI定義を明記

---

### 4.3 Migration Requirements

**Status**: ✅ 詳細に定義

Design L1098-1125でPhase 1-3の段階的移行戦略が詳細に定義されている。

**推奨事項**:
- 各フェーズのタイムラインが不明（前回指摘の再掲）
- Tasksに各フェーズの実装タスクを追加すべき（現在はPhase 1のみ実装対象）

---

## 5. Recommendations

### Critical Issues (Must Fix)

**なし**

---

### Warnings (Should Address)

以下は**前回レビューで指摘され、document-review-1-reply.mdで"Fix Required"と判定されたが、未修正の項目**です。

#### W1: DependencyResolver/CommandsetDefinitionManager/ProfileManagerのコンポーネント定義を追加

**Status**: ❌ 未修正（前回W1の継続）

**Impact**: 実装時の設計曖昧性によるリファクタリングリスク

**Action**:
- DesignのComponents and Interfacesセクション（L194-207のComponent Summary）に以下を追加:
  - DependencyResolver: Service層コンポーネントとして定義
  - CommandsetDefinitionManager: Service層コンポーネントとして定義
  - ProfileManager: Service層コンポーネントとして定義

**Affected Documents**: design.md

---

#### W2: UpdateManager（Requirement 14）の実装スコープを明確化

**Status**: ❌ 未修正（前回W2の継続）

**Impact**: 初回リリース範囲の不明確さによるスケジュール遅延リスク

**Action**:
- requirements.mdのRequirement 14に以下を追加:
  - タイトルまたは冒頭に"**Implementation Phase**: Phase 2 (Future)"を追加
  - Objectiveの最後に「本要件は初回リリースではスケルトン実装とし、Phase 2で完全実装する」と明記
- design.mdのUpdateManagerセクション（L793-865）に初回リリース範囲を明記
- spec.jsonの`futureRequirements.phase2`配列にRequirement 14を追加

**Affected Documents**: requirements.md, design.md, spec.json

---

#### W3: 設定ファイル競合解決のインタラクティブモード（Requirement 6.5）の実装スコープを明確化

**Status**: ❌ 未修正（前回W3の継続）

**Impact**: 同上

**Action**:
- requirements.mdのRequirement 6のAcceptance Criteria 6.5を修正:
  - "（インタラクティブモードの場合）"を"（Phase 2対応: インタラクティブモード）"に変更
- design.mdのNon-Goalsセクション（L21-24）にRequirement 6.5の明記を確認
- spec.jsonの`futureRequirements.phase2`配列にRequirement 6.5を追加

**Affected Documents**: requirements.md, design.md, spec.json

---

#### W4: UI関連タスクの詳細化

**Status**: ❌ 未修正（前回W4の継続）

**Impact**: UI実装時の機能漏れリスク

**Action**:
- tasks.mdのTask 10.1に以下を追加:
  - "projectStoreの状態監視とメニュー項目のenable/disable制御ロジック"
- tasks.mdのTask 10.3に以下を追加:
  - "エラーダイアログにロールバックボタンを追加し、RollbackManager.rollback呼び出し処理を実装"

**Affected Documents**: tasks.md

---

#### W5: 既存コードベースとの統合ポイントを明確化（再評価）

**Status**: ❌ 未修正（前回W5の再評価）

**前回判定の変更理由**:
- 前回レビューでは"No Fix Needed"と判定したが、**Design文書自体には既存サービスのファイルパスとAPIが記載されていない**
- 実装時に既存コード調査が必要で、設計ドキュメントとしての完全性が不足

**Impact**: 実装時の既存コード調査コスト増大、設計ドキュメントの不完全性

**Action**:
- design.mdのTechnology StackセクションまたはArchitecture PatternセクションにExisting Servicesサブセクションを追加:
  - CcSddWorkflowInstaller: `electron-sdd-manager/src/main/services/ccSddWorkflowInstaller.ts`
  - BugWorkflowInstaller: `electron-sdd-manager/src/main/services/bugWorkflowInstaller.ts`
  - permissionsService: `electron-sdd-manager/src/main/services/permissionsService.ts` - `addPermissionsToProject(projectPath, permissions)`
  - projectChecker: `electron-sdd-manager/src/main/services/projectChecker.ts` - `REQUIRED_PERMISSIONS`定数

**Affected Documents**: design.md

---

#### W6: テンプレートファイルの検証をValidationServiceに追加

**Status**: ❌ 未修正（前回W6の継続）

**Impact**: セキュリティリスク（悪意あるテンプレート）

**Action**:
- design.mdのValidationService責務（L727-730）に以下を追加:
  - "テンプレートファイルの安全性チェック（スクリプトインジェクション検出）"
- ValidationService Interface（L739-786）のvalidateFileStructureメソッドに安全性チェック処理を含める旨を記載
- tasks.mdのTask 8.1に以下を追加:
  - "テンプレートファイルの安全性チェック（危険なコマンドパターンの検出: `rm -rf`、`eval`等）"

**Affected Documents**: design.md, tasks.md

---

#### W7: パフォーマンス要件の数値目標を定義

**Status**: ❌ 未修正（前回W7の継続）

**Impact**: パフォーマンステストの合否判定基準不明確

**Action**:
- design.mdのPerformance/Load Testsセクション（L1090-1095）に以下の数値目標を追加:
  - "**目標**: 100ファイルのインストールを30秒以内に完了すること"
  - "**目標**: 並列ステータスチェックが10秒以内に完了すること"
  - "**目標**: プログレスコールバックのUI更新が100ms以内に反映されること"

**Affected Documents**: design.md

---

#### W8: デプロイ手順とドキュメント更新計画を追加

**Status**: ❌ 未修正（前回W8の継続）

**Impact**: リリース時の運用手順不明確

**Action**:
- design.mdのOptional Sectionsに"Deployment Strategy"セクションを追加:
  - Electronアプリへのバンドル方法
  - リリースパッケージング手順
  - アプリ更新時の統合インストーラーバージョン管理
  - 既存インストーラーとの共存期間中のデプロイ手順
- tasks.mdのTask 14.1に以下を追加:
  - "README.mdに統合インストーラーの使用方法を追加"
  - "CLAUDE.mdのDevelopment Commandsセクションに統合インストーラー関連コマンドを追加"

**Affected Documents**: design.md, tasks.md

---

### Suggestions (Nice to Have)

#### I1: テンプレートディレクトリのパス解決戦略を明記

**Status**: ℹ️ 新規（前回レビューでは曖昧性として指摘）

**Impact**: 実装時のパス解決方法が不明確

**Action**:
- design.mdのTechnology Stackセクションに以下を追加:
  - "テンプレートディレクトリパス: `electron-sdd-manager/resources/templates/` (実装時は`app.getAppPath()`を使用して絶対パス解決)"

**Affected Documents**: design.md

---

#### I2: claude CLIバージョン要件を明示（前回I2の継続）

**Status**: ℹ️ 前回Info項目の継続

**Impact**: 環境依存の問題発生時の診断困難

**Action**:
- design.mdのTechnology Stackにclaude CLIのバージョン要件を追加

**Affected Documents**: design.md

---

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents | 前回レビュー |
| -------- | ----- | ------------------ | ------------------ | ---------- |
| Warning | [W1] DependencyResolver/CommandsetDefinitionManager/ProfileManagerのコンポーネント定義不足 | DesignのComponents and InterfacesセクションにService Interfaceを追加 | design.md | W1（未修正） |
| Warning | [W2] UpdateManager実装スコープ不明確 | Requirements 14にフェーズ情報を追加、Designに反映 | requirements.md, design.md, spec.json | W2（未修正） |
| Warning | [W3] Requirement 6.5実装スコープ不明確 | Requirements 6.5にフェーズ情報を追加、Designに反映 | requirements.md, design.md, spec.json | W3（未修正） |
| Warning | [W4] UI関連タスク詳細不足 | Tasks 10.1, 10.3にUI実装詳細を追加 | tasks.md | W4（未修正） |
| Warning | [W5] 既存コード統合ポイント不明確 | Designに既存サービスのファイルパスとAPI定義を追加 | design.md | W5（再評価：Fix Required） |
| Warning | [W6] テンプレートファイル検証不足 | ValidationServiceに安全性チェック機能を追加 | design.md, tasks.md | W6（未修正） |
| Warning | [W7] パフォーマンス要件数値不足 | Designにパフォーマンス目標値を追加 | design.md | W7（未修正） |
| Warning | [W8] デプロイ手順/ドキュメント不足 | DesignにDeployment Strategyを追加、Tasks 14.1にREADME更新を明記 | design.md, tasks.md | W8（未修正） |
| Info | [I1] テンプレートディレクトリパス解決戦略不明 | Designにパス解決戦略を追加 | design.md | 新規 |
| Info | [I2] claude CLIバージョン要件なし | DesignにCLI要件を追加 | design.md | I2（継続） |

---

## 7. Next Steps

### 推奨アクション

**前回レビューの修正適用**:
1. document-review-1-reply.mdで"Fix Required"と判定された7件の修正を適用
2. 本レビュー（document-review-2.md）で再評価された項目を反映

**修正適用後の確認**:
- 全ての修正が完了したら、`/kiro:document-review commandset-unified-installer`を再実行して検証

**実装開始条件**:
- 上記の8件のWarningが全て修正されたことを確認後、`/kiro:spec-impl commandset-unified-installer`で実装フェーズに進む

---

_このレビューはdocument-reviewコマンドにより生成されました。_
