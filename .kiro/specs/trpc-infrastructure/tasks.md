# Implementation Plan

## 1. tRPC関連パッケージのインストール
- [x] 1. tRPC通信基盤に必要なライブラリをプロジェクトに追加する
  - `@trpc/server`、`@trpc/client`、`@trpc/react-query`をdependenciesに追加
  - `@tanstack/react-query`をdependenciesに追加
  - `electron-trpc`をdevDependenciesに追加
  - zodが既にインストール済みであることを確認
  - `npm install`が正常に完了し、TypeScriptコンパイルが成功することを検証
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

## 2. tRPCインスタンスとRouter基盤の構築
- [x] 2.1 (P) tRPCインスタンスの初期化とContext型を定義する
  - tRPCインスタンス（`initTRPC.create()`）を生成し、`router`と`publicProcedure`をexportする
  - Context型を定義する（初期は空オブジェクト、将来の拡張に対応可能な構造）
  - _Requirements: 2.1, 2.4_
  - _Method: initTRPC.create, router, publicProcedure, Context_
  - _Verify: Grep "initTRPC.create|publicProcedure" in trpc.ts_

- [x] 2.2 healthCheck procedureを持つsystem routerを実装する
  - system routerを作成し、`healthCheck` query procedureを定義する
  - Zodスキーマで出力型（status, timestamp, version）を定義する
  - package.jsonからアプリバージョンを取得して応答に含める
  - 2.1のtRPCインスタンスに依存
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Method: publicProcedure.query, z.object, healthCheckOutputSchema_
  - _Verify: Grep "healthCheck|healthCheckOutputSchema" in system.ts_

- [x] 2.3 Root Routerを定義し、AppRouter型をexportする
  - 空のネームスペース構造を持つRoot Routerを定義する
  - system routerをネームスペースに統合する
  - `AppRouter`型、`RouterInputs`型、`RouterOutputs`型をexportする
  - 2.1のtRPCインスタンスと2.2のsystem routerに依存
  - _Requirements: 2.2, 2.3, 2.5_
  - _Method: router, mergeRouters, AppRouter, inferRouterInputs, inferRouterOutputs_
  - _Verify: Grep "AppRouter|appRouter" in router.ts_

## 3. Preload設定とViteビルド構成
- [x] 3.1 tRPC専用のPreloadモジュールを作成する
  - `exposeElectronTRPC()`を`process.once('loaded')`内で呼び出すモジュールを作成する
  - 既存のPreloadスクリプトから分離モジュールとしてimportする形式とする
  - _Requirements: 3.1, 3.2_
  - _Method: exposeElectronTRPC, process.once('loaded')_
  - _Verify: Grep "exposeElectronTRPC" in preload/trpc.ts_

- [x] 3.2 既存Preloadスクリプトにtモジュールのimportを追加する
  - `preload/index.ts`にtRPCモジュールのimport文を1行追加する
  - 既存のcontextBridge APIや`window.electronAPI`の動作に影響しないことを確認する
  - _Requirements: 3.3_

- [x] 3.3 Vite設定でtRPC Preloadのビルドが正しく行われるよう調整する
  - Electron Renderer用のVite設定でtRPCモジュールの解決を正しく行う
  - Remote UI用のVite設定でtRPCモジュールの解決を正しく行う
  - Preloadのビルドエントリーが正しく設定されていることを確認する
  - _Requirements: 3.4, 5.1, 5.2, 5.3_

## 4. Renderer側tRPCクライアントとProvider構築
- [x] 4.1 (P) tRPCクライアントとReact Hooks統合を設定する
  - `createTRPCReact<AppRouter>()`でReact Hooks用のtRPCインスタンスを生成する
  - AppRouter型をimport type経由で参照する
  - _Requirements: 4.1, 4.2_
  - _Method: createTRPCReact, ipcLink, AppRouter_
  - _Verify: Grep "createTRPCReact|ipcLink" in client.ts_

- [x] 4.2 TRPCProviderコンポーネントを作成する
  - tRPC ProviderとQueryClientProviderを統合したラッパーコンポーネントを作成する
  - QueryClientとtRPCクライアントのインスタンスを遅延初期化する
  - 4.1のtRPCクライアントに依存
  - _Requirements: 4.3, 4.4_
  - _Method: trpc.Provider, QueryClientProvider, QueryClient_
  - _Verify: Grep "TRPCProvider|QueryClientProvider" in provider.tsx_

## 5. アプリケーション統合
- [x] 5.1 Main ProcessにtRPCハンドラを登録する
  - `createWindow()`内でBrowserWindow作成後に`createIPCHandler`を呼び出す
  - 既存の`registerIpcHandlers()`と共存する形で配置する
  - エラー発生時にprojectLoggerでログ出力する
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - _Method: createIPCHandler, appRouter, projectLogger_
  - _Verify: Grep "createIPCHandler|appRouter" in index.ts_

- [x] 5.2 Electron版App.tsxにTRPCProviderを統合する
  - 既存のProviderチェーンにTRPCProviderを追加してコンポーネントツリーをラップする
  - 既存のUIや状態管理に影響を与えないことを確認する
  - _Requirements: 4.5_

