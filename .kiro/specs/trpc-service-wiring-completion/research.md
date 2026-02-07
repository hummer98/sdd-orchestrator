# Research & Design Decisions: tRPC Service Wiring Completion

## Summary

- **Feature**: `trpc-service-wiring-completion`
- **Discovery Scope**: Extension（既存パターンの拡張）
- **Key Findings**:
  - 全66サービスの実装元が既存コードベースに存在し、新規ロジックは不要
  - Phase 2で確立した3つの配線パターン（シングルトン参照、インスタンス生成、関数ラッパー）で全てカバー可能
  - 配線完全性テストは `createMockServices()` のキーセットを正解とする比較方式が最も信頼性が高い

## Research Log

### 未配線66サービスの実装元マッピング

- **Context**: インシデントレポート Phase 3 の未配線サービス一覧から、各サービスの実装元を特定
- **Sources Consulted**: `context.ts`, `productionServices.ts`, インシデントレポート, 各ドメインサービスソースコード
- **Findings**:

#### File ドメイン（3サービス）

| ContextServices プロパティ | 実装元モジュール | 実装関数/メソッド | 配線パターン |
|---|---|---|---|
| `listProjectFiles` | `trpc/helpers/projectFileUtils.ts` | `listProjectFilesCore()` | 関数ラッパー |
| `readProjectFile` | `trpc/helpers/projectFileUtils.ts` | `readProjectFileCore()` | 関数ラッパー |
| `writeProjectFile` | `trpc/helpers/projectFileUtils.ts` | `writeProjectFileCore()` | 関数ラッパー |

#### Project ドメイン（2サービス）

| ContextServices プロパティ | 実装元モジュール | 実装関数/メソッド | 配線パターン |
|---|---|---|---|
| `showOpenDialog` | `electron` | `dialog.showOpenDialog()` | Electron APIラッパー |
| `createNewWindow` | `main/index.ts` | `createWindow()` | 関数参照（要: 遅延バインド） |

**注意**: `createNewWindow` は `index.ts` の `createWindow()` への参照が必要。`productionServices.ts` からのimportは循環依存のリスクがあるため、遅延importまたはコールバック注入を検討する。

#### Bug ドメイン（7サービス）

| ContextServices プロパティ | 実装元モジュール | 実装関数/メソッド | 配線パターン |
|---|---|---|---|
| `bugsWatcherStart` | `services/bugsWatcherService.ts` | `start()` | シングルトン参照 |
| `bugsWatcherStop` | `services/bugsWatcherService.ts` | `stop()` | シングルトン参照 |
| `bugWorktreeCreate` | `services/bugWorkflowService.ts` | `createWorktree()` | プロジェクトパス依存クロージャ |
| `bugWorktreeRemove` | `services/bugWorkflowService.ts` | `removeWorktree()` | プロジェクトパス依存クロージャ |
| `bugWorktreeAutoExecution` | `services/bugWorkflowService.ts` | `autoExecutionWithWorktree()` | プロジェクトパス依存クロージャ |
| `bugConvertToWorktree` | `services/convertBugWorktreeService.ts` | `convert()` | プロジェクトパス依存クロージャ |
| `validateWorktreeMainBranch` | `services/worktreeService.ts` | `checkMainBranch()` | 関数ラッパー |

#### Spec ドメイン（1サービス）

| ContextServices プロパティ | 実装元モジュール | 実装関数/メソッド | 配線パターン |
|---|---|---|---|
| `confirmCommonCommands` | `services/commandInstallerService.ts` | `confirmCommonCommands()` | シングルトン参照 |

#### Agent ドメイン（5サービス）

| ContextServices プロパティ | 実装元モジュール | 実装関数/メソッド | 配線パターン |
|---|---|---|---|
| `agentStop` | `services/agentLifecycleSetup.ts` | `getAgentLifecycleManager().stopAgent()` | シングルトン参照 |
| `agentGetLogs` | `services/logParserService.ts` | `parseLogs()` | 関数ラッパー |
| `agentGetRunningCounts` | `services/agentRecordService.ts` | `getRunningCounts()` | シングルトン参照 |
| `agentCheckFolderExists` | `fs` | `fs.access()` ラッパー | 関数ラッパー |
| `agentDeleteFolder` | `fs` | `fs.rm()` ラッパー | 関数ラッパー |

#### Git/Worktree ドメイン（13サービス）

