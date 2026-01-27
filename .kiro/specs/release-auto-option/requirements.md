# Requirements: Release Auto Option

## Decision Log

### バージョン番号の自動決定方式
- **Discussion**: patch固定、コミット解析から自動判定、プレリリース形式の3案を検討
- **Conclusion**: コミット解析から自動判定
- **Rationale**: Semantic Versioning に準拠し、feat:→minor, fix:→patch, BREAKING CHANGE:→major をコミットログから自動判定することで、適切なバージョン付けが可能

### steering-release.md の対象
- **Discussion**: 新規 steering-release.md の作成か、既存 generate-release.md の更新かを検討
- **Conclusion**: generate-release.md を更新
- **Rationale**: generate-release.md がリリースコマンドを生成する責務を持っており、生成される release.md に --auto オプションの説明を含めることで一貫性を保つ

### 未コミット変更の扱い
- **Discussion**: 警告スキップ、自動コミット、ホワイトリスト方式の3案を検討
- **Conclusion**: 警告をスキップして続行
- **Rationale**: リリース作業時に markdown, spec.json 等のドキュメント変更が残っていることは一般的。これらをブロッカーとしないことで自動リリースの実用性を確保

## Introduction

release.md コマンドに `--auto` オプションを追加し、UI のリリースボタンから完全自動でリリースを実行可能にする機能。未コミットのドキュメント変更を無視し、バージョン番号をコミットログから自動判定することで、ユーザー対話なしにリリースを完了できる。

## Requirements

### Requirement 1: --auto オプションの基本動作

**Objective:** As a 開発者, I want リリースコマンドに --auto オプションを指定して実行できる, so that ユーザー対話なしでリリースを完了できる

#### Acceptance Criteria
1. When `/release --auto` が実行された場合、the system shall ユーザーへの確認プロンプトをスキップしてリリース処理を続行する
2. When `--auto` オプションが指定されていない場合、then the system shall 従来通りユーザーに確認を求める
3. The system shall release.md 内に --auto オプションの使用方法と動作仕様を記載する

### Requirement 2: 未コミット変更の自動スキップ

**Objective:** As a 開発者, I want リリース作業用ファイルの未コミット変更を無視してリリースを続行できる, so that ドキュメント編集中でもリリースがブロックされない

#### Acceptance Criteria
1. When `--auto` オプションで実行され、未コミット変更が markdown (.md), JSON (.json), spec.json のみの場合、the system shall 警告をスキップしてリリース処理を続行する
2. When `--auto` オプションで実行され、ソースコード (.ts, .tsx, .js 等) の未コミット変更がある場合、the system shall エラーを報告してリリースを中止する
3. If `--auto` でスキップされた変更がある場合、then the system shall スキップしたファイルのリストをログに出力する

### Requirement 3: バージョン番号の自動判定

**Objective:** As a 開発者, I want バージョン番号をコミットログから自動判定してほしい, so that バージョン決定のためのユーザー入力が不要になる

#### Acceptance Criteria
1. When `--auto` オプションで実行された場合、the system shall 前回のタグから現在までのコミットメッセージを解析する
2. If コミットメッセージに `BREAKING CHANGE:` が含まれる場合、then the system shall major バージョンをインクリメントする
3. If コミットメッセージに `feat:` プレフィックスが含まれる場合、then the system shall minor バージョンをインクリメントする
4. If コミットメッセージが `fix:`, `docs:`, `chore:` 等のみの場合、then the system shall patch バージョンをインクリメントする
5. The system shall 決定されたバージョン番号をログに出力する

### Requirement 4: UI リリースボタンの --auto 統合

**Objective:** As a ユーザー, I want UI のリリースボタンをクリックしたら自動でリリースが実行される, so that 対話的なやり取りなしにリリースできる

#### Acceptance Criteria
1. When UI のリリースボタンがクリックされた場合、the system shall `/release --auto` コマンドを実行する
2. The system shall 従来の `/release` と同じ成功/エラー通知を表示する

### Requirement 5: generate-release.md テンプレートの更新

**Objective:** As a プロジェクト管理者, I want generate-release.md で生成される release.md に --auto オプションの説明が含まれる, so that 新規プロジェクトでも --auto オプションを使用できる

#### Acceptance Criteria
1. When `/kiro:generate-release` が実行された場合、the system shall 生成される release.md に --auto オプションのセクションを含める
2. The system shall --auto オプションの動作仕様（変更スキップ、バージョン自動判定）を記載する
3. The system shall コマンドセットインストール用テンプレートも同様に更新する

## Out of Scope

- Windows/Linux 向けのビルド・パッケージング対応
- CI/CD パイプラインでの自動リリース
- リリースのロールバック機能
- プレリリース版（alpha, beta）の自動判定

## Open Questions

_All questions have been resolved._

### Resolved Questions

- **スモークテスト失敗時の --auto オプションの動作**
  - **Decision**: 既存動作を維持（スモークテスト失敗時は処理を中止）
  - **Rationale**: 自動リリースであっても、品質ゲートとしてのスモークテストは重要。失敗した場合は中止し、手動での確認を促す。
  - **Reference**: design.md DD-004
