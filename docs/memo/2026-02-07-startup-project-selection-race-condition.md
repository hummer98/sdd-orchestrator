# 起動時プロジェクト選択のレースコンディション分析

**日付**: 2026-02-07
**ステータス**: 分析完了・対策案確定
**影響範囲**: E2Eテスト全般、`SDD_PROJECT_PATH` 環境変数による自動プロジェクト選択

## 1. 問題の概要

起動時に `SDD_PROJECT_PATH` 環境変数でプロジェクトを自動選択する機能にレースコンディションがある。Main process から Renderer へのプロジェクト選択結果の通知がタイミング依存で消失し、Renderer が起動後もプロジェクト未選択状態のままになる。

### 症状

- E2E診断テスト（`diagnostic-project-selection.e2e.spec.ts`）で確認：
  - **Step 1**: 3秒後に `currentProject: null`、trace entries: 0
  - Renderer は `PROJECT_SELECTED` ブロードキャストを一度も受信していない

## 2. 現行アーキテクチャ（Push モデル）

```
起動シーケンス:

Main Process                          Renderer Process
─────────────────────────────────────────────────────────
1. app.whenReady()
2. registerIpcHandlers()
3. selectProject(initialProjectPath)
   → setInitialSelectResult(result)
4. createWindow()
   → BrowserWindow 生成
   → preload 読み込み
   → HTML/JS 読み込み開始
5. ready-to-show イベント発火
   → broadcastInitialProjectSelection()
   → webContents.send(PROJECT_SELECTED, result)
                                       ← React 初期化中
                                       ← useEffect 未実行
                                       ← onProjectSelected リスナー未登録
                                       ← メッセージ消失 ❌
                                       6. React マウント完了
                                       7. useEffect → onProjectSelected 登録
                                          → もう遅い、メッセージは消えている
```

### 根本原因

| 要素 | 詳細 |
|------|------|
| **タイミング依存** | `ready-to-show` は DOM 描画準備完了を意味するが、React の `useEffect` によるリスナー登録はそれより遅延する |
| **Fire-and-forget** | `webContents.send()` は `ipcRenderer.on()` が未登録なら消失する（キューイングされない） |
| **確認手段なし** | Renderer がメッセージを受信したか Main は知りえない |

## 3. 関連コードの所在

| ファイル | 行 | 役割 |
|----------|-----|------|
| `src/main/index.ts:180-202` | `broadcastInitialProjectSelection()` | Push 送信関数 |
| `src/main/index.ts:237-245` | `ready-to-show` ハンドラ | broadcast 呼び出し |
| `src/main/ipc/channels.ts:53` | `PROJECT_SELECTED` | Push用チャンネル定義 |
| `src/main/ipc/handlers.ts:157-178` | `setInitialSelectResult`/`get`/`clear` | キャッシュ管理 |
| `src/preload/index.ts:369-384` | `onProjectSelected` | Renderer 側リスナーAPI |
| `src/renderer/App.tsx:363-383` | `useEffect` ブロック | リスナー登録（遅延） |

## 4. 対策案: Renderer Pull モデル

### 概念

Main が push するのではなく、Renderer がマウント完了後に IPC invoke でキャッシュ済み結果を pull する。

```
修正後シーケンス:

Main Process                          Renderer Process
─────────────────────────────────────────────────────────
1. app.whenReady()
2. registerIpcHandlers()
   → GET_INITIAL_SELECT_RESULT ハンドラ登録
3. selectProject(initialProjectPath)
   → setInitialSelectResult(result)     ← キャッシュに保存
4. createWindow()
5. ready-to-show
   → show() のみ（broadcast なし）
                                       6. React マウント完了
                                       7. useEffect 実行
                                          → invoke(GET_INITIAL_SELECT_RESULT)
                                       8. Main がキャッシュから result を返却
                                          → clearInitialSelectResult()
                                       9. applySelectProjectResult(result) ✅
```

### 設計上の利点

| 項目 | Push モデル（現行） | Pull モデル（提案） |
|------|---------------------|---------------------|
| タイミング依存 | `ready-to-show` と `useEffect` の競合 | Renderer が自発的に取得するため競合なし |
| メッセージ消失リスク | 高（リスナー未登録なら消失） | なし（invoke は同期的応答） |
| 1回限り保証 | なし（再送なし） | キャッシュ消去で自然に保証 |
| テスタビリティ | ブロードキャストタイミングの再現が困難 | IPC invoke のモックで容易 |
| 冪等性 | N/A | 2回目以降は `null` を返すだけ |

