/**
 * EngineConfigSection Component Tests
 * llm-engine-abstraction feature
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EngineConfigSection } from './EngineConfigSection';
import type { EngineConfig } from '../types/electron';

describe('EngineConfigSection', () => {
  const testProjectPath = '/test/project';

  // Type-safe mocks
  let mockLoadEngineConfig: Mock;
  let mockSaveEngineConfig: Mock;
  let mockGetAvailableLLMEngines: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mocks
    mockLoadEngineConfig = vi.fn().mockResolvedValue({});
    mockSaveEngineConfig = vi.fn().mockResolvedValue(undefined);
    mockGetAvailableLLMEngines = vi.fn().mockResolvedValue([
      { id: 'claude', label: 'Claude' },
      { id: 'gemini', label: 'Gemini' },
    ]);

    // Assign to window.electronAPI
    window.electronAPI = {
      ...window.electronAPI,
      loadEngineConfig: mockLoadEngineConfig,
      saveEngineConfig: mockSaveEngineConfig,
      getAvailableLLMEngines: mockGetAvailableLLMEngines,
    };
  });

  // ============================================================
  // Task 5.1: Section Layout
  // Requirements: 6.1, 6.2
  // ============================================================

  describe('Section Layout', () => {
    it('should render default engine selector', async () => {
      mockLoadEngineConfig.mockResolvedValue({ default: 'claude' });

      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        expect(screen.getByTestId('default-engine-select')).toBeInTheDocument();
      });
    });

    it('should render three sections: 生成, 検査, 実装', async () => {
      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        expect(screen.getByText(/生成/)).toBeInTheDocument();
        expect(screen.getByText(/検査/)).toBeInTheDocument();
        expect(screen.getByText(/実装/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Task 5.2: Default Engine Selection
  // Requirement: 6.4
  // ============================================================

  describe('Default Engine Selection', () => {
    it('should display current default engine', async () => {
      mockLoadEngineConfig.mockResolvedValue({ default: 'gemini' });

      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        const defaultSelect = screen.getByTestId('default-engine-select');
        expect(defaultSelect).toHaveValue('gemini');
      });
    });

    it('should save config when default engine is changed', async () => {
      mockLoadEngineConfig.mockResolvedValue({ default: 'claude' });

      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        const defaultSelect = screen.getByTestId('default-engine-select');
        expect(defaultSelect).toBeInTheDocument();
      });

      const defaultSelect = screen.getByTestId('default-engine-select');
      fireEvent.change(defaultSelect, { target: { value: 'gemini' } });

      await waitFor(() => {
        expect(mockSaveEngineConfig).toHaveBeenCalledWith(
          testProjectPath,
          expect.objectContaining({ default: 'gemini' })
        );
      });
    });
  });

  // ============================================================
  // Task 5.3: Section Engine Selection
  // Requirements: 6.3, 6.5
  // ============================================================

  describe('Section Engine Selection', () => {
    it('should display "デフォルトを使用" option', async () => {
      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        const genSelect = screen.getByTestId('generation-engine-select');
        expect(genSelect).toBeInTheDocument();
      });

      // Check that default option exists
      const genSelect = screen.getByTestId('generation-engine-select');
      expect(genSelect.querySelector('option[value=""]')).toBeInTheDocument();
    });

    it('should display engine options for each section', async () => {
      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        const genSelect = screen.getByTestId('generation-engine-select');
        expect(genSelect.querySelectorAll('option').length).toBeGreaterThan(1);
      });
    });
  });

  // ============================================================
  // Task 5.4: Section Change Auto-Update
  // Requirement: 6.6
  // ============================================================

  describe('Section Change Auto-Update', () => {
    it('should update all generation phases when generation section is changed', async () => {
      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        const genSelect = screen.getByTestId('generation-engine-select');
        expect(genSelect).toBeInTheDocument();
      });

      const genSelect = screen.getByTestId('generation-engine-select');
      fireEvent.change(genSelect, { target: { value: 'gemini' } });

      await waitFor(() => {
        expect(mockSaveEngineConfig).toHaveBeenCalledWith(
          testProjectPath,
          expect.objectContaining({
            plan: 'gemini',
            requirements: 'gemini',
            design: 'gemini',
            tasks: 'gemini',
            'document-review': 'gemini',
            'document-review-reply': 'gemini',
          })
        );
      });
    });

    it('should update inspection phase when inspection section is changed', async () => {
      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        const inspectSelect = screen.getByTestId('inspection-engine-select');
        expect(inspectSelect).toBeInTheDocument();
      });

      const inspectSelect = screen.getByTestId('inspection-engine-select');
      fireEvent.change(inspectSelect, { target: { value: 'gemini' } });

      await waitFor(() => {
        expect(mockSaveEngineConfig).toHaveBeenCalledWith(
          testProjectPath,
          expect.objectContaining({
            inspection: 'gemini',
          })
        );
      });
    });

    it('should update impl phase when implementation section is changed', async () => {
      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        const implSelect = screen.getByTestId('implementation-engine-select');
        expect(implSelect).toBeInTheDocument();
      });

      const implSelect = screen.getByTestId('implementation-engine-select');
      fireEvent.change(implSelect, { target: { value: 'gemini' } });

      await waitFor(() => {
        expect(mockSaveEngineConfig).toHaveBeenCalledWith(
          testProjectPath,
          expect.objectContaining({
            impl: 'gemini',
          })
        );
      });
    });

    it('should clear section phases when "デフォルトを使用" is selected', async () => {
      mockLoadEngineConfig.mockResolvedValue({
        plan: 'gemini',
        requirements: 'gemini',
        design: 'gemini',
        tasks: 'gemini',
        'document-review': 'gemini',
        'document-review-reply': 'gemini',
      });

      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        const genSelect = screen.getByTestId('generation-engine-select');
        expect(genSelect).toBeInTheDocument();
      });

      const genSelect = screen.getByTestId('generation-engine-select');
      fireEvent.change(genSelect, { target: { value: '' } });

      await waitFor(() => {
        expect(mockSaveEngineConfig).toHaveBeenCalledWith(
          testProjectPath,
          expect.objectContaining({
            plan: undefined,
            requirements: undefined,
            design: undefined,
            tasks: undefined,
            'document-review': undefined,
            'document-review-reply': undefined,
          })
        );
      });
    });
  });

  // ============================================================
  // Task 5.5: Integration with ProjectSettingsDialog
  // Requirement: 6.1
  // ============================================================

  describe('Loading and Initial State', () => {
    it('should load engine config on mount', async () => {
      mockLoadEngineConfig.mockResolvedValue({ default: 'claude' });

      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        expect(mockLoadEngineConfig).toHaveBeenCalledWith(testProjectPath);
      });
    });

    it('should fetch available engines on mount', async () => {
      render(<EngineConfigSection projectPath={testProjectPath} />);

      await waitFor(() => {
        expect(mockGetAvailableLLMEngines).toHaveBeenCalled();
      });
    });

    it('should handle load error gracefully', async () => {
      mockLoadEngineConfig.mockRejectedValue(new Error('Load failed'));

      render(<EngineConfigSection projectPath={testProjectPath} />);

      // Should still render without crashing - check for default engine selector
      await waitFor(() => {
        expect(screen.getByTestId('default-engine-select')).toBeInTheDocument();
      });
    });
  });
});
