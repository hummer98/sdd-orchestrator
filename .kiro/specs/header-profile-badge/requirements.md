# Requirements: Header Profile Badge

## Decision Log

### 表示位置と形式
- **Discussion**: プロジェクト名の横、下、ヘッダー右側の3案を検討
- **Conclusion**: プロジェクト名の横にバッジ表示（案A）
- **Rationale**: 視認性が高く、プロジェクトとプロファイルの関連が明確

### バッジスタイル
- **Discussion**: シンプルテキスト、色付きバッジ、アウトラインバッジの3案を検討
- **Conclusion**: アウトラインバッジ（枠線のみのピル型）
- **Rationale**: 控えめながら視認性を確保、ダークモード対応も容易

### 未インストール時の表示
- **Discussion**: 非表示、「未設定」表示、インストール促進リンクの3案を検討
- **Conclusion**: `[未インストール]` と表示
- **Rationale**: 状態を明示することでユーザーが次のアクションを判断可能

### クリック動作
- **Discussion**: 情報表示のみ、ダイアログ表示、ツールチップ表示を検討
- **Conclusion**: クリック動作なし（情報表示のみ）
- **Rationale**: シンプルさを優先、インストールは既存メニューから可能

### 更新タイミング
- **Discussion**: プロジェクト選択時のみ vs リアルタイム更新
- **Conclusion**: プロジェクト選択時 + コマンドプリセットインストール完了後
- **Rationale**: 必要十分なタイミングで更新、過度な監視は不要

### Remote UI対応
- **Discussion**: メインUIのみ vs Remote UIにも表示
- **Conclusion**: Remote UIにも同様に表示
- **Rationale**: モバイルでもプロジェクト状態を把握できるようにする

## Introduction

アプリケーションヘッダーにインストール済みコマンドプリセット（プロファイル）をバッジ表示する機能。ユーザーは現在のプロジェクトにどのプロファイル（cc-sdd / cc-sdd-agent / spec-manager）がインストールされているかを一目で確認できる。

## Requirements

### Requirement 1: プロファイル情報のIPC公開

**Objective:** As a renderer process, I want to load profile information from sdd-orchestrator.json, so that I can display the installed profile in the UI.

#### Acceptance Criteria
1. When the renderer requests profile information, the system shall return the profile name and installedAt timestamp from `.kiro/sdd-orchestrator.json`
2. If no profile is installed, the system shall return null
3. The system shall expose `loadProfile(projectPath)` via IPC channel

### Requirement 2: ヘッダーへのプロファイルバッジ表示

**Objective:** As a user, I want to see the installed profile in the header, so that I can quickly identify which commandset is configured for the current project.

#### Acceptance Criteria
1. When a project is selected and has an installed profile, the system shall display the profile name as an outline badge next to the project name
2. When a project is selected but has no installed profile, the system shall display `[未インストール]` badge
3. When no project is selected, the system shall not display any profile badge
4. The badge shall use outline style (border only, pill-shaped)
5. The badge shall support both light and dark mode

### Requirement 3: プロファイル情報の更新タイミング

**Objective:** As a user, I want the profile badge to reflect the current state, so that I always see accurate information.

#### Acceptance Criteria
1. When a project is selected, the system shall load and display the profile information
2. When commandset installation completes successfully, the system shall reload and update the profile badge
3. The system shall not require manual refresh to see updated profile after installation

### Requirement 4: Remote UIへのプロファイルバッジ表示

**Objective:** As a mobile user, I want to see the installed profile in Remote UI, so that I can identify the project configuration from my phone.

#### Acceptance Criteria
1. When Remote UI is connected and a project is selected, the system shall display the profile badge in the Remote UI header
2. The profile badge shall use the same styling as the main application
3. The badge component shall be shared between main UI and Remote UI

### Requirement 5: ProfileBadgeコンポーネント

**Objective:** As a developer, I want a reusable ProfileBadge component, so that both main UI and Remote UI can display profile information consistently.

#### Acceptance Criteria
1. The system shall provide a `ProfileBadge` component in `src/shared/components/`
2. The component shall accept profile name (or null) as a prop
3. The component shall render outline-style pill badge
4. The component shall display `未インストール` when profile is null

## Out of Scope

- プロファイルバッジのクリックによるダイアログ表示
- プロファイルバッジのツールチップ表示
- プロファイルのリアルタイム監視（ファイルウォッチャー）
- プロファイル切り替え機能（既存メニューを使用）

## Open Questions

- なし（設計フェーズで詳細を決定）
