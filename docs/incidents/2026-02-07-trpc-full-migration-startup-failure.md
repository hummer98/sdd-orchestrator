# インシデントレポート: trpc-full-migration マージ後の起動障害

- **発生日時**: 2026-02-07T04:15:00Z
- **検出方法**: 手動起動時のエラー報告
- **影響範囲**: アプリ起動不可（白画面）+ 全tRPCサービスDI未接続
- **根本原因**: `trpc-full-migration` ブランチのDI配線実装漏れ
- **関連コミット**: `b2d39af8 feat(trpc-full-migration): merge from worktree branch`

## 症状

### 致命的（起動不可）

1. **Mainプロセス**: `Cannot find module './projectFileUtils'`
   - `projectSetup.ts` の `require('./projectFileUtils')` がViteバンドル後に解決不能
2. **Rendererプロセス**: `ReferenceError: require is not defined`
   - `vanillaClient.ts` / `provider.tsx` の `require('electron-trpc/renderer')` が `nodeIntegration: false` 環境で実行不可
3. **Rendererプロセス**: `TypeError: Cannot destructure property 'client' of 'useContext(...)' as it is null`
   - `App.tsx` 内で `trpc.*.useSubscription()` フックを使用しているが、`TRPCProvider` が `App` の return 文内にあり、フック実行時にコンテキスト未提供

### 重大（全tRPCサービス機能不全）

4. **サービスDI未配線**: `setupTRPCHandler(mainWindow)` がサービス注入なしで呼ばれている
   - 設計（DD-006）では `setupTRPCHandler(mainWindow, { configStore, mcpServerService, ... })` を想定
   - 実装では `setupTRPCHandler(mainWindow)` のみ（サービスオーバーライドなし）
   - 結果: tRPCコンテキストの全サービスが `null` / `undefined`

## 影響を受けるサービス

| サービス | null時の挙動 | 実際の影響 |
|---|---|---|
| `configStore` | `null` → デフォルト値返却 or throw | レイアウト保存不可、設定読み込み不可 |
| `mcpServerService` | `undefined` → throw | "MCP Server Service not available" エラー |
| `cloudflareService` | `undefined` → throw | "Cloudflare service not initialized" エラー |
| `toolPathResolverService` | `null` → 空配列返却 | Claude未検出判定 → 設定ダイアログ自動表示 |
| `fileService` | `null` → throw | プロジェクトファイル操作不可 |
| `bugService` | `null` → throw | バグ管理操作不可 |
| `autoExecutionCoordinator` | `undefined` → throw | 自動実行制御不可 |
| `eventBus` | 注入済み（唯一） | **正常動作** |

## 根本原因分析

### 設計 vs 実装のギャップ

```
設計（DD-006）:
  index.ts → setupTRPCHandler(window, { services... }) → createContext(overrides) → ctx.services.*
                                        ↑ 全サービス注入

実装（実際）:
  index.ts → setupTRPCHandler(window) → createContext({ eventBus only }) → ctx.services.* = null
                                        ↑ eventBusのみ
```

- `tasks.md` でTask 1.1は「COMPLETED」マーク → 実際はDI配線の呼び出し側が未実装
- テストは直接オーバーライドを渡すため通過 → プロダクションコードの配線漏れを検出できず

### 3つの `require()` 問題

tRPC移行時に `require()` パターンを3箇所で使用したが、いずれもVite/Electronの制約に違反：

| 箇所 | 問題 | 制約 |
|---|---|---|
| `projectSetup.ts:386` | `require('./projectFileUtils')` | Viteバンドル後は相対require不可 |
| `vanillaClient.ts:29` | `require('electron-trpc/renderer')` | `nodeIntegration: false` でrequire不可 |
| `provider.tsx:31` | `require('electron-trpc/renderer')` | 同上（try-catchで抑制されていた） |

## 修正内容

### Phase 1: 起動障害修正（即時対応）

| ファイル | 修正 |
|---|---|
| `src/main/trpc/helpers/projectSetup.ts` | `require()` / `await import()` → 静的 `import` |
| `src/shared/trpc/vanillaClient.ts` | `require('electron-trpc/renderer')` → 静的 ESM `import` |
| `src/shared/trpc/provider.tsx` | 同上 |
| `src/renderer/main.tsx` | `<TRPCProvider>` を `<App>` の外側に移動 |
| `src/renderer/App.tsx` | 重複する `<TRPCProvider>` を削除 |

### Phase 2: サービスDI配線修正（TDD）

| ファイル | 修正 |
|---|---|
| `src/main/trpc/productionServices.ts` | **新規**: 全プロダクションサービスの組み立て関数 `createProductionServices()` |
| `src/main/trpc/handler.ts` | `createProductionServices()` をデフォルトサービスとして使用 |
| `src/main/trpc/__tests__/productionServices.test.ts` | **新規**: DI配線の検証テスト（30テスト） |

#### 配線済みサービス（Phase 2: 27サービス）

