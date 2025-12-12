# Specification Review Report #1

**Feature**: cc-sdd-command-installer
**Review Date**: 2025-12-12
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- product.md (steering)
- tech.md (steering)
- structure.md (steering)
- bugWorkflowInstaller.ts (参照実装)

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| Warning | 5 |
| Info | 3 |

全体的にドキュメントは整備されており、要件からタスクまでのトレーサビリティは概ね確保されています。ただし、いくつかの重要な不整合と欠落が検出されました。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**✅ 適切にカバーされている要件:**
- Requirement 1 (spec-managerテンプレート) → Design: Resources Layer で定義
- Requirement 2 (kiroテンプレート) → Design: Resources Layer で14コマンド列挙
- Requirement 3 (CcSddWorkflowInstaller) → Design: Service Interface で詳細定義
- Requirement 5 (メニュー統合) → Design: UI Layer / IPC Layer で定義
- Requirement 6 (ステータス管理) → Design: Service Interface で定義
- Requirement 7 (互換性) → Design: Architecture Pattern で言及

**❌ 不整合:**

| Requirement | Issue | Design Reference |
|-------------|-------|------------------|
| 4.2 | 要件では`claude --print`コマンドを使用と記載 | Designでは`claude -p`と記載（短縮形） |
| 4.3 | 要件では「環境変数PATHを使用」と明記 | Designでは具体的な実装方法の記載なし |

### 1.2 Design ↔ Tasks Alignment

**✅ 適切にカバーされているコンポーネント:**
- テンプレートフォルダ作成 (Task 1.x)
- CcSddWorkflowInstallerサービス (Task 4.x)
- IPCチャネル (Task 6.x)
- メニュー統合 (Task 7.x)

**❌ Critical - Designに定義されているがTasksに欠落:**

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| Bug Workflow コマンド5種 | BUG_COMMANDSとしてkiroテンプレートに含むべき？ | ❌ 曖昧 |
| BugWorkflowInstaller参照の`installTemplates` | CcSddWorkflowInstallerには不要？ | ❓ 要確認 |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | メニューエントリ、確認ダイアログ、結果サマリー | Task 7.1, 7.2 | ✅ |
| Services | CcSddWorkflowInstaller (5メソッド) | Task 4.1-4.5 | ✅ |
| Types/Models | InstallOptions, InstallResult, InstallError等 | Task 4.1, 5.1 | ✅ |
| IPC Channels | 3チャネル定義 | Task 6.1, 6.2 | ✅ |
| Templates (kiro) | 14コマンドファイル | Task 1.1-1.4 | ✅ |
| Templates (spec-manager) | 2コマンドファイル | Task 2.1 | ✅ |
| CLAUDE.md Template | テンプレートファイル | Task 3.1 | ✅ |

**❌ Warning - Designに定義されているがTasksで具体性が不足:**

| Item | Issue |
|------|-------|
| preload.ts更新 | IPC追加時にpreload/index.tsの更新が必要だが、タスクに明記なし |
| electron.d.ts更新 | IPCチャネル追加時に型定義の更新が必要だが、タスクに明記なし |

### 1.4 Cross-Document Contradictions

| Document 1 | Document 2 | Contradiction |
|------------|------------|---------------|
| requirements.md 4.2 | design.md Goals | `claude --print` vs `claude -p` の表記揺れ |
| design.md (Goals) | design.md (System Flows) | Goalsでは`claude -p`、System Flowsでは`claude -p`で一致 |
| requirements.md 2.5 | tasks.md 1.4 | 要件では「合計14ファイル」、タスクでは14ファイルの内訳確認とあり整合 |

## 2. Gap Analysis

### 2.1 Technical Considerations

**❌ Critical - Bug Workflowコマンドの扱いが未定義:**

要件・設計ともに「14種類のkiroコマンド」をインストール対象としているが、既存の`BugWorkflowInstaller`がインストールする5種類のBugコマンド（bug-create, bug-analyze, bug-fix, bug-verify, bug-status）との関係が不明確。

現状の解釈選択肢:
1. CcSddWorkflowInstallerは14種のみ、BugコマンドはBugWorkflowInstallerが担当（分離）
2. CcSddWorkflowInstallerが14種+Bug5種の19種すべてを担当（統合）

**⚠️ Warning - エラーハンドリングの網羅性:**

| Error Scenario | Coverage |
|----------------|----------|
| テンプレートファイル不在 | ✅ TEMPLATE_NOT_FOUND |
| 書き込み権限なし | ✅ PERMISSION_DENIED |
| 一般的な書き込みエラー | ✅ WRITE_ERROR |
| claudeコマンドタイムアウト | ✅ TIMEOUT_ERROR |
| claudeコマンド未インストール | ❓ どのエラータイプ？ |
| ネットワークエラー（claude実行時） | ❓ 考慮されていない |

**⚠️ Warning - セマンティック統合の詳細仕様:**

要件4.7「ユーザーのカスタマイズ内容を保持すること」と4.8「テンプレートの新しいセクションを追加すること」について:
- 具体的なマージ戦略がDesignに記載されていない
- BugWorkflowInstallerでは独自のマージロジック（`mergeBugSection`）を実装しているが、CcSddWorkflowInstallerでは`claude -p`に委譲する設計
- `claude -p`が期待通りの動作をしない場合のフォールバック戦略が未定義

### 2.2 Operational Considerations

**⚠️ Warning - テスト戦略の詳細:**