| ContextServices プロパティ | 実装元モジュール | 実装関数/メソッド | 配線パターン |
|---|---|---|---|
| `gitGetStatus` | `services/GitService.ts` | `getStatus()` | シングルトン参照 |
| `gitGetDiff` | `services/GitService.ts` | `getDiff()` | シングルトン参照 |
| `gitWatchChanges` | `services/GitService.ts` | `watchChanges()` | シングルトン参照 |
| `gitUnwatchChanges` | `services/GitService.ts` | `unwatchChanges()` | シングルトン参照 |
| `worktreeCheckMain` | `services/worktreeService.ts` | `checkMainBranch()` | 関数ラッパー |
| `worktreeCreate` | `services/worktreeService.ts` | `create()` | 関数ラッパー |
| `worktreeRemove` | `services/worktreeService.ts` | `remove()` | 関数ラッパー |
| `worktreeResolvePath` | `services/worktreeService.ts` | `resolvePath()` | 関数ラッパー |
| `worktreeImplStart` | `services/worktreeService.ts` | `implStart()` | 関数ラッパー |
| `normalModeImplStart` | `services/worktreeService.ts` | `normalImplStart()` | 関数ラッパー |
| `worktreeRebaseFromMain` | `services/worktreeService.ts` | `rebaseFromMain()` | 関数ラッパー |
| `convertCheck` | `services/convertWorktreeService.ts` | `check()` | 関数ラッパー |
| `convertToWorktree` | `services/convertWorktreeService.ts` | `convert()` | 関数ラッパー |

#### Install ドメイン（12サービス）

| ContextServices プロパティ | 実装元モジュール | 実装関数/メソッド | 配線パターン |
|---|---|---|---|
| `installProjectChecker` | `services/projectChecker.ts` | `ProjectChecker` インスタンス | インスタンス生成 |
| `installCommandInstallerService` | `services/commandInstallerService.ts` | `CommandInstallerService` インスタンス | インスタンス生成 |
| `installUnifiedCommandsetInstaller` | `services/unifiedCommandsetInstaller.ts` | シングルトン | シングルトン参照 |
| `installExperimentalToolsInstaller` | `services/experimentalToolsInstallerService.ts` | シングルトン | シングルトン参照 |
| `installCommandsetVersionService` | `services/commandsetVersionService.ts` | シングルトン | シングルトン参照 |
| `installGetCliInstallStatus` | `services/cliInstallerService.ts` | `getCliInstallStatus()` | 関数ラッパー |
| `installInstallCliCommand` | `services/cliInstallerService.ts` | `installCliCommand()` | 関数ラッパー |
| `installGetManualInstallInstructions` | `services/cliInstallerService.ts` | `getManualInstallInstructions()` | 関数ラッパー |
| `installMigrationService` | `services/MigrationService.ts` or similar | `MigrationService` インスタンス | シングルトン参照 |
| `installCheckJjAvailability` | `services/toolPathResolverService.ts` | jjツールチェック | 関数ラッパー |
| `installInstallJj` | `services/jjInstaller.ts` or similar | jjインストール | 関数ラッパー |
| `installIgnoreJjInstall` | `services/layoutConfigService.ts` | jj ignore flag | 関数ラッパー |

#### Schedule ドメイン（1サービス）

| ContextServices プロパティ | 実装元モジュール | 実装関数/メソッド | 配線パターン |
|---|---|---|---|
| `reportIdleTime` | `services/idleTimeTracker.ts` | `setLastActivityTime()` | シングルトン参照 |

#### Misc ドメイン（22サービス）

| ContextServices プロパティ | 実装元モジュール | 配線パターン |
|---|---|---|
| `openInVscode` | `child_process.exec('code ...')` | 関数ラッパー |
| `copyToClipboard` | `electron.clipboard.writeText()` | Electron APIラッパー |
| `logRenderer` | `services/projectLogger.ts` | シングルトン参照 |
| `recordHumanSession` | `services/metricsService.ts` | シングルトン参照 |
| `getSpecMetrics` | `services/metricsService.ts` | シングルトン参照 |
| `getProjectMetrics` | `services/metricsService.ts` | シングルトン参照 |
| `getProjectLogPath` | `services/projectLogger.ts` | シングルトン参照 |
| `openLogInBrowser` | `electron.shell.openPath()` | Electron APIラッパー |
| `addShellPermissions` | `services/permissionsService.ts` | シングルトン参照 |
| `addMissingPermissions` | `services/permissionsService.ts` | シングルトン参照 |
| `checkRequiredPermissions` | `services/permissionsService.ts` | シングルトン参照 |
| `startRemoteServer` | `services/remoteAccessSetup.ts` | シングルトン参照 |
| `stopRemoteServer` | `services/remoteAccessSetup.ts` | シングルトン参照 |
| `getRemoteServerStatus` | `services/remoteAccessSetup.ts` | シングルトン参照 |
| `refreshAccessToken` | `services/accessTokenService.ts` | シングルトン参照 |
| `sshConnect` | `services/ssh/sshConnectionService.ts` | シングルトン参照 |
| `sshDisconnect` | `services/ssh/sshConnectionService.ts` | シングルトン参照 |
| `sshGetStatus` | `services/ssh/sshConnectionService.ts` | シングルトン参照 |
| `sshGetConnectionInfo` | `services/ssh/sshConnectionService.ts` | シングルトン参照 |
| `sshGetRecentRemoteProjects` | `services/configStore.ts` or SSH service | シングルトン参照 |
| `sshAddRecentRemoteProject` | `services/configStore.ts` or SSH service | シングルトン参照 |
| `sshRemoveRecentRemoteProject` | `services/configStore.ts` or SSH service | シングルトン参照 |