| カテゴリ | サービス |
|---|---|
| Core | configStore, fileService, bugService, getSpecManagerService |
| State | getCurrentProjectPath, setProjectPath, getInitialProjectPath, setInitialProjectPath |
| System | getAppVersion, getPlatform, getAppPath, getNodeEnv |
| Config | layoutConfigService, engineConfigService, toolPathResolverService, settingsFileManager, getAvailableLlmEngines |
| Project | selectProject, getIsE2ETest |
| AutoExecution | autoExecutionCoordinator, bugAutoExecutionCoordinator |
| Cloudflare | cloudflareService（コンポジットアダプター） |
| MCP | mcpServerService |
| Schedule | scheduleTaskService, scheduleTaskCoordinator |
| Event | eventBus |

### Phase 3: 未配線サービス（実装漏れ残存）

Phase 2 で重大サービスは修正済みだが、`ContextServices` の全66個のオプショナルサービスが未配線のまま残っている。
これらも同じ `trpc-full-migration` の実装漏れであり、対応するルーターの手続きが呼ばれた時点で `"xxx not initialized"` エラーとなる。

#### 未配線サービス一覧（66サービス）

| ドメイン | 未配線サービス | 影響を受けるルーター |
|---|---|---|
| **File** (3) | `listProjectFiles`, `readProjectFile`, `writeProjectFile` | `file.*` |
| **Project** (2) | `showOpenDialog`, `createNewWindow` | `project.showOpenDialog`, `project.createNewWindow` |
| **Bug** (7) | `bugsWatcherStart`, `bugsWatcherStop`, `bugWorktreeCreate`, `bugWorktreeRemove`, `bugWorktreeAutoExecution`, `bugConvertToWorktree`, `validateWorktreeMainBranch` | `bug.worktree*`, `bug.watcher*` |
| **Spec** (1) | `confirmCommonCommands` | `spec.confirmCommonCommands` |
| **Agent** (5) | `agentStop`, `agentGetLogs`, `agentGetRunningCounts`, `agentCheckFolderExists`, `agentDeleteFolder` | `agent.*` |
| **Git** (13) | `gitGetStatus`, `gitGetDiff`, `gitWatchChanges`, `gitUnwatchChanges`, `worktreeCheckMain`, `worktreeCreate`, `worktreeRemove`, `worktreeResolvePath`, `worktreeImplStart`, `normalModeImplStart`, `worktreeRebaseFromMain`, `convertCheck`, `convertToWorktree` | `git.*` |
| **Install** (12) | `installProjectChecker`, `installCommandInstallerService`, `installUnifiedCommandsetInstaller`, `installExperimentalToolsInstaller`, `installCommandsetVersionService`, `installGetCliInstallStatus`, `installInstallCliCommand`, `installGetManualInstallInstructions`, `installMigrationService`, `installCheckJjAvailability`, `installInstallJj`, `installIgnoreJjInstall` | `install.*` |
| **Misc** (22) | `openInVscode`, `copyToClipboard`, `logRenderer`, `recordHumanSession`, `getSpecMetrics`, `getProjectMetrics`, `getProjectLogPath`, `openLogInBrowser`, `addShellPermissions`, `addMissingPermissions`, `checkRequiredPermissions`, `startRemoteServer`, `stopRemoteServer`, `getRemoteServerStatus`, `refreshAccessToken`, `sshConnect`, `sshDisconnect`, `sshGetStatus`, `sshGetConnectionInfo`, `sshGetRecentRemoteProjects`, `sshAddRecentRemoteProject`, `sshRemoveRecentRemoteProject` | `misc.*` |
| **Schedule** (1) | `reportIdleTime` | `schedule.reportIdleTime` |

#### 実装元の調査結果

各未配線サービスの実装は既存のサービスクラス/モジュールに存在するが、tRPCコンテキストへのアダプター配線が行われていない：

| 未配線サービス | 実装元 |
|---|---|
| `listProjectFiles`, `readProjectFile`, `writeProjectFile` | `trpc/helpers/projectFileUtils.ts` (`listProjectFilesCore`, `readProjectFileCore`, `writeProjectFileCore`) |
| `showOpenDialog` | `electron.dialog.showOpenDialog()` のラッパー |
| `createNewWindow` | `index.ts` の `createWindow()` |
| `bugWorktree*`, `bugConvertToWorktree` | `services/bugWorkflowService.ts`, `services/convertBugWorktreeService.ts` |
| `agentStop`, `agentGetLogs`, `agentGetRunningCounts` | `services/agentLifecycleSetup.ts`, `services/logParserService.ts` |
| `gitGetStatus`, `gitGetDiff`, `gitWatch*` | `services/GitService.ts` |
| `worktree*`, `convertCheck`, `convertToWorktree` | `services/worktreeService.ts`, `services/convertWorktreeService.ts` |
| `installProjectChecker` | `services/projectChecker.ts` |
| `installCommandInstallerService` | `services/commandInstallerService.ts` |
| `installUnifiedCommandsetInstaller` | `services/unifiedCommandsetInstaller.ts` |
| `startRemoteServer`, `stopRemoteServer`, `getRemoteServerStatus` | `services/remoteAccessSetup.ts` (`getRemoteAccessServer()`) |
| `sshConnect`, `sshDisconnect`, `sshGetStatus` | `services/ssh/` |
| `openInVscode` | `child_process.exec('code ...')` |
| `copyToClipboard` | `electron.clipboard.writeText()` |
| `logRenderer` | `services/projectLogger.ts` へのフォワード |
| `recordHumanSession`, `getSpecMetrics`, `getProjectMetrics` | `services/metricsService.ts` |
| `reportIdleTime` | `services/idleTimeTracker.ts` |
| `addShellPermissions`, `addMissingPermissions`, `checkRequiredPermissions` | `services/permissionsService.ts` |

