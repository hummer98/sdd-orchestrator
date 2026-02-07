# vitest 実行時間パフォーマンス分析 (2026-02-07)

## 現象

`vitest run` の実行に約20分を要しており、開発中の頻繁な実行に支障がある。
さらに全テスト実行時にワーカープロセスが各4-5GBのメモリを消費し、OOM（JavaScript heap out of memory）でクラッシュする問題が発生。

## テストスイート概要

| 項目 | 値 |
|------|-----|
| テストファイル数 | 426 (削除前は427) |
| テストケース数 | 約8,500 |
| テストコード総行数 | 159,466行 (約6.2MB) |
| React `render()` 呼び出し | 2,427回 |
| vitest バージョン | 2.1.9 (`^2.1.0`) |

### モジュール別テストファイル分布

| モジュール | ファイル数 | 備考 |
|-----------|-----------|------|
| `main/` | 164 | Node.jsプロセス。DOM不要 |
| `renderer/` | 111 | Electron Renderer。jsdom必要 |
| `shared/` | 101 | 混在（UIコンポーネント + 純ロジック） |
| `remote-ui/` | 47 | モバイルUI。jsdom必要 |
| `preload/` | 3 | IPC Bridge |

---

## 特定された問題

### 1. 全テストで jsdom 環境（最大の問題）

**状態: 施策適用済み → 結果観測中**

`vitest.config.ts` で `environment: 'jsdom'` がグローバル設定されている。`main/` の164ファイル（38%）は純粋なNode.jsコードであり、jsdom環境は不要だがオーバーヘッドが発生している。

**適用した施策**:

1. `vitest.config.ts` に `environmentMatchGlobs` を追加:
   ```ts
   environmentMatchGlobs: [
     ['src/main/**/*.test.ts', 'node'],
   ],
   ```

2. `setup.ts` の `window` 参照をガード:
   ```ts
   if (typeof window !== 'undefined') {
     Object.defineProperty(window, 'localStorage', { ... });
     Object.defineProperty(window, 'electronAPI', { ... });
   }
   ```

**部分検証の結果**:

- `main/` のみ実行（161ファイル）: **34.84秒で完了**（OOMなし）
- 9ファイル失敗 → jsdom環境に戻しても同じ9ファイルが失敗 → **既存の失敗であり環境変更は無関係**
- 失敗ファイルの内訳:
  - `remoteAccessIntegration.test.ts`: 実WebSocket接続テスト（remoteAccessE2Eと同種の問題）
  - `index.test.ts`: electron importのCJS/ESM互換性問題
  - `unifiedCommandsetInstaller.test.ts`, `validationService.test.ts`: ファイルシステム関連
  - その他: 既存の不安定テスト

**全テスト実行は OOM でクラッシュ** — 下記「問題8」参照。

### 2. 並列化設定なし

**状態: 未解消**

`vitest.config.ts` に `pool`, `poolOptions`, `threads`, `forks`, `maxConcurrency` 等の設定が一切ない。デフォルトの `forks` プールが使われているが、チューニングされていない。

### 3. 重いグローバル setup.ts

**状態: 一部対応（windowガード追加済み）**

全426テストファイルで `setup.ts` が実行され、以下をモックしている：

- `electron` モジュール全体（app, BrowserWindow, ipcMain, ipcRenderer, shell, dialog, Menu, nativeTheme）
- IPC handlers 6モジュール
- `window.electronAPI`（60+メソッド）
- `window.localStorage`

`main/` テストには `window.electronAPI` や `localStorage` は不要。`typeof window !== 'undefined'` ガードを追加し、node環境ではスキップするようにした。

**残課題**: setup.ts を main用/renderer用に分割すれば、`electron` モジュールモックやIPCハンドラーモックも不要にできる。

### 4. 実 setTimeout による待機（累計約23秒）

**状態: 一部解消**

34ファイル・127箇所で実 `setTimeout` が使用されていた。合計約23,030ms。

主な箇所：
- `specManagerService.test.ts`: 1200ms, 500ms x2, 300ms x3 等
- `remoteAccessE2E.test.ts`: 5000ms timeout x4, 300-500ms 待機多数 → **削除済み**

残存する主要な実待機:

| ファイル | 待機時間 |
|---------|---------|
| `specManagerService.test.ts` | 1200ms + 500ms x2 + 300ms x3 + 200ms + 100ms |
| その他多数 | 50-600ms 各所 |

**対策案**: `vi.useFakeTimers()` + `vi.advanceTimersByTime()` への置換。

### 5. renderer/shared 間のテスト重複

**状態: 未解消**

