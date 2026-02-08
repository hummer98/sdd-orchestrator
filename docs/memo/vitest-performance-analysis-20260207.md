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

**状態: 解消済み** — barrel export 解体により解消。詳細は「解消済み項目 > OOM の解消」を参照。

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

### OOM（JavaScript heap out of memory）の解消

**コミット**: `ddf0e0ee`

| 項目 | 詳細 |
|------|------|
| 問題 | 全テスト実行時にワーカーが各4-5GB消費し OOM クラッシュ |
| 根本原因 | `shared/index.ts` の barrel export (`export * from './hooks'` 等) により、1回の import で数十MBのモジュールツリーがロード。ワーカーごとにESMキャッシュが蓄積し数GBに膨張 |
| 対処 | ソース・テスト双方の `import { ... } from '../shared'` を `'../shared/api'`, `'../shared/providers'` 等の個別パスに変更。テストの `vi.mock('../shared', ...)` も対応するパスに分割 |
| 結果 | ワーカーメモリが正常化し OOM 解消。並列制限（maxForks=3）も不要になり撤廃 |
| 効果 | 実行時間: 20分 → 47秒（約25倍高速化）|

**再発防止**: `shared/index.ts` の barrel export (`export *`) を経由する import を避け、個別モジュールパスから直接 import すること。barrel import は1ファイルあたり40-48MBのヒープ消費を引き起こす。

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
| **中** | jsdom → happy-dom 移行 | Environment -45%, Duration -8% | 低（8ファイル修正） | **適用済み** |
| **中** | 実 setTimeout を fake timers に置換 | 約20秒削減 | 低 | 未着手 |
| **中** | renderer/shared 重複テスト統合 | テストケース数削減 | 中 | 未着手 |
| **低** | 巨大テストファイルの分割 | キャッシュ・並列効率向上 | 低 | 未着手 |

### 最終テスト実行結果（全施策適用後・Pre-tRPC）

| 項目 | 結果 |
|------|------|
| テストファイル | 395 passed / 27 failed / 423 total |
| テストケース | 8,144 passed / 219 failed / 22 skipped |
| 実行時間 | **46.96秒 (48秒)** |
| OOM | **なし** (以前は全面クラッシュ) |
| Worker unexpected exit | 1件 |
| **改善率** | **20分 → 48秒 (約25倍高速化)** |

### 現在のテスト実行結果（Post-tRPC Migration）

| 項目 | 結果 |
|------|------|
| テストファイル | 383 passed / 27 failed / 410 total |
| 実行時間 | **120.30秒 (2分)** |
| OOM | **なし** |
| **Pre-tRPC比** | **46.96秒 → 120.30秒 (2.6倍悪化)** |
| **初期比** | **20分 → 2分 (10倍高速化を維持)** |

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

**注意**: tRPC Full Migration 後に 46.96s → 120.30s へ回帰。詳細は「tRPC Full Migration 後の回帰分析」セクションを参照。

---

## tRPC Full Migration 後の回帰分析

### 概要

`feat(trpc-full-migration)` による大型リファクタ完了後に再計測したところ、vitest 実行時間が **46.96秒 → 120.30秒** へ 2.6倍悪化した。

### 計測結果比較

| 項目 | Pre-tRPC (Step 4) | Post-tRPC | 変化 |
|------|-------------------|-----------|------|
| 実行時間 | 46.96s | 120.30s | **+156%** |
| environment (累計) | 87.93s | 209.83s | **+139%** |
| collect (累計) | 53.47s | 103.22s | **+93%** |
| テストファイル | 423 | 410 | -13 |
| 1ファイルあたり environment | 0.34s | 1.34s | **4倍** |

### モジュール別の影響

| モジュール | 実行時間 | 備考 |
|-----------|---------|------|
| `main/` のみ | 46.5s | node 環境、tRPC router の実ロードあり |
| `renderer/` + `remote-ui/` + `preload/` | 230s | jsdom 環境、tRPC クライアント依存 |
| `shared/trpc/__tests__/` (7ファイル) | 5.57s | tRPC 自体のテスト（高速） |

### 原因: tRPC 依存チェーンの transitive loading

tRPC Migration により以下のモジュールが新たに追加され、多数のテストファイルから間接的にロードされるようになった:

```
shared/trpc/client.ts      → import { createTRPCReact } from '@trpc/react-query'  (value import)
shared/trpc/provider.tsx    → import { QueryClient } from '@tanstack/react-query'  (value import)
shared/trpc/vanillaClient.ts → import { createTRPCClient } from '@trpc/client'     (value import)
main/trpc/router.ts         → 15 sub-routers を集約 (6,163行相当のサービス実装)
```

- `import type { AppRouter }` は esbuild で strip されるため無影響
- 問題は **value import** — `@trpc/react-query`, `@tanstack/react-query`, `@trpc/client` が実ロードされる
- テスト対象コンポーネントが `shared/trpc/client` や `shared/trpc/provider` を間接的に import → これらのパッケージが jsdom 環境の初期化コストに加算

### テストファイルの tRPC 依存状況

| 分類 | ファイル数 | 説明 |
|------|-----------|------|
| **tRPC パッケージが必要** | 7 | `shared/trpc/__tests__/` 配下、実際に tRPC の機能をテスト |
| **transitive にロード** | ~403 | テスト対象が間接的に tRPC モジュールを import。テスト自体は tRPC 機能を使わない |

### 試行したモックアプローチと結果

#### アプローチ 1: npm パッケージレベルの mock

`setup.ts` に `@trpc/react-query`, `@trpc/client`, `@tanstack/react-query` の `vi.mock()` を追加。

| 計測対象 | Before | After | 改善 |
|---------|--------|-------|------|
| renderer/remote-ui/preload のみ | 230s | 69s | **70%改善** |
| **全テストスイート** | **120s** | **134-152s** | **悪化** |

**失敗原因**: `vi.mock()` のファクトリ関数はテストファイルごとに実行される（410ファイル × 3 mock = 1,230回）。一方、ESM パッケージはワーカーごとに1回ロードされキャッシュされる（10ワーカー × 1回 = 10回）。**mock のオーバーヘッド（1,230回）がパッケージロードの節約（10回）を上回った。**

#### アプローチ 2: 中間モジュールレベルの mock

`setup.ts` に `shared/trpc/client` と `shared/trpc/provider` の `vi.mock()` を追加（npm パッケージではなく中間モジュール単位）。

| 計測対象 | Before | After | 改善 |
|---------|--------|-------|------|
| renderer/remote-ui/preload のみ | 230s | 86s | **63%改善** |
| **全テストスイート** | **120s** | **122-130s** | **改善なし** |

**失敗原因**: 同じ per-file overhead 問題。部分実行では効果があるが、全テスト実行では mock ファクトリの累計コストが支配的。

#### アプローチ 3: npm mock + vi.unmock 併用

`setup.ts` で npm パッケージを mock し、tRPC テスト（7ファイル）で `vi.unmock()` を使用。テストは全パスしたが実行時間は改善せず（133-152s）。

### 結論

**tRPC Full Migration による 120s への回帰は、現時点では vitest 側の mock アーキテクチャの制約により解消困難。** 主な知見:

1. **ESM forks pool のキャッシュ構造**: パッケージはワーカー単位でキャッシュされる（10回）のに対し、`vi.mock()` はファイル単位で実行される（410回）
2. **mock のオーバーヘッドがロード節約を上回るパラドックス**: 部分実行（特定モジュールのみ）では顕著に改善するが、全体実行では mock 自体のコストが支配的になる
3. **tRPC 依存は約400ファイルに波及**: しかし実際に tRPC をテストしているのは7ファイルのみ

### 今後の対策候補

| 優先度 | 施策 | 期待効果 | 備考 |
|--------|------|----------|------|
| **高** | tRPC import の lazy 化 / dynamic import | ファイル単位のロードコスト削減 | ソースコード側の変更が必要 |
| **中** | happy-dom 移行 | jsdom 環境初期化コスト削減 | tRPC ロードとは独立した改善 |
| **中** | vitest `deps.optimizer` 設定 | 依存の事前バンドルで初期化高速化 | vitest 3.x の機能 |
| **低** | vitest 4.x 待ち | 新プールアーキテクチャでの改善期待 | 現在はメモリリーク問題あり |

---

## 現在のモジュール別実行時間（2026-02-07 計測）

### 全テスト実行結果

| 項目 | 結果 |
|------|------|
| テストファイル | 389 passed / 20 failed / 411 total |
| テストケース | 8,473 passed / 102 failed / 22 skipped |
| 実行時間 | **106.93s** |
| OOM | なし |