- **Implications**: 全66サービスの実装が既存コードベースに存在することを確認。新規ビジネスロジックの実装は不要。配線パターンは3種類（シングルトン参照、インスタンス生成、関数ラッパー）に分類できる。

### 配線パターンの分類

- **Context**: 66サービスの配線をどのパターンで実装するかの整理
- **Findings**:

| パターン | 説明 | 例 | 該当数（概算） |
|---------|------|-----|-----------|
| **シングルトン参照** | `getXxxService()` で取得したシングルトンのメソッドを直接参照 | `configStore: getConfigStore()` | ~30 |
| **関数ラッパー** | 既存関数をクロージャでラップし `ContextServices` のシグネチャに合わせる | `listProjectFiles: (p) => listProjectFilesCore(p)` | ~25 |
| **Electron APIラッパー** | Electron APIを薄くラップ | `copyToClipboard: (text) => clipboard.writeText(text)` | ~5 |
| **インスタンス生成** | `new XxxService()` でステートレスインスタンスを生成 | `installProjectChecker: new ProjectChecker()` | ~6 |

### createNewWindow の循環依存リスク

- **Context**: `createNewWindow` は `main/index.ts` の `createWindow()` 関数を参照する必要があるが、`productionServices.ts` が `index.ts` をimportすると循環依存が発生する可能性がある
- **Findings**:
  - `index.ts` → `handler.ts` → `productionServices.ts` → `index.ts` の循環が形成される
  - 解決策: `createProductionServices()` にファクトリ引数を追加するか、遅延import（`await import('./index.ts')`）を使用
  - 代替案: `BrowserWindow` を直接生成する関数を `productionServices.ts` 内に定義（`createWindow` の実装をコピーせず、最低限のウィンドウ作成に限定）
- **Implications**: 実装時に循環依存の有無を確認し、必要に応じてファクトリ引数パターンまたは遅延importを採用する

### 配線完全性テストの設計検討

- **Context**: `ContextServices` のキーリストをランタイムで取得する方法
- **Findings**:
  - TypeScriptのinterface型情報はランタイムに消える
  - `createMockServices()` は全プロパティを網羅しており、その `Object.keys()` を正解リストとして使用できる
  - `createProductionServices()` の `Object.keys()` と比較することで、差分（未配線サービス）を検出
  - `Set` の差分演算で欠落キーを明示的にリストアップ可能
- **Implications**: テストコードは `createMockServices()` のキーセットを信頼の基盤とする。`createMockServices()` に新プロパティが追加されたが `productionServices.ts` に配線されていない場合、テストが自動的に失敗する

## Risks & Mitigations

- **Risk 1: 循環依存（createNewWindow）** -- `productionServices.ts` が `index.ts` をimportすると `index.ts` → `handler.ts` → `productionServices.ts` の循環が発生する可能性。Mitigation: 遅延importまたはファクトリ引数パターンで解決
- **Risk 2: サービス初期化タイミング** -- 一部サービス（bugWorkflowService等）はプロジェクト選択後に初期化される。`createProductionServices()` はアプリ起動時に呼ばれるため、未初期化のサービスを参照する可能性。Mitigation: 遅延評価クロージャパターン（DD-004）で対応
- **Risk 3: 型キャストの使用** -- Phase 2で `as unknown as ContextServices['xxx']` パターンが使用されている。66サービスでも同様のキャストが必要な場合がある。Mitigation: ContextServicesのインターフェース型がルーズ（`Record<string, unknown>` 使用箇所あり）なため、型安全性は限定的だが、ランタイム動作には影響しない

## References

- インシデントレポート: `docs/incidents/2026-02-07-trpc-full-migration-startup-failure.md`
- 既存配線パターン: `src/main/trpc/productionServices.ts` (Phase 2)
- ContextServices型定義: `src/main/trpc/context.ts`
- テストヘルパー: `src/main/trpc/helpers/test-helpers.ts`