| Test Type | Coverage in Design | Gap |
|-----------|-------------------|-----|
| Unit Tests | 詳細に定義 | claude CLI モックの方針が未記載 |
| Integration Tests | 概要のみ | 具体的なテストシナリオ数が不明 |
| E2E Tests | 概要のみ | 実行環境の前提条件が未記載 |

**✅ ログ・モニタリング:**
- Design 12.2でlogger.error/logger.infoの使用を明記

## 3. Ambiguities and Unknowns

### 曖昧な記述

| Location | Issue | Impact |
|----------|-------|--------|
| requirements.md 1.3 | 「コマンド参照を`/kiro:*`から`/spec-manager:*`形式に変換」- 変換対象のパターンが明確でない | Medium - 実装時に判断が必要 |
| design.md | CC_SDD_WORKFLOW_CLAUDE_MD_SECTIONの具体的な内容が未定義 | High - 実装に必要 |
| requirements.md 4.7-4.8 | 「セマンティック統合」の具体的な期待動作 | High - claude -p の仕様依存 |

### 未定義の依存関係

| Dependency | Status |
|------------|--------|
| claude CLI のバージョン要件 | 未定義 |
| claude CLI の `-p`/`--print` オプションの仕様 | 外部ドキュメント参照なし |
| Node.js child_process の spawn/exec 選択 | 未定義 |

### 保留中の決定事項

| Decision | Options | Current Status |
|----------|---------|----------------|
| BugコマンドのCcSddへの統合 | 分離 / 統合 | 要確認 |
| claude CLI 不在時の動作 | エラー終了 / スキップ | 要確認 |
| CLAUDE.md既存セクションの更新方針 | 上書き / スキップ / マージ | 要確認 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**✅ 準拠事項:**
- Service Pattern: `main/services/`への配置（structure.md準拠）
- IPC Pattern: contextBridge + preload（tech.md準拠）
- Zustand Store: 不要（状態管理なし）

**⚠️ Warning - 新規パターンの導入:**

CcSddWorkflowInstallerでの`claude -p`使用は、既存のBugWorkflowInstallerにはない外部CLIへの依存を導入。これにより:
- 実行環境の前提条件が増加
- テストの複雑性が増加
- エラーケースが増加

### 4.2 Integration Concerns

| Concern | Impact | Mitigation |
|---------|--------|------------|
| BugWorkflowInstallerとの並行動作 | 同一ディレクトリへの書き込み競合の可能性 | 要件7.4で「互いのファイルを上書きしない」と規定 |
| CommandInstallerServiceとの関係 | spec-managerコマンドとの重複可能性 | Non-Goalsで「spec-managerコマンドのインストールは既存が担当」と明記 |
| メニュー項目の位置 | ツールメニューの肥大化 | サブメニュー化の検討が必要 |

### 4.3 Migration Requirements

**✅ 移行不要:**
- 新規機能のため、既存データの移行は不要
- 既存のBugWorkflowInstallerは変更なし

## 5. Recommendations

### Critical Issues (Must Fix)

1. **`claude --print` vs `claude -p` の表記統一**
   - 要件とデザインで表記を統一する
   - 推奨: 正式なオプション名 `--print` を使用

2. **BugWorkflowコマンドとの関係明確化**
   - CcSddWorkflowInstallerがBugコマンドを含むかどうかを明確に定義
   - 推奨: 分離を維持し、Design/Requirementsに明記

### Warnings (Should Address)

1. **CC_SDD_WORKFLOW_CLAUDE_MD_SECTIONの内容定義**
   - Designにテンプレートの具体的な内容を追加

2. **preload.ts/electron.d.ts更新タスクの追加**
   - Task 6.1にpreload更新、型定義更新を含める

3. **claude CLI不在時のエラー処理**
   - MERGE_ERRORの詳細化またはCLI_NOT_FOUNDエラータイプの追加

4. **セマンティック統合のフォールバック戦略**
   - claude -p 失敗時の代替手段を検討

5. **テスト戦略の詳細化**
   - claude CLIのモック方針をDesignに追加

### Suggestions (Nice to Have)

1. **コマンド参照変換のパターン定義**
   - 変換対象とする正規表現パターンをDesignに追加

2. **インストール進捗のUI表示**
   - 14ファイルのインストール中に進捗表示を検討

3. **ドライラン機能**
   - `dryRun: true`オプションで実際の書き込みなしに結果をプレビュー

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Critical | `claude --print`/`-p`表記揺れ | 統一（`--print`推奨） | requirements.md, design.md |
| Critical | Bugコマンドとの関係不明確 | 明確化（分離を推奨） | requirements.md, design.md |
| Warning | CC_SDD_WORKFLOW_CLAUDE_MD_SECTION未定義 | 具体的な内容をDesignに追加 | design.md |
| Warning | preload/型定義更新タスク欠落 | Task 6.1に追加 | tasks.md |
| Warning | claude CLI不在エラー未定義 | InstallErrorにCLI_NOT_FOUND追加 | design.md, tasks.md |
| Warning | フォールバック戦略未定義 | 検討しDesignに追加 | design.md |
| Warning | テストモック方針未定義 | Testing Strategyに追加 | design.md |
| Info | コマンド変換パターン未定義 | 実装時に定義で可 | design.md |
| Info | 進捗表示未検討 | 将来の拡張として記録 | - |
| Info | ドライラン機能未検討 | 将来の拡張として記録 | - |

---

_This review was generated by the document-review command._
