# Implementation Plan

- [x] 1. vanillaClient を共有 TRPCClient ベースの proxy ラッパーに変換する
- [x] 1.1 `setSharedClient()` と deferred initialization パターンを実装する
  - `getVanillaClient()` が TRPCClient 未設定時に deferred proxy を返す仕組みを構築する
  - Deferred proxy は subscribe 操作を内部キューに蓄積し、`setSharedClient()` 呼び出し時に flush する
  - `createTRPCClientProxy()` を使用して渡された TRPCClient から vanilla proxy を生成する
  - `resetVanillaClient()` テスト用リセット関数を提供する
  - `ipcLink()` および `createTRPCProxyClient()` の import を除去する
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Method: createTRPCClientProxy, setSharedClient, getVanillaClient_
  - _Verify: Grep "ipcLink" in vanillaClient.ts expects 0 matches_
  - _Verify: Grep "createTRPCProxyClient" in vanillaClient.ts expects 0 matches_
  - _Verify: Grep "createTRPCClientProxy" in vanillaClient.ts expects 1+ matches_
  - _Contracts: vanillaClient.ts Service Interface_

- [x] 1.2 vanillaClient のユニットテストを更新する
  - `setSharedClient()` 後に `getVanillaClient()` が正しい proxy を返すことを検証する
  - `setSharedClient()` 前の `getVanillaClient()` が deferred proxy を返し、設定後に flush されることを検証する
  - `resetVanillaClient()` で状態がリセットされることを検証する
  - 既存テストの mock パターンが引き続き動作することを確認する
  - _Requirements: 1.2, 5.2_

- [x] 2. provider.tsx で TRPCClient を vanillaClient に共有する
- [x] 2.1 `TRPCProvider` マウント時に `setSharedClient()` を呼び出す処理を追加する
  - `trpc.createClient()` で生成した `trpcClient` を `setSharedClient()` に渡す
  - `ipcLink()` はこのコンポーネント内でのみ呼ばれることを維持する
  - Remote UI 環境（ipcLink 不可）では `setSharedClient()` を呼ばない
  - _Requirements: 1.1_
  - _Method: setSharedClient_
  - _Verify: Grep "setSharedClient" in provider.tsx expects 1+ matches_
  - _Contracts: provider.tsx Service Interface_

- [x] 2.2 provider.tsx のユニットテストを追加する
  - `TRPCProvider` マウント時に `setSharedClient()` が呼ばれることを検証する
  - `ipcLink()` が1回のみ呼ばれることを `vi.fn()` で call count 検証する
  - _Requirements: 1.1, 1.4_

- [x] 3. console-message native 方式に統一する
- [x] 3.1 (P) `main/index.ts` の `console-message` リスナーを全環境有効化・レベルマッピングに変更する
  - 既存の `isE2ETest` ガードを解除し、全環境で `console-message` リスナーを登録する
  - Electron native の `level` パラメータ（0=DEBUG, 1=INFO, 2=WARNING, 3=ERROR）を `logger` メソッドに直接マッピングする
  - 現在の一律 `logger.info()` をレベル別呼び分けに変更する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - _Method: webContents.on('console-message'), logger.debug/info/warn/error_
  - _Verify: Grep "isE2ETest" in main/index.ts console-message section expects 0 matches_

- [x] 3.2 (P) `renderer/main.tsx` から `initializeConsoleHook()` 呼び出しを削除する
  - `initializeConsoleHook` の import 文と呼び出しを除去する
  - _Requirements: 3.8_
  - _Verify: Grep "initializeConsoleHook\|consoleHook" in renderer/main.tsx expects 0 matches_

- [x] 3.3 (P) `consoleHook.ts`, `consoleHook.test.ts`, `noiseFilter.ts`, `noiseFilter.test.ts`, `rendererLogging.integration.test.ts` を物理削除する
  - `src/renderer/utils/consoleHook.ts` を物理削除する
  - `src/renderer/utils/consoleHook.test.ts` を物理削除する
  - `src/renderer/utils/noiseFilter.ts` を物理削除する
  - `src/renderer/utils/noiseFilter.test.ts` を物理削除する
  - `src/renderer/utils/rendererLogging.integration.test.ts` を物理削除する
  - 他ファイルからの import 参照が残っていないことを確認する
  - _Requirements: 3.7, 5.3_
  - _Verify: Grep "consoleHook\|noiseFilter" in src/ expects 0 matches (excluding test setup mocks if any)_