- [x] 5.3 Remote UI版App.tsxにTRPCProviderを統合する
  - 既存のProviderチェーンにTRPCProviderを追加してコンポーネントツリーをラップする
  - ipcLinkがRemote UI環境では動作しないことに留意（構造のみの統合）
  - ipcLink初期化がRemote UI環境でエラーを発生させないことを確認。エラーが発生する場合はtry-catchまたは条件分岐で対応する
  - _Requirements: 4.6_

## 6. 統合テストの実装
- [x] 6.1 tRPC Router統合テストを実装する
  - tRPCのcallerパターンでhealthCheck procedureを直接呼び出すテストを作成する
  - status、timestamp（ISO 8601形式）、versionの正確性を検証する
  - TypeScriptコンパイルによる型安全性を確認する
  - Electronプロセスを起動せずにVitestで実行可能であることを確認する
  - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - _Method: createCallerFactory, caller.system.healthCheck_
  - _Verify: Grep "createCallerFactory|healthCheck" in router.test.ts_

- [x] 6.2 全テストの実行と本番ビルドの検証を行う
  - `npm run test`で全テストがpassすることを確認する
  - 開発モードでHMRが正常に動作することを確認する
  - `npm run build`で本番ビルドが成功することを確認する
  - アプリ起動後、devtoolsのConsoleでtRPC関連エラーが出力されないことを確認（手動スモークテスト）
  - _Requirements: 5.4, 5.5, 7.5_

## 7. Renderer/Remote UIからのhealthCheck呼び出し確認
- [x] 7. RendererおよびRemote UIからhealthCheck APIを呼び出せることを確認する
  - Renderer側で`trpc.system.healthCheck.useQuery()`が型安全に呼び出せることを確認する
  - Remote UI側で同様の呼び出し構造が利用可能であることを確認する（ipcLinkの制約により実行時の動作確認はスコープ外）
  - 検証方法: TypeScriptコンパイル成功（`npm run typecheck`）でtrpc hooks呼び出しの型安全性を確認、ビルド成功（`npm run build`）でProvider統合の構造的正しさを確認
  - _Requirements: 6.5, 6.6_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | electron-trpc devDependencies | 1 | Infrastructure |
| 1.2 | @trpc/server dependencies | 1 | Infrastructure |
| 1.3 | @trpc/client dependencies | 1 | Infrastructure |
| 1.4 | @trpc/react-query dependencies | 1 | Infrastructure |
| 1.5 | @tanstack/react-query dependencies | 1 | Infrastructure |
| 1.6 | zod 既存確認 | 1 | Infrastructure |
| 1.7 | npm install 正常完了 | 1 | Infrastructure |
| 1.8 | TypeScriptコンパイル成功 | 1 | Infrastructure |
| 2.1 | tRPCインスタンス定義 | 2.1 | Infrastructure |
| 2.2 | Root Router定義 | 2.3 | Infrastructure |
| 2.3 | 空ネームスペース構造 | 2.3 | Infrastructure |
| 2.4 | Context型定義 | 2.1 | Infrastructure |
| 2.5 | Router型のexport | 2.3 | Infrastructure |
| 3.1 | tRPC Preload設定 | 3.1 | Infrastructure |
| 3.2 | exposeElectronTRPC設定 | 3.1 | Infrastructure |
| 3.3 | 既存preloadへの非影響 | 3.2 | Integration |
| 3.4 | Vite Preloadビルド | 3.3 | Infrastructure |
| 4.1 | tRPCクライアント設定 | 4.1 | Infrastructure |
| 4.2 | createTRPCReact設定 | 4.1 | Infrastructure |
| 4.3 | TRPCProvider | 4.2 | Infrastructure |
| 4.4 | QueryClientProvider統合 | 4.2 | Infrastructure |
| 4.5 | Electron版Provider統合 | 5.2 | Integration |
| 4.6 | Remote UI版Provider統合 | 5.3 | Integration |
| 5.1 | Electron Renderer Vite設定 | 3.3 | Infrastructure |
| 5.2 | Remote UI Vite設定 | 3.3 | Infrastructure |
| 5.3 | Preload Vite設定 | 3.3 | Infrastructure |
| 5.4 | HMR動作確認 | 6.2 | Feature |
| 5.5 | 本番ビルド成功 | 6.2 | Feature |
| 6.1 | system router作成 | 2.2 | Feature |
| 6.2 | healthCheck procedure | 2.2 | Feature |
| 6.3 | healthCheck応答内容 | 2.2 | Feature |
| 6.4 | Zod入出力スキーマ | 2.2 | Feature |
| 6.5 | Renderer useQuery呼び出し | 7 | Feature |
| 6.6 | Remote UI呼び出し | 7 | Feature |
| 7.1 | 統合テスト存在 | 6.1 | Integration Test |
| 7.2 | Electronプロセス不要 | 6.1 | Integration Test |
| 7.3 | healthCheck動作検証 | 6.1 | Integration Test |
| 7.4 | 型安全性検証 | 6.1 | Integration Test |
| 7.5 | テスト全pass | 6.2 | Integration Test |
| 8.1 | tRPCハンドラ登録 | 5.1 | Integration |
| 8.2 | createIPCHandler設定 | 5.1 | Integration |
| 8.3 | アプリ起動時自動有効化 | 5.1 | Integration |
| 8.4 | 既存IPCとの共存 | 5.1 | Integration |
| 8.5 | エラーログ出力 | 5.1 | Integration |
