/**
 * SubTabBar component tests
 *
 * Task 4.1: SubTabBarコンポーネントを作成する
 * - DetailPage内下部のサブタブ表示
 * - 2つのタブ（Spec/Artifact または Bug/Artifact）のレンダリング
 * - アクティブタブの視覚的強調
 * - タブ変更コールバック
 * Requirements: 3.1, 4.1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubTabBar } from './SubTabBar';

describe('SubTabBar', () => {
  const defaultTabs = [
    { id: 'spec', label: 'Spec' },
    { id: 'artifact', label: 'Artifact' },
  ];

  it('should render two tabs', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="spec"
        onTabChange={() => {}}
      />
    );

    expect(screen.getByText('Spec')).toBeInTheDocument();
    expect(screen.getByText('Artifact')).toBeInTheDocument();
  });

  it('should highlight the active tab with visual styling', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="spec"
        onTabChange={() => {}}
      />
    );

    const specButton = screen.getByRole('button', { name: 'Spec' });
    const artifactButton = screen.getByRole('button', { name: 'Artifact' });

    // Active tab should have aria-selected="true"
    expect(specButton).toHaveAttribute('aria-selected', 'true');
    expect(artifactButton).toHaveAttribute('aria-selected', 'false');
  });

  it('should call onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="spec"
        onTabChange={onTabChange}
      />
    );

    const artifactButton = screen.getByRole('button', { name: 'Artifact' });
    fireEvent.click(artifactButton);

    expect(onTabChange).toHaveBeenCalledWith('artifact');
  });

  it('should call onTabChange with correct tab id', () => {
    const onTabChange = vi.fn();
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="artifact"
        onTabChange={onTabChange}
      />
    );

    const specButton = screen.getByRole('button', { name: 'Spec' });
    fireEvent.click(specButton);

    expect(onTabChange).toHaveBeenCalledWith('spec');
  });

  it('should render Bug/Artifact tabs correctly', () => {
    const bugTabs = [
      { id: 'bug', label: 'Bug' },
      { id: 'artifact', label: 'Artifact' },
    ];

    render(
      <SubTabBar
        tabs={bugTabs}
        activeTab="bug"
        onTabChange={() => {}}
      />
    );

    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('Artifact')).toBeInTheDocument();
  });

  it('should support testId prop for E2E testing', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="spec"
        onTabChange={() => {}}
        testId="spec-detail-subtabs"
      />
    );

    expect(screen.getByTestId('spec-detail-subtabs')).toBeInTheDocument();
  });

  it('should add correct testId to individual tabs', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="spec"
        onTabChange={() => {}}
        testId="spec-detail-subtabs"
      />
    );

    expect(screen.getByTestId('spec-detail-subtabs-spec')).toBeInTheDocument();
    expect(screen.getByTestId('spec-detail-subtabs-artifact')).toBeInTheDocument();
  });

  it('should apply active styling class to active tab', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="spec"
        onTabChange={() => {}}
      />
    );

    const specButton = screen.getByRole('button', { name: 'Spec' });
    const artifactButton = screen.getByRole('button', { name: 'Artifact' });

    // Active tab should have the active styling (blue color)
    expect(specButton.className).toContain('text-blue-600');
    // Inactive tab should have the inactive styling (gray color)
    expect(artifactButton.className).toContain('text-gray-500');
  });

  // Task 11.3: Additional tests for comprehensive coverage
  // Requirements: 3.1, 4.1

  it('should apply border styling to active and inactive tabs', () => {
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="artifact"
        onTabChange={() => {}}
      />
    );

    const specButton = screen.getByRole('button', { name: 'Spec' });
    const artifactButton = screen.getByRole('button', { name: 'Artifact' });

    // Active tab should have blue border
    expect(artifactButton.className).toContain('border-blue-600');
    // Inactive tab should have transparent border
    expect(specButton.className).toContain('border-transparent');
  });

  it('should call onTabChange when clicking already-active tab', () => {
    const onTabChange = vi.fn();
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="spec"
        onTabChange={onTabChange}
      />
    );

    const specButton = screen.getByRole('button', { name: 'Spec' });
    fireEvent.click(specButton);

    // Should still call onTabChange even when clicking the active tab
    expect(onTabChange).toHaveBeenCalledWith('spec');
    expect(onTabChange).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple tab changes correctly', () => {
    const onTabChange = vi.fn();
    render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="spec"
        onTabChange={onTabChange}
      />
    );

    const specButton = screen.getByRole('button', { name: 'Spec' });
    const artifactButton = screen.getByRole('button', { name: 'Artifact' });

    // Click multiple times
    fireEvent.click(artifactButton);
    fireEvent.click(specButton);
    fireEvent.click(artifactButton);

    expect(onTabChange).toHaveBeenCalledTimes(3);
    expect(onTabChange).toHaveBeenNthCalledWith(1, 'artifact');
    expect(onTabChange).toHaveBeenNthCalledWith(2, 'spec');
    expect(onTabChange).toHaveBeenNthCalledWith(3, 'artifact');
  });

  it('should update aria-selected when activeTab changes', () => {
    const { rerender } = render(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="spec"
        onTabChange={() => {}}
      />
    );

    const specButton = screen.getByRole('button', { name: 'Spec' });
    const artifactButton = screen.getByRole('button', { name: 'Artifact' });

    // Initial state
    expect(specButton).toHaveAttribute('aria-selected', 'true');
    expect(artifactButton).toHaveAttribute('aria-selected', 'false');

    // Rerender with different active tab
    rerender(
      <SubTabBar
        tabs={defaultTabs}
        activeTab="artifact"
        onTabChange={() => {}}
      />
    );

    // Updated state
    expect(specButton).toHaveAttribute('aria-selected', 'false');
    expect(artifactButton).toHaveAttribute('aria-selected', 'true');
  });
});
