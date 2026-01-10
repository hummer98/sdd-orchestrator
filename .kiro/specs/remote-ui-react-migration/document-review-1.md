# Specification Review Report #1

**Feature**: remote-ui-react-migration
**Review Date**: 2026-01-10
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/steering/design-principles.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| Warning | 5 |
| Info | 3 |

全体として仕様書の整合性は高く、requirements → design → tasksの流れが適切にトレースされている。ただし、Steering文書（structure.md）との整合性に関する重大な矛盾と、いくつかの設計上の曖昧さが検出された。

---

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**整合性: 良好**

全11件のRequirementがDesign文書でカバーされている。

| Requirement ID | Requirement Summary | Design Coverage | Status |
|----------------|---------------------|-----------------|--------|
| 1 | React移行とビルド基盤 | Architecture, DD-001, DD-003 | ✅ |
| 2 | API抽象化層 | ApiClient Interface, IpcApiClient, WebSocketApiClient | ✅ |
| 3 | コンポーネント共有化 | SharedComponents, PlatformProvider | ✅ |
| 4 | レスポンシブUI | MobileLayout, DesktopLayout, useDeviceType | ✅ |
| 5 | トークンベース認証 | TokenValidator | ✅ |
| 6 | QRコード・URL共有 | 既存機能活用（RemoteAccessPanel） | ✅ |
| 7 | 全機能実装 | SharedComponentsで詳細化 | ✅ |
| 8 | ネットワーク対応 | 既存機能活用（RemoteAccessServer） | ✅ |
| 9 | プロジェクト切り替え時動作 | ReconnectOverlay, エラーハンドリング | ✅ |
| 10 | 既存機能との互換性 | WebSocketメッセージタイプ拡張 | ✅ |
| 11 | CLI起動オプション | CLIArgsParser, DD-006 | ✅ |

### 1.2 Design ↔ Tasks Alignment

**整合性: 良好**

Designの主要コンポーネントがTasks文書でカバーされている。

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| vite.config.remote.ts | Task 1.1 | ✅ |
| src/shared/ 構造 | Task 1.2 | ✅ |
| src/remote-ui/ エントリー | Task 1.3 | ✅ |
| ApiClient Interface | Task 2.1 | ✅ |
| IpcApiClient | Task 2.2 | ✅ |
| WebSocketApiClient | Task 2.3 | ✅ |
| ApiClientProvider | Task 2.4 | ✅ |
| PlatformProvider | Task 3.1 | ✅ |
| useDeviceType | Task 3.2 | ✅ |
| MobileLayout | Task 3.3 | ✅ |
| DesktopLayout | Task 3.4 | ✅ |
| 共有コンポーネント | Task 4.1-4.9 | ✅ |
| 共有Stores | Task 5.1-5.4 | ✅ |
| WebSocketハンドラ拡張 | Task 6.1-6.3 | ✅ |
| AuthPage, ReconnectOverlay | Task 7.1-7.3 | ✅ |
| Electron専用分離 | Task 8.1-8.2 | ✅ |
| Remote UI統合 | Task 9.1-9.3 | ✅ |
| CLIArgsParser | Task 10.1-10.3 | ✅ |
| テスト | Task 11.1-11.5 | ✅ |
| クリーンアップ | Task 12.1-12.3 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components (Shared) | 9カテゴリ詳細定義 | Task 4.1-4.9で全カバー | ✅ |
| UI Components (Web専用) | AuthPage, ReconnectOverlay, Layouts | Task 7.1-7.2, 3.3-3.4 | ✅ |
| Services (API Layer) | ApiClient, IpcApiClient, WebSocketApiClient | Task 2.1-2.4 | ✅ |
| Services (Platform) | PlatformProvider | Task 3.1 | ✅ |
| Stores | specStore, bugStore, agentStore, executionStore | Task 5.1-5.4 | ✅ |
| CLI | CLIArgsParser | Task 10.1-10.3 | ✅ |

**UI設定コンポーネントの欠落検出: なし**

DesignのSharedComponentsセクションとTasksが適切に対応している。

### 1.4 Cross-Document Contradictions

#### **[CRITICAL] ディレクトリ構造の不整合**

**矛盾箇所**:
- **structure.md**: `main/remote-ui/` をリモートアクセス用静的UIとして定義
- **design.md**: `main/remote-ui/` を削除対象、新設は `src/remote-ui/` と明記
- **requirements.md (1.2)**: `src/main/services/remote/remote-ui/` を削除対象と記載

