# Requirements: Well Known Tool Paths

## Decision Log

### パス解決アプローチの選択
- **Discussion**: 従来は `-il` フラグでインタラクティブシェルを起動し `.zshrc` を読み込んでいたが、VSCodeシェル統合のANSIエスケープシーケンス混入、macOSセッション保存メッセージなど多数の副作用が発生。パッチで対処を続けるのはモグラたたき状態。
- **Conclusion**: Well Knownパスを直接チェックする方式に変更
- **Rationale**: シェルを起動しないため副作用なし、高速、予測可能、デバッグ容易

### 設定スコープ
- **Discussion**: プロジェクトごと vs グローバル（アプリ全体）
- **Conclusion**: グローバル設定（`ConfigStore`を使用）
- **Rationale**: ツールのインストール場所はマシン固有であり、プロジェクト間で共通

### 対象ツール
- **Discussion**: claude のみ vs 全ツール
- **Conclusion**: claude, jj, jq すべてを対象
- **Rationale**: 統一的なアプローチで保守性向上

### フォールバック方式
- **Discussion**: エラー表示のみ vs 設定画面への誘導
- **Conclusion**: ツールが見つからない場合、設定画面を自動で開く
- **Rationale**: ユーザーが即座に対応可能。トースト通知は廃止。

## Introduction

外部ツール（claude, jj, jq）のパス解決を、シェル起動による副作用のあるアプローチから、Well Knownパスの直接チェック + 設定画面での手動指定に変更する。これにより、TTYエラー、セッション保存メッセージ、ANSIエスケープシーケンス混入などの問題を根本的に解消する。

## Requirements

### Requirement 1: Well Known パス探索

**Objective:** システムとして、ツールパスを副作用なく解決したい。これにより、シェル起動に起因する各種問題を回避できる。

#### Acceptance Criteria

1.1. システムは以下の順序でツールの存在をチェックすること:
   - `/opt/homebrew/bin/{tool}` (Homebrew Apple Silicon)
   - `/usr/local/bin/{tool}` (Homebrew Intel)
   - `$HOME/.local/bin/{tool}` (npm global等)
   - `/usr/bin/{tool}` (システム)

1.2. 最初に見つかったパスを使用すること

1.3. パス探索時にシェルを起動しないこと（`fs.existsSync` 等を使用）

1.4. 対象ツールは claude, jj, jq の3つであること

### Requirement 2: 設定画面でのパス指定

**Objective:** ユーザーとして、Well Knownパスにツールがない場合でも手動でパスを指定したい。これにより、カスタムインストール環境でもツールを使用できる。

#### Acceptance Criteria

2.1. グローバル設定（`ConfigStore`）にツールパス設定を追加すること:
   - `toolPaths.claude`: string | null
   - `toolPaths.jj`: string | null
   - `toolPaths.jq`: string | null

2.2. 設定画面（ToolSettingsPanel）を既存の設定UIに追加すること

2.3. 各ツールについて以下を表示すること:
   - ツール名
   - 現在のパス（自動検出 or 手動設定）
   - ステータス（見つかった/見つからない）
   - パス入力フィールド（手動設定用）

2.4. 手動設定されたパスはWell Known探索より優先すること

### Requirement 3: ツール未検出時の自動誘導

**Objective:** ユーザーとして、必須ツールが見つからない場合に即座に対応したい。これにより、問題解決までの時間を短縮できる。

#### Acceptance Criteria

3.1. 必須ツール（claude）が見つからない場合、設定画面を自動で開くこと

3.2. 設定画面では未検出ツールをハイライト表示すること

3.3. トースト通知は使用しないこと（廃止）

### Requirement 4: 既存コードのリファクタリング

**Objective:** 開発者として、新しいパス解決方式に統一したい。これにより、コードの保守性が向上する。

#### Acceptance Criteria

4.1. `ToolPathResolverService` を新しい方式に書き換えること

4.2. シェル起動による解決ロジック（`-il` フラグ使用部分）を削除すること

4.3. `SHELL_SESSIONS_DISABLE`, `TERM=dumb` などのワークアラウンドを削除すること

4.4. 既存の `getPath()`, `isResolved()` 等のAPIは維持すること（後方互換性）

## Out of Scope

- Windowsサポート（現在macOS専用）
- ツールの自動インストール機能
- バージョン要件のチェック
- Remote UI対応: 不要（ツールパス設定はグローバル設定であり、デスクトップ専用）

## Open Questions

- なし（設計フェーズで詳細化）
