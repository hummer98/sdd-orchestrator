# Implementation Plan

## Task 1: 共通アイコンコンポーネントと定数の作成

- [x] 1.1 (P) AGENT_ICON_COLOR定数を定義する
  - Agentアイコンの統一色として`text-white`を定数化
  - `shared/components/ui/AgentIcon.tsx`内でexport（新規ディレクトリ作成不要、コンポーネントとco-location）
  - ボタン背景色（blue-500, violet-500）との対比で白色を採用
  - _Requirements: 3.3_

- [x] 1.2 (P) AgentIconコンポーネントを作成する
  - Botアイコンを統一色で表示するコンポーネント
  - classNameプロップでサイズ指定可能
  - data-testidプロップでテスト対応
  - `shared/components/ui/`ディレクトリに配置
  - _Requirements: 3.1, 3.4_

- [x] 1.3 (P) AgentBranchIconコンポーネントを作成する
  - BotアイコンとGitBranchアイコンを横並びで表示
  - gap-1で2アイコン間の間隔を設定
  - classNameプロップで両アイコンのサイズを一括指定可能
  - `shared/components/ui/`ディレクトリに配置
  - _Requirements: 3.2, 3.4, 2.3_

## Task 2: 既存コンポーネントのアイコン置換

- [x] 2.1 PhaseItemコンポーネントの実行ボタンを変更する
  - 実行ボタン（pending状態、「実行」ラベル）のPlayアイコンをAgentIconに置換
  - 自動実行トグル（PlayCircle）は変更しない
  - 実行中ステータス（Bot + animate-pulse）は変更しない
  - Task 1.2の完了が前提条件
  - _Requirements: 1.1, 1.3, 3.5, 4.2, 4.3_

- [x] 2.2 ImplPhasePanelコンポーネントのボタンを変更する
  - 通常モードボタンのPlayアイコンをAgentIconに置換
  - WorktreeモードボタンのGitBranchアイコンをAgentBranchIconに置換
  - Worktreeモードの紫色（violet-500）は維持
  - 自動実行トグル（PlayCircle）は変更しない
  - 実行中ステータス（Bot + animate-pulse）は変更しない
  - Task 1.2, 1.3の完了が前提条件
  - _Requirements: 1.2, 2.1, 2.2, 3.5, 4.2, 4.3_

## Task 3: 変更対象外コンポーネントの確認と検証

- [x] 3.1 変更対象外コンポーネントのリグレッションテストを追加する
  - PhaseItemの自動実行トグルがPlayCircleのままであることを検証
  - PhaseItemの実行中ステータスがBot + animate-pulseのままであることを検証
  - ImplPhasePanelの自動実行トグルがPlayCircleのままであることを検証
  - ImplPhasePanelの実行中ステータスがBot + animate-pulseのままであることを検証
  - AgentInputPanelの「続行を指示」ボタンがPlay + 緑色のままであることを検証
  - _Requirements: 4.1, 4.2, 4.3_

## Task 4: 新規コンポーネントのユニットテスト

- [x] 4.1 (P) AgentIconコンポーネントのテストを作成する
  - Botアイコンが正しくレンダリングされることを検証
  - classNameが適用されることを検証
  - data-testidが設定されることを検証
  - _Requirements: 3.1_

- [x] 4.2 (P) AgentBranchIconコンポーネントのテストを作成する
  - BotとGitBranchが両方レンダリングされることを検証
  - gap-1のFlexコンテナが適用されることを検証
  - classNameが両アイコンに適用されることを検証
  - _Requirements: 3.2, 2.3_

## Task 5: 統合検証

- [x] 5.1 ビルドと型チェックの確認
  - `npm run build`でビルドエラーがないことを確認
  - `npm run typecheck`で型エラーがないことを確認
  - _Requirements: 1.1, 1.2, 2.1, 3.5_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | PhaseItemの実行ボタンアイコン変更 | 2.1 | Feature |
| 1.2 | ImplPhasePanelの通常モードアイコン変更 | 2.2 | Feature |
| 1.3 | アイコン色の統一 | 1.1, 2.1, 2.2 | Feature |
| 2.1 | Worktreeボタンの2アイコン表示 | 2.2 | Feature |
| 2.2 | Worktreeボタンの紫色維持 | 2.2 | Feature |
| 2.3 | 2アイコンの適切な間隔 | 1.3, 4.2 | Feature |
| 3.1 | AgentIconコンポーネント作成 | 1.2, 4.1 | Feature |
| 3.2 | AgentBranchIconコンポーネント作成 | 1.3, 4.2 | Feature |
| 3.3 | AGENT_ICON_COLOR定数定義 | 1.1 | Infrastructure |
| 3.4 | shared/components/ui/配置 | 1.2, 1.3 | Infrastructure |
| 3.5 | 既存コンポーネントのリファクタリング | 2.1, 2.2 | Feature |
| 4.1 | AgentInputPanelは変更しない | 3.1 | Feature |
| 4.2 | 自動実行トグルは変更しない | 2.1, 2.2, 3.1 | Feature |
| 4.3 | 実行中ステータスBotアイコンは変更しない | 2.1, 2.2, 3.1 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 2.1), not container tasks (e.g., 2)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