### モジュール別内訳

| モジュール | Files | Duration | Transform | Setup | Collect | Tests | Environment | Prepare | 環境 |
|-----------|-------|----------|-----------|-------|---------|-------|-------------|---------|------|
| `main/` | 150 | **38.47s** | 5.33s | 2.89s | 14.41s | 112.78s | 0.02s | 11.33s | node |
| `renderer/` | 111 | **58.40s** | 5.75s | 11.78s | 44.53s | 41.16s | 81.94s | 11.84s | jsdom |
| `shared/` | 101 | **22.65s** | 5.18s | 10.83s | 29.70s | 20.38s | 83.76s | 11.87s | jsdom |
| `remote-ui/` | 47 | **17.65s** | 5.86s | 4.79s | 26.65s | 60.49s | 36.90s | 5.59s | jsdom |
| `preload/` | 2 | **0.89s** | 0.07s | 0.13s | 0.02s | 0.02s | 0.48s | 0.12s | jsdom |
| **全体** | **411** | **106.93s** | **12.59s** | **26.49s** | **87.52s** | **221.86s** | **180.58s** | **37.37s** |  |

※ Duration は wallclock（並列実行あり）。Transform〜Prepare は累計値（ワーカー合算）。

### 分析

- **Environment が最大のオーバーヘッド**: 累計 180.58s（jsdom 環境の初期化コスト）。`renderer/`(81.94s) + `shared/`(83.76s) が大半
- **Collect（モジュール解決）**: 累計 87.52s。`renderer/`(44.53s) が最大
- **Tests（実テスト実行）**: 累計 221.86s だが `main/` の 112.78s が半分以上（実 setTimeout 待機含む可能性）
- **main/ の Environment が 0.02s**: node 環境への切替が正しく効いている
- **Transform**: 各モジュール 5-6s で頭打ち。deps.optimizer で改善の余地あり
- **モジュール個別実行の合計（137.66s）> 全体実行（106.93s）**: 並列化の効果

---

## 追加施策の試行結果

### `pool: 'threads'` への変更（2026-02-07）

| 項目 | 詳細 |
|------|------|
| 施策 | `vitest.config.ts` の `pool: 'forks'` → `pool: 'threads'` |
| 期待効果 | worker_threads は child_process より IPC 通信が軽量。大規模プロジェクトで 10-30% 高速化の報告あり |
| 結果 | **exit code 137 (SIGKILL / OOM)** — テスト出力なしでプロセスが kill された |
| 原因 | `threads` プールはプロセス内でメモリ空間を共有する。jsdom 環境を多数（~250ファイル）使用する本プロジェクトでは、共有メモリ空間内のヒープ圧が `forks`（プロセス分離）より悪化し、OS の OOM killer に kill された |
| 結論 | **本プロジェクトでは `pool: 'threads'` は使用不可。`pool: 'forks'` が正解** |

**補足**: `forks` は各ワーカーが独立プロセスのため、1ワーカーがメモリを多く消費しても他に波及しない。`threads` は同一プロセス内の worker_threads のため、全スレッドのヒープが合算され上限に達しやすい。jsdom のメモリフットプリントが大きい環境では `forks` 一択。

### `deps.optimizer` 有効化（2026-02-07）

| 項目 | 詳細 |
|------|------|
| 施策 | `vitest.config.ts` に `deps.optimizer.web.include` を追加。対象: `lucide-react`(1,906ファイル/44MB), `zod`(176ファイル), `@tanstack/react-query`(91), `@trpc/server`(89), `@trpc/client`(35), `@trpc/react-query`(18), `@uiw/react-md-editor`(88), `react-dom`(40), `@testing-library/jest-dom`(35) |
| 期待効果 | 外部ライブラリを esbuild で事前バンドルし、Transform 時間を短縮 |
| 結果 | **効果なし** — 106.93s → 107.94s (+0.9%、誤差範囲) |
| Transform | 12.59s → 12.30s（-2.3%、微減） |
| Environment | 180.58s → 177.95s（-1.5%、誤差） |
| Collect | 87.52s → 92.23s（+5.4%、微増） |
| 原因分析 | `forks` プールではワーカーごとにモジュールが ESM キャッシュされるため、事前バンドルの恩恵がキャッシュ効果と相殺される。Transform 自体が全体の 12% 程度しか占めておらず、ボトルネックは Environment（jsdom 初期化 = 180s）と Collect（モジュール解決 = 87s）にある |
| 結論 | **本プロジェクトでは `deps.optimizer` の効果は確認できず、設定を撤回** |

