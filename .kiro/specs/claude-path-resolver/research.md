# Research & Design Decisions: Claude Path Resolver

## Summary

- **Feature**: `claude-path-resolver`
- **Discovery Scope**: Extension
- **Key Findings**:
  - GUIアプリ起動時にはシェルプロファイルが読み込まれず、`process.env.PATH` が制限される
  - ログインシェル（`-l` フラグ）経由で `which` を実行することで、ユーザー環境のPATHを正確に取得可能
  - 既存の `cloudflaredBinaryChecker.ts` と同様のパターンでサービスを実装できる

## Research Log

### GUIアプリケーションにおけるPATH問題

- **Context**: macOS/Linux上でGUIアプリケーション（Electron含む）を起動した場合、ターミナルから起動した場合と異なり、シェルのプロファイル（`.zshrc`, `.bash_profile`等）が読み込まれない。
- **Sources Consulted**:
  - Electronドキュメント: [Environment Variables](https://www.electronjs.org/docs/latest/api/environment-variables)
  - macOS Launchd ドキュメント
- **Findings**:
  - GUIアプリ起動時のPATHは `/usr/bin:/bin:/usr/sbin:/sbin` 等の最小限のパスのみ
  - Homebrewでインストールしたコマンド（`/opt/homebrew/bin`）はPATHに含まれない
  - `process.env.PATH` はアプリ起動時の環境を継承するため、GUIから起動すると制限される
- **Implications**: `which claude` を単純に実行しても、ユーザーのシェル環境とは異なるPATHで検索される

### ログインシェル経由でのコマンド解決

- **Context**: ユーザーのシェル環境を正確に再現する方法の調査
- **Sources Consulted**:
  - bash/zsh マニュアル（`-l` フラグの動作）
  - Node.js child_process ドキュメント
- **Findings**:
  - `$SHELL -l -c 'command'` 形式でログインシェルを起動すると、プロファイルが読み込まれる
  - `$SHELL` 環境変数にはユーザーのデフォルトシェルパスが格納されている（例: `/bin/zsh`）
  - `-l` フラグによりログインシェルとして動作し、`.zshrc` や `.bash_profile` が読み込まれる
  - `-c` フラグでコマンドを実行して終了
- **Implications**: `$SHELL -l -c 'which claude'` を実行することで、ユーザー環境と同じPATHでclaudeコマンドを検索可能

### 既存コードパターンの分析

- **Context**: 類似機能の既存実装パターンを調査
- **Sources Consulted**:
  - `cloudflaredBinaryChecker.ts` — cloudflaredバイナリの検出ロジック
  - `agentProcess.ts` — 現在のPATH追加方式
- **Findings**:
  - `cloudflaredBinaryChecker.ts` は以下の順序で検索:
    1. カスタムパス（設定から取得）
    2. `which cloudflared` コマンド
    3. 共通パス（`/usr/local/bin`, `/opt/homebrew/bin`）
  - 現在の `agentProcess.ts` はハードコードで `/opt/homebrew/bin:/usr/local/bin` をPATHに追加
  - シングルトンパターンで `getCloudflaredBinaryChecker()` を提供
- **Implications**: 同様のシングルトンパターンで `ClaudePathResolverService` を実装可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| ログインシェル経由which | `$SHELL -l -c 'which claude'` を実行 | ユーザー環境と完全に一致 | シェル起動オーバーヘッド（数百ms） | 採用 |
| ハードコードパス拡充 | 既知のパスをすべてリストアップ | 実装が単純 | 環境ごとの差異に対応不可 | 却下 |
| 設定画面での手動指定 | ユーザーがパスを入力 | 確実に任意のパスを指定可能 | UX悪化、初期設定の手間 | 却下（Out of Scope） |

## Design Decisions

### Decision: ログインシェル経由でのパス解決

- **Context**: GUIアプリ起動時にユーザーのPATH設定を正確に取得する必要がある
- **Alternatives Considered**:
  1. ハードコードパスの拡充 — すべての環境に対応するのは不可能
  2. 設定画面での手動指定 — 要件でOut of Scopeと明記
- **Selected Approach**: `$SHELL -l -c 'which claude'` を実行してパスを動的に解決
- **Rationale (Why)**:
  - 技術的正しさ: ユーザーのシェル環境を正確に再現
  - 保守性: ハードコードパスのメンテナンス不要
  - 互換性: zsh, bash, fish等の主要シェルで動作
- **Trade-offs**: 起動時に追加の子プロセス起動が発生（数百ミリ秒程度のオーバーヘッド）
- **Follow-up**: パフォーマンス計測（起動時間への影響）

### Decision: シングルトンサービスによるキャッシュ

- **Context**: 解決したパスをアプリ全体で共有する方法
- **Alternatives Considered**:
  1. グローバル変数 — テスト困難
  2. 毎回解決 — オーバーヘッド大
- **Selected Approach**: シングルトンパターンのサービスクラス
- **Rationale (Why)**:
  - 既存の `cloudflaredBinaryChecker.ts` と同じパターン
  - テスト時のモック差し替えが容易
- **Trade-offs**: シングルトンの一般的な欠点（グローバル状態）はあるが、許容範囲
- **Follow-up**: ユニットテストでのモック方法を確認

## Implementation Guidance

### シェルコマンド実行例

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function resolveClaudePath(): Promise<string | null> {
  const shell = process.env.SHELL || '/bin/sh';

  try {
    const { stdout } = await execAsync(`${shell} -l -c 'which claude'`, {
      timeout: 5000, // 5秒タイムアウト
    });
    const path = stdout.trim();
    return path || null;
  } catch (error) {
    // which失敗またはタイムアウト
    return null;
  }
}
```

### E2Eテスト対応

既存の `E2E_MOCK_CLAUDE_COMMAND` 環境変数との互換性を維持:

```typescript
function getClaudePath(): string {
  // E2Eテスト用オーバーライド
  if (process.env.E2E_MOCK_CLAUDE_COMMAND) {
    return process.env.E2E_MOCK_CLAUDE_COMMAND;
  }
  // キャッシュされたパスまたはフォールバック
  return this.resolvedPath ?? 'claude';
}
```

### ワーニング表示

```typescript
import { dialog } from 'electron';

function showClaudeNotFoundWarning(): void {
  dialog.showMessageBox({
    type: 'warning',
    title: '警告',
    message: 'claudeコマンドが見つかりません',
    detail: 'Claude Codeがインストールされているか、PATHが通っているか確認してください',
    buttons: ['OK'],
  });
}
```

## Risks & Mitigations

- **Risk 1: シェル起動のオーバーヘッド** — 起動時の非同期実行でUIブロックを回避。数百ミリ秒は許容範囲。
- **Risk 2: $SHELL未設定** — `/bin/sh` をフォールバックとして使用
- **Risk 3: シェルタイムアウト** — 5秒タイムアウトを設定、失敗時は 'claude' をそのまま使用

## References

- [Electron Environment Variables](https://www.electronjs.org/docs/latest/api/environment-variables)
- [Bash Reference Manual - Invocation](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html)
- 既存実装: `electron-sdd-manager/src/main/services/cloudflaredBinaryChecker.ts`
