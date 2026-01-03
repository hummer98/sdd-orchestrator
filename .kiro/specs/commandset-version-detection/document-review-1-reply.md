# Response to Document Review #1

**Feature**: commandset-version-detection
**Review Date**: 2026-01-03
**Reply Date**: 2026-01-03

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 2            | 1             | 0                |
| Info     | 4      | 0            | 4             | 0                |

---

## Response to Critical Issues

該当なし

---

## Response to Warnings

### W1: Requirement 4.3のハイライト表示UI仕様が未定義

**Issue**: Requirement 4.3では「インストールダイアログで更新対象のコマンドセットをハイライト表示する」とあるが、Designでは`CommandsetInstallerDialog`との連携方法やハイライト表示のUI仕様が詳細に記述されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
現在の`CommandsetInstallDialog.tsx`を確認したところ、propsには以下のみが定義されている：
```typescript
interface CommandsetInstallDialogProps {
  isOpen: boolean;
  projectPath: string;
  onClose: () => void;
  onInstall: (profileName: ProfileName, progressCallback?: ProgressCallback) => Promise<InstallResultSummary | void>;
  onCheckAgentFolderExists?: (projectPath: string) => Promise<boolean>;
  onDeleteAgentFolder?: (projectPath: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}
```
更新対象コマンドセットを渡すためのパラメータ（`updateTargets`等）が存在しない。新機能として実装が必要。

**Action Items**:
- design.md の `RecentProjects Extension` セクションに `CommandsetInstallerDialog` との連携インターフェースを追記
- 具体的には `updateTargets?: CommandsetName[]` パラメータを追加
- ハイライト表示のスタイル仕様を追記（背景色 `bg-amber-50` を使用、既存のプロジェクト内UIパターンに準拠）

---

### W2: CommandsetInstallerDialogへのパラメータ渡しが未定義

**Issue**: ダイアログへの更新対象情報の渡し方が未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
W1と同様、現在のダイアログインターフェースには更新対象情報を受け取る手段がない。

**Action Items**:
- design.md に `CommandsetInstallDialog` 拡張インターフェースを追記
- `updateTargets?: readonly CommandsetName[]` パラメータ定義を追加
- tasks.md の Task 6.1 に詳細を追記

---

### W3: ツールチップの複数コマンドセット時フォーマット未定義

**Issue**: Requirement 3.3では「更新が必要なコマンドセット名と現在バージョン・期待バージョンをツールチップで表示」とあるが、複数コマンドセットが更新必要な場合のフォーマットが未定義。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
レビューで提案されているフォーマットは妥当であり、実装時にこのフォーマットを採用すれば十分。既存の`SpecList.tsx`で使用されている`title`属性によるネイティブツールチップと同様のアプローチで実装可能。

```typescript
// SpecList.tsx:212-215 の既存パターン
<span
  className="text-xs text-gray-400"
  title={tooltipDate}  // ネイティブツールチップ
>
```

レビューで提案されたフォーマット案は適切であり、実装時のガイダンスとして機能するため、設計書への追記は任意。Task 5.3での実装時に以下のフォーマットを採用：
```
更新が必要なコマンドセット:
- cc-sdd: 1.0.0 → 2.0.0
- bug: 1.0.0 → 1.1.0
```

