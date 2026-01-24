# Requirements: Generate Release Command

## Decision Log

### コマンド名の変更
- **Discussion**: `steering-release` という名前が実態と乖離している。steering ファイル（`.kiro/steering/`）を作成するのではなく、コマンドファイル（`.claude/commands/`）を作成するため
- **Conclusion**: `generate-release` にリネーム
- **Rationale**: `generate-*` は生成系コマンドとして直感的。`steering-verification` は実際に steering ファイルを作成するが、本コマンドはコマンドを生成するため、接頭辞を変更

### 全プロファイルへのインストール
- **Discussion**: 現在は cc-sdd, cc-sdd-agent のみ。spec-manager は含まれていない
- **Conclusion**: 全プロファイル（cc-sdd, cc-sdd-agent, spec-manager）でインストール対象に追加
- **Rationale**: リリースワークフローはどのプロファイルでも有用

### spec-manager 用テンプレート
- **Discussion**: spec-manager 専用テンプレートを作成するか、cc-sdd と共有するか
- **Conclusion**: cc-sdd のテンプレートを共有
- **Rationale**: 内容は同一で、重複を避ける

### バリデーション対象
- **Discussion**: release.md を必須バリデーションに追加するか
- **Conclusion**: 追加しない（オプショナル維持）
- **Rationale**: 既存の steering-release-integration spec の Out of Scope に準拠

## Introduction

既存の `steering-release` コマンド/エージェントを `generate-release` にリネームし、全プロファイル（cc-sdd, cc-sdd-agent, spec-manager）でインストールされるようにする。これにより命名の一貫性を改善し、release.md 生成機能をすべてのユーザーに提供する。

## Requirements

### Requirement 1: コマンド/エージェントのリネーム

**Objective:** 開発者として、命名が実態を反映したコマンド名を使用したい。これにより、コマンドの役割が直感的に理解できる。

#### Acceptance Criteria

1.1. `kiro:steering-release` コマンドを `kiro:generate-release` にリネームすること

1.2. エージェントファイル `steering-release.md` を `generate-release.md` にリネームすること

1.3. テンプレートファイルを以下のようにリネームすること:
  - `templates/commands/cc-sdd/steering-release.md` → `generate-release.md`
  - `templates/commands/cc-sdd-agent/steering-release.md` → `generate-release.md`
  - `templates/agents/kiro/steering-release.md` → `generate-release.md`

1.4. コード内の参照（IPC handlers, webSocketHandler, projectStore 等）を更新すること

1.5. UI ラベル（ReleaseSection 等）は変更不要（ユーザー向け表示は「release.md を生成」のまま）

### Requirement 2: 全プロファイルへのインストール対象追加

**Objective:** すべてのプロファイルユーザーが release.md 生成機能を利用できるようにしたい。

#### Acceptance Criteria

2.1. `unifiedCommandsetInstaller` で全プロファイル（cc-sdd, cc-sdd-agent, spec-manager）に `generate-release` をインストール対象として追加すること

2.2. spec-manager 用のテンプレートは cc-sdd のものを参照・コピーすること（専用テンプレートは作成しない）

2.3. バリデーション必須チェック（`projectChecker.CC_SDD_PROFILE_COMMANDS` 等）には追加しないこと（オプショナル維持）

### Requirement 3: エージェント起動コードの更新

**Objective:** リネーム後もエージェント起動が正常に動作すること。

#### Acceptance Criteria

3.1. `generateReleaseMd` 関数内のエージェント起動コマンドを `kiro:generate-release` に更新すること

3.2. webSocketHandler の releaseHandlers を更新すること

3.3. 既存の UI（ReleaseSection）が引き続き正常に動作すること

### Requirement 4: ドキュメント更新

**Objective:** ドキュメントが最新のコマンド名を反映すること。

#### Acceptance Criteria

4.1. `.kiro/steering/skill-reference.md` の `steering-release` を `generate-release` に更新すること

4.2. `CLAUDE.md` に `generate-release` への言及があれば更新すること（なければ不要）

## Out of Scope

- release.md の必須バリデーション化
- ReleaseSection UI の機能追加・変更
- release.md テンプレートの内容変更
- 新規機能の追加（純粋なリネーム+プロファイル追加のみ）

## Open Questions

- なし（設計フェーズで詳細を決定）
