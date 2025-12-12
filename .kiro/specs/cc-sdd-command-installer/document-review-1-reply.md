# Response to Document Review #1

**Feature**: cc-sdd-command-installer
**Review Date**: 2025-12-12
**Reply Date**: 2025-12-12

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 1            | 1             | 0                |
| Warning  | 5      | 3            | 2             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C1: `claude --print` vs `claude -p` の表記揺れ

**Issue**: 要件では`claude --print`コマンドを使用と記載、Designでは`claude -p`と記載（短縮形）

**Judgment**: **Fix Required** ✅

**Evidence**:
コードベース調査結果：
- 既存の全実装は `claude -p` を使用している（agentProcess.ts、handlers.ts、など多数）
- ドキュメント `docs/technical-notes/claude-cli-stdin-handling.md` でも `claude -p` で記載
- `docs/BOOTSTRAP.md` のみ `claude --print` を使用
- プロジェクト全体としては `-p` が標準的に使われている

表記はどちらでも動作するが、プロジェクト内の一貫性のため統一が必要。

**Action Items**:
- requirements.md の 4.2 を `claude -p` に変更（プロジェクト標準に合わせる）

---

### C2: BugWorkflowコマンドとの関係不明確

**Issue**: CcSddWorkflowInstallerがBugコマンドを含むかどうか不明

**Judgment**: **No Fix Needed** ❌

**Evidence**:
既存のコードと設計を確認した結果：

1. **BugWorkflowInstaller** (`bugWorkflowInstaller.ts:12-18`):
   - Bug Workflowコマンド5種（bug-create, bug-analyze, bug-fix, bug-verify, bug-status）を管理
   - テンプレート4種も管理
   - CLAUDE.mdへのBugセクション追加機能を持つ

2. **Design.md の Non-Goals**:
   > - spec-managerコマンドのインストール（既存CommandInstallerServiceが担当）

3. **Design.md の Architecture Pattern**:
   > - Domain boundaries: CcSddWorkflowInstallerはkiroコマンドのみを管理し、spec-managerコマンドやBugコマンドには触れない

4. **Requirements.md 7.4**:
   > - When 両方のインストーラーが同一プロジェクトに実行された場合, the インストーラー shall 互いのファイルを上書きしないこと

設計上、明確に分離されている。Bugコマンドは既存のBugWorkflowInstallerが担当し、CcSddWorkflowInstallerは14種のkiroコマンドのみを担当する。この分離は適切であり、追加の明文化は不要。

---

## Response to Warnings

### W1: CC_SDD_WORKFLOW_CLAUDE_MD_SECTIONの内容未定義

**Issue**: Designにテンプレートの具体的な内容がない

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md の Service Interface (行203) で `CC_SDD_WORKFLOW_CLAUDE_MD_SECTION: string;` と宣言されているが、具体的な内容が未定義。これは実装時に問題となる。

BugWorkflowInstallerの参考実装（`bugWorkflowInstaller.ts:33-51`）では、以下のようにセクション内容が明確に定義されている：
```typescript
export const BUG_WORKFLOW_CLAUDE_MD_SECTION = `### Bug Fix (Lightweight Workflow)
// ... 具体的なMarkdown内容
`;
```

同様のパターンで、CcSddWorkflowも具体的な内容を定義すべき。

**Action Items**:
- design.md に CC_SDD_WORKFLOW_CLAUDE_MD_SECTION の具体的な内容を追加

---

### W2: preload.ts/electron.d.ts更新タスク欠落

**Issue**: IPC追加時にpreload/index.tsとelectron.d.tsの更新が必要だが、タスクに明記なし

**Judgment**: **Fix Required** ✅

**Evidence**:
既存のBugWorkflowInstaller実装を確認：
- `preload/index.ts:440-464` にBug Workflow用のIPC API（checkBugWorkflowStatus, installBugWorkflow, onMenuInstallBugWorkflow）が追加されている
- `electron.d.ts:366-369` に対応する型定義が追加されている

CcSddWorkflowInstallerでも同様のパターンが必要：
```typescript
// preload/index.ts に追加が必要
checkCcSddWorkflowStatus: (projectPath: string): Promise<CcSddWorkflowInstallStatus>
installCcSddWorkflow: (projectPath: string): Promise<Result<CcSddWorkflowInstallResult, InstallError>>
onMenuInstallCcSddWorkflow: (callback: () => void): () => void
```

**Action Items**:
- tasks.md の Task 6.1 を更新し、preload/index.ts への API 追加を明記
- tasks.md の Task 6.1 を更新し、electron.d.ts への型定義追加を明記