### 変更一覧

#### 削除するもの

| 対象 | 場所 | 理由 |
|------|------|------|
| `PROJECT_SELECTED` チャンネル | `channels.ts:53` | Push用チャンネル不要 |
| `broadcastInitialProjectSelection()` | `index.ts:180-202` | Push 関数不要 |
| `ready-to-show` 内の broadcast 呼び出し | `index.ts:237-245` | Push 呼び出し不要 |
| `onProjectSelected` preload API | `preload/index.ts:369-384` | Push リスナー不要 |
| `onProjectSelected` 型定義 | `electron.d.ts:718-720` | 型定義不要 |
| `onProjectSelected` の useEffect | `App.tsx:363-383` | Push リスナー不要 |

#### 追加するもの

| 対象 | 場所 | 内容 |
|------|------|------|
| `GET_INITIAL_SELECT_RESULT` チャンネル | `channels.ts` | Pull用チャンネル |
| `getInitialSelectResult`/`clearInitialSelectResult` DI | `projectHandlers.ts` | DI パラメータ |
| IPC ハンドラー | `projectHandlers.ts` | `safeHandle(GET_INITIAL_SELECT_RESULT, ...)` |
| DI 引数追加 | `handlers.ts` | `registerProjectHandlers` 呼び出し |
| `getInitialSelectResult` preload API | `preload/index.ts` | `ipcRenderer.invoke(...)` |
| `getInitialSelectResult` 型定義 | `electron.d.ts` | `Promise<SelectProjectResult \| null>` |
| Pull useEffect | `App.tsx` | マウント後に invoke で取得 |

#### 既存キャッシュ基盤はそのまま再利用

`handlers.ts` の `setInitialSelectResult`/`getInitialSelectResult`/`clearInitialSelectResult` は変更不要。Main process 側のキャッシュ保存ロジック（`index.ts:338`）もそのまま。

### App.tsx 修正イメージ

```typescript
// Before (Push - リスナー登録)
const cleanupProjectSelected = window.electronAPI.onProjectSelected(async (result) => {
  await applySelectProjectResult(result);
});

// After (Pull - マウント後に取得)
const { applySelectProjectResult } = useProjectStore();
const initialProjectPulled = useRef(false);
useEffect(() => {
  if (initialProjectPulled.current) return;
  initialProjectPulled.current = true;

  const pullInitialProject = async () => {
    const result = await window.electronAPI.getInitialSelectResult();
    if (result) {
      await applySelectProjectResult(result);
    }
  };
  pullInitialProject();
}, [applySelectProjectResult]);
```

## 5. リスク評価

| リスク | 評価 | 対策 |
|--------|------|------|
| 既存 E2E テストへの影響 | 低 | E2E は `SDD_PROJECT_PATH` で起動するため、Pull モデルでも同じ結果 |
| HMR 時の挙動 | 低 | `useRef` で2重呼び出しを防止。キャッシュは起動時1回のみ有効 |
| マルチウィンドウ | 低 | 現行 `broadcastInitialProjectSelection` は最初の window のみ対象で、Pull も同様 |
| `SDD_PROJECT_PATH` 未設定時 | なし | キャッシュが `null` のまま → `getInitialSelectResult` が `null` を返す → 何もしない |

## 6. 検証方法

1. **ビルド**: `npm run build` → 成功確認
2. **診断テスト**:
   ```bash
   npx wdio run wdio.conf.ts --spec e2e-wdio/diagnostic-project-selection.e2e.spec.ts
   ```
   Step 1 で `currentProject` がセットされていることを確認（Pull 動作の証拠）
3. **ユニットテスト**: `npx vitest run`
4. **E2E テスト**:
   ```bash
   npx wdio run wdio.conf.ts --spec e2e-wdio/auto-execution-impl-phase.e2e.spec.ts
   ```

## 7. 結論

現行の Push モデルは Electron の `webContents.send` と React の `useEffect` のタイミング競合という構造的な問題を抱えている。Pull モデルへの変更は：

- **破壊的変更は最小限**（キャッシュ基盤をそのまま再利用）
- **チャンネル1つ追加・1つ削除** + 関連API差し替えで完結
- **レースコンディションの根本原因を解消**（Renderer が準備完了後に自発取得）

Electron アプリにおける Main→Renderer 初期化データ伝達のベストプラクティス（Renderer Pull パターン）に沿った修正であり、導入リスクは低い。
