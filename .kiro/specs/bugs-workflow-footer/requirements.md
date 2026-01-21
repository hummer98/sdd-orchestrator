# Requirements: Bugs Workflow Footer

## Decision Log

### 自動実行ボタンの配置場所
- **Discussion**: 現在ヘッダーにある自動実行ボタンをどこに配置するか
- **Conclusion**: SpecWorkflowFooter と同様に、BugWorkflowFooter を新設してフッターエリアに配置
- **Rationale**: Spec ワークフローとの UI 一貫性を保ち、ユーザーの学習コストを削減。フッターは画面下部で常に見える位置であり、ワークフロー全体の操作に適している

### Worktree 変換方式
- **Discussion**: worktree への変換を事前に行うか、fix 実行時に自動作成するか、両方を提供するか
- **Conclusion**: 事前変換のみを提供（「Worktreeに変更」ボタン）。fix 実行時の自動作成は廃止
- **Rationale**:
  - 事前変換により、ユーザーが明示的に worktree モードを選択できる
  - 自動作成は暗黙的な動作で混乱を招く可能性がある
  - Spec の「Worktreeに変更」ボタンと操作体系が統一される
  - fix 実行ロジックがシンプルになり、bug.json を SSOT として参照するのみになる

### useWorktree チェックボックスの扱い
- **Discussion**: 現在の「Worktreeを使用」チェックボックスをどうするか
- **Conclusion**: 廃止する
- **Rationale**:
  - 事前変換方式では不要（変換済みかどうかは bug.json で判定）
  - UI がシンプルになる
  - Spec ワークフローとの対称性（Spec にもチェックボックスは存在しない）

### イベントログボタンの要否
- **Discussion**: Spec にあるイベントログボタンを Bug にも追加するか
- **Conclusion**: 一旦不要
- **Rationale**: Bug ワークフローにはイベントログ機能がまだ実装されていないため、将来的な拡張として残す

### Spec ワークフローとの整合性
- **Discussion**: Spec の SpecWorkflowFooter と完全に同じ構成にするか
- **Conclusion**: 基本構造は同じだが、Bug 固有の要件に合わせる
- **Rationale**:
  - 自動実行ボタン: 両方に必要
  - 「Worktreeに変更」ボタン: 両方に必要
  - イベントログボタン: Bug には不要（当面）
  - 一貫性を保ちつつ、各ワークフローの特性に応じたカスタマイズを許容

## Introduction

Bug ワークフロー画面にフッターエリア（BugWorkflowFooter）を追加し、自動実行ボタンと「Worktreeに変更」ボタンを配置する。これにより、Spec ワークフローと UI の一貫性を保ち、Bug ワークフローでも worktree への変換を事前に行えるようにする。現在ヘッダーにある自動実行ボタンをフッターに移動し、worktree 使用を選択するチェックボックスは廃止する。

## Requirements

### Requirement 1: BugWorkflowFooter コンポーネント作成

**Objective:** システムとして、Bug ワークフローにフッターエリアを提供し、ワークフロー全体の操作を集約したい

#### Acceptance Criteria
1. The system shall `BugWorkflowFooter.tsx` コンポーネントを `electron-sdd-manager/src/renderer/components/` に作成する
2. The component shall 以下の props を受け取る:
   - `isAutoExecuting: boolean` - 自動実行中かどうか
   - `hasRunningAgents: boolean` - Agent 実行中かどうか
   - `onAutoExecution: () => void` - 自動実行ボタンのハンドラ
   - `isOnMain: boolean` - main ブランチにいるかどうか
   - `bugJson: BugJson | null` - Bug の JSON データ
   - `onConvertToWorktree: () => void` - Worktree 変換ボタンのハンドラ
   - `isConverting: boolean` - 変換処理中かどうか
3. The component shall `p-4 border-t` のスタイルでフッターエリアとして表示される
4. The component shall SpecWorkflowFooter と同様の視覚的デザインを持つ

### Requirement 2: 自動実行ボタンの配置

**Objective:** 開発者として、フッターエリアで自動実行を開始・停止したい

