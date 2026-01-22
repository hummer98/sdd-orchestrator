# Requirements: CreateSpecDialogの簡素化

## Decision Log

### ダイアログサイズ
- **Discussion**: 現在の`max-w-md`（448px）ではボタンが2行になる可能性がある
- **Conclusion**: `max-w-xl`（576px）に拡大
- **Rationale**: ボタンが横一列に収まる十分な幅を確保

### ボタン統合
- **Discussion**: 現在「作成」（spec-init）と「プランニングで開始」（spec-plan）の2つのボタンがある
- **Conclusion**: spec-planのみに統合し、「作成」ボタン（spec-init）を削除
- **Rationale**: spec-planが対話形式でDecision Logも生成するため、より優れたワークフローを提供

### ボタンラベル
- **Discussion**: 統合後のボタンラベルを検討（「作成」「プランニングで作成」など）
- **Conclusion**: 「spec-planで作成」
- **Rationale**: 使用するコマンドを明示し、ユーザーが何が実行されるか理解できる

### アイコン
- **Discussion**: 現在MessageCircle（プランニング）とPlus（作成）を使用
- **Conclusion**: Botアイコンを使用、Worktree時はBot + GitBranchアイコン
- **Rationale**: AIエージェントによる処理であることを視覚的に示す。Worktree時はブランチ操作も行われることを示す

### ボタン色
- **Discussion**: 標準時とWorktree時で色を変えるか
- **Conclusion**: 標準時は青系（標準色）、Worktree時は紫
- **Rationale**: 「Worktreeで実装継続」ボタンと同じ視覚的パターンを維持

## Introduction

CreateSpecDialogの簡素化を行う。ダイアログサイズを拡大してボタンが2行にならないようにし、ボタンをspec-plan専用の1つに統合する。アイコンとボタン色はWorktreeモードの状態に応じて変化させる。

## Requirements

### Requirement 1: ダイアログサイズ拡大

**Objective:** As a ユーザー, I want ダイアログが十分な幅を持つ, so that ボタンが2行にならず視認性が向上する

#### Acceptance Criteria
1. ダイアログの最大幅は`max-w-xl`（576px）であること
2. ボタン群が横一列に収まること

### Requirement 2: ボタン統合

**Objective:** As a ユーザー, I want 仕様作成ボタンが1つに統合されている, so that 選択の迷いがなくシンプルに操作できる

#### Acceptance Criteria
1. 「作成」ボタン（spec-init呼び出し）が削除されていること
2. handleCreate関数および関連コードが削除されていること
3. ボタンは「spec-planで作成」のみであること
4. ボタンクリック時にspec-planが実行されること

### Requirement 3: ボタンアイコン

**Objective:** As a ユーザー, I want ボタンアイコンがAIエージェント処理を示す, so that 何が実行されるか視覚的に理解できる

#### Acceptance Criteria
1. 標準モード時、ボタンにBotアイコンが表示されること
2. Worktreeモード時、ボタンにBotアイコンとGitBranchアイコンが並んで表示されること
3. アイコン配置は「Worktreeで実装継続」ボタンと同じパターンであること

### Requirement 4: ボタン色

**Objective:** As a ユーザー, I want ボタン色がWorktreeモードの状態を反映する, so that 現在のモードを視覚的に把握できる

#### Acceptance Criteria
1. 標準モード時、ボタンは青系（`bg-blue-500 hover:bg-blue-600`）であること
2. Worktreeモード時、ボタンは紫（`bg-violet-500 hover:bg-violet-600`）であること

## Out of Scope

- spec-init機能自体の削除（IPC・バックエンド側）
- 他のダイアログ（CreateBugDialogなど）への変更
- Worktreeモードスイッチの変更

## Open Questions

- なし
