# Bug Analysis: profile-config-unification

## Summary
プロジェクト設定が2つのJSONファイルに分散しており、`.kiro/sdd-orchestrator.json`への統合が必要。

## Root Cause
設計時に関心の分離を意識しすぎた結果、同一プロジェクトの設定が2ファイルに分散。

### Technical Details
- **Location**:
  - `projectChecker.ts:226-247` - `profile.json`の読み込み
  - `unifiedCommandsetInstaller.ts:298-315` - `profile.json`の書き込み
  - `layoutConfigService.ts:52-54` - `sdd-orchestrator.json`のパス定義
- **Component**: 設定管理サービス群
- **Trigger**: 歴史的経緯による設計の不整合

## Impact Assessment
- **Severity**: Low（機能的な問題はない）
- **Scope**: 設定管理の複雑さ
- **Risk**: 修正自体は低リスク（後方互換性不要）

## Related Code

### profile.json（削除対象）
```
.kiro/settings/profile.json
{
  "profile": "cc-sdd-agent",
  "installedAt": "2024-..."
}
```

### sdd-orchestrator.json（統合先）
```
.kiro/sdd-orchestrator.json
{
  "version": 1,
  "layout": { ... }
}
```

## Proposed Solution

### 統合後のスキーマ
```typescript
{
  version: 2,  // バージョンアップ
  profile: {
    name: "cc-sdd-agent",
    installedAt: "2024-..."
  },
  layout: {
    leftPaneWidth: 288,
    ...
  }
}
```

### 修正対象ファイル
1. **layoutConfigService.ts** - スキーマ拡張（profile追加）
2. **projectChecker.ts** - 読み込み先を`sdd-orchestrator.json`に変更
3. **unifiedCommandsetInstaller.ts** - 書き込み先を`sdd-orchestrator.json`に変更
4. **validationService.ts** - 参照先の更新（必要に応じて）
5. **テストファイル** - 上記に対応するテストの更新

### Recommended Approach
`layoutConfigService.ts`を拡張して統合設定サービスとし、profile管理機能を追加する。

## Dependencies
- `projectChecker.ts` → `layoutConfigService.ts`への依存追加
- `unifiedCommandsetInstaller.ts` → `layoutConfigService.ts`への依存追加

## Testing Strategy
1. 既存のlayoutConfigService.test.tsを拡張
2. projectChecker.test.tsのパス参照を更新
3. unifiedCommandsetInstaller.test.tsのパス参照を更新
4. E2Eテストでプロファイル検出が正常に動作することを確認
