# Requirements: 起動時プロジェクト選択のレースコンディション修正

## Decision Log

### アーキテクチャ変更: tRPC 全面移行の影響
- **議論**: 当初は旧 IPC（`channels.ts`, `projectHandlers.ts`, `handlers.ts`, preload `electronAPI`）ベースで計画していたが、tRPC 全面移行が完了し、これらのファイルは全て削除済み。現在の通信は tRPC Router（Query/Mutation）+ EventBus（Subscription）で統一されている。
- **結論**: 修正対象を tRPC アーキテクチャに合わせて再設計
- **根拠**: 旧 IPC 構造は存在しないため、現行アーキテクチャに沿った修正が必須

### Push → Pull モデルの選択
- **議論**: 3つの選択肢を検討：(A) tRPC query のみ（Pull）、(B) Subscription + Query 併用、(C) Subscription のタイミング修正（delay）
- **結論**: (A) tRPC query のみの Pull モデルを採用
- **根拠**: レースコンディションの根本原因は「Renderer 準備前の emit」であり、Renderer が自発的に取得する Pull モデルが構造的に安全。Subscription は不要な複雑性を追加する。delay は脆弱な回避策

### onProjectSelected Subscription の扱い
- **議論**: 起動時ブロードキャスト用の `onProjectSelected` Subscription を残すか削除するか
- **結論**: 削除する（起動時初期化専用の Subscription は不要）
- **根拠**: Pull モデルに完全移行するため、起動時の `eventBus.emit(PROJECT_SELECTED)` 自体が不要になる。menu 経由のプロジェクト選択は `onMenuOpenProject` Subscription で別途処理されており影響なし

### キャッシュ基盤の再利用
- **議論**: `projectSetup.ts` の `setInitialSelectResult`/`getInitialSelectResult`/`clearInitialSelectResult` を再利用するか新設するか
- **結論**: 既存のキャッシュ基盤をそのまま再利用
- **根拠**: DRY 原則。Main process 側のキャッシュ管理ロジックは変更不要で、アクセス方法（EventBus emit → tRPC query）のみ変更する

## Introduction

起動時に `SDD_PROJECT_PATH` 環境変数でプロジェクトを自動選択する機能にレースコンディションがある。Main process が `ready-to-show` イベントで EventBus 経由で `PROJECT_SELECTED` を emit するが、Renderer の tRPC Subscription がまだ確立されておらず、イベントが消失する。Pull モデル（tRPC query）に変更することで、Renderer がマウント完了後に自発的にキャッシュ済み結果を取得し、レースコンディションを根本解消する。

## Requirements

### Requirement 1: tRPC Query による Pull API

**Objective:** 開発者として、Renderer がマウント完了後に起動時プロジェクト選択結果を取得できるように、tRPC query エンドポイントを追加したい。

#### Acceptance Criteria
1.1. `project` router に `getInitialSelectResult` query を追加する。戻り値は `SelectProjectResult | null` とする。

1.2. `getInitialSelectResult` query は `projectSetup.ts` の `getInitialSelectResult()` を呼び出し、結果が存在する場合はキャッシュを `clearInitialSelectResult()` でクリアした上で返却する。

1.3. キャッシュが `null` の場合（`SDD_PROJECT_PATH` 未設定、または既に取得済み）、query は `null` を返す。

1.4. `ContextServices` インターフェース（`context.ts`）に `getInitialSelectResult` と `clearInitialSelectResult` を追加する。

1.5. `context.ts` の `createDefaultServices` に `getInitialSelectResult` と `clearInitialSelectResult` のデフォルト実装を追加する。

### Requirement 2: Renderer 側の Pull 実装

**Objective:** ユーザーとして、`SDD_PROJECT_PATH` で指定したプロジェクトが起動時に確実に選択されるようにしたい。

#### Acceptance Criteria
2.1. `App.tsx` で、コンポーネントマウント完了後に `vanillaClient.project.getInitialSelectResult.query()` を呼び出す `useEffect` を実装する。

2.2. query の結果が `null` でない場合、`applySelectProjectResult(result)` を呼び出してストアに適用する。

2.3. Pull は起動時に1回のみ実行する（`useRef` で重複呼び出しを防止）。

2.4. Pull 処理中にエラーが発生した場合、`console.error` でログ出力し、アプリケーションのクラッシュを防ぐ。

### Requirement 3: Push モデルの除去

**Objective:** 開発者として、不要になった Push 方式のコードを削除し、コードベースを簡潔に保ちたい。

#### Acceptance Criteria
3.1. `main/index.ts` の `broadcastInitialProjectSelection` 関数を削除する。

3.2. `main/index.ts` の `ready-to-show` ハンドラーから `broadcastInitialProjectSelection` 呼び出しを削除する。

3.3. `main/index.ts` の import から `getInitialSelectResult`, `clearInitialSelectResult` を削除する（query ハンドラーから直接使用するため、index.ts では不要）。

3.4. `events.ts` の `onProjectSelected` Subscription 定義を削除する。

3.5. `eventBus.ts` の `EVENT_NAMES.PROJECT_SELECTED` 定数を削除する。

3.6. `App.tsx` の `trpc.events.onProjectSelected.useSubscription()` フックを削除する。

### Requirement 4: DI 基盤の拡張

**Objective:** 開発者として、tRPC Context の DI パターンに沿って、テスト可能な形で Pull API を提供したい。

#### Acceptance Criteria
4.1. ~~`ContextServices` への getter/clearer 追加~~ → Requirement 1.4 参照（同一内容のため統合）

4.2. ~~`createDefaultServices` のデフォルト実装~~ → Requirement 1.5 参照（同一内容のため統合）

4.3. tRPC handler setup（`handler.ts` の `createContextFactory`）で、`projectSetup.ts` の `getInitialSelectResult`/`clearInitialSelectResult` を注入する。

### Requirement 5: テスト

**Objective:** 開発者として、Pull モデルの動作を単体テストで検証できるようにしたい。

#### Acceptance Criteria
5.1. `project` router の `getInitialSelectResult` query のテストを追加する。キャッシュ有り・無しの2パターンを検証する。

5.2. キャッシュ有りの場合、1回目の呼び出しで結果を返し、キャッシュがクリアされることを検証する。

5.3. `main/index.test.ts` の `broadcastInitialProjectSelection` テストブロックを削除する。

5.4. `events-router.test.ts` の `onProjectSelected` テストを削除する。

## Out of Scope

- マルチウィンドウ対応（現状は単一ウィンドウのみ）
- Remote UI への初期プロジェクト選択通知（Remote UI は別経路で処理）
- `SDD_PROJECT_PATH` 以外のプロジェクト選択方法の変更
- tRPC Subscription の汎用的な初期化順序保証（本件は起動時初期化の1点修正のみ）

## Open Questions

- ~~E2E テスト（`diagnostic-project-selection.e2e.spec.ts`）の更新が必要か確認（Pull 動作の検証方法）~~ → **解決済み**: Design UJ-001/UJ-002 の分析により、既存 E2E テスト（`SDD_PROJECT_PATH` 付き起動）は Pull モデルでもそのまま動作する。E2E テストの更新は不要。
- ~~`onProjectSelected` Subscription を削除した場合、他の箇所（Remote UI、マルチウィンドウ等）で使用されていないか最終確認が必要~~ → **解決済み**: ソースコード grep により、`onProjectSelected` の使用箇所は `events.ts`（Subscription定義）、`App.tsx`（useSubscription + コメント）、`events-router.test.ts`（テスト）のみ。全て本仕様の削除対象。Remote UI やマルチウィンドウでの使用はなし。
