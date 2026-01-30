# projectConfigService エラー調査レポート

**日時**: 2026-01-30
**調査対象**: E2Eテスト実行時の`[projectConfigService] Invalid config format`エラー

## 問題の概要

E2Eテスト実行時に以下のエラーが頻発：

```
[electron-err] [projectConfigService] Invalid config format
[electron-err] [projectConfigService] Invalid config format for V3 load
```

## 根本原因

### 問題のファイル

**パス**: `electron-sdd-manager/e2e-wdio/fixtures/bugs-pane-test/.kiro/sdd-orchestrator.json`

**内容**:
```json
{
  "commandPrefix": "/kiro:",
  "autoExecution": {
    "enabled": false
  }
}
```

### 原因の詳細

1. **古い形式の設定ファイルが存在**
   - このファイルは古いスキーマで作成されたもの
   - `commandPrefix`と`autoExecution`フィールドを含む（現在のスキーマには存在しない）

2. **スキーマバリデーションの失敗**
   - V3スキーマ: `version: 3`フィールドが必須 → **不一致**
   - V2スキーマ: `version: 2`フィールドが必須 → **不一致**
   - V1スキーマ: `layout`フィールドが必須 → **不一致**

3. **エラーログの発生箇所**
   ```typescript
   // layoutConfigService.ts:201
   console.warn('[projectConfigService] Invalid config format');

   // layoutConfigService.ts:253
   console.warn('[projectConfigService] Invalid config format for V3 load');
   ```

### 発生タイミング

E2Eテスト実行中、以下の処理で頻繁に設定ファイルを読み込もうとする：

- `LOAD_LAYOUT_CONFIG` - レイアウト設定の読み込み
- `LOAD_PROFILE` - プロファイル設定の読み込み
- `LOAD_SKIP_PERMISSIONS` - パーミッション設定の読み込み（複数回）
- `LOAD_PROJECT_DEFAULTS` - プロジェクトデフォルト設定の読み込み

各処理で設定ファイルのバリデーションに失敗するため、エラーが繰り返し出力される。

## 現在の挙動

- エラーは出力されるが、アプリケーションは正常に動作
- `loadProjectConfig`は`null`を返し、設定がない状態として処理される
- E2Eテストは成功する（機能的な問題はない）

## 問題点

1. **ログの煩雑化**
   - E2Eテスト実行時に40回以上のエラーログが出力される
   - テスト結果の確認が困難になる

2. **警告レベルの不適切さ**
   - ファイルが存在しない場合は警告を出さない（正常）
   - 不明な形式の場合は警告を出す（過剰）
   - 両者とも同じ結果（`null`を返す）なのに、警告レベルが異なる

3. **後方互換性の欠如**
   - 古い形式の設定ファイルを適切に処理できない

## 解決策の提案

### Option A: Fixtureファイルの更新（簡易）

**アプローチ**: E2Eテストのfixtureファイルを削除または更新する

**実装**:
```bash
# fixtureファイルを削除
rm electron-sdd-manager/e2e-wdio/fixtures/bugs-pane-test/.kiro/sdd-orchestrator.json

# または、V3形式に更新
echo '{"version":3}' > electron-sdd-manager/e2e-wdio/fixtures/bugs-pane-test/.kiro/sdd-orchestrator.json
```

**メリット**:
- 簡単で即座に問題解決
- コード変更不要

**デメリット**:
- 根本的な解決ではない
- 他のプロジェクトでも同じ問題が発生する可能性がある

### Option B: ログレベルの調整（推奨）

**アプローチ**: 不明な形式の場合、警告を出さないまたはDEBUGレベルに変更

**実装**:
```typescript
// layoutConfigService.ts:201
// Before:
console.warn('[projectConfigService] Invalid config format');

// After:
// 警告を出さない（ファイルが存在しない場合と同様に扱う）
// または
logger.debug('[projectConfigService] Config file exists but format unrecognized, treating as no config');
```

**メリット**:
- ログの煩雑化を防ぐ
- アプリケーション動作は変わらない
- 後方互換性の向上

**デメリット**:
- 本当に壊れた設定ファイルがあっても気づきにくくなる可能性がある

### Option C: スキーマの拡張（包括的）

**アプローチ**: 古い形式の設定ファイルもサポートする

**実装**:
```typescript
// Legacy config schema
const LegacyConfigSchema = z.object({
  commandPrefix: z.string().optional(),
  autoExecution: z.object({
    enabled: z.boolean(),
  }).optional(),
});

// loadProjectConfig内で追加のバリデーション
const legacyResult = LegacyConfigSchema.safeParse(data);
if (legacyResult.success) {
  // マイグレーション: 空のV3設定として扱う
  return {
    version: 2,
    // layout/profileはnullとして扱われる
  };
}
```

**メリット**:
- 完全な後方互換性
- ユーザーの古いプロジェクトでも動作

**デメリット**:
- コードが複雑になる
- メンテナンスコストが増加

## 推奨アクション

**短期的対応（即座に実施）**: Option A - Fixtureファイルの削除
```bash
rm electron-sdd-manager/e2e-wdio/fixtures/bugs-pane-test/.kiro/sdd-orchestrator.json
```

**中長期的対応（次回リファクタリング時）**: Option B - ログレベルの調整

## 影響範囲

- **E2Eテスト**: ログが煩雑になるが、機能的な問題はない
- **ユーザー**: 古いプロジェクトで同様のエラーが出る可能性があるが、機能は正常
- **開発者**: デバッグ時にログが見づらくなる

## 参考情報

### 関連ファイル

- `electron-sdd-manager/src/main/services/layoutConfigService.ts` - 設定ファイルの読み込みロジック
- `electron-sdd-manager/e2e-wdio/fixtures/bugs-pane-test/.kiro/sdd-orchestrator.json` - 問題のファイル

### 現在のスキーマバージョン

- **V3** (最新): `version: 3`, profile, layout, commandsets, settings, defaults
- **V2**: `version: 2`, profile, layout
- **V1**: layout のみ

### 古い形式（非公式）

- `commandPrefix`, `autoExecution` - 現在は使用されていない