---

### W3: claude CLI不在時のエラー処理

**Issue**: claudeコマンド未インストール時のエラータイプが未定義

**Judgment**: **No Fix Needed** ❌

**Evidence**:
design.md の Error Strategy (行454-459) を確認：

| Error Type | Cause | Response |
|------------|-------|----------|
| MERGE_ERROR | claude -p統合失敗 | エラーメッセージ表示、手動統合を促す |
| TIMEOUT_ERROR | claude -p 60秒タイムアウト | エラーメッセージ表示、再試行を促す |

`MERGE_ERROR` はすでに汎用的なエラータイプとして定義されており、claude CLI 不在時もこのエラーで適切にカバーできる：
- コマンド実行失敗時は `MERGE_ERROR` が返される（既存のパターン）
- エラーメッセージに具体的な失敗理由（"claude command not found" など）を含めれば十分

別途 `CLI_NOT_FOUND` エラーを追加することは過剰な複雑性を導入する。実装時にエラーメッセージで区別可能。

---

### W4: セマンティック統合のフォールバック戦略未定義

**Issue**: claude -p 失敗時の代替手段が未定義

**Judgment**: **No Fix Needed** ❌

**Evidence**:
設計意図を確認：

1. **Requirements 4.5, 4.6**:
   > - If `claude --print`コマンドが失敗した場合, then the CcSddWorkflowInstaller shall `MERGE_ERROR`を返す

2. **Design Error Strategy**:
   > - MERGE_ERROR | claude -p統合失敗 | エラーメッセージ表示、**手動統合を促す**

これは意図的な設計決定である：
- `claude -p` が利用できない場合、ユーザーに手動でCLAUDE.mdを編集するよう促す
- BugWorkflowInstallerは独自のマージロジックを実装しているが、これは簡単な「セクション追加」であり、CcSddWorkflowの「セマンティック統合」とは性質が異なる
- フォールバックとして不完全なマージロジックを実装するより、失敗時は手動対応を促す方が安全

フォールバック戦略の追加は、要件のスコープ拡大に該当するため、現時点では不要。

---

### W5: テストモック方針未定義

**Issue**: claude CLIのモック方針がDesignに未記載

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md の Testing Strategy (行474-506) を確認：
- Unit Tests でセマンティック統合のテストが列挙されている
- しかし、`claude -p` コマンドをどのようにモックするかの方針が記載されていない

実装時にテスト方針が曖昧だと、テスト品質に影響する。

**Action Items**:
- design.md の Testing Strategy セクションに claude CLI モック方針を追加
  - 推奨：`child_process.spawn` をモックして、標準出力をシミュレート

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | コマンド変換パターン未定義 | No Fix Needed ❌ | 実装時に `/kiro:` → `/spec-manager:` の単純置換で対応可能。過度な事前定義は不要 |
| I2 | 進捗表示未検討 | No Fix Needed ❌ | 14ファイルのコピーは瞬時に完了するため、進捗表示の必要性は低い。将来の拡張として記録するのみ |
| I3 | ドライラン機能未検討 | No Fix Needed ❌ | Nice to have であり、MVP には不要。将来の拡張として記録するのみ |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| requirements.md | 4.2: `claude --print` → `claude -p` に変更 |
| design.md | CC_SDD_WORKFLOW_CLAUDE_MD_SECTION の具体的な内容を追加 |
| design.md | Testing Strategy に claude CLI モック方針を追加 |
| tasks.md | Task 6.1 に preload/index.ts, electron.d.ts 更新を追加 |

---

## Conclusion

レビューで指摘された10件の問題のうち、**4件が修正必要**と判断しました。

### 修正が必要な項目
1. `claude -p` への表記統一（requirements.md）
2. CC_SDD_WORKFLOW_CLAUDE_MD_SECTION の内容定義追加（design.md）
3. preload/electron.d.ts 更新タスクの追加（tasks.md）
4. テストモック方針の追加（design.md）

### 修正不要と判断した項目
- Bugコマンドとの関係：設計上明確に分離されている
- CLI不在エラー：既存の MERGE_ERROR で十分カバー可能
- フォールバック戦略：意図的な設計決定（手動対応を促す）
- Info レベルの3項目：将来の拡張として記録するのみ

### 次のステップ
`--fix` オプションで修正を適用するか、手動で上記の変更を行ってください。

```bash
/kiro:document-review-reply cc-sdd-command-installer 1 --fix
```

---

_This reply was generated by the document-review-reply command._