- [x] 4. steering ドキュメントを更新する
- [x] 4.1 `tech.md` の vanillaClient セクションを「React client の proxy ラッパー」として更新する
  - `getVanillaClient()` が provider.tsx の TRPCClient を `createTRPCClientProxy()` でラップした proxy であることを記述する
  - `ipcLink()` 単一呼び出しの設計方針を記載する
  - _Requirements: 4.1, 4.2_

- [x] 4.2 `logging.md` の Renderer ロギングアーキテクチャセクションを更新する
  - consoleHook 廃止と `console-message` native 方式への統一を反映する
  - レイヤー構成表から consoleHook を削除し、console-message native 方式を記載する
  - rendererLogger の IPC 経路記述をソースコード実態（`getVanillaClient().misc.logRenderer.mutate()`）と一致させる
  - 関連ソースから consoleHook.ts と noiseFilter.ts を削除する
  - _Requirements: 4.3_

- [x] 5. ビルド・テスト検証
- [x] 5.1 `npm run build && npm run typecheck` がエラーなく完了することを確認する
  - 型エラー、未解決参照、missing import がないことを検証する
  - _Requirements: 5.1_

- [x] 5.2 ユニットテストスイートが全て PASS することを確認する
  - `getVanillaClient()` を使用する既存テストが変更なしで PASS することを検証する
  - `consoleHook.test.ts`, `noiseFilter.test.ts` 削除後にテストスイートがエラーなく完了することを検証する
  - `rendererLogger` のテストが PASS することを検証する
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `ipcLink()` を1回のみ呼び出す | 1.1, 2.1, 2.2 | Feature |
| 1.2 | `getVanillaClient()` が React client と同じ TRPCClient proxy を返す | 1.1, 1.2 | Feature |
| 1.3 | `getVanillaClient()` の API シグネチャ維持 | 1.1 | Feature |
| 1.4 | `ipcLink()` 複数呼び出しの検出 | 1.1, 2.2 | Feature |
| 2.1 | `onMenuOpenProject` が phantom data を受信しない | 1.1, 2.1 | Feature |
| 2.2 | `onMenuResetLayout` が意図しないリセットを起こさない | 1.1, 2.1 | Feature |
| 2.3 | EventBus イベント発火まで `onData` が呼ばれない | 1.1, 2.1 | Feature |
| 3.1 | 全環境で `console-message` リスナー登録 | 3.1 | Feature |
| 3.2 | Renderer console を Main logger に適切レベルで記録 | 3.1 | Feature |
| 3.3 | DEBUG (0) を `logger.debug()` で記録 | 3.1 | Feature |
| 3.4 | INFO (1) を `logger.info()` で記録 | 3.1 | Feature |
| 3.5 | WARNING (2) を `logger.warn()` で記録 | 3.1 | Feature |
| 3.6 | ERROR (3) を `logger.error()` で記録 | 3.1 | Feature |
| 3.7 | `consoleHook.ts` と `noiseFilter.ts` の削除 | 3.3 | Cleanup |
| 3.8 | `main.tsx` から `initializeConsoleHook()` 呼び出し削除 | 3.2 | Cleanup |
| 4.1 | `tech.md` の vanillaClient セクション更新 | 4.1 | Integration |
| 4.2 | `ipcLink()` 単一呼び出し方針の記載 | 4.1 | Integration |
| 4.3 | `logging.md` の Renderer ロギング更新 | 4.2 | Integration |
| 5.1 | `build && typecheck` がエラーなく完了 | 5.1, 5.2 | Validation |
| 5.2 | `getVanillaClient()` 使用テストが変更なしで PASS | 5.2 | Validation |
| 5.3 | `consoleHook.test.ts` と `noiseFilter.test.ts` 削除後にテスト PASS | 5.2 | Validation |
| 5.4 | `rendererLogger` テストが PASS | 5.2 | Validation |
