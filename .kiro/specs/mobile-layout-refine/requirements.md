# Requirements: Mobile Layout Refine

## Decision Log

<!-- 計画対話で決定した事項の構造化された記録 -->

### ナビゲーション方式

- **Discussion**: React Router等を使ったURL駆動 vs 状態ベースのナビゲーションスタック
- **Conclusion**: 状態ベースのナビゲーションスタック（Option B）
- **Rationale**: React Router導入の複雑さを回避し、現在のパターンの自然な拡張として実装可能

### DetailPage時の底部タブ表示

- **Discussion**: 底部メインタブ（Specs/Bugs/Agents）を常に表示 vs DetailPage時に非表示
- **Conclusion**: DetailPage表示時は底部タブを非表示にする（Option B）
- **Rationale**: モバイル画面スペースの有効活用、ネイティブアプリ風のプッシュナビゲーションUX

### BugWorkflowFooterの共通化

- **Discussion**: Electron専用のままにする vs shared/に移動して共通化
- **Conclusion**: `shared/components/bug/`に移動して共通化（Option A）
- **Rationale**: DRY原則、Desktop Web/Mobile間でのUI一貫性確保

### ProjectAgentsタブの機能

- **Discussion**: 既存ProjectAgentPanelと同等 vs 新しい機能を持つビュー
- **Conclusion**: 既存ProjectAgentPanelと同等の機能
- **Rationale**: 既存コンポーネントの再利用、学習コストの低減

### AgentDetailDrawerの内容

- **Discussion**: リアルタイムログ vs 実行履歴 vs 両方
- **Conclusion**: リアルタイムコンソール出力ログ + 追加指示入力フィールド + 続行ボタン
- **Rationale**: 既存AgentLogAreaと同等の機能を提供、モバイルでのAgent制御を可能にする

### AgentDetailDrawerの高さ

- **Discussion**: 固定高さ vs ドラッグ調整可能 vs 自動調整
- **Conclusion**: ユーザーがドラッグで調整可能（Option B）
- **Rationale**: ユーザーの好みに応じた柔軟なUI

### 実装スコープ

- **Discussion**: MVPスコープの範囲
- **Conclusion**: フル実装（新ナビゲーション構造 + AgentDetailDrawer + BugWorkflowFooter共通化 + コンポーネント共用化）
- **Rationale**: 完全な刷新により、Desktop/Mobile間の一貫性を実現

## Introduction

Remote UI（スマートフォン向け）のMobileLayoutを刷新し、3タブ構成（Specs/Bugs/Agents）のナビゲーション、DetailPageへのプッシュナビゲーション、AgentDetailDrawerによるリアルタイムログ表示機能を実装する。Desktop Web版とのコンポーネント共用を最大化し、保守性と一貫性を向上させる。

## Requirements

### Requirement 1: 底部タブナビゲーション

**Objective:** モバイルユーザーとして、底部タブからSpecs/Bugs/Agentsの各機能にアクセスしたい。メイン画面間の素早い切り替えを実現するため。

#### Acceptance Criteria

1.1. The system shall display a bottom tab bar with three tabs: Specs, Bugs, and Agents.

1.2. When the user taps a tab, the system shall switch the main content area to the corresponding view.

1.3. The system shall visually indicate the currently active tab with distinct styling (color, icon size).

1.4. When navigating to a DetailPage, the system shall hide the bottom tab bar.

1.5. The bottom tab bar shall have a minimum touch target size of 44x44px for each tab.

### Requirement 2: ナビゲーションスタック

**Objective:** モバイルユーザーとして、一覧から詳細画面への遷移と戻る操作を直感的に行いたい。ネイティブアプリのような操作感を実現するため。

#### Acceptance Criteria

2.1. When the user taps a SpecItem in the Specs list, the system shall push SpecDetailPage onto the navigation stack.

2.2. When the user taps a BugItem in the Bugs list, the system shall push BugDetailPage onto the navigation stack.

2.3. While a DetailPage is displayed, the system shall show a back button in the header.

2.4. When the user taps the back button, the system shall pop the current page from the navigation stack and return to the list view.

2.5. While a DetailPage is displayed, the system shall hide the bottom tab bar.

2.6. The navigation state shall be managed via React state (not URL routing).

### Requirement 3: SpecDetailPage構造

**Objective:** モバイルユーザーとして、Specの詳細情報とArtifactを効率的に閲覧・操作したい。限られた画面スペースでSpecの全機能にアクセスするため。

#### Acceptance Criteria

3.1. The SpecDetailPage shall display two sub-tabs at the bottom of the content area: "Spec" and "Artifact".

3.2. The Spec sub-tab shall display from top to bottom: SpecAgent list (fixed 3-item height, scrollable), SpecWorkflow area (main content, scrollable), and WorkflowFooter (fixed at bottom).

3.3. The SpecAgent list area shall have a fixed height equivalent to 3 AgentItems and shall be independently scrollable.

3.4. When the user taps an AgentItem in the SpecAgent list, the system shall display the AgentDetailDrawer.

3.5. The Artifact sub-tab shall display artifact file tabs at the top with edit/view functionality.

3.6. The Artifact sub-tab's edit/view components shall be shared with Desktop Web implementation.

3.7. The WorkflowFooter shall include the auto-execution button (shared SpecWorkflowFooter component).

### Requirement 4: BugDetailPage構造

**Objective:** モバイルユーザーとして、Bugの詳細情報とArtifactを効率的に閲覧・操作したい。限られた画面スペースでBugワークフローを制御するため。

#### Acceptance Criteria

4.1. The BugDetailPage shall display two sub-tabs at the bottom of the content area: "Bug" and "Artifact".

