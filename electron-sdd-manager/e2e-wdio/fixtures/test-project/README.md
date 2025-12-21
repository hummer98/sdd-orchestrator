# test-project Fixture

E2Eテスト用のメインfixtureプロジェクト。

## 用途

以下のE2Eテストファイルで使用される、自動実行ワークフローの包括的なテスト用fixture：

| テストファイル | 概要 |
|---------------|------|
| `auto-execution-workflow.e2e.spec.ts` | 自動実行の権限設定別シナリオテスト |
| `auto-execution-flow.e2e.spec.ts` | 自動実行フローの包括的テスト（権限制御、ドキュメント生成、UI同期） |
| `auto-execution-intermediate-artifacts.e2e.spec.ts` | 中間成果物（requirements.md, design.md, tasks.md）の生成検証 |
| `workflow-integration.e2e.spec.ts` | ワークフロー統合テスト（プロジェクト選択、UI要素、フェーズ実行） |

## 構造

```
test-project/
├── .kiro/
│   ├── specs/
│   │   └── test-feature/
│   │       ├── spec.json           # spec-init状態（テスト前にリセット）
│   │       └── logs/               # 実行ログ（テスト中に生成）
│   ├── runtime/
│   │   └── agents/
│   │       └── test-feature/       # agentランタイムデータ（テスト中に生成）
│   └── sdd-orchestrator.json       # SDD Orchestrator設定（version 2形式）
└── README.md
```

## 初期状態

- `spec.json`:
  - `phase: "initialized"`
  - 全承認フラグ `generated: false, approved: false`
  - 言語設定: `language: "ja"`

```json
{
  "name": "test-feature",
  "description": "E2Eテスト用のテスト機能",
  "phase": "initialized",
  "language": "ja",
  "approvals": {
    "requirements": { "generated": false, "approved": false },
    "design": { "generated": false, "approved": false },
    "tasks": { "generated": false, "approved": false }
  }
}
```

## テストシナリオ

### 1. 権限設定別の自動実行テスト (`auto-execution-workflow.e2e.spec.ts`)

| シナリオ | 権限設定 | 期待動作 |
|----------|----------|----------|
| 全フェーズ許可 | req/design/tasks = ON | requirements → design → tasks 順次実行 |
| requirementsのみ許可 | req = ON, 他 = OFF | requirementsのみ実行して停止 |
| req+design許可 | req/design = ON, tasks = OFF | design完了後に停止 |

### 2. 自動実行フローテスト (`auto-execution-flow.e2e.spec.ts`)

- 権限設定に基づく停止位置の検証
- ドキュメント生成後のメインパネル更新
- spec.json更新とUI同期
- 実行中のUI無効化
- 完了後のUI/内部状態更新

### 3. 中間成果物テスト (`auto-execution-intermediate-artifacts.e2e.spec.ts`)

- 各フェーズでの成果物生成検証
- フェーズ進行中のステータスアイコン更新
- spec.jsonとUIの同期確認
- 生成コンテンツの内容検証

### 4. ワークフロー統合テスト (`workflow-integration.e2e.spec.ts`)

- プロジェクト選択とspec読み込み
- UI要素の表示確認
- Mock Claude CLIを使用したフェーズ実行
- セキュリティ設定（contextIsolation, nodeIntegration）確認

## テストでの使い方

各テストの `beforeEach` で以下の処理を実行：

1. **spec.jsonのリセット**: 初期状態に書き戻し
2. **生成ファイルの削除**: `requirements.md`, `design.md`, `tasks.md` を削除
3. **プロジェクト選択**: Zustand store経由でfixtureプロジェクトを選択
4. **spec選択**: `test-feature` specを選択

```typescript
// 例: beforeEach での初期化
beforeEach(async () => {
  resetSpecJson();           // spec.jsonを初期状態に
  cleanupGeneratedFiles();   // 生成ファイルを削除

  await selectProjectViaStore(FIXTURE_PROJECT_PATH);
  await selectSpecViaStore('test-feature');
});
```

## テスト実行コマンド

```bash
# 全E2Eテスト実行
npm run test:e2e
# または
task electron:test:e2e

# 特定テストファイルのみ実行
npx wdio wdio.conf.ts --spec e2e-wdio/auto-execution-flow.e2e.spec.ts
```

## 注意事項

- このfixtureはgit管理されているが、テスト中に生成されるファイル（`requirements.md`, `design.md`, `tasks.md`, logs, agents）は `.gitignore` に含まれていないため、テスト後のクリーンアップを推奨
- Mock Claude CLI (`E2E_MOCK_CLAUDE_COMMAND`) と組み合わせて使用
- `sdd-orchestrator.json` は version 2 形式を使用
- テストはZustand storeを直接操作してUI操作の不安定さを回避

## 関連ファイル

- Mock Claude CLI: `scripts/e2e-mock/mock-claude.sh`
- WebdriverIO設定: `wdio.conf.ts`
- E2Eテストディレクトリ: `e2e-wdio/`