**Reason**: 実装詳細レベルの仕様であり、設計書に必須ではない。tasks.mdのTask 5.3にこのフォーマットが暗黙的に含まれている。

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S1 | 大量プロジェクト（100+）でのパフォーマンステストケース追加 | No Fix Needed | 設計書の「並列チェックで対応」で方針は定義済み。具体的な並列数・テストケースは実装フェーズで決定すれば十分 |
| S2 | レガシープロジェクト初回警告時のユーザー説明追加 | No Fix Needed | 仕様通りの動作であり、ツールチップで詳細を表示することで対応済み。追加説明は実装後のUXフィードバックに基づいて判断 |
| S3 | v2→v3マイグレーション時の書き込みタイミング明確化 | No Fix Needed | 既存の`layoutConfigService.ts`を確認した結果、loadProjectConfig内でv1→v2変換は**メモリ内のみ**で行われ、ファイルへの書き込みはsave操作時のみ。このパターンを踏襲するため追加定義不要 |
| S4 | VersionCheckResultのキャッシュ戦略の検討 | No Fix Needed | 初期実装では毎回チェックで問題なし。パフォーマンス問題が発生した場合に対応 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| design.md | W1/W2: CommandsetInstallerDialogとの連携インターフェース定義を追加 |
| tasks.md | Task 6.1にハイライト表示の詳細仕様を追記 |

---

## Conclusion

**Warningsの判定結果**:
- W1, W2: **Fix Required** - ダイアログ連携のインターフェース定義を設計書に追記
- W3: **No Fix Needed** - 実装時のガイダンスとしてレビュー提案を採用

**Info項目**:
- 全て **No Fix Needed** - 実装フェーズで対応可能、または既存パターンで解決済み

**次のステップ**:
修正が必要な項目があるため、`--fix` オプションで修正を適用後、`/kiro:spec-impl commandset-version-detection` で実装を開始することを推奨。

---

## Applied Fixes

**Applied Date**: 2026-01-03
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | CommandsetInstallerDialog連携インターフェース定義を追加 |
| tasks.md | Task 6.1にハイライト表示の詳細仕様を追記 |

### Details

#### design.md

**Issue(s) Addressed**: W1, W2

**Changes**:
- `RecentProjects Extension` セクションに `CommandsetInstallerDialog連携インターフェース` サブセクションを追加
- `CommandsetInstallDialogProps` に `updateTargets?: readonly CommandsetName[]` パラメータを定義
- ハイライト表示仕様（背景色 `bg-amber-50`）を追記

**Diff Summary**:
```diff
+ ##### CommandsetInstallerDialog連携インターフェース
+
+ ```typescript
+ /**
+  * CommandsetInstallDialogに渡す更新対象情報
+  * インストールダイアログを開く際に、更新が必要なコマンドセットを伝達
+  */
+ interface CommandsetInstallDialogProps {
+   // ... existing props ...
+   /**
+    * 更新が必要なコマンドセット一覧（オプショナル）
+    * 指定された場合、該当コマンドセットがハイライト表示される
+    */
+   updateTargets?: readonly CommandsetName[];
+ }
+ ```
+
+ **ハイライト表示仕様**
+ - 更新対象のコマンドセットには背景色 `bg-amber-50` を適用
+ - 既存のプロジェクト内UIパターン（警告表示）に準拠
+ - ハイライト表示は視覚的な案内であり、インストール動作には影響しない
```

#### tasks.md

**Issue(s) Addressed**: W2

**Changes**:
- Task 6.1 にインストールダイアログ連携の詳細仕様を追記
- ハイライト表示の実装詳細を追記

**Diff Summary**:
```diff
  - [ ] 6.1 更新ボタンとインストールダイアログ連携
    - 更新が必要なプロジェクト選択時に更新促進UIを表示
    - 更新ボタンクリックでコマンドセットインストールダイアログを開く
-   - 更新対象コマンドセットのハイライト表示
+   - **インストールダイアログ連携**:
+     - `CommandsetInstallDialogProps`に`updateTargets?: readonly CommandsetName[]`を追加
+     - VersionCheckResultから更新が必要なコマンドセット名を抽出してupdateTargetsに渡す
+   - **ハイライト表示の実装**:
+     - updateTargetsに含まれるコマンドセットに背景色`bg-amber-50`を適用
+     - 既存のプロファイル選択UIにハイライトスタイルを統合
+     - ハイライトは視覚的な案内であり、インストール動作には影響しない
```

---

_Fixes applied by document-review-reply command._
