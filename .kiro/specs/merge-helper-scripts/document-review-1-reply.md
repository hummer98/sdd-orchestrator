# Response to Document Review #1

**Feature**: merge-helper-scripts
**Review Date**: 2026-01-23
**Reply Date**: 2026-01-23

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 0            | 2             | 0                |
| Info     | 3      | 1            | 2             | 0                |

---

## Response to Warnings

### W-1: スクリプトのテスト自動化がOut of Scope

**Issue**: スクリプトのユニットテストがOut of Scopeとして除外されている。CI/CDでの回帰検知ができない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- requirements.md (line 116-119) のOut of Scopeセクションで明確に「スクリプトのテスト自動化（手動テストで確認）」と定義されている
- この決定はDecision Log（line 5-8）の「定型作業をシェルスクリプト化することで確実にworktree内で操作を行わせる」という目的に沿ったもの
- スクリプトは非常にシンプル（約15行）で、jq存在確認→JSON更新→git commitという明確なフローのみ
- 将来的なテスト追加は「推奨」であり、今回のスコープ内で必須ではない
- 手動テストでTask 5.1で動作確認を行う設計となっている

**Action Items**: なし（将来的なテスト追加は別機能として検討可能）

---

### W-2: ドキュメント更新の明記なし

**Issue**: プロジェクトのREADME.mdやインストールガイドにjq依存が追加されることの記載がない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- jqは「必須」ではなく「推奨」の依存関係である（Requirement 6.2: 「警告（not error）with installation guidance」）
- jqがなくてもspec-merge/bug-mergeの他のステップは実行可能
- プロジェクトバリデーション（Task 4.1-4.3）でjq未インストール時に警告を表示し、インストール手順（Homebrew/apt等）を案内する設計
- README.mdへの追記は本機能のスコープ外であり、バリデーションパネルでのランタイム通知で十分にカバーされる
- ユーザーは初めてスクリプトが失敗した時点でも明確なエラーメッセージを受け取る（「Error: jq is not installed」）

**Action Items**: なし（バリデーションパネルでの通知でユーザー体験は担保される）

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| AMB-1 | spec-managerプロファイルでのスクリプトインストール | Fix Required ✅ | design.mdに明記が必要 |
| AMB-2 | UnifiedCommandsetInstaller vs CcSddWorkflowInstaller責務分担 | No Fix Needed ❌ | Design文書で明確（下記詳細参照） |
| AMB-3 | 既存プロジェクトへのスクリプト配置 | No Fix Needed ❌ | 要件3.4で解決済み |

### AMB-1: spec-managerプロファイルでのスクリプトインストール

**Issue**: Task 2.1でcc-sdd, cc-sdd-agentは言及されているがspec-managerは明示されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
既存コード `unifiedCommandsetInstaller.ts` (line 139-143, 256-274) を確認：

```typescript
'spec-manager': {
  name: 'spec-manager',
  description: 'spec-manager commands with bug and document-review',
  commandsets: ['spec-manager', 'bug', 'document-review']
}
```

spec-managerプロファイルは`installCommandset`経由で`ccSddInstaller.installCommands`を呼び出しており、スクリプトインストールを追加する際にはcc-sdd/cc-sdd-agentと同様に対応が必要。

Design文書の「Integration & Deprecation Strategy」セクションに明記すべき。

**Action Items**:
- design.mdの「修正が必要なファイル」テーブルにspec-manager関連の記載を追加
- tasks.mdのTask 2.1の説明にspec-managerを含める

---

### AMB-2: UnifiedCommandsetInstaller vs CcSddWorkflowInstaller責務分担

**Issue**: どちらが主体か明確化が望ましい。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
Design文書で明確に記載されている：

1. **design.md line 283**: `Inbound: UnifiedCommandsetInstaller.installCommandset - 呼び出し元 (P0)`
2. **design.md line 500-501**:
   - `ccSddWorkflowInstaller.ts` - `installScripts`メソッド追加
   - `unifiedCommandsetInstaller.ts` - 各profileでスクリプトインストールを呼び出すよう修正

責務分担は明確：
- **CcSddWorkflowInstaller**: スクリプトファイルのコピーと権限設定（installScriptsメソッド）
- **UnifiedCommandsetInstaller**: 各プロファイルのinstallCommandsetケースからinstallScriptsを呼び出し

これは既存の`installCommands`、`installAgents`、`installSettings`と同じパターン。

**Action Items**: なし

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| design.md | spec-managerプロファイルへの言及を「Integration & Deprecation Strategy」セクションに追加 |
| tasks.md | Task 2.1にspec-managerプロファイルを含めることを明記 |

---

## Conclusion

レビューで指摘された問題のほとんどは、既存の設計・要件で適切にカバーされているか、明示的にスコープ外として定義されています。

**修正が必要な項目**: 1件（AMB-1: spec-managerプロファイルの明記）
- design.mdとtasks.mdを更新してspec-managerプロファイルでのスクリプトインストールを明確化

仕様は全体的に堅牢であり、軽微な明確化のみで実装に進むことが可能です。

---

## Applied Fixes

**Applied Date**: 2026-01-23
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | spec-managerプロファイルを統合ポイントに明記 |
| tasks.md | Task 2.1とTask 5.1にspec-managerを追加 |

### Details

#### design.md

**Issue(s) Addressed**: AMB-1

**Changes**:
- 「Integration & Deprecation Strategy」セクションのunifiedCommandsetInstaller.ts行にspec-managerプロファイルを明記

**Diff Summary**:
```diff
- | `electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts` | 各profileでスクリプトインストールを呼び出すよう修正 |
+ | `electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts` | 各profile（cc-sdd, cc-sdd-agent, spec-manager）でスクリプトインストールを呼び出すよう修正 |
```

#### tasks.md

**Issue(s) Addressed**: AMB-1

**Changes**:
- Task 2.1: 各profile（cc-sdd, cc-sdd-agent, spec-manager）からinstallScriptsを呼び出すことを明記
- Task 5.1: 確認対象をcc-sdd、cc-sdd-agent、spec-manager全プロファイルに拡張

**Diff Summary**:
```diff
- installCommandsetから適切なタイミングでinstallScriptsを呼び出す
+ UnifiedCommandsetInstallerのinstallCommandsetで各profile（cc-sdd, cc-sdd-agent, spec-manager）からinstallScriptsを呼び出す

- cc-sdd、cc-sdd-agent両プロファイルでスクリプトがインストールされることを確認
+ cc-sdd、cc-sdd-agent、spec-manager全プロファイルでスクリプトがインストールされることを確認
```

---

_Fixes applied by document-review-reply command._

---

_This reply was generated by the document-review-reply command._
