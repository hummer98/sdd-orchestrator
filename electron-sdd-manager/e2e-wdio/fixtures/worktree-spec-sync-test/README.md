# Worktree Spec Sync Test Fixture

E2Eテスト用のフィクスチャ。以下の構造を持つ:

## Directory Structure

```
.kiro/
├── specs/
│   └── main-spec/              # メインブランチのSpec
│       ├── spec.json
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
├── worktrees/
│   └── specs/
│       └── worktree-spec/      # Worktreeディレクトリ (擬似)
│           └── .kiro/
│               └── specs/
│                   └── worktree-spec/  # Worktree内のSpec
│                       ├── spec.json   # worktree field あり
│                       ├── requirements.md
│                       ├── design.md
│                       └── tasks.md
└── steering/
    └── product.md
```

## Test Scenarios

1. **Spec一覧表示**: main-spec と worktree-spec の両方が表示されること
2. **Worktreeバッジ**: worktree-spec には Worktree バッジが表示されること
3. **ファイル監視**: 両方のSpec変更が検出されること
4. **Phase表示**: main-spec は tasks、worktree-spec は implementation フェーズ
