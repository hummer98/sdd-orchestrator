# Research & Design Decisions: 外部ツールパス解決の統合

## Summary

- **Feature**: `unified-tool-path-resolver`
- **Discovery Scope**: Extension（既存実装の統合・リファクタリング）
- **Key Findings**:
  - 既存`ClaudePathResolverService`のログインシェル解決ロジックは堅牢で再利用可能
  - `ProjectChecker`の`checkJjAvailability`/`checkJqAvailability`は単純な`exec`で、GUIアプリ起動時のPATH制限問題を解決していない
  - E2Eモック対応は環境変数ベースで既に実装済み（`E2E_MOCK_CLAUDE_COMMAND`）

## Research Log

### 既存実装の分析

- **Context**: 統合対象の既存コードベースを理解するため
- **Sources Consulted**:
  - `/electron-sdd-manager/src/main/services/claudePathResolverService.ts`
  - `/electron-sdd-manager/src/main/services/projectChecker.ts`
- **Findings**:
  - `ClaudePathResolverService`:
    - シングルトンパターンで実装
    - `$SHELL -il -c 'which claude'`でログインシェル経由解決
    - `-il`フラグで`.zshrc`と`.zprofile`両方を読み込み
    - 5秒タイムアウト設定
    - macOS zshセッション復元メッセージへの対応（最終行のみ抽出）
    - E2E_MOCK_CLAUDE_COMMAND環境変数によるモック対応
  - `ProjectChecker.checkJj/JqAvailability`:
    - 単純な`execAsync('jj --version')`
    - ログインシェルを使用しないため、GUI起動時にPATH制限問題が発生
- **Implications**: `ClaudePathResolverService`のロジックを汎用化して全ツールに適用する

### macOS GUIアプリのPATH制限問題

- **Context**: なぜログインシェル経由が必要か
- **Sources Consulted**: Electron GitHub Issues、macOS開発ドキュメント
- **Findings**:
  - macOSでGUIアプリを起動すると、シェルプロファイル（`.zshrc`, `.zprofile`）が読み込まれない
  - デフォルトPATHは`/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`程度
  - Homebrewは`/opt/homebrew/bin`（Apple Silicon）または`/usr/local/bin`にインストール
  - ユーザーの`.zshrc`で`eval "$(/opt/homebrew/bin/brew shellenv)"`等の設定が必要
- **Implications**: `-il`フラグによるインタラクティブログインシェル起動が唯一の解決策

### 呼び出し元の分析

- **Context**: 移行が必要な呼び出し元を特定
- **Sources Consulted**: Grep検索結果
- **Findings**:
  - `getClaudePathResolverService().getClaudePath()`:
    - `agentProcess.ts`（line 21）
    - `engineCommandResolverService.ts`（line 42）
  - `getClaudePathResolverService().resolveClaudePath()`:
    - `index.ts`（line 153）
  - `projectChecker.checkJjAvailability()`:
    - `handlers.ts`（line 576, 590）
    - `projectStore.ts`（IPC経由、直接呼び出しなし）
  - `projectChecker.checkJqAvailability()`:
    - 直接呼び出し箇所なし（未使用）
- **Implications**: 4ファイル（index.ts, agentProcess.ts, engineCommandResolverService.ts, handlers.ts）の変更が必要

## Architecture Pattern Evaluation

| オプション | 説明 | 強み | リスク/制限 | 備考 |
|----------|------|------|------------|------|
| 統合シングルトン | 単一サービスで全ツール管理 | シンプル、一貫性、重複排除 | 単一障害点（ただし影響軽微） | **選択** |
| ファクトリーパターン | ツールごとにResolverインスタンス生成 | 拡張性、疎結合 | 過剰設計、複雑化 | 却下 |
| 既存構造維持 | jj/jqにログインシェル追加のみ | 変更最小 | 重複コード、DRY違反 | 却下 |

## Design Decisions

### Decision: ログインシェル実行方式

