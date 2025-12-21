# auto-exec-test Fixture

E2Eテスト用のシンプルなfixtureプロジェクト。

## 用途

`simple-auto-execution.e2e.spec.ts` で使用される、自動実行フロー（requirements → design → tasks）のテスト用fixture。

## 構造

```
auto-exec-test/
├── .kiro/
│   ├── commands/
│   │   └── dummy.md          # ダミーコマンド
│   ├── specs/
│   │   └── simple-feature/
│   │       ├── spec.json      # spec-init状態
│   │       └── requirements.md # requirements-init状態
│   ├── steering/
│   │   └── product.md         # プロダクト情報
│   └── sdd-orchestrator.json  # SDD Orchestrator設定
└── README.md
```

## 初期状態

- `spec.json`: `phase: "initialized"`, 全承認フラグ `false`
- `requirements.md`: テンプレート状態（requirements-init.md相当）

## テストでの使い方

各テスト前に以下の処理で初期状態にリセット：

1. `spec.json` を初期状態に書き戻し
2. `requirements.md` をテンプレート状態に書き戻し
3. `.kiro/runtime/agents/simple-feature/` 内のagent JSONを削除
4. `.kiro/specs/simple-feature/logs/` 内のログファイルを削除

## 注意事項

- このfixtureはgit管理されているため、テスト後は自動的に初期状態に戻せる
- Mock Claude CLI (`scripts/e2e-mock/mock-claude.sh`) と組み合わせて使用