#### 確認済みのランタイムエラー（Phase 3 起因）

動作確認時に以下のエラーを確認：

```
[tRPC] query agent.getAllAgents failed: "SpecManagerService not initialized"
[tRPC] query install.checkSpecManagerFiles failed: "ProjectChecker not initialized"
[tRPC] query misc.checkRequiredPermissions failed: "checkRequiredPermissions not initialized"
[tRPC] mutation misc.startRemoteServer failed: "startRemoteServer not initialized"
```

## なぜ検査（Inspection）で検出できなかったか

### 1. 設計の曖昧さ（DD-006）

DD-006は「全ドメインサービスへのアクセスを`ctx.services.*`経由で提供する」と記述しているが、**配線すべきサービスの具体的なリスト**が存在しない。「全ドメインサービス」の定量的な定義（何個のうち何個を配線すべきか）が欠落していた。

### 2. タスク完了基準の不備（Task 1.1）

Task 1.1の検証基準:

```
_Verify: Grep "ctx.services" in context.ts_
```

これは**型定義に `ctx.services` パターンが存在するか**を確認しているだけであり、**プロダクションコード（`productionServices.ts`）で実際に配線されているか**は一切検証していない。「定義の存在」と「実装の完全性」が混同されていた。

### 3. テストモックによる問題の隠蔽

テストは `createTestContext()` / `createMockServices()` で**全サービスにモックを注入**するため、全テストがパスする。一方、プロダクションコードでは `productionServices.ts` に記述された26個しか注入されない。

```
テスト環境: ctx.services.bugWorktreeCreate = vi.fn()       → ✅ パス
本番環境:   ctx.services.bugWorktreeCreate = undefined      → ❌ "not available" エラー
```

テストとプロダクションのDI構成が乖離しており、テスト通過がプロダクション品質を保証しない構造だった。

### 4. 防御的コーディングパターンによる検出困難

全ルーターが以下の防御パターンを使用:

```typescript
if (!ctx.services.bugWorktreeCreate) {
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'bugWorktreeCreate not available' });
}
```

このパターンによりアプリはクラッシュせず、**特定の操作を実行して初めてエラーが顕在化**する。起動時やスモークテストでは発見不可能。

### 5. 検査観点の不足

検査は「`ctx.services.*` が241箇所で使用されている → PASS」と判定した。しかし**宣言と実装の対応関係（配線完全性）**は検証していない。

| 検査が確認したこと | 検査が確認しなかったこと |
|---|---|
| `ctx.services.*` の使用箇所数（241箇所） | `productionServices.ts` の配線率（26/92 = 28%） |
| ルーターの防御的nullチェックの存在 | 防御チェックが本番で実際にトリガーされるか |
| テストの通過率 | テストモックとプロダクション配線の一致性 |

### 構造的問題のまとめ

| 原因 | 問題 | 影響 |
|---|---|---|
| **設計の曖昧さ** | 配線すべきサービスのリストが未定義 | 「何が完了か」の基準がない |
| **検証基準の甘さ** | 型定義の存在確認のみ | 実装の完全性が未検証 |
| **テスト/本番の乖離** | モックが全サービスを提供 | テスト通過 ≠ 本番動作 |
| **防御的パターン** | nullチェックで制御エラー | 起動時に顕在化せず検出困難 |
| **検査観点の欠如** | 使用箇所数のみカウント | 配線率・カバレッジ未測定 |

## 再発防止策

1. **統合テスト追加**: プロダクションコードの `setupTRPCHandler` 呼び出しでサービスが注入されることを検証
2. **ESLint ルール**: Renderer コードでの `require()` 使用を禁止（`no-require-imports` 徹底）
3. **タスク完了基準**: DI配線のタスクは「受け側実装」と「呼び出し側配線」の両方を完了条件に含める
4. **未配線サービスの段階的解消**: Phase 3 の66サービスをドメイン単位で配線（優先度: Agent > Install > Misc > Git > Bug > File > Project > Spec）
5. **DI配線完全性チェックの検査項目追加**: 検査時に `ContextServices` の全プロパティと `productionServices.ts` の返却プロパティを突き合わせ、配線率100%を確認する観点を必須化
6. **テスト/本番DI一致性検証**: `productionServices.ts` が返すキーセットと `createMockServices()` が返すキーセットの差分を検出するテストを追加
