# Bug Fix: remote-ui-missing-create-buttons

## Summary
Remote UIにSpec/Bug作成ボタン（+ボタン）とダイアログを追加し、モバイルデバイスから新しいSpecやBugを作成できるようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/webSocketHandler.ts` | CREATE_SPEC / CREATE_BUG メッセージハンドラ追加、WorkflowControllerインターフェースにcreateSpec/createBugメソッド追加 |
| `electron-sdd-manager/src/main/ipc/remoteAccessHandlers.ts` | createWorkflowControllerにcreateSpec/createBugメソッド実装追加 |
| `electron-sdd-manager/src/main/remote-ui/index.html` | Create Spec Dialog / Create Bug Dialog のHTML追加 |
| `electron-sdd-manager/src/main/remote-ui/components.js` | DocsTabsにPlusボタン追加、CreateSpecDialog / CreateBugDialogコンポーネント追加 |
| `electron-sdd-manager/src/main/remote-ui/app.js` | ダイアログ初期化、createSpec/createBug関数、SPEC_CREATED/BUG_CREATEDハンドラ追加 |

### Code Changes

#### 1. WebSocket API追加 (webSocketHandler.ts)
```diff
+ // Create methods (remote-ui-missing-create-buttons bug fix)
+ /** Create a new spec with spec-init */
+ createSpec?(description: string): Promise<WorkflowResult<AgentInfo>>;
+ /** Create a new bug with bug-create */
+ createBug?(name: string, description: string): Promise<WorkflowResult<AgentInfo>>;

+ case 'CREATE_SPEC':
+   await this.handleCreateSpec(client, message);
+   break;
+ case 'CREATE_BUG':
+   await this.handleCreateBug(client, message);
+   break;
```

#### 2. WorkflowController実装追加 (remoteAccessHandlers.ts)
```diff
+ createSpec: async (description: string): Promise<WorkflowResult<AgentInfo>> => {
+   const result = await specManagerService.startAgent({
+     specId: '',
+     phase: 'spec-init',
+     command: getClaudeCommand(),
+     args: buildClaudeArgs({ command: `/kiro:spec-init "${description}"` }),
+   });
+   ...
+ },
+
+ createBug: async (name: string, description: string): Promise<WorkflowResult<AgentInfo>> => {
+   const result = await specManagerService.startAgent({
+     specId: '',
+     phase: 'bug-create',
+     command: getClaudeCommand(),
+     args: buildClaudeArgs({ command: `/kiro:bug-create ${name} "${description}"` }),
+   });
+   ...
+ },
```

#### 3. DocsTabs Plusボタン追加 (components.js)
```diff
+ this.onCreateClick = null; // Bug fix: remote-ui-missing-create-buttons

+ <!-- Plus button - Bug fix: remote-ui-missing-create-buttons -->
+ <div class="ml-auto pr-2">
+   <button id="btn-create-item" data-testid="remote-create-btn"
+     class="p-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors">
+     <svg class="w-5 h-5" ...><path d="M12 4v16m8-8H4"></path></svg>
+   </button>
+ </div>
```

#### 4. ダイアログコンポーネント追加 (components.js)
```diff
+ class CreateSpecDialog { ... }
+ class CreateBugDialog { ... }
+ window.CreateSpecDialog = CreateSpecDialog;
+ window.CreateBugDialog = CreateBugDialog;
```

#### 5. app.js統合
```diff
+ this.createSpecDialog = new CreateSpecDialog();
+ this.createBugDialog = new CreateBugDialog();

+ this.docsTabs.onCreateClick = (activeTab) => {
+   if (activeTab === 'specs') this.createSpecDialog.show();
+   else if (activeTab === 'bugs') this.createBugDialog.show();
+ };

+ createSpec(description) { wsManager.send({ type: 'CREATE_SPEC', payload: { description } }); }
+ createBug(name, description) { wsManager.send({ type: 'CREATE_BUG', payload: { name, description } }); }

+ wsManager.on('SPEC_CREATED', (payload) => this.handleSpecCreated(payload));
+ wsManager.on('BUG_CREATED', (payload) => this.handleBugCreated(payload));
```

## Implementation Notes
- Option 1（シンプルな作成ボタン追加）を採用
- 既存のAskAgentDialogの設計パターンに従い、CreateSpecDialog / CreateBugDialogを実装
- WebSocketメッセージタイプは `CREATE_SPEC` / `CREATE_BUG`、レスポンスは `SPEC_CREATED` / `BUG_CREATED`
- 実際のSpec/Bug作成はspec-init / bug-createコマンドをエージェントで実行

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. 該当ファイルの変更を `git revert` で戻す
2. 新規追加したハンドラ・コンポーネントは既存機能に影響しないため、削除のみでOK

## Related Commits
- *未コミット - 実装完了後にコミット予定*
