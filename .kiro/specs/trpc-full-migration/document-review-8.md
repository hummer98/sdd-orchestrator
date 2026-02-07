# Specification Review Report #8

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, document-review-7.md, document-review-7-reply.md, product.md, tech.md, structure.md, design-principles.md + 実装済みコードベース検証（context.ts, router.ts, handler.ts, routers/system.ts, routers/config.ts, helpers/test-helpers.ts, shared/hooks/, shared/trpc/vanillaClient.ts, Renderer側差し替え状況）

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 1 |
| WARNING | 2 |
| INFO | 2 |

レビュー#7の修正は**全7項目が正しく適用済み**である。本レビュー#8では、**実装済みタスク（Task 1.1, 1.2, 2.1, 2.2, 2.3, 3.1）とドキュメントの整合性**を中心に、design.mdの設計指針と実際のコード実装のギャップ分析を実施した。

主要な発見:
- design.mdの「Zodスキーマ配置」セクションが`src/main/trpc/schemas/*.ts`（ドメイン別ファイル分離）を指定しているが、実装ではルーターファイル内にインライン定義されている（**CRITICAL**: 今後のTask実装者が誤った配置で実装するリスク）
- Task 3.2がtasks.mdで「未完了」だが、vanillaClientの実装とRenderer側の部分的差し替え（RemoteAccessPanel, ProjectSettingsDialog, VcsSchemeSelector, EngineConfigSection, projectStore, agentStoreAdapter, toolPathStore）が既に進行している
- design.mdのDD-006（Context DI）は忠実に実装されている

## 1. Document Consistency Analysis

### 1.1 Requirements <-> Design Alignment

**全体評価**: 良好。レビュー#7で指摘された全ての不整合が修正済み。

新規検出なし。

### 1.2 Design <-> Tasks Alignment

**全体評価**: 概ね良好だが、1件の重要な乖離あり。

| # | 不整合 | design.md | 実装/tasks.md | 重要度 |
|---|--------|-----------|---------------|--------|
| 1 | Zodスキーマ配置方針 | design.md行472-488: `src/main/trpc/schemas/` にドメイン別スキーマファイルを分離配置 | 実装: 各ルーターファイル内（`routers/system.ts`, `routers/config.ts`）にインライン定義。`schemas/` ディレクトリは存在しない | CRITICAL |

**詳細**: design.mdでは以下の配置を指定:
```
src/main/trpc/schemas/
├── system.ts
├── config.ts
├── project.ts
...
```

しかし実装済みのsystem.tsとconfig.tsでは、Zodスキーマがルーターファイル内に直接定義されている。これ自体は技術的に問題ないが、**今後のTask実装者（Task 4以降）がdesign.mdの配置に従って`schemas/`ディレクトリにスキーマを作成する可能性**がある。実装の一貫性が失われるリスクがあるため、design.mdを実装に合わせて更新するか、今後のTaskで`schemas/`配置に移行するかを決定する必要がある。

### 1.3 Design <-> Tasks Completeness

前回レビュー#7からの変更なし。全カテゴリで完了。

### 1.4 Acceptance Criteria -> Tasks Coverage

前回レビュー#7で検出されたCRITICAL 2件は修正済み。

**Validation Results**:
- [x] 全criterion IDからrequirements.mdへのマッピングが完了
- [x] ユーザー向けcriterionにFeature Implementationタスクが存在
- [x] Cleanupタスクに対応する削除対象ファイルが具体的に列挙されている
- [x] worktreeImplHandlers.tsの記述が正確（ユーティリティファイル、チャンネル登録なし）
- [x] bug routerマッピングテーブルにSETTINGS_BUGS_WORKTREE_DEFAULT 2チャンネルが含まれている

### 1.5 Integration Test Coverage

前回レビュー#7と同等。全ポイントで良好。

### 1.6 Cross-Document Contradictions