#### Acceptance Criteria
1. When 自動実行中でないとき, the system shall 「自動実行」ボタンを表示する
2. When 自動実行中のとき, the system shall 「停止」ボタンを表示する
3. The 「自動実行」ボタン shall Agent 実行中のとき disabled になる
4. When 「自動実行」ボタンがクリックされたとき, the system shall onAutoExecution ハンドラを呼び出す
5. When 「停止」ボタンがクリックされたとき, the system shall onAutoExecution ハンドラを呼び出す
6. The ボタン shall Play/Square アイコンを含む
7. The ボタン shall flex-1 スタイルで横幅いっぱいに広がる

### Requirement 3: 「Worktreeに変更」ボタン

**Objective:** 開発者として、Bug を worktree モードに変換したい

#### Acceptance Criteria
1. The system shall 表示条件を満たすときのみ「Worktreeに変更」ボタンを表示する
2. The 表示条件 shall 以下を全て満たす:
   - main ブランチにいる（isOnMain が true）
   - bugJson が存在する
   - bugJson.worktree フィールドが存在しない
3. When ボタンがクリックされたとき, the system shall onConvertToWorktree ハンドラを呼び出す
4. The ボタン shall 変換中・Agent実行中・自動実行中のとき disabled になる
5. The ボタン shall GitBranch アイコンを含む
6. When 変換中のとき, the system shall 「変換中...」のテキストを表示する

### Requirement 4: 表示条件判定ロジック

**Objective:** システムとして、「Worktreeに変更」ボタンの表示条件を正確に判定したい

#### Acceptance Criteria
1. The system shall `canShowConvertButton(isOnMain: boolean, bugJson: BugJson | null): boolean` 関数を提供する
2. When main ブランチにいないとき, the function shall false を返す
3. When bugJson が null または undefined のとき, the function shall false を返す
4. When bugJson.worktree フィールドが存在するとき, the function shall false を返す
5. When 上記全ての条件を満たすとき, the function shall true を返す

### Requirement 5: convertBugToWorktree IPC API

**Objective:** システムとして、Bug を worktree モードに変換する IPC API を提供したい

#### Acceptance Criteria
1. The system shall `convertBugToWorktree(bugName: string)` IPC API を提供する
2. When API が呼ばれたとき, the system shall main ブランチにいることを確認する
3. If main ブランチにいない場合, then the system shall NOT_ON_MAIN_BRANCH エラーを返す
4. When main ブランチにいるとき, the system shall `../{project}-worktrees/bugs/{bugName}` に worktree を作成する
5. When worktree を作成するとき, the system shall `bugfix/{bugName}` ブランチを作成する
6. When worktree 作成が成功したとき, the system shall bug.json に worktree フィールドを追加する:
   ```json
   {
     "worktree": {
       "path": "../{project}-worktrees/bugs/{bugName}",
       "branch": "bugfix/{bugName}",
       "created_at": "ISO-8601"
     }
   }
   ```
7. When 全ての処理が成功したとき, the system shall ok: true と worktree 情報を返す
8. If worktree 作成が失敗した場合, then the system shall ok: false とエラー情報を返す

### Requirement 6: BugWorkflowView の変更

**Objective:** システムとして、BugWorkflowView から不要な要素を削除し、BugWorkflowFooter を統合したい

#### Acceptance Criteria
1. The system shall BugWorkflowView のヘッダーから自動実行ボタンを削除する（294-330行目）
2. The system shall 「Worktreeを使用」チェックボックスとそのセクションを削除する（346-364行目）
3. The system shall コンポーネント最下部に BugWorkflowFooter を追加する
4. The BugWorkflowFooter shall 適切な props を受け取る:
   - isAutoExecuting: runtime?.isAutoExecuting
   - hasRunningAgents: runningPhases.size > 0
   - onAutoExecution: handleStartAutoExecution または handleStopAutoExecution
   - isOnMain: 新規に取得が必要
   - bugJson: bugDetail から取得
   - onConvertToWorktree: 新規ハンドラ
   - isConverting: 新規ステート

