# Requirements: tRPC Infrastructure（基盤構築）

## Decision Log

### スコープ決定
- **Discussion**: Phase 0のみか、全フェーズかを検討
- **Conclusion**: 全フェーズ（Phase 0〜3）を一気に実行
- **Rationale**: 並行運用は危険。他の開発を停止して移行を完了させる

### Spec分割
- **Discussion**: 単一Specか複数Specか
- **Conclusion**: 2つのSpecに分割（infrastructure + full-migration）
- **Rationale**: 基盤構築と移行作業を分離してリスク管理。Service層は既に充実（79個）しているため、service-extraction Specは不要

### テスト戦略
- **Discussion**: E2Eテスト vs 統合テスト（Vitest + Mocking）
- **Conclusion**: 統合テスト主軸、E2Eは最小限、困難なものは人間にテスト依頼
- **Rationale**: E2Eは実行コスト高く、デバッグ困難。統合テストで十分な品質担保が可能

### 並行運用
- **Discussion**: 移行期間中の古いIPC/新しいtRPCの共存
- **Conclusion**: 並行運用しない
- **Rationale**: 他の開発を停止して移行に集中することで、状態の不整合リスクを排除

### ライブラリバージョン
- **Discussion**: electron-trpcのバージョン指定
- **Conclusion**: 最新安定版を使用
- **Rationale**: 特別な要件なし

## Introduction

本Specは、electron-sdd-managerにおけるtRPC基盤の構築を定義する。現状のIPC通信（preload.ts 2,771行、219チャンネル）の肥大化・複雑化を解消するため、electron-trpcを導入し、型安全かつ保守性の高いアーキテクチャへの移行準備を行う。

本Specの完了により、後続の`trpc-full-migration` Specで本格的なIPC移行が可能になる。

## Requirements

### Requirement 1: ライブラリ導入

**Objective:** 開発者として、tRPC関連ライブラリがプロジェクトに導入されていることで、型安全なIPC通信の実装を開始できる

#### Acceptance Criteria
1. `electron-trpc` がdevDependenciesにインストールされていること
2. `@trpc/server` がdependenciesにインストールされていること
3. `@trpc/client` がdependenciesにインストールされていること
4. `@trpc/react-query` がdependenciesにインストールされていること（React統合用）
5. `@tanstack/react-query` がdependenciesにインストールされていること（react-query依存）
6. `zod` が既存インストール済みであること（確認のみ）
7. `npm install` が正常に完了すること
8. TypeScriptコンパイルが成功すること

### Requirement 2: tRPC Router基盤

**Objective:** 開発者として、tRPC Routerの基盤構造が整備されていることで、ドメイン別のルーター追加が容易にできる

#### Acceptance Criteria
1. `src/main/trpc/trpc.ts` にtRPCインスタンス（`t`）とbase router/procedureが定義されていること
2. `src/main/trpc/router.ts` にRoot Routerが定義されていること
3. Root Routerは空のネームスペース構造を持ち、将来のドメイン別ルーター追加に対応できること
4. `src/main/trpc/context.ts` にContext型が定義されていること（初期は空でも可）
5. TypeScriptの型推論が正しく機能すること（Router型がexportされている）

### Requirement 3: tRPC Preload設定

**Objective:** Rendererプロセスから、tRPC APIを呼び出せるようにPreloadスクリプトが設定されている

#### Acceptance Criteria
1. `src/preload/trpc.ts` にtRPC専用のPreload設定が存在すること
2. electron-trpcの`exposeElectronTRPC`が正しく設定されていること
3. 既存の`src/preload/index.ts`の公開API（`window.electronAPI`）に機能的影響を与えないこと（import文追加のみ許容）
4. Vite設定でPreloadのビルドが正しく行われること

### Requirement 4: Renderer側tRPCクライアント

**Objective:** Rendererプロセスから、型安全にtRPC APIを呼び出せるクライアントが設定されている

#### Acceptance Criteria
1. `src/shared/trpc/client.ts` にtRPCクライアント設定が存在すること
2. electron-trpcの`createTRPCReact`を使用してReactフック統合が設定されていること
3. `src/shared/trpc/provider.tsx` にTRPCProviderコンポーネントが存在すること
4. QueryClientProviderとTRPCProviderが統合されていること
5. Electron版（renderer/App.tsx）でProviderがラップされていること
6. Remote UI版（remote-ui/App.tsx）でProviderがラップされていること

