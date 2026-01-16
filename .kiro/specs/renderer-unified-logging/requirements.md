# Requirements: Renderer Unified Logging

## Decision Log

### ログ収集スコープ
- **Discussion**: notify.*()のみ vs console.*フック vs 専用API vs 両方
- **Conclusion**: console.*グローバルフック + 専用API（rendererLogger）の両方を提供
- **Rationale**: グローバルフックで既存コード変更不要、専用APIで構造化ログも可能に

### ログの粒度
- **Discussion**: どの程度の詳細さが必要か（コンポーネント単位、スタックトレース、コンテキスト情報）
- **Conclusion**: コンポーネント/ファイル名（自動取得）、エラー時スタックトレース、specId/bugNameコンテキスト
- **Rationale**: E2Eテストデバッグに必要十分なレベル。過剰な詳細（全render追跡等）は不要

### 有効化タイミング
- **Discussion**: 常時有効 vs 開発時のみ vs オンデマンド
- **Conclusion**: 開発時 + E2Eテスト時に有効、本番環境では無効
- **Rationale**: E2Eテストデバッグがメインユースケース。本番でのパフォーマンス影響を回避

### E2Eテスト時のログ分離
- **Discussion**: Main/Rendererログを統合 vs 分離ファイル
- **Conclusion**: 統合（main-e2e.logにMain/Renderer両方出力）
- **Rationale**: Main/Renderer間の相互作用を時系列で追跡可能。[main]/[renderer]タグで区別可能

### フック方式
- **Discussion**: グローバルフック vs 選択的フック、フック設定場所（main.tsx vs preload）
- **Conclusion**: main.tsxでのグローバルフック + ノイズフィルタ
- **Rationale**: 既存コード変更不要、シンプル、ContextIsolationの複雑さ回避

### API設計
- **Discussion**: シンプルAPI vs コンポーネント指定 vs 自動推論 vs console互換
- **Conclusion**: console互換API + 自動ファイル名付与
- **Rationale**: import文変更のみで既存console.*呼び出しがそのまま動作、段階的移行可能

### 既存notify.*との関係
- **Discussion**: 統合 vs 共存
- **Conclusion**: rendererLoggerに統一、notifyは内部でrendererLoggerを使用
- **Rationale**: コード重複回避、ログ出力経路の一本化

## Introduction

Rendererプロセス（UIフロントエンド）のログをMainプロセスに統合し、AIアシスタントが解析可能な形式でファイル出力する機能。現在の`notify.*()` 経由のログに加え、`console.*`のグローバルフックと専用ロガーAPIを提供し、E2Eテストや開発時のデバッグを支援する。

## Requirements

### Requirement 1: グローバルconsoleフック

**Objective:** 開発者として、既存の`console.*`呼び出しを変更せずにRendererログをMainプロセスに送信したい。これにより、既存コードへの影響なくログ統合を実現できる。

#### Acceptance Criteria

1. When Rendererプロセスが起動した時、`console.log/warn/error/debug`がフックされ、Mainプロセスにログが送信される
2. When `console.error`が呼び出された時、スタックトレースが自動的に付与される
3. When 開発環境（`NODE_ENV=development`）またはE2Eテスト環境（`--e2e-test`フラグ）の時、フックが有効になる
4. If 本番環境の場合、フックは無効となりオリジナルの`console.*`がそのまま動作する
5. When ログが送信される時、呼び出し元のファイル名が自動的に付与される

### Requirement 2: ノイズフィルタリング

**Objective:** 開発者として、HMRやReact DevTools等の無関係なログを除外したい。これにより、アプリケーション固有のログに集中できる。

#### Acceptance Criteria

1. When `[HMR]`または`[vite]`を含むログが出力された時、Mainプロセスへの送信がスキップされる
2. When React DevTools関連のメッセージが出力された時、Mainプロセスへの送信がスキップされる
3. When `Download the React DevTools`メッセージが出力された時、Mainプロセスへの送信がスキップされる
4. If フィルタ対象のログの場合でも、オリジナルの`console.*`は正常に動作する（ブラウザコンソールには表示される）