4.2. The Bug sub-tab shall display from top to bottom: BugAgent list (fixed 3-item height, scrollable), BugWorkflow area (main content, scrollable), and BugWorkflowFooter (fixed at bottom).

4.3. The BugAgent list area shall have a fixed height equivalent to 3 AgentItems and shall be independently scrollable.

4.4. When the user taps an AgentItem in the BugAgent list, the system shall display the AgentDetailDrawer.

4.5. The Artifact sub-tab shall display artifact file tabs at the top with edit/view functionality (same as SpecArtifactTab).

4.6. The BugWorkflowFooter shall include the auto-execution button (shared component from shared/components/bug/).

### Requirement 5: Agentsタブ

**Objective:** モバイルユーザーとして、プロジェクトレベルのAgentを一覧表示し、ログを確認したい。プロジェクト全体のAgent状態を把握するため。

#### Acceptance Criteria

5.1. The Agents tab shall display the Project Agent list (same content as existing ProjectAgentPanel).

5.2. When the user taps an AgentItem, the system shall display the AgentDetailDrawer with the agent's log.

5.3. The Agents tab shall show the count of running agents in the tab badge or header.

5.4. The Agents tab shall include the Ask button to execute project-level prompts.

### Requirement 6: AgentDetailDrawer

**Objective:** モバイルユーザーとして、Agentのリアルタイムログを確認し、追加指示を送信したい。Agent実行中の状態を監視・制御するため。

#### Acceptance Criteria

6.1. The AgentDetailDrawer shall slide up from the bottom of the screen when activated.

6.2. The drawer shall display real-time console output logs of the selected agent.

6.3. The drawer height shall be adjustable by user drag gesture.

6.4. The drawer shall include an input field for additional instructions at the bottom.

6.5. The drawer shall include a "Send" button to submit the additional instruction.

6.6. The drawer shall include a "Continue" button to resume agent execution.

6.7. When the user taps outside the drawer or swipes down, the system shall close the drawer.

6.8. The drawer's internal rendering shall be shared with Desktop Web implementation where possible.

### Requirement 7: BugWorkflowFooter共通化

**Objective:** 開発者として、BugWorkflowFooterをDesktopとMobileで共用したい。コード重複を避け、保守性を向上させるため。

#### Acceptance Criteria

7.1. The BugWorkflowFooter component shall be moved from `renderer/components/` to `shared/components/bug/`.

7.2. The BugWorkflowFooter shall maintain all existing functionality (auto-execution button, worktree conversion button).

7.3. The BugWorkflowFooter shall be usable from both Electron renderer and Remote UI.

7.4. The existing BugWorkflowFooter import paths in Electron shall be updated to use the shared component.

### Requirement 8: 一覧・フィルタの共用

**Objective:** 開発者として、一覧表示とフィルタUIをDesktopとMobileで共用したい。UI一貫性と保守性を向上させるため。

#### Acceptance Criteria

8.1. The Specs list component shall be shared between Desktop and Mobile layouts.

8.2. The Bugs list component shall be shared between Desktop and Mobile layouts.

8.3. The filter area component shall be shared and displayed as a fixed header in both layouts.

8.4. If a shared component does not exist, the system shall use the existing Remote UI implementation (SpecsView, BugsView).

## Layout Diagrams

### MobileLayout - List View

```
┌─────────────────────────────────────┐
│ Header (SDD Orchestrator, Status)   │
├─────────────────────────────────────┤
│ [Filter Area - Fixed]               │
├─────────────────────────────────────┤
│                                      │
│   Spec/Bug/Agent List               │
│   (Scrollable)                       │
│                                      │
│                                      │
├─────────────────────────────────────┤
│ [Specs] [Bugs] [Agents]             │ ← Bottom Tabs
└─────────────────────────────────────┘
```

### SpecDetailPage - Spec Tab

```
┌─────────────────────────────────────┐
│ [←] Spec: feature-name              │ ← Header with Back
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Agent 1  [running]              │ │
│ │ Agent 2  [completed]            │ │ ← Agent List (3 items, scrollable)
│ │ Agent 3  [completed]            │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│                                      │
│   Workflow Area                      │
│   - Phase Items                      │
│   - Progress                         │ ← Main Content (scrollable)
│   - Actions                          │
│                                      │
├─────────────────────────────────────┤
│ [Auto Execute] [Stop]               │ ← WorkflowFooter (fixed)
├─────────────────────────────────────┤
│      [Spec]      [Artifact]         │ ← Sub-tabs
└─────────────────────────────────────┘
```

### AgentDetailDrawer (Overlay)

```
┌─────────────────────────────────────┐
│                                      │
│   (Behind content dimmed)           │
│                                      │
├─────────────────────────────────────┤ ← Drag handle
│ Agent: spec-requirements            │
│ Status: running                      │
├─────────────────────────────────────┤
│                                      │
│ > Analyzing requirements...          │
│ > Found 5 user stories               │ ← Real-time logs (scrollable)
│ > Generating EARS format...          │
│                                      │
├─────────────────────────────────────┤
│ [Additional instruction input    ]  │
│ [Continue] [Send]                   │ ← Action buttons
└─────────────────────────────────────┘
```

## Out of Scope

- URL-based routing (React Router integration)
- Offline support / PWA features
- Gesture-based navigation (swipe to go back)
- Agent log persistence / history viewing
- Multi-agent selection in drawer
- Landscape orientation optimization

## Open Questions

- AgentDetailDrawerのログ更新頻度（WebSocket経由のリアルタイム更新の既存実装を確認する必要あり）
- 追加指示送信後のUIフィードバック（送信中の状態表示等）の詳細
