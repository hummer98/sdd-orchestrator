# Response to Document Review #1

**Feature**: spec-phase-auto-update
**Review Date**: 2026-01-03
**Reply Date**: 2026-01-03

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 1            | 1             | 0                |
| Warning  | 4      | 2            | 2             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### C-1 / CR-1: Requirements要件6.1-6.2とDesignの検出方式が矛盾

**Issue**: Requirements要件6.1では「inspection-*.mdファイル監視」、Designでは「spec.json変更検出時にinspectionフィールドを解析」と記載されており、検出方式が矛盾している。

**Judgment**: **Fix Required** ✅

**Evidence**:
レビュー指摘は正しい。Requirements の要件6.1-6.2はinspection-*.mdファイルの監視を記述しているが、Designでは「Key Decisions」セクションで明確に「phase更新はspec.jsonの更新検出時にトリガー（inspection-*.mdの直接監視ではなく）」と記載している。

既存のspecsWatcherServiceのパターン（`specsWatcherService.ts:100-104`）を確認すると、tasks.mdファイルの変更を検出して処理している。Designのspec.json監視方式は、既存のinspection.roundDetails構造を活用できるため合理的。

**Action Items**:
- requirements.md 要件6.1を「The specsWatcherService shall detect spec.json changes and parse the inspection field」に修正
- 要件6.2を「When spec.json.inspection field is updated with GO judgment, the specsWatcherService shall parse the roundDetails to determine GO/NO-GO judgment」に修正
- 要件6.5を「The specsWatcherService shall use the latest round in spec.json.inspection.roundDetails to determine the current inspection status」に修正

---

### C-2 / CR-2: CompletedPhase型の整合

**Issue**: Designに記載のCompletedPhase型（`inspection-complete`, `deploy-complete`を含む）が現在のコードベースに存在しない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
この指摘は「現状との差分」を問題視しているが、**この仕様は新機能の追加仕様**であるため、現状のコードに型が存在しないのは当然である。

確認した現行コード（`fileService.ts:499-501`）:
```typescript
async updateSpecJsonFromPhase(
  specPath: string,
  completedPhase: 'requirements' | 'design' | 'tasks' | 'impl' | 'impl-complete',
  ...
```

Designでは`CompletedPhase`型の拡張を明確に記載しており（design.md lines 252-259）:
```typescript
type CompletedPhase =
  | 'requirements'
  | 'design'
  | 'tasks'
  | 'impl'
  | 'impl-complete'
  | 'inspection-complete'  // 新規追加
  | 'deploy-complete';     // 新規追加
```

これは実装タスク（Task 1.2, Task 3）で追加される予定であり、仕様としては正しい。

---

## Response to Warnings

### W-1: 要件6.5「複数inspection files時の最新ファイル使用」がDesignに反映されていない

**Issue**: 要件6.5はinspection filesに関する記述だが、Designではspec.json.inspection.roundDetailsを使用する方式を採用している。

**Judgment**: **Fix Required** ✅

**Evidence**:
C-1と連動する問題。Designの方式（spec.json.inspection.roundDetailsを使用）で解決されているため、Requirementsを更新して整合させる必要がある。

**Action Items**:
- 要件6.5を以下に修正: 「If multiple inspection rounds exist, the specsWatcherService shall use the latest round in spec.json.inspection.roundDetails to determine the current inspection status」

---

### W-2: specsWatcherServiceからWebSocketHandlerへの依存追加方法が不明確

**Issue**: Design図では`SW->>WS: broadcastSpecUpdated`となっているが、依存注入パターンの詳細が不明確。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
既存のspecsWatcherService（`specsWatcherService.ts:30-35`）を確認:
```typescript
export class SpecsWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private projectPath: string;
  private callbacks: SpecsChangeCallback[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 300;
  private fileService: FileService | null = null;

  constructor(projectPath: string, fileService?: FileService) {
    this.projectPath = projectPath;
    this.fileService = fileService ?? null;
  }
```

FileServiceと同様のコンストラクタ注入パターンを使用すればよく、これはDesign Implementation Notesで「Integration: 既存のhandleEvent内でspec.json変更を検出し」と記載されている範囲で十分理解可能。実装詳細はTasksレベルで扱う内容であり、Design修正は不要。

---

### W-3: PHASE_LABELSの定義場所の曖昧さ

**Issue**: Designでは「SpecList」コンポーネントに「PHASE_LABELSに追加」と記載。workflow.tsにもPHASE_LABELSが存在（WorkflowPhase用）。どちらを更新するか不明確。

**Judgment**: **Fix Required** ✅

**Evidence**:
コードベースを確認した結果:

1. **SpecList.tsx（lines 15-21）** - `SpecPhase`用の`PHASE_LABELS`:
```typescript
const PHASE_LABELS: Record<SpecPhase, string> = {
  initialized: '初期化',
  'requirements-generated': '要件定義済',
  'design-generated': '設計済',
  'tasks-generated': 'タスク済',
  'implementation-complete': '実装完了',
};
```