| # | 矛盾内容 | 文書A | 文書B | 重要度 |
|---|---------|-------|-------|--------|
| 1 | **Zodスキーマ配置方針 vs 実装** | design.md行472-488: `src/main/trpc/schemas/*.ts` にファイル分離 | 実装: ルーターファイル内にインライン定義（`schemas/`ディレクトリ不在） | CRITICAL |
| 2 | **Task 3.2ステータスとRenderer側差し替え** | tasks.md Task 3.2: 未完了（`[ ]`） | 実装: vanillaClient完成済み、RemoteAccessPanel/ProjectSettingsDialog/VcsSchemeSelector/EngineConfigSection/projectStore/agentStoreAdapter/toolPathStoreで既にtRPCに差し替え済み | WARNING |
| 3 | **design.md ConfigRouterProcedures型定義 vs 実装の引数形式** | design.md行280: `loadSkipPermissions: Query<void, Record<string, boolean>>` | 実装: `loadSkipPermissions`の入力スキーマに`projectPath`が必要（`z.object({ projectPath: z.string() })`） | WARNING |

**#2の詳細**: Task 3.2は「Config関連のRenderer呼び出しをtRPCフックに置換する」と定義されているが、実際にはTask 3.1の実装と並行してvanillaClient + 複数コンポーネント/Storeの差し替えが既に進行している。tasks.mdのステータスを実態に合わせるか、Task 3.2の完了基準を明確化する必要がある。

**#3の詳細**: design.mdのConfigRouterProceduresインターフェースでは、プロジェクト固有設定（skipPermissions, projectDefaults, profile, engineConfig, remoteUiAutoStart）の入力が`void`として記載されているが、実装では全て`projectPath: string`を入力パラメータとして受け取る。これはdesign.mdの疑似コードが簡略化されているためだが、実装者が混乱する可能性がある。

## 2. Gap Analysis

### 2.1 Technical Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **vanillaClientのRemote UI対応**: `vanillaClient.ts`は`require('electron-trpc/renderer')`を使用しており、Remote UIからは利用不可。現在のdesign.mdでは「Remote UIはScope外で維持」としているが、vanillaClient使用箇所がRemote UIから呼ばれるSharedストア（toolPathStore, agentStoreAdapter）に存在する場合の影響が未定義 | INFO | Remote UIからSharedストアのtRPC呼び出しが失敗する可能性。ただし、Remote UIは本Spec範囲外のため、将来的な検討事項 |
| 2 | **テストヘルパーの配置**: `helpers/test-helpers.ts`がsrc/main/trpc/helpers/に配置されているが、design.mdのImpact Analysis Contractには記載なし | INFO | 機能的影響なし。将来の実装者がテストヘルパーの存在を知るために有用 |

### 2.2 Operational Considerations

特記事項なし。

## 3. Ambiguities and Unknowns

| # | 曖昧な記述 | 文書 | 具体化が必要な理由 |
|---|-----------|------|-------------------|
| 1 | **design.md ConfigRouterProceduresのprojectPath入力**: loadSkipPermissions, saveSkipPermissions, loadProjectDefaults, saveProjectDefaults, loadProfile, loadEngineConfig, saveEngineConfig, loadRemoteUiAutoStart, saveRemoteUiAutoStartの9プロシージャはdesign.mdで`Query<void, ...>`または`Mutation<{ ... }, void>`と記載されているが、実装では全てprojectPathを入力として要求する | design.md行277-303 | 後続Task実装時に入力スキーマの設計が混乱する可能性 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**全体評価**: 優良。

- **tech.md**: tRPC関連技術の記載はTask 13.1で更新予定。現時点で問題なし
- **structure.md**: `src/main/trpc/helpers/`ディレクトリが追加されているが、structure.mdにはまだ反映されていない。Task 13.2で対応予定
- **design-principles.md**: DD-002（薄いアダプター）、DD-004（ZodスキーマSSoT）、DD-006（Context DI）は全て忠実に実装されている
- **Electron Process Boundary Rules**: context.tsの`getCurrentProjectPath/setProjectPath`パターンは、Mainプロセスでのステート保持原則に準拠

### 4.2 Integration Concerns

