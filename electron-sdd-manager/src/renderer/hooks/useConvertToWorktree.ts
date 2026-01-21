/**
 * useConvertToWorktree Hook
 * Worktree変換の状態管理とロジック
 * Requirements: 4.1, 4.2, 4.3 (convert-spec-to-worktree)
 */

import { useState, useCallback, useEffect } from 'react';
import { notify } from '../stores';
import { useProjectStore } from '../stores/projectStore';
import { useSpecStore } from '../stores/specStore';
import { useSpecDetailStore } from '../stores/spec/specDetailStore';

/**
 * Convert error type for renderer-side error handling
 */
interface ConvertErrorResult {
  type: string;
  currentBranch?: string;
  specPath?: string;
  message?: string;
}

/**
 * Get user-friendly error message for convert errors
 */
function getConvertErrorMessage(error: ConvertErrorResult): string {
  switch (error.type) {
    case 'NOT_ON_MAIN_BRANCH':
      return `mainブランチでのみ変換できます。現在: ${error.currentBranch ?? 'unknown'}`;
    case 'SPEC_NOT_FOUND':
      return '仕様が見つかりません';
    case 'ALREADY_WORKTREE_MODE':
      return '既にWorktreeモードです';
    case 'IMPL_ALREADY_STARTED':
      return '実装開始後は変換できません';
    case 'WORKTREE_CREATE_FAILED':
      return `Worktree作成に失敗しました: ${error.message ?? ''}`;
    case 'FILE_MOVE_FAILED':
      return `ファイル移動に失敗しました: ${error.message ?? ''}`;
    case 'SYMLINK_CREATE_FAILED':
      return `シンボリックリンク作成に失敗しました: ${error.message ?? ''}`;
    case 'SPEC_JSON_UPDATE_FAILED':
      return `spec.json更新に失敗しました: ${error.message ?? ''}`;
    default:
      return `不明なエラー: ${error.type}`;
  }
}

export interface UseConvertToWorktreeResult {
  /** mainブランチにいるかどうか */
  isOnMain: boolean;
  /** 変換処理中かどうか */
  isConverting: boolean;
  /** 変換処理を実行 */
  handleConvert: () => Promise<void>;
  /** mainブランチ状態をリフレッシュ */
  refreshMainBranchStatus: () => Promise<void>;
}

/**
 * Convert to Worktree フック
 * - mainブランチ状態の取得と管理
 * - 変換処理の実行
 * - エラーハンドリング
 *
 * Requirements: 4.1, 4.2, 4.3 (convert-spec-to-worktree)
 */
export function useConvertToWorktree(): UseConvertToWorktreeResult {
  const [isOnMain, setIsOnMain] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Use currentProject from projectStore (not projectPath)
  const currentProject = useProjectStore((state) => state.currentProject);
  // Get specDetail from specStore facade
  const specDetail = useSpecStore((state) => state.specDetail);
  // Get selectSpec from specDetailStore for reloading
  const selectSpec = useSpecDetailStore((state) => state.selectSpec);
  const selectedSpec = useSpecDetailStore((state) => state.selectedSpec);

  // mainブランチ状態をチェック
  const refreshMainBranchStatus = useCallback(async () => {
    if (!currentProject) {
      setIsOnMain(false);
      return;
    }

    try {
      const result = await window.electronAPI.worktreeCheckMain(currentProject);
      if (result.ok) {
        setIsOnMain(result.value.isMain);
      } else {
        setIsOnMain(false);
      }
    } catch (error) {
      console.error('[useConvertToWorktree] Failed to check main branch status:', error);
      setIsOnMain(false);
    }
  }, [currentProject]);

  // 初期ロード時とcurrentProject変更時にチェック
  useEffect(() => {
    refreshMainBranchStatus();
  }, [refreshMainBranchStatus]);

  // 変換処理
  // spec-path-ssot-refactor: Use spec.name instead of spec.path
  const handleConvert = useCallback(async () => {
    if (!currentProject || !specDetail) {
      notify.error('プロジェクトまたは仕様が選択されていません');
      return;
    }

    const specName = specDetail.metadata.name;
    const featureName = specDetail.metadata.name;

    setIsConverting(true);

    try {
      // 事前チェック - spec-path-ssot-refactor: Use specName instead of specPath
      const checkResult = await window.electronAPI.convertCheck(currentProject, specName);
      if (!checkResult.ok) {
        const errorMessage = getConvertErrorMessage(checkResult.error as ConvertErrorResult);
        notify.error(errorMessage);
        return;
      }

      // 変換実行 - spec-path-ssot-refactor: Use specName instead of specPath
      const result = await window.electronAPI.convertToWorktree(currentProject, specName, featureName);
      if (!result.ok) {
        const errorMessage = getConvertErrorMessage(result.error as ConvertErrorResult);
        notify.error(`Worktree変換に失敗しました: ${errorMessage}`);
        return;
      }

      // 成功通知
      notify.success('Worktreeモードに変換しました');

      // spec詳細を再読み込みして新しいworktree状態を反映
      if (selectedSpec) {
        await selectSpec(selectedSpec, { silent: true });
      }
    } catch (error) {
      console.error('[useConvertToWorktree] Conversion failed:', error);
      notify.error('Worktree変換中にエラーが発生しました');
    } finally {
      setIsConverting(false);
    }
  }, [currentProject, specDetail, selectedSpec, selectSpec]);

  return {
    isOnMain,
    isConverting,
    handleConvert,
    refreshMainBranchStatus,
  };
}