- **Context**: GUIアプリ起動時のPATH制限を回避する方法
- **Alternatives Considered**:
  1. 環境変数直接設定 — Electronプロセス起動前に設定が必要で現実的でない
  2. `source ~/.zshrc`実行 — シェル固有で複雑
  3. ログインシェル経由`which` — ユーザー環境を正確に反映
- **Selected Approach**: `$SHELL -il -c 'which {tool}'`
- **Rationale (Why)**:
  - ユーザーのシェル設定を完全に反映
  - 既存`ClaudePathResolverService`で実証済み
  - `-i`（インタラクティブ）と`-l`（ログイン）両方で`.zshrc`と`.zprofile`を読み込み
- **Trade-offs**: シェル起動オーバーヘッドあり（約100-300ms）、並列実行で軽減
- **Follow-up**: パフォーマンスモニタリングで問題があれば再検討

### Decision: E2Eモック環境変数命名規則

- **Context**: テスト時のモックパス指定方法
- **Alternatives Considered**:
  1. `MOCK_{TOOL}_PATH` — 一般的だが既存との互換性なし
  2. `E2E_MOCK_{TOOL}_COMMAND` — 既存規則に準拠
  3. 設定ファイルベース — 複雑化
- **Selected Approach**: `E2E_MOCK_{TOOL}_COMMAND`（大文字ツール名）
- **Rationale (Why)**:
  - 既存`E2E_MOCK_CLAUDE_COMMAND`との一貫性
  - 環境変数は設定が容易でCIとも相性良好
- **Trade-offs**: 環境変数名が長い、ツール名に特殊文字使用不可
- **Follow-up**: jj/jq用の`E2E_MOCK_JJ_COMMAND`、`E2E_MOCK_JQ_COMMAND`を追加

### Decision: バージョン取得タイミング

- **Context**: ツールのバージョン情報をいつ取得するか
- **Alternatives Considered**:
  1. パス解決と同時に取得 — 1回の実行で完結
  2. パス解決後に別途取得 — シェル実行2回
  3. バージョン取得しない — 情報不足
- **Selected Approach**: パス解決成功後に`{path} --version`で取得
- **Rationale (Why)**:
  - パスが解決できていればバージョン取得も成功する可能性が高い
  - 別コマンドとして実行するほうがエラーハンドリングが明確
- **Trade-offs**: シェル実行が2回になる（パス解決 + バージョン取得）
- **Follow-up**: パフォーマンス問題があれば1回の実行に統合を検討

## Implementation Guidance

### ToolPathResolverService実装パターン

```typescript
// 参考: 既存ClaudePathResolverServiceからの汎用化パターン
export class ToolPathResolverService {
  private resolvedCache: Map<string, ToolResolutionResult> = new Map();
  private initialized = false;

  async resolveAll(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // 並列解決
    await Promise.all(
      TOOL_DEFINITIONS.map(async (def) => {
        const result = await this.resolveTool(def.name);
        this.resolvedCache.set(def.name, result);
      })
    );
  }

  async resolveTool(toolName: string): Promise<ToolResolutionResult> {
    // E2Eモック優先
    const mockEnvKey = `E2E_MOCK_${toolName.toUpperCase()}_COMMAND`;
    const mockPath = process.env[mockEnvKey];
    if (mockPath) {
      return { resolved: true, path: mockPath };
    }

    // ログインシェル経由で解決（既存ロジック）
    const shell = process.env.SHELL || '/bin/sh';
    const command = `${shell} -il -c 'which ${toolName}'`;
    // ... 既存ClaudePathResolverServiceと同様の実装
  }

  getPath(toolName: string): string {
    // E2Eモック優先（getPathでも確認）
    const mockEnvKey = `E2E_MOCK_${toolName.toUpperCase()}_COMMAND`;
    const mockPath = process.env[mockEnvKey];
    if (mockPath) return mockPath;

    const result = this.resolvedCache.get(toolName);
    return result?.path || toolName; // 未解決時はツール名をそのまま返す
  }
}
```

