# test-project Fixture

E2Eテスト用のメインfixtureプロジェクト。

## 用途

以下のE2Eテストファイルで使用される、自動実行ワークフローの包括的なテスト用fixture：

| テストファイル | 概要 |
|---------------|------|
| `auto-execution-workflow.e2e.spec.ts` | 自動実行の権限設定別シナリオテスト |
| `auto-execution-flow.e2e.spec.ts` | 自動実行フローの包括的テスト（権限制御、ドキュメント生成、UI同期） |

## 構造

```
test-project/
├── .kiro/
│   ├── commands/
│   │   └── dummy.md              # ダミーコマンド
│   ├── specs/
│   │   └── test-feature/
│   │       ├── spec.json         # spec-init状態
│   │       └── requirements.md   # requirements-init状態
│   ├── steering/
│   │   └── product.md            # プロダクト情報
│   ├── settings -> symlink       # 設定（シンボリックリンク）
│   └── sdd-orchestrator.json     # SDD Orchestrator設定
└── README.md
```

## 初期状態

- `spec.json`: `phase: "initialized"`, 全承認フラグ `false`
- `requirements.md`: テンプレート状態

## テストでの使い方

各テスト前に以下の処理で初期状態にリセット：

1. `spec.json` を初期状態に書き戻し
2. `requirements.md` をテンプレート状態に書き戻し
3. `.kiro/runtime/agents/test-feature/` 内のagent JSONを削除
4. `.kiro/specs/test-feature/logs/` 内のログファイルを削除

## 注意事項

- このfixtureはgit管理されているため、テスト後は自動的に初期状態に戻せる
- Mock Claude CLI (`scripts/e2e-mock/mock-claude.sh`) と組み合わせて使用
- モック遅延: `E2E_MOCK_CLAUDE_DELAY=2`（2秒）
