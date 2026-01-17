# Requirements: Steering Verification Integration

## Decision Log

### 検証コマンドの配置場所
- **Discussion**: tech.md に追加するか、別ファイルにするか
- **Conclusion**: 新規ファイル `verification.md` として分離
- **Rationale**: tech.md は「何を使うか」、verification.md は「どう検証するか」で責務が異なる

### verification.md の生成方法
- **Discussion**: テンプレートコピー vs エージェント生成
- **Conclusion**: エージェント生成（`kiro:steering-verification`）
- **Rationale**: プロジェクトの技術スタックを分析して適切なコマンドを推測する必要がある

### verification.md がない場合のspec-inspection動作
- **Discussion**: NOGO / Warning / パス（スキップ）
- **Conclusion**: パス（スキップ）
- **Rationale**: オプショナルな拡張として扱い、既存プロジェクトへの影響を最小化。UIで存在チェック＋インストールボタンがあれば気づきの導線は確保できる

### UIバリデーションの配置
- **Discussion**: specManagerCheckに統合 / 独立セクション
- **Conclusion**: steeringセクションとして独立
- **Rationale**: steeringファイルは設定ファイルとは異なるカテゴリ

## Introduction

プロジェクト固有の検証コマンド（ビルド、テスト、型チェック等）を `steering/verification.md` で定義し、spec-inspection が自動実行する仕組みを導入する。これにより、spec-inspection がプロジェクトに依存しない汎用的な検証を行えるようになる。

## Requirements

### Requirement 1: steering-verification コマンド/エージェント

**Objective:** AIエージェントとして、プロジェクトを分析して適切な検証コマンドを含む `verification.md` を生成したい。これにより、手動でコマンドを調べて記述する手間を省ける。

#### Acceptance Criteria

1.1. `kiro:steering-verification` コマンドを実行すると、steering-verification-agent が起動すること

1.2. エージェントは以下を分析して検証コマンドを推測すること:
  - `tech.md`（存在する場合）
  - `package.json`, `Cargo.toml`, `Makefile` 等のビルド設定ファイル
  - 既存のCI設定（`.github/workflows/`, `.gitlab-ci.yml` 等）

1.3. エージェントは `.kiro/steering/verification.md` を生成すること

1.4. テンプレート `.kiro/settings/templates/steering/verification.md` が存在し、エージェントが参照できること

1.5. コマンド/エージェントファイルがコマンドプリセット（cc-sdd, cc-sdd-agent）に同梱されること

### Requirement 2: verification.md フォーマット

**Objective:** spec-inspection が解析・実行できる構造化されたフォーマットで検証コマンドを定義したい。

#### Acceptance Criteria

2.1. verification.md は以下の情報を含むこと:
  - コマンドタイプ（build, typecheck, test, lint 等）
  - 実行コマンド
  - 作業ディレクトリ（プロジェクトルートからの相対パス）
  - 説明

2.2. フォーマットはMarkdownテーブルまたはコードブロックで、spec-inspection が正規表現やパーサーで抽出可能であること

2.3. 複数のコマンドを定義できること（例：ビルドとテストの両方）

### Requirement 3: プロジェクトバリデーション拡張

**Objective:** UIユーザーとして、`verification.md` が不足していることに気づき、簡単に生成を開始したい。

#### Acceptance Criteria

3.1. ProjectValidationPanel に「Steering」セクションを追加すること

3.2. `steering/verification.md` の存在をチェックすること

3.3. 不足している場合、「verification.md を生成」ボタンを表示すること

3.4. ボタンをクリックすると、プロジェクトエージェントとして `/kiro:steering-verification` を起動すること

3.5. 他のsteeringファイル（product.md, tech.md, structure.md）はチェック対象外とすること

### Requirement 4: spec-inspection 統合

**Objective:** spec-inspection 実行時に、verification.md で定義されたコマンドを自動実行し、失敗時はNOGO判定としたい。

#### Acceptance Criteria

4.1. spec-inspection は `.kiro/steering/verification.md` を読み込むこと

4.2. verification.md が存在しない場合、検証をスキップし「Verification Commands: skipped (verification.md not found)」とレポートに記載すること

4.3. verification.md が存在する場合、定義された各コマンドを実行すること

4.4. コマンド実行時は指定された作業ディレクトリに移動すること

4.5. いずれかのコマンドが失敗（非ゼロ終了コード）した場合、Critical として NOGO 判定とすること

4.6. 検証結果をInspection Reportの「Verification Commands」セクションに記載すること

## Out of Scope

- 他のsteeringファイル（product.md, tech.md, structure.md）の存在チェック・インストール
- verification.md の必須化（オプショナルな拡張として扱う）
- CI/CDパイプラインとの直接統合
- コマンド実行のタイムアウト設定（将来の拡張）

## Open Questions

- なし（設計フェーズで詳細を決定）
