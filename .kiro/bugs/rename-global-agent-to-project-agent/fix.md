# Bug Fix: rename-global-agent-to-project-agent

## Summary
「グローバルエージェント」という用語を「プロジェクトエージェント」にリネーム。UI表記およびコード内の変数/メソッド名を全て変更した。

## Changes Made

### 1. ファイル名のリネーム
| 変更前 | 変更後 |
|--------|--------|
| `GlobalAgentPanel.tsx` | `ProjectAgentPanel.tsx` |
| `GlobalAgentPanel.test.tsx` | `ProjectAgentPanel.test.tsx` |

### 2. コンポーネント名・エクスポート名
- `GlobalAgentPanel` → `ProjectAgentPanel`
- `GlobalAgentPanelProps` → `ProjectAgentPanelProps`
- `GlobalAgentListItem` → `ProjectAgentListItem`
- `GlobalAgentListItemProps` → `ProjectAgentListItemProps`

### 3. メソッド名・変数名
| ファイル | 変更前 | 変更後 |
|----------|--------|--------|
| `agentStore.ts` | `getGlobalAgents()` | `getProjectAgents()` |
| `agentStore.ts` | `selectForGlobalAgents()` | `selectForProjectAgents()` |
| `App.tsx` | `globalAgentPanelHeight` | `projectAgentPanelHeight` |
| `App.tsx` | `handleGlobalAgentPanelResize` | `handleProjectAgentPanelResize` |
| `App.tsx` | `GLOBAL_AGENT_PANEL_MIN/MAX` | `PROJECT_AGENT_PANEL_MIN/MAX` |
| `layoutConfigService.ts` | `globalAgentPanelHeight` | `projectAgentPanelHeight` |
| `electron.d.ts` | `globalAgentPanelHeight` | `projectAgentPanelHeight` |

### 4. UI表記
| 変更前 | 変更後 |
|--------|--------|
| `Global Agent` | `Project Agent` |
| `グローバルエージェントなし` | `プロジェクトエージェントなし` |
| 通知メッセージ内「グローバルAgentパネル」 | 「プロジェクトAgentパネル」 |

### 5. data-testid属性
| 変更前 | 変更後 |
|--------|--------|
| `global-agent-panel` | `project-agent-panel` |
| `global-agent-panel-header` | `project-agent-panel-header` |
| `global-agent-panel-empty` | `project-agent-panel-empty` |
| `global-agent-panel-container` | `project-agent-panel-container` |
| `global-agent-item-{id}` | `project-agent-item-{id}` |

### 6. 後方互換性対応
- `layoutConfigService.ts`のスキーマで`globalAgentPanelHeight`（旧名）も引き続き受け入れ
- 既存の設定ファイルが読み込まれた場合、旧プロパティ名でも動作するよう対応

## Modified Files
- `src/renderer/components/ProjectAgentPanel.tsx` (旧: GlobalAgentPanel.tsx)
- `src/renderer/components/ProjectAgentPanel.test.tsx` (旧: GlobalAgentPanel.test.tsx)
- `src/renderer/components/index.ts`
- `src/renderer/components/CreateSpecDialog.tsx`
- `src/renderer/components/CreateSpecDialog.test.tsx`
- `src/renderer/components/CreateBugDialog.tsx`
- `src/renderer/components/CreateBugDialog.test.tsx`
- `src/renderer/components/AgentListPanel.tsx`
- `src/renderer/components/AgentListPanel.test.tsx`
- `src/renderer/components/DocsTabs.integration.test.tsx`
- `src/renderer/stores/agentStore.ts`
- `src/renderer/stores/agentStore.test.ts`
- `src/renderer/App.tsx`
- `src/renderer/types/electron.d.ts`
- `src/main/services/layoutConfigService.ts`
- `src/main/services/layoutConfigService.test.ts`
- `e2e-wdio/layout-persistence.e2e.spec.ts`

## Test Results
```
Test Files  115 passed (115)
     Tests  2122 passed | 6 skipped (2128)
  Duration  23.36s
```

全ユニットテストが成功。

## Implementation Notes
- 機能的な変更はなし（用語のリネームのみ）
- 後方互換性を維持するため、設定ファイルのスキーマで旧プロパティ名も受け入れ
- コメント内の「global agent」「グローバルエージェント」も「project agent」「プロジェクトエージェント」に更新