**問題**:
1. structure.mdでは `main/remote-ui/` がプロジェクト構造の一部として現存するパターンとして記載されている
2. requirements.mdでは削除対象パスが `src/main/services/remote/remote-ui/` となっているが、structure.mdでは `main/remote-ui/` となっている
3. 本Specが完了した後、structure.mdの更新が必要になるが、その点がドキュメントに明記されていない

**影響**: structure.mdの更新漏れが発生するリスク

---

#### **[WARNING] 用語の不統一**

| 用語 | requirements.md | design.md | tasks.md |
|------|-----------------|-----------|----------|
| 削除対象ディレクトリ | `src/main/services/remote/remote-ui/` | `src/main/remote-ui/` | `src/main/remote-ui/` |

requirements.mdとdesign.md/tasks.mdで削除対象ディレクトリのパスが異なる。実際のコードベースを確認し、正確なパスに統一が必要。

---

## 2. Gap Analysis

### 2.1 Technical Considerations

#### **[WARNING] WebSocket再接続時のState復元**

**Gap**: Design文書のWebSocket再接続フロー（mermaid図）では、再接続成功後に「通常運用再開」となっているが、以下が未定義：
- 再接続後のStore状態の同期方法
- 切断中に発生した変更の取得方法
- 古いAgent情報の整合性確認

**推奨**: Design文書に「再接続後のState同期フロー」を追加

---

#### **[WARNING] エラーハンドリングの詳細**

**Gap**: Requirements「Open Questions」セクションで「エラーハンドリング戦略」が未解決として記載されているが、Design文書では一般的なエラーカテゴリのみ定義。以下が未詳細：
- トークン期限切れ時の具体的なユーザーフロー（再認証手順）
- Agent実行中のWebSocket切断時の動作
- 複数タブからの同時接続時の競合処理

**推奨**: Design文書の「Error Handling」セクションを具体化

---

#### **[INFO] パフォーマンス要件の具体化**

**Gap**: Design文書に「初回ロード < 500KB gzip」「WebSocket遅延 < 100ms」の目標があるが、達成確認方法（ベンチマーク実施タスク）がtasks.mdに未記載。

**推奨**: Task 11（機能統合テスト）にパフォーマンステストを追加

---

### 2.2 Operational Considerations

#### **[WARNING] structure.md更新タスクの欠落**

**Gap**: 本Specが完了すると、以下のSteering文書の更新が必要になるが、Tasks文書に明示的なタスクがない：
- structure.md: `main/remote-ui/` の削除、`remote-ui/` と `shared/` の追加
- tech.md: Remote UIアーキテクチャセクションの更新（Reactベースへの変更）

**推奨**: Task 12に「Steering文書の更新」タスクを追加

---

#### **[INFO] ロールバック戦略**

**Gap**: 「既存Specとの完全置き換え」（DD-005）が選択されているが、移行失敗時のロールバック手順が未定義。

**推奨**: 移行期間中のフォールバック手順をドキュメント化（任意）

---

## 3. Ambiguities and Unknowns

### Open Questionsの残存

Requirements文書の「Open Questions」に9項目が残存。Design文書で一部解決されているが、以下は依然として曖昧：

| # | Open Question | Design文書での対応 | 状態 |
|---|---------------|-------------------|------|
| 1 | WebSocketプロトコル拡張 | Supporting Referencesで4タイプ定義 | ✅ 解決 |
| 2 | エラーハンドリング戦略 | Error Handling節で概要定義 | ⚠️ 部分解決 |
| 3 | パフォーマンス最適化 | Testing Strategy節で目標値定義 | ⚠️ 部分解決 |
| 4 | テスト戦略 | Testing Strategy節で概要定義 | ⚠️ 部分解決 |
| 5 | 段階的実装の詳細 | Tasks文書で12セクション定義 | ✅ 解決 |
| 6 | PlatformCapabilitiesの詳細 | PlatformProvider節で定義 | ✅ 解決 |
| 7 | ファイル編集のUX | 未定義 | ❌ 未解決 |
| 8 | トークンのストレージ | Security Considerations節で「sessionStorage」と決定 | ✅ 解決 |
| 9 | CLI起動オプションの詳細 | CLIArgsParser節、DD-006で定義 | ✅ 解決 |

