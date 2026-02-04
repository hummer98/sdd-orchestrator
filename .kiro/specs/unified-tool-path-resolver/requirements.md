# Requirements: 外部ツールパス解決の統合

## Decision Log

### サービス統合方針
- **Discussion**: 現状、`claude`は`ClaudePathResolverService`で専用実装、`jj`/`jq`は`ProjectChecker`内の個別メソッドで実装されている。検出ロジックが異なり、`jj`/`jq`はログインシェルを使用しないためGUIアプリ起動時にPATHが不十分で検出失敗する問題がある。
- **Conclusion**: `ToolPathResolverService`として統一サービスに統合
- **Rationale**: 同じ問題（GUIアプリのPATH制限）を同じ方法で解決すべき。DRY原則に従い重複コードを排除。

### 既存コードの扱い
- **Discussion**: `ClaudePathResolverService`を残すか削除するか
- **Conclusion**: 完全削除。古いロジック（`ProjectChecker.checkJj/JqAvailability`も含む）は全て削除
- **Rationale**: 後方互換ラッパーは技術的負債になる。呼び出し元を新サービスに移行する方が長期的に健全。

### キャッシュ戦略
- **Discussion**: ツールごとに個別キャッシュか、統一キャッシュか
- **Conclusion**: セッション単位での統一キャッシュ
- **Rationale**: 外部ツールのパスはセッション中に変わらない。複数箇所からの呼び出しでパフォーマンス向上。実装もシンプル。

### 初期化タイミング
- **Discussion**: 起動時一括解決 vs lazy解決
- **Conclusion**: 起動時に全ツールを並列で一括解決
- **Rationale**: UI表示の即時性確保、lazy解決だと初回アクセス時にUIブロックの可能性あり。

### ツール定義の管理方法
- **Discussion**: 設定ファイル外部化 vs コード内定数
- **Conclusion**: コード内の定数配列で管理
- **Rationale**: 開発効率優先。ツール追加頻度は低く、型安全性も確保できる。

### 必須/オプションの区別
- **Discussion**: サービス層で管理 vs UIレイヤーで判断
- **Conclusion**: サービス層に含める
- **Rationale**: 単一責任。複数UIで同じ判定ロジックを使える一貫性。

## Introduction

macOSでElectronアプリをGUIから起動した場合、`process.env.PATH`には限定的なパス（`/usr/local/bin:/usr/bin:/bin`等）しか含まれず、Homebrewでインストールされたツール（`/opt/homebrew/bin`）が見つからない問題がある。現在`claude`コマンドは専用サービスでログインシェル経由の解決を行っているが、`jj`/`jq`は単純な`exec`で検出しており同じ問題が発生している。本機能は外部ツールのパス解決ロジックを統一サービスに統合し、全ツールで一貫した検出を実現する。

## Requirements

### Requirement 1: 統一サービスの提供

**Objective:** 開発者として、外部ツールのパス解決を単一のサービスで行いたい。コードの重複を排除し保守性を向上させるため。

#### Acceptance Criteria
1.1. `ToolPathResolverService`クラスが存在し、複数ツールのパス解決を提供すること
1.2. 対象ツールとして`claude`, `jj`, `jq`をサポートすること
1.3. 将来のツール追加が容易な設計（定数配列へのエントリ追加のみ）であること

### Requirement 2: ログインシェル経由のパス解決

**Objective:** ユーザーとして、Homebrewでインストールしたツールが正しく検出されてほしい。GUIアプリ起動時のPATH制限を回避するため。

#### Acceptance Criteria
2.1. `$SHELL -il -c 'which {tool}'`形式でユーザーのログインシェル経由でパスを解決すること
2.2. `.zshrc`や`.zprofile`で設定されたPATHが反映されること
2.3. シェルが未設定の場合は`/bin/sh`にフォールバックすること
2.4. コマンド実行のタイムアウトを5秒に設定すること

### Requirement 3: セッションキャッシュ

**Objective:** 開発者として、同じツールの検出を繰り返し実行したくない。パフォーマンスを向上させるため。

#### Acceptance Criteria
3.1. 一度解決したツールのパスはセッション終了までキャッシュすること
3.2. キャッシュされた結果は`getPath(toolName)`で即座に取得できること
3.3. 解決状態（成功/失敗）もキャッシュに含めること

### Requirement 4: 起動時一括解決

**Objective:** ユーザーとして、アプリ起動後すぐにツールの状態を確認したい。UI表示の遅延を防ぐため。

#### Acceptance Criteria
4.1. アプリ起動時に全登録ツールのパス解決を実行すること
4.2. 複数ツールの解決は並列で実行すること
4.3. 一括解決完了後にイベントまたはPromiseで通知すること

### Requirement 5: ツール定義の管理

**Objective:** 開発者として、新しいツールの追加を簡単に行いたい。拡張性を確保するため。

#### Acceptance Criteria
5.1. ツール定義は定数オブジェクト（`TOOL_DEFINITIONS`等）で管理すること
5.2. 各ツール定義に以下の情報を含むこと:
  - `name`: ツール名
  - `required`: 必須フラグ（true/false）
  - `versionCommand`: バージョン取得コマンド引数（例: `--version`）
  - `installGuidance`: インストール手順の説明
5.3. 新ツール追加時は定数へのエントリ追加のみで対応できること

### Requirement 6: 解決結果のインターフェース

**Objective:** 開発者として、ツール解決結果を統一的なインターフェースで受け取りたい。呼び出し元のコードを簡潔に保つため。

#### Acceptance Criteria
6.1. 解決結果は以下の情報を含むこと:
  - `resolved`: 解決成功フラグ
  - `path`: フルパス（成功時のみ）
  - `version`: バージョン情報（取得成功時のみ）
  - `error`: エラーメッセージ（失敗時のみ）
6.2. ツール定義情報（`required`, `installGuidance`）も取得可能であること

### Requirement 7: 既存コードの削除

**Objective:** 開発者として、重複したコードを排除したい。技術的負債を防ぐため。

#### Acceptance Criteria
7.1. `ClaudePathResolverService`クラスを完全に削除すること
7.2. `ProjectChecker.checkJjAvailability()`メソッドを削除すること
7.3. `ProjectChecker.checkJqAvailability()`メソッドを削除すること
7.4. 上記の呼び出し元を全て新サービスに移行すること

### Requirement 8: E2Eテストサポート

**Objective:** 開発者として、E2Eテスト時にモックパスを使用したい。テストの独立性を確保するため。

#### Acceptance Criteria
8.1. 環境変数`E2E_MOCK_{TOOL}_COMMAND`が設定されている場合、その値を優先して返すこと
8.2. 例: `E2E_MOCK_CLAUDE_COMMAND`が設定されていれば、`claude`の解決結果としてその値を使用すること

## Out of Scope

- リモートマシン上のツール検出（SSH経由）
- ツールの自動インストール機能
- バージョン互換性チェック
- Windows/Linux固有のパス解決（現状macOS向け）

## Open Questions

- 将来的にWindowsサポートが必要になった場合、ログインシェル相当の仕組みをどうするか（設計フェーズで検討）