### Requirement 5: Vite設定の調整

**Objective:** tRPCのビルドが正しく行われるようVite設定が調整されている

#### Acceptance Criteria
1. `vite.config.ts`（Electron Renderer用）でtRPCモジュールの解決が正しく行われること
2. `vite.config.remote.ts`（Remote UI用）でtRPCモジュールの解決が正しく行われること
3. `vite.config.ts`のelectronプラグインpreloadエントリー設定でtRPC Preloadのビルドが正しく行われること
4. 開発モード（`npm run dev`）でHMRが正常に動作すること
5. 本番ビルド（`npm run build`）が成功すること

### Requirement 6: healthCheck API実装

**Objective:** 開発者として、tRPC基盤が正しく動作することを検証するためのhealthCheck APIが利用できる

#### Acceptance Criteria
1. `src/main/trpc/routers/system.ts` にsystem routerが存在すること
2. `system.healthCheck` procedureが実装されていること
3. healthCheckは以下の情報を返すこと:
   - `status`: "ok"
   - `timestamp`: ISO 8601形式の現在時刻
   - `version`: アプリバージョン（package.jsonから取得）
4. Zodスキーマで入出力が型定義されていること
5. Rendererから `trpc.system.healthCheck.useQuery()` で呼び出せること
6. Remote UIにおいて`trpc.system.healthCheck.useQuery()`の型レベルでの呼び出し構造が利用可能であること（ipcLink非動作のため実行時検証はスコープ外）

### Requirement 7: 統合テスト

**Objective:** tRPC基盤が正しく動作することを統合テストで検証できる

#### Acceptance Criteria
1. `src/main/trpc/__tests__/router.test.ts` に統合テストが存在すること
2. テストは実際のElectronプロセスを起動せずに実行できること（Vitest + Mocking）
3. healthCheck APIの動作が検証されていること
4. 型安全性が検証されていること（TypeScriptコンパイルで確認）
5. `npm run test` で全テストがpassすること

### Requirement 8: Main Process統合

**Objective:** Electron Main ProcessでtRPCサーバーが起動し、IPC経由でリクエストを受け付ける

#### Acceptance Criteria
1. `src/main/index.ts`（またはエントリーポイント）でtRPCハンドラが登録されていること
2. electron-trpcの`createIPCHandler`が正しく設定されていること
3. アプリ起動時にtRPCサーバーが自動的に有効化されること
4. 既存のIPCハンドラ（`registerIpcHandlers()`）と共存できること（移行完了まで）
5. エラーが発生した場合、適切にログ出力されること

## Out of Scope

- 既存IPCチャンネルのtRPC移行（`trpc-full-migration` Specで対応）
- Remote UI用WebSocket経由のtRPC通信（将来検討、本Specでは対象外）
- 認証・認可機能（現状のIPCと同様、不要）
- レート制限（デスクトップアプリのため不要）

## Open Questions

1. **Remote UIのtRPC対応**: 現在Remote UIはWebSocket経由でIPC-like通信を行っている。tRPC移行後もWebSocket経由を維持するか、将来的にtRPC over WebSocketを検討するか？
   - **暫定回答**: 本Specでは対象外。Remote UIは既存のWebSocket通信を維持し、`trpc-full-migration`完了後に別途検討

2. **エラーハンドリングの統一**: 既存の`safeHandle()`パターンをtRPCのエラーハンドリングとどう統合するか？
   - **暫定回答**: tRPCの標準エラーハンドリング（TRPCError）を使用。詳細は`trpc-full-migration`のdesignで検討

## Dependencies

- **前提条件**: なし（本Specが最初）
- **後続Spec**: `trpc-full-migration`（本Spec完了後に実行可能）

## References

- [元計画書](/docs/future-concepts/trpc-migration-plan.md)
- [electron-trpc公式ドキュメント](https://github.com/jsonnull/electron-trpc)
- [tRPC公式ドキュメント](https://trpc.io/docs)