**未解決項目「ファイル編集のUX」**:
Remote UIでファイル編集時、保存の遅延やエラーをどう表現するかが未定義。Tasksには「ファイル保存機能の`useApi()`経由への変更」（Task 4.9）があるが、UXの詳細設計が必要。

---

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**整合性: 良好**

| Steering要件 | 本Spec対応 | 状態 |
|--------------|-----------|------|
| React + TypeScript (tech.md) | 維持・拡張 | ✅ |
| Zustand状態管理 (tech.md) | 共有Store化で拡張 | ✅ |
| Tailwind CSS 4 (tech.md) | 維持 | ✅ |
| IPC設計パターン (tech.md) | API抽象化層で拡張 | ✅ |
| preload + contextBridge (tech.md) | 維持（Electron側） | ✅ |
| WebSocket通信 (tech.md) | 既存webSocketHandler拡張 | ✅ |

### 4.2 Integration Concerns

#### **[WARNING] 既存stores依存**

Electron版の既存stores（`specStore`, `bugStore`等）を共有化する際、現在これらのstoresを直接参照しているコンポーネントが多数存在する可能性がある。

**懸念**:
- 移行期間中のインポートパス変更の影響範囲
- 既存テストコードの修正必要性

**推奨**: Task 12.2（Electron版のインポートパス更新）の詳細化

---

### 4.3 Migration Requirements

#### **[INFO] 段階的移行の考慮**

DD-005で「完全置き換え」が決定されているが、移行期間中の動作確認方法について：

1. 新Remote UIのビルド完了前は既存Vanilla JS版が動作
2. 切り替えはTask 9.3（remoteAccessServerの配信元更新）+ Task 12.1（Vanilla JS削除）で実施
3. この順序により、新UIが動作確認できてから旧UIを削除する流れが担保されている

**評価**: 適切な移行手順が設計されている

---

## 5. Recommendations

### Critical Issues (Must Fix)

1. **ディレクトリパスの統一**
   - requirements.md、design.md、tasks.md間で削除対象ディレクトリのパスを統一する
   - 実際のコードベースを確認し、正確なパスを記載する
   - 対象: `src/main/services/remote/remote-ui/` vs `src/main/remote-ui/`

### Warnings (Should Address)

1. **Steering文書更新タスクの追加**
   - Task 12に「structure.mdの更新」「tech.mdの更新」を明示的に追加
   - 更新内容: `main/remote-ui/` 削除、`remote-ui/` と `shared/` の追加

2. **WebSocket再接続後のState同期フローの定義**
   - Design文書の「Error Handling」セクションに詳細フローを追加

3. **ファイル編集UXの詳細設計**
   - Open Questions #7の解決
   - 保存中のローディング表示、エラー時のトースト表示等を設計

4. **エラーハンドリングの具体化**
   - トークン期限切れ時の再認証手順
   - Agent実行中のWebSocket切断時の動作

5. **既存stores移行の影響範囲確認**
   - 現在のstores参照箇所の洗い出し
   - テストコードの修正計画

### Suggestions (Nice to Have)

1. **パフォーマンステストタスクの追加**
   - バンドルサイズ、WebSocket遅延の計測方法を定義

2. **ロールバック手順のドキュメント化**
   - 移行失敗時のフォールバック方法

3. **E2Eテストシナリオの詳細化**
   - モバイル/デスクトップUIの切り替えテスト
   - CLI起動オプションのテスト詳細

---

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | ディレクトリパスの不整合 | 実コードを確認し、requirements.md、design.md、tasks.mdのパスを統一 | requirements.md, design.md, tasks.md |
| Warning | Steering更新タスク欠落 | Task 12にstructure.md、tech.md更新タスクを追加 | tasks.md |
| Warning | State同期フロー未定義 | Design文書のError Handlingセクションに再接続後同期フローを追加 | design.md |
| Warning | ファイル編集UX未定義 | Open Questions #7を解決し、Design文書に追記 | requirements.md, design.md |
| Warning | エラーハンドリング不足 | Design文書のError Handlingセクションを具体化 | design.md |
| Warning | stores移行影響範囲 | 移行影響範囲を調査し、Task 12.2を詳細化 | tasks.md |
| Info | パフォーマンステスト | Task 11にパフォーマンステスト追加 | tasks.md |
| Info | ロールバック手順 | 移行失敗時のフォールバック手順をドキュメント化 | design.md |
| Info | E2Eテスト詳細化 | Task 11のテストシナリオを具体化 | tasks.md |

---

_This review was generated by the document-review command._
