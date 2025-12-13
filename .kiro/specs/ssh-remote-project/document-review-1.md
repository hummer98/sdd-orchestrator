# Specification Review Report #1

**Feature**: ssh-remote-project
**Review Date**: 2025-12-13
**Documents Reviewed**:
- `spec.json`
- `requirements.md`
- `design.md`
- `tasks.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| Warning | 5 |
| Info | 3 |

本レビューでは、SSH Remote Project仕様の整合性を検証した結果、Requirements ↔ Design ↔ Tasks間でいくつかの不整合、欠落、および曖昧な点を特定しました。特に**タスク番号の不整合**と**UI関連の設計・タスク欠落**は、実装前に対処が必要です。

---

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**問題なし**: すべてのRequirement（1〜10）がDesignのRequirements Traceability表でカバーされている。

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| Req 1: SSH URI | SSHUriParser | ✅ |
| Req 2: SSH認証 | SSHAuthService | ✅ |
| Req 3: FileSystemProvider | FileSystemProvider, LocalFSProvider, SSHFSProvider | ✅ |
| Req 4: ProcessProvider | ProcessProvider, LocalProcProvider, SSHProcProvider | ✅ |
| Req 5: Claude Code実行 | SSHProcessProvider | ✅ |
| Req 6: 接続状態管理 | SSHConnectionService | ✅ |
| Req 7: プロジェクト切り替え | ProjectStore, ProviderFactory | ✅ |
| Req 8: 最近使用したプロジェクト | ConfigStore | ✅ |
| Req 9: セキュリティ | HostKeyManager | ✅ |
| Req 10: エラーハンドリング | Logger | ✅ |

### 1.2 Design ↔ Tasks Alignment

**Critical Issue #1: タスク番号の不整合**

tasks.mdでタスク番号が連続していない問題が検出されました：

| 期待されるタスク番号 | 実際のタスク番号 | 内容 |
|---------------------|-----------------|------|
| 7.1, 7.2, 7.3, 7.4 | **8.1, 8.2, 8.3, 8.4** | Claude Code リモート実行 |
| 8.1, 8.2 | **9.1, 9.2** | 接続状態UIとステータス表示 |
| 9.1, 9.2, 9.3 | **10.1, 10.2, 10.3** | プロジェクト切り替え機能 |
| ... | ... | 以降すべてズレ |

タスク7番台が存在せず、「7. Claude Code リモート実行」セクションのサブタスクが「8.1」から始まっています。

**Warning #1: Requirements参照の誤り**

- tasks.md 9.2（認証プログレスとダイアログ）が `Requirements: 2.7` を参照していますが、requirements.mdには `Requirement 2.6` までしか存在しない

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| **SSHUriParser** | ✅ 定義あり | ✅ Task 1.1, 1.2 | ✅ |
| **SSHAuthService** | ✅ 定義あり | ✅ Task 2.1, 2.2 | ✅ |
| **HostKeyManager** | ✅ 定義あり | ✅ Task 3.1, 3.2 | ✅ |
| **SSHConnectionService** | ✅ 定義あり | ✅ Task 4.1-4.5 | ✅ |
| **FileSystemProvider** | ✅ 定義あり | ✅ Task 5.1-5.4 | ✅ |
| **ProcessProvider** | ✅ 定義あり | ✅ Task 6.1-6.4 | ✅ |
| **RemoteFileWatcher** | ✅ 定義あり | ⚠️ 明示的タスクなし | ⚠️ |
| **接続状態UI** | ❌ 明示的コンポーネント定義なし | ✅ Task 9.1, 9.2 | ⚠️ |
| **SSH URI入力ダイアログ** | ❌ 明示的コンポーネント定義なし | ✅ Task 11.1 | ⚠️ |
| **最近使用したプロジェクトUI** | ❌ 明示的コンポーネント定義なし | ✅ Task 12.2 | ⚠️ |

**Warning #2: UI Component設計の欠落**

Design.mdにはサービス層のインターフェース定義が充実していますが、以下のUIコンポーネントの明示的な設計がありません：
- 接続状態ステータスバーコンポーネント
- パスワード/パスフレーズ入力ダイアログ
- ホストキー確認ダイアログ
- SSH URI入力ダイアログ
- 最近使用したリモートプロジェクト一覧表示

タスクには存在するため実装可能ですが、UIの詳細設計がないことで実装者の解釈に依存する部分が大きくなります。

**Warning #3: RemoteFileWatcherのタスク欠落**

Design.mdで定義された `RemoteFileWatcher` コンポーネントに対応する明示的なタスクがありません。Task 5.3の「ポーリングベースのリモートファイル監視」で暗黙的にカバーされている可能性がありますが、明確ではありません。

### 1.4 Cross-Document Contradictions

**Critical Issue #2: Requirement ID参照の矛盾**

- requirements.md: Requirement 2 に AC 2.1〜2.6 が存在
- tasks.md 9.2: `Requirements: 2.7` を参照（存在しない）

**Info #1: 用語の軽微な揺れ**

| Document | 用語 |
|----------|------|
| requirements.md | 「ssh-agent」 |
| design.md | 「agent」（AuthMethod型内） |
| tasks.md | 「ssh-agent」 |

意味は同一であり、大きな問題ではありません。

---

## 2. Gap Analysis

### 2.1 Technical Considerations

**Info #2: 大容量ファイル転送の詳細仕様なし**

Design.mdで「大きなファイルのストリーミング読み込み」が Performance Optimization として言及されていますが：
- ストリーミングの閾値（何KB以上でストリーミング？）
- メモリ制限の具体値
- プログレス表示の有無

これらの詳細が未定義です。

**Warning #4: エラーリトライ戦略の詳細**

Design.mdで「自動再接続を3回まで試行」と記載されていますが：
- リトライ間隔（即時？指数バックオフ？）
- リトライ中のUI状態
- リトライ失敗後の復旧手順

これらの詳細が明記されていません。

### 2.2 Operational Considerations

**Info #3: デプロイメント/マイグレーション考慮なし**

新機能のため、以下は該当しない：
- データベースマイグレーション
- ローリングアップデート
- バックワード互換性

electron-storeへの設定追加のみであり、既存設定との互換性は維持される想定です。

---

## 3. Ambiguities and Unknowns

| ID | 項目 | 曖昧な点 | 影響 |
|----|------|---------|------|
| A1 | リモートClaude Codeバージョン | 最小要求バージョンは何か？バージョン不一致時の動作は？ | Req 5.6 |
| A2 | ホストキー変更時の「セッション限定承認」 | Design.mdで言及されているが、Requirementsに定義なし | セキュリティ実装 |
| A3 | ファイル監視ポーリング間隔 | 何秒間隔でポーリングするか未定義 | パフォーマンス/負荷 |
| A4 | 「データ転送量」の追跡 | どのレベルで追跡？（接続単位？セッション単位？） | UI表示 |
| A5 | 接続履歴10件の挙動 | 11件目追加時の削除ロジック（FIFO? LRU?） | Req 8.6 |

---

## 4. Steering Alignment

### 4.1 Architecture Compatibility

✅ **準拠**: Structure.mdで定義された以下のパターンに従っている：
- `main/services/` へのサービス配置
- Zustand storeパターン
- IPC通信パターン（handlers.ts, channels.ts）

✅ **技術スタック準拠**: Tech.mdに記載された技術（TypeScript, React, Zustand, electron-store）を使用

### 4.2 Integration Concerns

**Warning #5: 既存サービスへの影響**

Design.mdのTask 14.2で「既存のSpecManagerServiceをProvider対応に拡張」とあります。これは既存コードの変更を伴うため：
- 既存のローカル動作のリグレッションリスク
- 既存テストの修正が必要になる可能性

慎重なリファクタリングとテストが必要です。

### 4.3 Migration Requirements

該当なし（新機能のため）。electron-storeの設定スキーマ拡張のみ。

---

## 5. Recommendations

### Critical Issues (Must Fix)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| C1 | タスク番号の不整合（7番台欠落） | tasks.mdのタスク番号を1〜15で連番に修正 |
| C2 | Requirement 2.7への参照（存在しない） | tasks.md 9.2の参照を修正または、Requirement 2にAC 2.7を追加 |

### Warnings (Should Address)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| W1 | UI Component設計の欠落 | Design.mdにUI Componentsセクションを追加し、主要ダイアログ・ステータス表示の設計を記載 |
| W2 | RemoteFileWatcherタスク不明確 | Task 5.3でRemoteFileWatcherの実装を明示 |
| W3 | エラーリトライ戦略の詳細不足 | Design.mdのError Handlingセクションにリトライ間隔・バックオフ戦略を追加 |
| W4 | 既存サービス変更のリスク | Task 14.2の前にリファクタリング計画・テスト戦略を明確化 |

### Suggestions (Nice to Have)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| S1 | 大容量ファイル転送仕様 | ストリーミング閾値とプログレス表示の詳細を追加 |
| S2 | 曖昧点の明確化 | A1〜A5の各項目について仕様を確定 |

---

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|--------------------|
| **Critical** | C1: タスク番号不整合 | タスク番号を連番に修正 | tasks.md |
| **Critical** | C2: 存在しないRequirement参照 | Req 2.7追加またはtasks.md参照修正 | requirements.md or tasks.md |
| **High** | W1: UI設計欠落 | UI Componentsセクション追加 | design.md |
| **High** | W4: 既存サービス変更リスク | リファクタリング計画明記 | tasks.md |
| **Medium** | W2: RemoteFileWatcherタスク | Task 5.3に明示 | tasks.md |
| **Medium** | W3: リトライ戦略詳細 | Error Handling詳細追加 | design.md |
| **Low** | S1, S2 | 詳細仕様追加 | design.md, requirements.md |

---

_This review was generated by the document-review command._