### Requirement 7: Convert to Worktree ハンドラ

**Objective:** 開発者として、「Worktreeに変更」ボタンをクリックして変換処理を実行したい

#### Acceptance Criteria
1. The system shall `handleConvertToWorktree` ハンドラを BugWorkflowView に追加する
2. The ハンドラ shall `isConverting` ステートを true に設定する
3. When selectedBug が null のとき, the system shall 早期リターンする
4. The ハンドラ shall `window.electronAPI.convertBugToWorktree(bugName)` を呼び出す
5. When 変換が成功したとき, the system shall 成功メッセージを表示する
6. When 変換が失敗したとき, the system shall エラーメッセージを表示する
7. The ハンドラ shall finally ブロックで isConverting を false に戻す

### Requirement 8: 現在のブランチ取得

**Objective:** システムとして、現在のブランチが main かどうかを判定したい

#### Acceptance Criteria
1. The system shall BugWorkflowView で現在のブランチを取得する手段を提供する
2. When プロジェクトが選択されているとき, the system shall IPC 経由でブランチ情報を取得する
3. The system shall `isOnMain` ステートを保持する
4. When ブランチが main または master のとき, the system shall isOnMain を true にする

### Requirement 9: bugStore の useWorktree 削除

**Objective:** システムとして、不要な useWorktree ステートを削除したい

#### Acceptance Criteria
1. The system shall bugStore から useWorktree ステートを削除する
2. The system shall bugStore から setUseWorktree アクションを削除する
3. The system shall BugWorkflowView から useWorktree の import と使用を削除する

### Requirement 10: fix 実行時の自動作成ロジック削除

**Objective:** システムとして、fix 実行時の worktree 自動作成ロジックを削除したい

#### Acceptance Criteria
1. The system shall `handleExecutePhase` から以下のコードを削除する:
   ```typescript
   if (phase === 'fix' && useWorktree) {
     const result = await window.electronAPI.createBugWorktree(selectedBug.name);
     if (!result.ok) {
       notify.error(result.error?.message || 'worktreeの作成に失敗しました');
       return;
     }
   }
   ```
2. The fix 実行 shall bug.json の worktree フィールドを参照するのみで、新規作成は行わない
3. The deploy ボタン shall 既存のロジック（worktree 存在時は bug-merge）を維持する

### Requirement 11: 型定義の追加

**Objective:** システムとして、BugJson 型に worktree フィールドを含めたい

#### Acceptance Criteria
1. If BugJson 型に worktree フィールドが存在しない場合, then the system shall 追加する
2. The worktree フィールド shall optional とし、以下の構造を持つ:
   ```typescript
   worktree?: {
     path: string;
     branch: string;
     created_at: string;
   }
   ```

### Requirement 12: electron.d.ts の型定義追加

**Objective:** システムとして、convertBugToWorktree の型定義を追加したい

#### Acceptance Criteria
1. The system shall electron.d.ts に convertBugToWorktree の型定義を追加する
2. The 型定義 shall 以下の構造を持つ:
   ```typescript
   convertBugToWorktree(bugName: string): Promise<{
     ok: true;
     value: {
       path: string;
       absolutePath: string;
       branch: string;
       created_at: string;
     };
   } | {
     ok: false;
     error: {
       type: string;
       currentBranch?: string;
       message?: string;
     };
   }>;
   ```

## Out of Scope

- イベントログボタンの追加（Bug ワークフローにイベントログ機能が未実装のため）
- Remote UI への対応（Desktop UI のみ）
- Bug の自動実行設定の永続化（プロジェクト設定への保存）
- bug-merge スキルの実装（既存機能として存在）
- Worktree 作成場所のカスタマイズ
- ブランチ命名規則のカスタマイズ

## Open Questions

- useConvertToWorktree フックを再利用するか、独自のロジックを実装するか
- BugWorkflowFooter のテストをどの程度のカバレッジで書くか
- convertBugToWorktree の Main Process 実装は既存の convertToWorktree をリファクタして共通化するか
