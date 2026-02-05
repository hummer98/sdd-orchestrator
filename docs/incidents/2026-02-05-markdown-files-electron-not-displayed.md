# [Open] Electron版でmarkdownFilesタブが表示されない

> **Status:** Open
> **Root Cause:** `specDetailStore.ts`の`selectSpec`関数で`markdownFiles`を取得・設定していない
> **Impact:** Electron版で`e2e-report-*.md`などの追加マークダウンファイルがArtifactEditorに表示されない

## 発見日
2026-02-05

## 概要
`artifact-all-markdown-files`仕様で実装された機能において、Remote UI版は正常に動作するが、Electron版では追加マークダウンファイル（`e2e-report-1.md`など）がArtifactEditorのタブとして表示されない。

## 症状
- Electron版でspec詳細を開いても、`e2e-report-1.md`などの追加マークダウンファイルのタブが表示されない
- 固定タブ（requirements.md, design.md, tasks.md, research.md）は正常に表示される
- 動的タブ（document-review-*, inspection-*）は正常に表示される
- Remote UI版では追加マークダウンファイルが正常に表示される

## 根本原因

### 実装漏れの詳細

**Spec:** `artifact-all-markdown-files`

| 箇所 | `markdownFiles`対応 | ファイル |
|------|---------------------|----------|
| `FileService.listMarkdownFilesInSpec()` | ✅ 実装済み | `fileService.ts:1120-1215` |
| IPC `listMarkdownFilesInSpec` | ✅ 実装済み | `preload/index.ts:92` |
| `SpecDetail`型定義 | ✅ `markdownFiles?: string[]` | `types/index.ts:108` |
| `SpecPane.tsx` (UI側) | ✅ `specDetail?.markdownFiles`を参照 | `SpecPane.tsx:134-145` |
| `remoteAccessHandlers.ts` (Remote UI用) | ✅ 取得・設定している | `remoteAccessHandlers.ts:577-604` |
| **`specDetailStore.ts` (Electron版)** | ❌ **未実装** | `specDetailStore.ts:196-208` |

### 問題のコード

`specDetailStore.ts:196-208`:
```typescript
const specDetail: SpecDetail = {
  metadata: spec,
  specJson,
  artifacts: {
    requirements,
    design,
    tasks,
    research,
    inspection,
  },
  taskProgress,
  parallelTaskInfo,
  // markdownFiles が欠落している！
};
```

**Remote UI版（正常動作）** `remoteAccessHandlers.ts:577-604`:
```typescript
// markdownFilesを取得
const markdownFilesResult = await fileService.listMarkdownFilesInSpec(specPath);
const markdownFiles = markdownFilesResult.ok ? markdownFilesResult.value : [];

// specDetailに含める
return {
  ok: true,
  value: {
    // ...
    markdownFiles,  // ← Remote UI版では設定されている
  },
};
```

## なぜInspectionで検出されなかったか

### 1. 検証範囲の限界
- InspectionはRemote UI版での動作確認を行った
- Electron版の`specDetailStore.ts`内での実装漏れは未検証

### 2. テストカバレッジの不足
- `specDetailStore.test.ts`に`markdownFiles`の検証テストが存在しない
- E2Eテストも追加マークダウンファイルのタブ表示を検証していない

### 3. 複数実装パスの見落とし
- Remote UI版とElectron版で`specDetail`を構築するパスが異なる
  - Remote UI: `remoteAccessHandlers.ts` → WebSocket経由
  - Electron: `specDetailStore.ts` → IPC経由で直接取得
- 一方の実装を確認しただけで、もう一方を見落とした

## 影響範囲

### 機能への影響
- **Medium:** Electron版でユーザーが追加マークダウンファイルをArtifactEditorで閲覧できない
- 固定タブ、動的タブ（review, inspection）は正常に動作
- ファイル自体は存在し、外部エディタで閲覧可能

### 影響を受けるファイル
- `e2e-report-*.md`
- `document-review-*-reply.md`以外のカスタムマークダウンファイル
- ユーザーが手動で追加した任意の`.md`ファイル

## 修正方針

### 即座の修正

`specDetailStore.ts`の`selectSpec`関数で以下を追加:

```typescript
// 追加マークダウンファイル一覧を取得
const markdownFiles = await window.electronAPI.listMarkdownFilesInSpec(spec.name, 'spec');

// specDetail構築時に追加
const specDetail: SpecDetail = {
  metadata: spec,
  specJson,
  artifacts: { ... },
  taskProgress,
  parallelTaskInfo,
  markdownFiles,  // ← 追加
};
```

### テストの追加

```typescript
// specDetailStore.test.ts
it('should include markdownFiles in specDetail', async () => {
  // Mock listMarkdownFilesInSpec to return test files
  mockElectronAPI.listMarkdownFilesInSpec.mockResolvedValue(['e2e-report-1.md', 'custom.md']);

  await store.selectSpec(mockSpec);

  expect(store.specDetail?.markdownFiles).toEqual(['e2e-report-1.md', 'custom.md']);
});
```

## 再発防止策

### 1. 複数実装パスの検証

**Inspection時のチェック項目追加:**
```markdown
## 複数実装パスの確認

| 機能 | Electron版 | Remote UI版 | 一致 |
|------|-----------|-------------|------|
| markdownFiles取得 | specDetailStore.ts | remoteAccessHandlers.ts | ❌ |
```

### 2. 型定義と実装の一致確認

```markdown
## 型定義と実装の一致確認

型定義に追加されたフィールドが、すべての実装パスで設定されているか確認:

| フィールド | 型定義 | specDetailStore | remoteAccessHandlers |
|-----------|--------|-----------------|---------------------|
| markdownFiles | ✅ Optional | ❌ 未設定 | ✅ 設定済み |
```

### 3. プラットフォーム横断テスト

- 同じ機能がElectron版とRemote UI版で同等に動作することを確認するテストを追加
- 共通のテストケースを定義し、両プラットフォームで実行

## 参考情報

### 関連ファイル
- `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts`
- `electron-sdd-manager/src/main/ipc/remoteAccessHandlers.ts`
- `electron-sdd-manager/src/renderer/components/SpecPane.tsx`
- `electron-sdd-manager/src/renderer/types/index.ts`
- `electron-sdd-manager/src/main/services/fileService.ts`

### 関連Spec
- Feature: `artifact-all-markdown-files`
- 実装コミット: 該当specのcommit履歴を確認

### タイムライン
- 2026-XX-XX: artifact-all-markdown-files機能実装
- 2026-02-05: ユーザーからバグ報告、問題発見

## 次のアクション

- [ ] `specDetailStore.ts`で`markdownFiles`を取得・設定するコードを追加
- [ ] `specDetailStore.test.ts`にテストを追加
- [ ] Inspectionチェックリストに「複数実装パスの確認」を追加
