# Bug Analysis: rename-global-agent-to-project-agent

## Summary
「グローバルエージェント」という用語を「プロジェクトエージェント」にリネームする。UI表記とコード内の変数/メソッド名の両方を変更対象とする。

## Root Cause
本件はバグではなく、用語の改善（リファクタリング）タスク。「グローバルエージェント」という名称がわかりにくいため、「プロジェクトエージェント」に変更する。

### Technical Details
- **Location**: 複数ファイルにまたがる
- **Component**: GlobalAgentPanel、AgentStore、レイアウト設定
- **Trigger**: 用語のわかりにくさ（UX改善）

## Impact Assessment
- **Severity**: Low（機能変更なし、用語変更のみ）
- **Scope**: UI表示、変数名、メソッド名、コメント、ファイル名
- **Risk**: 広範囲の変更だが、検索・置換で対応可能。破壊的変更のリスクは低い

## 変更対象一覧

### 1. UI表記（日本語）
| ファイル | 行 | 現在の表記 | 変更後 |
|----------|-----|------------|--------|
| `GlobalAgentPanel.tsx` | 138 | `Global Agent` | `Project Agent` |
| `GlobalAgentPanel.tsx` | 152 | `グローバルエージェントなし` | `プロジェクトエージェントなし` |
| `layout-persistence.e2e.spec.ts` | 213 | `グローバルエージェントなし` | `プロジェクトエージェントなし` |

### 2. コンポーネント/ファイル名
| 現在 | 変更後 |
|------|--------|
| `GlobalAgentPanel.tsx` | `ProjectAgentPanel.tsx` |
| `GlobalAgentPanel.test.tsx` | `ProjectAgentPanel.test.tsx` |

### 3. 変数/メソッド名（TypeScript）
| ファイル | 現在の名前 | 変更後 |
|----------|------------|--------|
| `agentStore.ts` | `getGlobalAgents()` | `getProjectAgents()` |
| `agentStore.ts` | `selectForGlobalAgents()` | `selectForProjectAgents()` |
| `App.tsx` | `globalAgentPanelHeight` | `projectAgentPanelHeight` |
| `App.tsx` | `handleGlobalAgentPanelResize` | `handleProjectAgentPanelResize` |
| `layoutConfigService.ts` | `globalAgentPanelHeight` | `projectAgentPanelHeight` |
| `electron.d.ts` | `globalAgentPanelHeight` | `projectAgentPanelHeight` |

### 4. コンポーネントエクスポート
| ファイル | 変更内容 |
|----------|----------|
| `components/index.ts` | `GlobalAgentPanel` → `ProjectAgentPanel` |

### 5. テストファイル
| ファイル | 変更内容 |
|----------|----------|
| `GlobalAgentPanel.test.tsx` | モック変数名、テスト説明文 |
| `agentStore.test.ts` | `getGlobalAgents` テストケース |
| `CreateSpecDialog.test.tsx` | `selectForGlobalAgents` 関連 |
| `CreateBugDialog.test.tsx` | `selectForGlobalAgents` 関連 |
| `AgentListPanel.test.tsx` | `global-agent` ID参照 |

### 6. E2Eテスト
| ファイル | 変更内容 |
|----------|----------|
| `layout-persistence.e2e.spec.ts` | `GlobalAgentPanel` 関連テスト説明 |

### 7. 設定ファイル（後方互換性に注意）
| ファイル | 変更内容 | 注意事項 |
|----------|----------|----------|
| `layoutConfigService.ts` | `globalAgentPanelHeight` | 既存ユーザーの設定ファイル移行が必要 |

### 8. コメント/ドキュメント
- 各ファイル内のコメントで「global agent」「グローバルエージェント」と記載されている箇所

## Proposed Solution

### Option 1: 一括リネーム（推奨）
- Description: 検索・置換で全ての対象を一括変更
- Pros: 一貫性が保たれる、作業が明確
- Cons: 変更ファイル数が多い

### Option 2: UI表記のみ変更（最小限）
- Description: ユーザーに見える部分のみ変更
- Pros: 変更範囲が小さい
- Cons: コードとUIで用語が乖離する

### Recommended Approach
**Option 1** を推奨。コードとUIで用語を統一することで、将来のメンテナンス性が向上する。

### 実装順序
1. ファイル名のリネーム（`GlobalAgentPanel.tsx` → `ProjectAgentPanel.tsx`）
2. コンポーネント名・エクスポート名の変更
3. メソッド名・変数名の変更
4. UI表記の変更
5. コメントの更新
6. テストの更新と実行
7. 後方互換性対応（設定ファイルマイグレーション）

## Dependencies
- `layoutConfigService.ts`: 設定スキーマの変更
- 全てのimport文の更新

## Testing Strategy
1. 全ユニットテストの実行（`npm test`）
2. E2Eテストの実行（`task electron:test:e2e`）
3. アプリの起動確認
4. 既存の設定ファイルがある場合の後方互換性確認
