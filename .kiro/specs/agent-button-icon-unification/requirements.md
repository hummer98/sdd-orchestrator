# Requirements: Agent Button Icon Unification

## Decision Log

### 変更対象の範囲

- **Discussion**: Agent起動ボタンとして、PhaseItemの実行ボタン、ImplPhasePanelの実装開始ボタン、AgentInputPanelの続行指示ボタンが候補として挙がった
- **Conclusion**: PhaseItemの実行ボタンとImplPhasePanelの実装開始ボタン（通常モード）を対象とする。AgentInputPanelは除外
- **Rationale**: 「続行を指示」は新規Agent起動ではなく既存Agentへの入力送信であり、性質が異なるため除外

### Worktreeボタンの扱い

- **Discussion**: 「worktreeで実装開始」ボタンは色を変更せず、アイコンのみ変更するか検討
- **Conclusion**: 色は紫（violet）のまま維持し、アイコンを`GitBranch`単体から`Bot` + `GitBranch`の2アイコン表示に変更
- **Rationale**: Worktreeモードは通常の実装開始と視覚的に区別する必要があり、紫色で差別化を維持。ただしAgent起動であることを明示するためBotアイコンを追加

### 自動実行ボタンの扱い

- **Discussion**: 自動実行許可トグル（PlayCircleアイコン）も変更対象か検討
- **Conclusion**: 自動実行ボタンは変更対象外とし、既存のまま維持
- **Rationale**: ユーザー指示により明示的に除外

### コンポーネント化の方針

- **Discussion**: ボタン全体のコンポーネント化 vs アイコン部分のみのコンポーネント化を検討
- **Conclusion**: アイコン部分のみをコンポーネント化（`AgentIcon`, `AgentBranchIcon`）し、色定数（`AGENT_ICON_COLOR`）を定義
- **Rationale**: ボタンのレイアウト・サイズは使用箇所で異なるため、過度な抽象化を避けつつ、色の一括変更という要件に対応。KISSの原則に従う

### 統一する色

- **Discussion**: 青、紫、緑、カスタム色の選択肢
- **Conclusion**: 青系（`blue-500`相当）を推奨。共通色定数で管理し、後から一括変更可能にする
- **Rationale**: 現在のフェーズ実行ボタンの色と整合性があり、「実行」アクションとして認知されやすい

## Introduction

アプリケーション全体のUI統一の第一弾として、Agentが起動するコマンドボタンのアイコンと色を統一する。現在は再生ボタン（Playアイコン）が使用されているが、これをBotアイコンに変更し、Agent起動であることを視覚的に明示する。また、色を共通定数で管理することで、将来の一括変更を容易にする。

## Requirements

### Requirement 1: Agent起動ボタンアイコンの統一

**Objective:** 開発者として、Agent起動ボタンが一目でわかるようにしたい。それにより、UIの一貫性が向上し、操作の理解が容易になる。

#### Acceptance Criteria

1. PhaseItemコンポーネントの実行ボタン（requirements, design, tasks等のフェーズ）において、`Play`アイコンが`Bot`アイコンに置き換えられていること
2. ImplPhasePanelコンポーネントの実装開始ボタン（通常モード）において、`Play`アイコンが`Bot`アイコンに置き換えられていること
3. 上記ボタンのアイコン色が統一されていること

### Requirement 2: Worktreeボタンのアイコン変更

**Objective:** 開発者として、Worktreeモードでの実装開始がAgent起動であることを認識しつつ、通常モードと視覚的に区別したい。

#### Acceptance Criteria

1. ImplPhasePanelコンポーネントの「Worktreeで実装開始」ボタンにおいて、`GitBranch`アイコン単体から`Bot` + `GitBranch`の2アイコン表示に変更されていること
2. ボタンの背景色は紫（`violet-500`）のまま維持されていること
3. 2つのアイコンが適切な間隔で並んで表示されていること

### Requirement 3: 共通アイコンコンポーネントの作成

**Objective:** 開発者として、Agent起動ボタンのアイコンと色を一箇所で管理したい。それにより、将来の変更が容易になる。

#### Acceptance Criteria

1. `AgentIcon`コンポーネントが作成され、単体の`Bot`アイコンを表示すること
2. `AgentBranchIcon`コンポーネントが作成され、`Bot` + `GitBranch`の2アイコンを表示すること
3. `AGENT_ICON_COLOR`定数が定義され、アイコンの色が一元管理されていること
4. 上記コンポーネントが`shared/components/ui/`ディレクトリに配置されていること
5. 既存のPhaseItem、ImplPhasePanelが新しいコンポーネントを使用するようにリファクタリングされていること

### Requirement 4: 変更対象外の明確化

**Objective:** 開発者として、変更対象外のコンポーネントが誤って変更されないようにしたい。

#### Acceptance Criteria

1. AgentInputPanelの「続行を指示」ボタンは変更されないこと（`Play`アイコン、緑色のまま）
2. 自動実行許可トグル（`PlayCircle`アイコン）は変更されないこと
3. 実行中ステータス表示の`Bot`アイコン（青色、アニメーション付き）は変更されないこと

## Out of Scope

- AgentInputPanelの「続行を指示」ボタンの変更
- 自動実行許可トグル（PlayCircleアイコン）の変更
- 実行中ステータス表示のBotアイコンの変更
- ボタンのサイズ・レイアウトの変更
- ボタンラベル（テキスト）の変更
- その他のUI統一作業（本Specは第一弾のアイコン統一のみ）

## Open Questions

- なし（設計フェーズで詳細を決定）