2. **workflow.ts（lines 47-54）** - `WorkflowPhase`用の`PHASE_LABELS`:
```typescript
export const PHASE_LABELS: Record<WorkflowPhase, string> = {
  requirements: '要件定義',
  design: '設計',
  tasks: 'タスク',
  impl: '実装',
  inspection: '検査',
  deploy: 'デプロイ',
};
```

これらは異なる型（SpecPhase vs WorkflowPhase）に対するマッピングであり、本仕様で更新すべきは**SpecList.tsx内のPHASE_LABELS（SpecPhase用）**である。Tasksに明記が必要。

**Action Items**:
- tasks.md Task 2.1に「SpecList.tsx内のPHASE_LABELS（SpecPhase用マッピング）を更新する」ことを明記

---

### W-4: symbol-semantic-map.mdの更新必要性

**Issue**: 実装完了後にsymbol-semantic-map.mdのSpecPhaseセクションを更新する必要がある。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
symbol-semantic-map.mdはステアリングドキュメントであり、仕様ドキュメント外の運用事項。本機能の実装完了後に別途更新すればよく、Tasksへの追加は不要。

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S-1 | Remote UI側の型定義・コンポーネント更新タスク | No Fix Needed | Task 7.2で既に「Remote UI側のステータス表示を確認する」が含まれている。Remote UIはWebSocket経由でデータを受信するため、型定義はメインアプリと共有済み。必要に応じてTask 7.2で対応。 |
| S-2 | 統合テストスコープ拡大 | No Fix Needed | Task 10.2で既にWebSocket通知の統合テストが計画されている。追加の詳細化は実装時に判断。 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| requirements.md | 要件6.1, 6.2, 6.5を「spec.json監視方式」に修正 |
| tasks.md | Task 2.1に「SpecList.tsx内のPHASE_LABELS」を明記 |

---

## Conclusion

**Fix Required 判定: 3件**
- C-1/CR-1: Requirements更新（検出方式の整合）
- W-1: Requirements更新（要件6.5の整合）
- W-3: Tasks更新（PHASE_LABELS定義場所の明確化）

**No Fix Needed 判定: 5件**
- CR-2: 新機能追加仕様のため、現状コードに型がないのは当然
- W-2: 既存パターンで十分対応可能
- W-4: ステアリングドキュメントは仕様外
- S-1, S-2: 既存タスクでカバー済み

**次のアクション**:
`--fix` オプションで修正を適用するか、手動でrequirements.mdとtasks.mdを更新してください。

---

## Applied Fixes

**Applied Date**: 2026-01-03
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | 要件6.1, 6.2, 6.5を「spec.json監視方式」に修正 |
| tasks.md | Task 2.1に更新対象ファイルとPHASE_LABELS区別を明記 |

### Details

#### requirements.md

**Issue(s) Addressed**: C-1/CR-1, W-1

**Changes**:
- 要件6.1: 「inspection-*.mdファイル監視」→「spec.json変更検出・inspectionフィールド解析」
- 要件6.2: 「inspectionファイル解析」→「spec.json.inspection.roundDetailsでGO/NO-GO判定解析」
- 要件6.5: 「最新ファイル（modification time）」→「spec.json.inspection.roundDetailsの最新ラウンド」

**Diff Summary**:
```diff
-1. The specsWatcherService shall monitor for new inspection files (pattern: `inspection-*.md`) in the spec directory
-2. When a new inspection file is detected, the specsWatcherService shall parse the file to determine GO/NO-GO judgment
-5. If multiple inspection files exist, the specsWatcherService shall use the latest file (by modification time) to determine the current inspection status
+1. The specsWatcherService shall detect spec.json changes and parse the inspection field
+2. When spec.json.inspection field is updated with GO judgment, the specsWatcherService shall parse the roundDetails to determine GO/NO-GO judgment
+5. If multiple inspection rounds exist, the specsWatcherService shall use the latest round in spec.json.inspection.roundDetails to determine the current inspection status
```

#### tasks.md

**Issue(s) Addressed**: W-3

**Changes**:
- Task 2.1タイトルに「SpecList.tsx内のPHASE_LABELS（SpecPhase用マッピング）」を明記
- 更新対象ファイルパスを追加: `electron-sdd-manager/src/renderer/components/SpecList.tsx`
- workflow.ts内のPHASE_LABELS（WorkflowPhase用）ではないことを注意書きとして追加

**Diff Summary**:
```diff
-- [ ] 2.1 (P) PHASE_LABELSとPHASE_COLORSに新しいphaseを追加する
+- [ ] 2.1 (P) SpecList.tsx内のPHASE_LABELS（SpecPhase用マッピング）とPHASE_COLORSに新しいphaseを追加する
+  - **更新対象ファイル**: `electron-sdd-manager/src/renderer/components/SpecList.tsx`
+  - **注意**: workflow.ts内のPHASE_LABELS（WorkflowPhase用）ではなく、SpecList.tsx内のPHASE_LABELS（SpecPhase用）を更新する
```

---

_Fixes applied by document-review-reply command._