`docs/memo/test-code-duplication.md` に詳細記載。以下が重複：

- `BugListItem` コンポーネント（renderer版 / shared版）
- `AgentStore` ストア（renderer版 / shared版）
- `SpecStore` ストア（renderer版 / shared版）
- `AgentList` 表示ロジック（AgentListPanel / AgentListItem）

移行過渡期の産物であり、shared版への統一が必要。

### 6. 巨大テストファイル群

**状態: 未解消**

| ファイル | 行数 |
|----------|------|
| `webSocketHandler.test.ts` | 4,881 |
| `specManagerService.test.ts` | 3,265 (139テストケース) |
| `autoExecutionCoordinator.test.ts` | 3,157 |
| `scheduleTaskCoordinator.test.ts` | 2,754 |

ファイル分割によりキャッシュ効率と並列実行効率が向上する可能性がある。

### 7. vitest 内での E2E テスト混在

**状態: 解消済み**

`remoteAccessE2E.test.ts`（812行）が vitest スイート内で実サーバー起動・実 WebSocket 接続を行っていた。

### 8. ワーカープロセスの異常メモリ消費（新規発見・最重要）

**状態: 未解消**

全テスト実行時に vitest ワーカーが各 **4-5GB** のヒープメモリを消費し、OOM でクラッシュする。

**観測されたプロセスメモリ**:
```
vitest 5: 4.8GB
vitest 8: 2.4GB
vitest 9: 4.4GB
```

`NODE_OPTIONS="--max-old-space-size=8192"` を設定しても OOM が発生。426ファイル（8,500テスト）の規模でこのメモリ消費は異常。

**Webリサーチによる類似事例**:

