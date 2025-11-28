# Claude CLI stdin処理に関する技術メモ

## 問題

Electronアプリから`claude -p`コマンドを`child_process.spawn()`で起動すると、プロセスが即座に終了し出力が取得できない。

## 原因

### 1. `stdio: 'inherit'`の問題

- `stdin: 'inherit'`を使用すると、親プロセス（Electronアプリ）のstdinを継承しようとする
- Electronアプリには親のstdinが存在しないため、子プロセスが正常に動作しない
- また、`'inherit'`を使うと`child.stdout`が`null`になり、出力をキャプチャできない

### 2. Claude CLIの`-p`フラグの動作

- `-p`（`--print`）フラグは非対話モードで動作
- 標準入力からの入力を受け付け、処理後に終了する
- stdinが閉じられないと、入力待ちでハングする可能性がある

### 3. Ink（TUIライブラリ）のRaw Mode問題

- Claude CLIはInkライブラリを使用
- パイプされたstdin（非対話モード）ではraw modeをサポートしていない
- `-p`フラグを使うことでこの問題を回避可能

## 解決策

`stdin: 'pipe'`に変更し、プロセス起動後すぐに`stdin.end()`を呼ぶ。

```typescript
// Before (問題あり)
this.process = spawn(options.command, options.args, {
  cwd: options.cwd,
  shell: false,
  stdio: ['inherit', 'pipe', 'pipe'],  // stdinがinherit
  // ...
});

// After (正しい実装)
this.process = spawn(options.command, options.args, {
  cwd: options.cwd,
  shell: false,
  stdio: ['pipe', 'pipe', 'pipe'],  // 全てpipe
  // ...
});

// プロセス起動後すぐにstdinを閉じる
this.process.stdin?.end();
```

## 検証

コマンドラインでの動作確認：

```bash
# stdinを閉じずに実行 → タイムアウト
timeout 5 claude -p "echo hello"  # Exit code: 124

# stdinを閉じて実行 → 正常動作
echo "" | claude -p "echo hello"  # 正常に出力される
```

## 参考リンク

- [Node.js Child Process Documentation](https://nodejs.org/api/child_process.html)
- [CLI reference - Claude Code Docs](https://code.claude.com/docs/en/cli-reference)
- [GitHub Issue #1072 - Raw mode not supported](https://github.com/anthropics/claude-code/issues/1072)
- [Stack Overflow - stdio inherit output capture](https://stackoverflow.com/questions/54527014/when-using-the-child-process-spawn-method-with-stdio-inherit-is-it-possi)

## 関連ファイル

- `electron-sdd-manager/src/main/services/agentProcess.ts`

## 日付

2025-11-28