### Requirement 3: 専用ロガーAPI（rendererLogger）

**Objective:** 開発者として、構造化されたログを明示的に出力したい。これにより、AIアシスタントが解析しやすい形式でログを記録できる。

#### Acceptance Criteria

1. When `rendererLogger.log/info/warn/error/debug`を呼び出した時、`console.*`と同じシグネチャで動作する
2. When `rendererLogger`をimportして使用した時、自動的にファイル名がログに付与される
3. When 追加のコンテキスト情報（オブジェクト）を渡した時、JSON形式でログに含まれる
4. If `import { rendererLogger as console } from '@/utils/rendererLogger'`とした場合、既存の`console.*`呼び出しがそのまま動作する

### Requirement 4: 自動コンテキスト付与

**Objective:** 開発者として、現在のアプリケーション状態（specId、bugName等）がログに自動付与されてほしい。これにより、ログ解析時に関連するSpec/Bugを特定しやすくなる。

#### Acceptance Criteria

1. When ログが出力された時、現在選択中の`specId`が自動的にコンテキストに含まれる（選択中の場合）
2. When ログが出力された時、現在選択中の`bugName`が自動的にコンテキストに含まれる（選択中の場合）
3. When Specもbugも選択されていない時、コンテキスト情報は空オブジェクトとなる

### Requirement 5: 既存notify.*の統合

**Objective:** 開発者として、notify.*とrendererLoggerのログ出力を一本化したい。これにより、コードの重複を避け、一貫したログ形式を維持できる。

#### Acceptance Criteria

1. When `notify.error/warning/info/success`が呼び出された時、内部で`rendererLogger`を使用してログが送信される
2. When `notify.showCompletionSummary`が呼び出された時、内部で`rendererLogger`を使用してログが送信される
3. If 既存の`logToMain`関数が存在する場合、`rendererLogger`に置き換えられる

### Requirement 6: ログフォーマットとファイル出力

**Objective:** AIアシスタントとして、Rendererログを既存のMainプロセスログと同じ形式で解析したい。これにより、統一的なログ解析が可能になる。

#### Acceptance Criteria

1. When Rendererログが出力された時、既存のログフォーマット`[timestamp] [LEVEL] [projectId] [renderer] message data`に従う
2. When E2Eテスト環境の時、ログは`main-e2e.log`に出力される
3. When 開発環境の時、ログは`main.log`（開発用）に出力される
4. When ファイル名情報が付与された時、`[renderer:ファイル名]`の形式でsourceフィールドに含まれる

### Requirement 7: IPC通信

**Objective:** システムとして、Renderer→Main間のログ送信を効率的に行いたい。これにより、UIパフォーマンスへの影響を最小化できる。

#### Acceptance Criteria

1. When ログが送信される時、既存の`LOG_RENDERER` IPCチャンネルを使用する
2. When ログが送信される時、fire-and-forget方式（応答を待たない）で送信される
3. If IPCが利用できない環境（テスト環境等）の場合、エラーなく処理がスキップされる

## Out of Scope

- 本番環境でのRendererログ収集
- ログのリアルタイムUI表示（既存のAgent Log表示とは別）
- Rendererログの独立したログファイル（main.logに統合）
- ログレベルの動的変更UI
- リモートへのログ送信
- Remote UIからの`console.*`収集（将来検討: ブラウザ環境でのログ収集が必要になった場合）

## Open Questions

- ~~フィルタパターンの設定を外部化するか（ハードコードで十分か）~~ → **Resolved**: DD-002にてハードコードに決定
- ~~ログのバッファリング/バッチ送信は必要か（現状fire-and-forgetで十分か）~~ → **Resolved**: DD-001にてfire-and-forgetに決定