| 情報源 | 要約 |
|--------|------|
| [vitest#9560](https://github.com/vitest-dev/vitest/issues/9560) | vitest 4.0.18 でメモリリーク。4.0.4 にダウングレードで解消 |
| [vitest#8293](https://github.com/vitest-dev/vitest/issues/8293) | vitest 3.1.4→3.2.0 でOOM発生。macOS/Windowsで顕著 |
| [vitest#7288](https://github.com/vitest-dev/vitest/issues/7288) | vitest 3.0 で `useFakeTimers` + OOM の組み合わせ |
| [vitest Discussion#9149](https://github.com/vitest-dev/vitest/discussions/9149) | `vmMemoryLimit: '1024mb'` で改善 |
| [Improving Vitest Performance (DEV)](https://dev.to/thejaredwilcurt/improving-vitest-performance-42c6) | `fileParallelism: false` で750ファイルが70s→30sに高速化 |

**根本原因: `@shared` barrel export による巨大依存ツリーのロード**

ファイルごとのヒープ計測（`process.memoryUsage()` + `--expose-gc`）により根本原因を特定:

```
[HEAP] App.test.tsx           | start=37.1MB | end=84.5MB | delta=47.5MB
[HEAP] integration.test.tsx   | start=37.2MB | end=81.0MB | delta=43.8MB
[HEAP] cleanup.test.ts        | start=34.0MB | end=76.9MB | delta=42.9MB
[HEAP] MobileBugNavigation    | start=37.2MB | end=75.3MB | delta=38.1MB
[HEAP] SpecDetailPage.test    | start=75.0MB | end=96.7MB | delta=21.7MB
  ...
[HEAP] CreateSpecDialog.test  | start=34.0MB | end=34.1MB | delta=0.1MB
[HEAP] entry.test.ts          | start=34.0MB | end=34.1MB | delta=0.1MB
```

47ファイル合計: **383MB** (平均 8.3MB/file)

**メモリ消費の3層構造**:

| 層 | delta | 原因 | 例 |
|----|-------|------|-----|
| **特大** | 40-48MB | `import('../shared')` barrel import で shared 全モジュール読み込み | App.test.tsx, cleanup.test.ts |
| **大** | 10-22MB | テスト対象コンポーネントが `@shared/components`, `@shared/stores` を連鎖インポート | SpecDetailPage, BugDetailPage |
| **中** | 2-10MB | 部分的な shared 依存 | AgentsTabView, SubTabBar |
| **軽** | 0.1MB | shared を使わない or モックで完全置換 | CreateSpecDialog, entry.test |

**決定的な証拠**: `cleanup.test.ts` は103行で `fs` と `path` のみインポートするが、テスト内で `await import('../shared')` を1回呼ぶだけで **42.9MB** 消費。`shared/index.ts` の barrel export (`export * from './hooks'`, `export * from './api'`) が全サブモジュールを芋づる式にロード。

**悪化の構造**:
1. `shared/index.ts` の barrel export → 1回の import で数十MBのモジュールツリーがロード
2. テスト対象コンポーネント自体が `@shared/components/agent`, `@shared/stores/agentStore` 等を多数 import → テストが実コンポーネントを import するだけで連鎖
3. vitest worker がファイルを順次処理 → ESMキャッシュが蓄積（Node.js APIではクリア不可）
4. 9ワーカー並列 × 数十ファイル/worker × 数十MB/file → 合計 数GB でOOM

**時間分析（remote-ui/ 47ファイル、fileParallelism=false）**:
- wallclock: **1133秒**
- テスト実行: **21.6秒 (1.9%)**
- オーバーヘッド（モジュール解決・jsdom構築等）: **1091秒 (96.1%)**

**@testing-library/react auto-cleanup の検証結果**:

診断テストにより **auto-cleanup は正常に動作している** ことを確認：
- `render()` で追加されたコンテナは `afterEach` で自動除去される
- `document.body.innerHTML` はテスト間で空にリセットされる
- 全158件の `.tsx` テストファイルが `@testing-library/react`（auto-cleanup付き）からインポート、`pure`（auto-cleanupなし）からのインポートは0件
- ただし、auto-cleanup は React root の unmount と container の DOM 除去のみ。jsdom 自体のメモリはワーカーのライフタイム中リセットされない

**vitest バージョン**: 2.1.9 (最新は 4.0.18)。vitest 3.x で `vmMemoryLimit` オプションが追加されており、アップグレードにより改善の可能性あり。

**対策候補（優先度順）**:

| 優先度 | 施策 | 期待効果 | リスク |
|--------|------|----------|--------|
| **最高** | barrel export 解体 (`shared/index.ts` の `export *` を個別 export に) | 1ファイルあたり数十MBのロード削減 | import パス変更が広範囲 |
| **最高** | テスト内の `await import('../shared')` を個別パスに変更 | 42MB→数MB に削減 | 低（テストのみ変更） |
| **高** | vitest 3.x+ へアップグレード（`vmMemoryLimit` オプション利用可能に） | ワーカーメモリ上限設定 | 破壊的変更の可能性 |
| **高** | `poolOptions.forks.maxForks` でワーカー数制限 | メモリ圧を制御 | 並列度低下 |
| **中** | jsdom → happy-dom | メモリ使用量削減（3倍速の報告あり） | テスト互換性要確認 |
| **中** | setup.ts 分割 | 不要モック排除でワーカーメモリ削減 | 影響範囲が広い |
| **低** | `isolate: false` | 3-8倍の速度改善 | テスト間干渉リスクが増大 |

---

## 解消済み項目

### remoteAccessE2E.test.ts の削除

**コミット**: `b53e824e`

| 項目 | 詳細 |
|------|------|
| 問題 | vitest 内で実 HTTP サーバー起動、実 WebSocket 接続、5秒 timeout 多数 |
| 原因 | E2E テストが vitest スイートに混在していた |
| 対処 | ファイル削除 |
| 影響 | 812行削除、テストファイル 1 減、実 setTimeout 待機の削減 |
| E2E カバレッジ | `remote-webserver.e2e.spec.ts` と `websocket-command-execution.e2e.spec.ts` で同等のシナリオがカバー済み |

### setup.ts の window ガード追加

| 項目 | 詳細 |
|------|------|
| 問題 | `main/` テストを node 環境にすると `window is not defined` で全失敗 |
| 原因 | setup.ts が無条件に `window.localStorage` / `window.electronAPI` を設定 |
| 対処 | `if (typeof window !== 'undefined')` ガードを追加 |
| 影響 | node 環境の `main/` テストが正常動作するようになった |

### @testing-library/react auto-cleanup の動作確認

| 項目 | 詳細 |
|------|------|
| 疑い | auto-cleanup が動作せず DOM リークしているのでは |
| 検証方法 | 診断テスト: テスト1で `render()` → テスト2で `document.body` が空か確認 |
| 結果 | **auto-cleanup は正常動作** — 4件全パス |
| 確認事項 | (1) `afterEach` でのコンテナ除去を確認 (2) `pure` からのインポート0件 (3) `index.js` にて `afterEach(() => cleanup())` 登録を確認 |
| 結論 | OOM の原因は auto-cleanup の欠如ではなく、jsdom 自体のメモリフットプリントとESMキャッシュ蓄積 |

### vitest.config.ts に environmentMatchGlobs 追加

| 項目 | 詳細 |
|------|------|
| 問題 | `main/` (164ファイル) が不要な jsdom 環境で実行 |
| 対処 | `environmentMatchGlobs: [['src/main/**/*.test.ts', 'node']]` |
| 検証 | `main/` のみの実行: 151 passed / 9 failed (全9件が既存の失敗) |
| 実行時間 | `main/` 161ファイル: **34.84秒** |

---

## 優先度順の対策ロードマップ（更新版）

| 優先度 | 施策 | 期待効果 | リスク | 状態 |
|--------|------|----------|--------|------|
| **最高** | ワーカー数制限 → 撤廃 | OOM回避→並列制限不要に | 低 | **適用→撤廃** |
| **最高** | barrel export 解体 | **11倍高速化** | 低 | **適用済み** |
| **高** | vitest 3.1.4 へアップグレード | Module Runner改善 | 中 | **適用済み** |
| **高** | `main/` テストの `node` 環境移行 | jsdom オーバーヘッド削減 | 低 | **適用済み** |
| **高** | `setup.ts` jsdom ガード強化 | 不要モック排除 | 低 | **適用済み** |
| **中** | jsdom → happy-dom 移行検討 | メモリ・速度改善 | 中（互換性） | 未着手 |
| **中** | 実 setTimeout を fake timers に置換 | 約20秒削減 | 低 | 未着手 |
| **中** | renderer/shared 重複テスト統合 | テストケース数削減 | 中 | 未着手 |
| **低** | 巨大テストファイルの分割 | キャッシュ・並列効率向上 | 低 | 未着手 |

### 最終テスト実行結果（全施策適用後）

| 項目 | 結果 |
|------|------|
| テストファイル | 395 passed / 27 failed / 423 total |
| テストケース | 8,144 passed / 219 failed / 22 skipped |
| 実行時間 | **46.96秒 (48秒)** |
| OOM | **なし** (以前は全面クラッシュ) |
| Worker unexpected exit | 1件 |
| **改善率** | **20分 → 48秒 (約25倍高速化)** |

## vitest バージョンアップ検討

### 現状

- vitest: **2.1.9** (`^2.1.0`)
- 最新: **4.0.18**
- Vite: **^5.4.0**

### 推奨ターゲット: **vitest 3.1.4**

| バージョン | メモリ安全性 | Vite互換 | 安定性 | 判定 |
|-----------|------------|---------|--------|------|
| 2.1.9 (現在) | 悪（OOM既知） | Vite 5 | 安定 | 移行推奨 |
| **3.1.4** | **改善** | **Vite 5/6** | **3.x最良** | **推奨** |
| 3.2.x | OOM退行あり #8293 | Vite 5/6/7 | 壊れている | 回避 |
| 4.0.0-4.0.4 | 新プールアーキ | Vite 6必須 | まあまあ | 待機 |
| 4.0.5-4.0.18 | メモリリーク #9560 | Vite 6必須 | 壊れている | 回避 |

**3.1.4 を推奨する理由**:
1. **Vite 5 のまま移行可能** — Vite アップグレード不要
2. **vite-node → Module Runner** に置き換え — ESMモジュールキャッシュの処理が改善
3. **破壊的変更が少ない** — `poolOptions` 構文はそのまま使える
4. **3.2.x の OOM退行を回避** — #8293 で macOS/Windows で OOM が報告済み

**4.x を待つ理由**:
- Vite 6 必須（別の大規模アップグレード）
- #9560: 4.0.18 にメモリリーク（4.0.4 のみ安全確認済み）
- tinypool 完全撤去 + 新プールアーキテクチャは将来的に有望だが安定化待ち

**3.1.4 へのマイグレーション**:
- `package.json`: `"vitest": "^2.1.0"` → `"vitest": "^3.1.4"`
- vitest.config.ts: 変更不要（`poolOptions` 構文は 3.x でも有効）
- 破壊的変更: スナップショット形式の微調整のみ（`vitest --update` で対応）

## 段階的最適化の計測結果

ベースライン（maxForks=3, vitest 2.1.9）から3段階の最適化を適用し、各段階で実行時間を計測した。

### 計測結果

| Step | 施策 | Duration | wallclock | Files | Passed | Failed |
|------|------|----------|-----------|-------|--------|--------|
| Baseline | maxForks=3, vitest 2.1.9 | 1104.89s | ~18:24 | 423 | 395 | 26 |
| Step 1 | + vitest 3.1.4 アップグレード | 1091.95s | 18:12 | 423 | 395 | 26 |
| Step 2 | + barrel export 解体 | 99.51s | 1:40 | 423 | 395 | 26 |
| Step 3 | + setup.ts jsdom ガード強化 | 94.61s | 1:35 | 423 | 395 | 27* |
| **Step 4** | **+ 並列制限撤廃（デフォルト）** | **46.96s** | **0:48** | **423** | **395** | **27** |

\* Step 3以降の +1 fail は Worker unexpected exit 由来（既存テストの pass/fail 変動なし）

### 並列数チューニング（Step 4 詳細）

barrel export 解体後はワーカーのメモリ消費が大幅に減少し、並列制限が不要になった。

| maxForks | Duration | wallclock | CPU使用率 | OOM |
|----------|----------|-----------|-----------|-----|
| 3 | 94.61s | 1:35 | 293% | なし |
| 6 | 55.11s | 0:56 | 534% | なし |
| 8 | 48.02s | 0:49 | 630% | なし |
| **制限なし** | **46.96s** | **0:48** | **658%** | **なし** |

CPU 10コア環境。制限なし（デフォルト）が最速かつ OOM なし。`poolOptions` 設定を削除。

### 分析

- **Step 1 (vitest 3.1.4)**: 効果微小（-1.2%）。Module Runner への移行だけでは根本問題を解決しない
- **Step 2 (barrel export 解体)**: **11倍高速化**（1092s → 99.5s）。決定的な改善。`shared/index.ts` の `export *` による巨大依存ツリーのロードが全テスト速度低下の根本原因だった
- **Step 3 (setup.ts split)**: 追加効果 -5%（99.5s → 94.6s）。jest-dom の動的 import を jsdom 環境のみに限定

### Step 2 で変更したファイル

**ソースファイル（barrel import → 個別 import）**:
- `src/renderer/App.tsx`: `import { ... } from '../shared'` → `../shared/api`, `../shared/providers`
- `src/remote-ui/App.tsx`: `import { ... } from '../shared'` → `../shared/api`, `../shared/providers`, `../shared/hooks/useDeviceType`
- `src/remote-ui/layouts/DesktopLayout.tsx`: `import { useApi } from '../../shared'` → `../../shared/api`
- `src/remote-ui/layouts/MobileLayout.tsx`: `import { useApi } from '../../shared'` → `../../shared/api`

**テストファイル（vi.mock パス修正）**:
- `src/remote-ui/App.test.tsx`: `vi.mock('../shared', ...)` → 3つの個別パスに分割
- `src/remote-ui/integration.test.tsx`: 同上
- `src/remote-ui/MobileAppContent.test.tsx`: 同上
- `src/remote-ui/components/MobileBugNavigation.test.tsx`: `vi.mock('../../shared', ...)` → 3つの個別パスに分割
- `src/remote-ui/cleanup.test.ts`: `await import('../shared')` → 個別パスに分割
- `src/renderer/App.provider.test.tsx`: `await import('../shared')` → 個別パスに分割

### Step 3 で変更したファイル

- `src/test/setup.ts`: `import '@testing-library/jest-dom'` をトップレベルから `if (typeof window !== 'undefined') { await import('@testing-library/jest-dom'); }` に移動

### 結論

**barrel export (`shared/index.ts` の `export *`) の解体が最も効果的な施策であり、並列制限の撤廃と合わせて約25倍の高速化を達成した（20分 → 48秒）。**

- **barrel export 解体**: 11倍高速化（決定的な改善）
- **並列制限撤廃**: さらに2倍（メモリ問題解消後に可能に）
- vitest バージョンアップ、setup.ts 分割は副次的な改善

残りの最適化候補:
1. `shared/index.ts` 自体の `export *` を削除（まだソース側で barrel import しているファイルが残存している可能性）
2. 実 setTimeout → fake timers 置換（約20秒削減見込み）
3. happy-dom 移行検討（jsdom のメモリフットプリント削減）

---

## 既存で失敗しているテスト（9ファイル・環境非依存）

jsdom / node いずれの環境でも失敗するファイル：

| ファイル | 失敗原因 |
|----------|---------|
| `main/index.test.ts` | electron CJS/ESM 互換性 |
| `main/services/agentRecordWatcherService.test.ts` | 不明 |
| `main/services/remoteAccessIntegration.test.ts` | 実WebSocket接続（E2E相当） |
| `main/services/runtimeAgentsIntegration.test.ts` | 不明 |
| `main/services/scheduleTaskCoordinator.test.ts` | 不明 |
| `main/services/specManagerService.categoryIntegration.test.ts` | 不明 |
| `main/services/specManagerService.test.ts` | 不明 |
| `main/services/unifiedCommandsetInstaller.test.ts` | ファイルシステム関連 |
| `main/services/validationService.test.ts` | ファイルシステム関連 |