### `jsdom` → `happy-dom` 移行検証（2026-02-07）

| 項目 | 詳細 |
|------|------|
| 施策 | `vitest.config.ts` の `environment: 'jsdom'` → `environment: 'happy-dom'` |
| 期待効果 | jsdom より軽量な DOM 実装により Environment 初期化コスト削減 |

**性能比較**:

| 指標 | jsdom | happy-dom | 差分 |
|------|-------|-----------|------|
| **Duration** | 106.93s | **89.38s** | **-16.4%** |
| **Environment** | 180.58s | **91.22s** | **-49.5%** |
| Transform | 12.59s | 11.93s | -5.2% |
| Setup | 26.49s | 23.41s | -11.6% |
| Tests | 221.86s | 179.52s | -19.1% |
| Failed files | 20 | 27 | +7 |
| Failed tests | 102 | 158 | +56 |

**新規失敗ファイル（happy-dom のみで失敗する7ファイル）**:

| ファイル | モジュール |
|---------|-----------|
| `remote-ui/components/AgentDetailDrawer.test.tsx` | remote-ui |
| `renderer/components/BugListItem.test.tsx` | renderer |
| `renderer/components/InstallCloudflaredDialog.test.tsx` | renderer |
| `renderer/components/McpSettingsPanel.test.tsx` | renderer |
| `renderer/components/RemoteAccessPanel.test.tsx` | renderer |
| `shared/components/agent/AgentLogPanel.test.tsx` | shared |
| `shared/components/ui/AgentIcon.test.tsx` | shared |

**結論**: Environment コストが半減し Duration が17秒短縮。ただし7ファイルの互換性問題あり。修正コストが低ければ採用価値あり。現時点では jsdom に戻して保留。

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
| `main/trpc/__tests__/spec-router.test.ts` | 不明 |
| `remote-ui/App.test.tsx` | vi.mock パス関連 |
| `remote-ui/MobileAppContent.test.tsx` | vi.mock パス関連 |
| `remote-ui/components/AgentsTabView.test.tsx` | 不明 |
| `remote-ui/components/BugDetailPage.test.tsx` | 不明 |
| `remote-ui/components/SpecDetailPage.test.tsx` | 不明 |
| `renderer/components/AgentLogPanel.test.tsx` | SessionInfoBlock レンダリング不一致 |
| `renderer/components/ArtifactEditor.test.tsx` | 不明 |
| `renderer/components/BugPane.test.tsx` | 不明 |
| `renderer/components/CommandsetInstallDialog.test.tsx` | 不明 |
| `renderer/components/DocsTabs.integration.test.tsx` | 不明 |
| `renderer/components/ProjectAgentPanel.test.tsx` | 不明 |

---

## happy-dom 移行結果

### 移行概要

jsdom から happy-dom へのデフォルト DOM 環境移行を実施。

**修正内容**:
- `vitest.config.ts`: `environment: 'jsdom'` -> `'happy-dom'`
- 6ファイル・8箇所: `Object.assign(navigator, { clipboard: ... })` -> `Object.defineProperty(navigator, 'clipboard', { value: ..., configurable: true })`
- 1ファイル・3箇所: `toHaveStyle({ height: 'Xvh' })` -> `element.style.height` 直接比較
- 1ファイル・6箇所: `svgs[N].className.baseVal` -> `svgs[N].getAttribute('class')`

### 計測結果

| 項目 | jsdom | happy-dom | 改善 |
|------|-------|-----------|------|
| Duration | 106.62s | 98.30s | -7.8% |
| Environment 累計 | 180.32s | 99.85s | -44.6% |
| Test Files passed | 388 | 388 | 変化なし |
| Test Files failed | 21 | 21 | 変化なし（全て既存の失敗） |
| Tests passed | 8476 | 8476 | 変化なし |
| Tests failed | 103 | 103 | 変化なし |

**結論**: happy-dom 移行により Environment 初期化コストを約45%削減し、全体実行時間を約8秒短縮。新たな失敗テストは発生していない。フォールバック対象ファイルなし。
