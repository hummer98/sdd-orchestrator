# Claude CLI ファイル読み込み仕様

## CLAUDE.md の自動読み込み

Claude CLIは実行時に以下の`CLAUDE.md`を暗黙的に読み込む：

1. **カレントディレクトリの`CLAUDE.md`** - 最優先
2. **親ディレクトリの`CLAUDE.md`** - ディレクトリ階層を遡って検索
3. **`~/.claude/CLAUDE.md`** - グローバル設定

また、`.claude/`ディレクトリ内の`CLAUDE.md`も認識される。

## 特定ファイルの明示的読み込み

`--add-file`（または`-a`）オプションで特定のファイルを追加で読み込ませる：

```bash
claude --add-file path/to/specific.md "質問内容"
```

### 複数ファイルの読み込み

```bash
claude -a file1.md -a file2.md "質問内容"
```

## 注意事項

- `--add-file`は**追加で読み込む**オプション
- `CLAUDE.md`の自動読み込みを**無効化するものではない**

## CLAUDE.md自動読み込みの回避方法

公式オプションは存在しない。ワークアラウンド：

### 1. CLAUDE.mdが存在しないディレクトリで実行

```bash
cd /tmp && claude --add-file /path/to/specific.md "質問"
```

### 2. 一時的にCLAUDE.mdをリネーム

```bash
mv CLAUDE.md CLAUDE.md.bak
claude --add-file other.md "質問"
mv CLAUDE.md.bak CLAUDE.md
```

## 参考

```bash
claude --help  # 全オプションの確認
```
