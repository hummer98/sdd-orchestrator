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
├── bugs/
│   ├── main-bug/               # 通常モードのBug
│   │   ├── bug.json            # worktree field なし
│   │   ├── report.md
│   │   └── analysis.md
│   └── worktree-bug/           # WorktreeモードのBug
│       ├── bug.json            # worktree field あり
│       ├── report.md
│       ├── analysis.md
│       └── fix.md
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

### Specs
1. **Spec一覧表示**: main-spec と worktree-spec の両方が表示されること
2. **Worktreeバッジ**: worktree-spec には Worktree バッジが表示されること
3. **ファイル監視**: 両方のSpec変更が検出されること
4. **Phase表示**: main-spec は tasks、worktree-spec は implementation フェーズ

### Bugs
5. **Bug一覧表示**: main-bug と worktree-bug の両方が表示されること
6. **Worktreeバッジ**: worktree-bug には Worktree バッジが表示されること
7. **Phase表示**: main-bug は analyze、worktree-bug は fix フェーズ
