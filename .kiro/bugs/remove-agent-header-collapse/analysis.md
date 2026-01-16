# Bug Analysis: remove-agent-header-collapse

## Summary
プロジェクトエージェントパネル（ProjectAgentPanel）のヘッダ部に一覧を折り畳む機能が実装されているが、この機能は不要であり削除すべき。

## Root Cause
機能削除の要望。不要な折り畳み機能がコードベースに残っている。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/ProjectAgentPanel.tsx:58-93`
- **Component**: ProjectAgentPanel
- **Issue**: ヘッダクリックで一覧を折り畳める機能が存在するが、これは不要

## 現状の実装

### 折り畳み機能の構成要素

1. **Props** (`ProjectAgentPanel.tsx:58-63`):
   ```tsx
   interface ProjectAgentPanelProps {
     collapsed?: boolean;
     onCollapsedChange?: (collapsed: boolean) => void;
   }
   ```

2. **内部状態** (`ProjectAgentPanel.tsx:68`):
   ```tsx
   const [internalCollapsed, setInternalCollapsed] = useState(false);
   ```

3. **折り畳み制御ロジック** (`ProjectAgentPanel.tsx:84-93`):
   ```tsx
   const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;

   const handleToggleCollapse = () => {
     const newCollapsed = !isCollapsed;
     if (onCollapsedChange) {
       onCollapsedChange(newCollapsed);
     } else {
       setInternalCollapsed(newCollapsed);
     }
   };
   ```

4. **ヘッダのクリックハンドラ** (`ProjectAgentPanel.tsx:154`):
   ```tsx
   onClick={handleToggleCollapse}
   ```

5. **折り畳みアイコン** (`ProjectAgentPanel.tsx:160-164`):
   ```tsx
   {isCollapsed ? (
     <ChevronRight className="w-4 h-4 text-gray-500" />
   ) : (
     <ChevronDown className="w-4 h-4 text-gray-500" />
   )}
   ```

6. **条件付きレンダリング** (`ProjectAgentPanel.tsx:191-214`):
   ```tsx
   {!isCollapsed && ( ... )}
   ```

### 使用状況
- **App.tsx**: `<ProjectAgentPanel />` として使用。`collapsed`/`onCollapsedChange`プロパティは渡していない
- パネル自体のリサイズ機能（ResizeHandle経由）は別途存在し、これは残すべき

## Impact Assessment
- **Severity**: Low
- **Scope**: UI/UXの簡素化
- **Risk**: テストコードに折り畳み機能のテストが含まれているため、テストも更新必要

## Proposed Solution

### 削除対象
1. `ProjectAgentPanelProps`インターフェースの`collapsed`と`onCollapsedChange`プロパティ
2. `internalCollapsed`状態と`isCollapsed`計算
3. `handleToggleCollapse`関数
4. ヘッダの`onClick={handleToggleCollapse}`
5. ChevronRight/ChevronDownアイコン
6. `lucide-react`インポートから`ChevronDown`, `ChevronRight`を削除
7. `{!isCollapsed && (...)}` の条件分岐（常に表示に変更）

### テスト更新
`ProjectAgentPanel.test.tsx`の「Collapse functionality」セクション（213-248行目）を削除

### Recommended Approach
折り畳み機能を完全に削除し、エージェント一覧を常に表示する。パネル自体の高さ調整はResizeHandleで行えるため、折り畳み機能は冗長。

## Dependencies
- `ProjectAgentPanel.tsx` - コンポーネント本体
- `ProjectAgentPanel.test.tsx` - テストファイル
- App.tsx - 親コンポーネント（変更不要、propsを渡していないため）

## Testing Strategy
1. 折り畳み関連テストを削除
2. 既存のエージェント表示・操作テストが引き続きパスすることを確認
3. E2Eテストで折り畳み関連のアサーションがあれば更新