| 懸念 | 影響 | 対応状況 |
|------|------|---------|
| Remote UI + vanillaClient | vanillaClientはipcLink使用のためRemote UIから利用不可 | DD-005で方針定義済み。Scope外で問題なし |
| configRouter + projectPath依存 | プロジェクト固有設定APIはprojectPath未設定時にエラー | 実装でguard済み（nullチェック＋TRPCError） |

### 4.3 Migration Requirements

前回レビュー#7と同等。問題なし。

## 5. Recommendations

### Critical Issues (Must Fix)

1. **design.mdのZodスキーマ配置セクションを実装に合わせて更新する**（Section 1.2 #1、Section 1.6 #1）
   - 現在design.md行472-488では`src/main/trpc/schemas/*.ts`にドメイン別ファイル分離を指定
   - 実装済み2ルーター（system, config）ではルーターファイル内にインライン定義
   - **推奨**: design.mdのスキーマ配置セクションを以下のように修正:
     - 「各ルーターファイル内にZodスキーマをインライン定義する。スキーマが肥大化した場合はルーター単位で`schemas/`への分離を検討する」
     - `src/main/trpc/schemas/`ディレクトリツリーの記載を削除し、実態に合わせる
   - **理由**: 今後13個のルーターを実装するTask 4以降で、実装者がdesign.mdの指示に従って`schemas/`ディレクトリにファイルを作成し、既存ルーター（system, config）と配置が不統一になるリスクを防止

### Warnings (Should Address)

1. **design.md ConfigRouterProceduresインターフェースのprojectPath入力を実装に合わせる**（Section 1.6 #3、Section 3 #1）
   - design.md行277-303でプロジェクト固有設定プロシージャの入力が`void`と記載されているが、実装では`projectPath: string`が必要
   - **推奨**: 影響を受ける9プロシージャのインターフェース定義を以下の形式に更新:
     ```
     loadSkipPermissions: Query<{ projectPath: string }, boolean>;
     saveSkipPermissions: Mutation<{ projectPath: string; skipPermissions: boolean }, void>;
     ```
   - **理由**: 後続ルーター（project, spec, bug等）でも同様のprojectPath依存パターンが発生する可能性が高く、design.mdの疑似コードを正確にすることで実装者の混乱を防止

2. **Task 3.2のスコープと進捗の明確化**（Section 1.6 #2）
   - tasks.md Task 3.2は未完了だが、vanillaClient実装とRenderer側の部分的差し替えが既に進行中
   - 差し替え済みファイル: RemoteAccessPanel.tsx, ProjectSettingsDialog.tsx, VcsSchemeSelector.tsx, EngineConfigSection.tsx, projectStore.ts, agentStoreAdapter.ts, toolPathStore.ts
   - **推奨**: Task 3.2が部分完了であることを明示するか、完了基準（全てのConfig関連window.electronAPIが置換されていること）を確認の上ステータスを更新

### Suggestions (Nice to Have)

なし。ドキュメント全体の品質は非常に高く、レビュー#7までの修正が適切に反映されている。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| CRITICAL | Zodスキーマ配置: design.mdは`schemas/`分離を指定するが、実装はルーター内インライン | design.md行472-488のスキーマ配置セクションを実態に合わせて更新 | design.md |
| WARNING | ConfigRouterProceduresのprojectPath入力がdesign.mdで`void`だが、実装では必須 | design.md行277-303の9プロシージャのインターフェース定義を更新 | design.md |
| WARNING | Task 3.2が未完了だが、Renderer側の部分的差し替えが進行中 | tasks.mdのTask 3.2ステータスを実態に合わせて更新 | tasks.md |
| INFO | vanillaClientがRemote UIからは利用不可 | Scope外のため文書修正不要。将来検討事項として記録 | なし |
| INFO | helpers/test-helpers.tsがdesign.md Impact Analysis Contractに未記載 | 機能的影響なし。design.md更新時に追記可能 | なし（オプション: design.md） |

---

_This review was generated by the document-review command._