### 移行作業の詳細

#### index.ts 変更

```typescript
// Before
import { getClaudePathResolverService } from './services/claudePathResolverService';

async function resolveClaudePathAtStartup(): Promise<void> {
  const resolver = getClaudePathResolverService();
  const result = await resolver.resolveClaudePath();
  // ...
}

// After
import { getToolPathResolverService } from './services/toolPathResolverService';

async function resolveToolPathsAtStartup(): Promise<void> {
  const resolver = getToolPathResolverService();
  await resolver.resolveAll();

  // claude未解決時のみ警告ダイアログ（既存動作維持）
  if (!resolver.isResolved('claude')) {
    dialog.showMessageBox({
      type: 'warning',
      title: 'Claude Command Not Found',
      message: 'claudeコマンドが見つかりません...',
      buttons: ['OK'],
    });
  }
}
```

#### handlers.ts 変更

```typescript
// Before
safeHandle(IPC_CHANNELS.CHECK_JJ_AVAILABILITY, async () => {
  const result = await projectChecker.checkJjAvailability();
  return result;
});

// After
safeHandle(IPC_CHANNELS.CHECK_JJ_AVAILABILITY, async () => {
  const status = getToolPathResolverService().getStatus('jj');
  if (!status) {
    // 定義が見つからない場合（通常発生しない）
    return { name: 'jj', available: false, installGuidance: 'brew install jj' };
  }
  // ToolStatus -> ToolCheck 変換（IPC互換性維持）
  return {
    name: status.definition.name,
    available: status.resolution.resolved,
    version: status.resolution.version,
    installGuidance: status.definition.installGuidance,
  };
});
```

### テスト実装ガイダンス

#### ユニットテストパターン

```typescript
describe('ToolPathResolverService', () => {
  let mockExecDeps: ExecDeps;

  beforeEach(() => {
    mockExecDeps = {
      execAsync: vi.fn(),
    };
  });

  describe('resolveTool', () => {
    it('should resolve tool path via login shell', async () => {
      mockExecDeps.execAsync.mockResolvedValue({
        stdout: '/opt/homebrew/bin/jj\n',
        stderr: '',
      });

      const service = new ToolPathResolverService(mockExecDeps);
      const result = await service.resolveTool('jj');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/opt/homebrew/bin/jj');
      expect(mockExecDeps.execAsync).toHaveBeenCalledWith(
        expect.stringContaining("-il -c 'which jj'"),
        expect.any(Object)
      );
    });

    it('should return E2E mock path when environment variable is set', async () => {
      process.env.E2E_MOCK_JJ_COMMAND = '/mock/jj';

      const service = new ToolPathResolverService(mockExecDeps);
      const result = await service.resolveTool('jj');

      expect(result.resolved).toBe(true);
      expect(result.path).toBe('/mock/jj');
      expect(mockExecDeps.execAsync).not.toHaveBeenCalled();

      delete process.env.E2E_MOCK_JJ_COMMAND;
    });
  });
});
```

## Risks & Mitigations

| リスク | 軽減策 |
|-------|-------|
| 起動時間増加（3ツール並列解決） | Promise.allで並列実行、ログ監視で問題検知 |
| シェル環境依存の動作差異 | テストでモック使用、実環境テストはCI macOSで実施 |
| 既存呼び出し元の移行漏れ | Grep検索で全呼び出し元を事前特定、コンパイルエラーで検知 |
| IPC互換性破損 | ToolStatus→ToolCheck変換で既存型を維持 |

## References

- [Electron macOS PATH Issues](https://github.com/electron/electron/issues/4690) — GUIアプリのPATH制限に関する議論
- 既存実装: `/electron-sdd-manager/src/main/services/claudePathResolverService.ts`
- 既存テスト: `/electron-sdd-manager/src/main/services/claudePathResolverService.test.ts`
