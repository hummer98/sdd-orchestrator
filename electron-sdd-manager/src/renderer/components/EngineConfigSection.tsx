/**
 * EngineConfigSection Component
 * llm-engine-abstraction feature
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import type { EngineConfig, LLMEngineId } from '../types/electron';

// ============================================================
// Section Configuration
// Requirements: 6.2
// ============================================================

/**
 * Section definitions mapping UI sections to engine config phases
 */
interface SectionConfig {
  id: string;
  label: string;
  testId: string;
  phases: (keyof EngineConfig)[];
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'generation',
    label: '生成',
    testId: 'generation-engine-select',
    phases: ['plan', 'requirements', 'design', 'tasks', 'document-review', 'document-review-reply'],
  },
  {
    id: 'inspection',
    label: '検査',
    testId: 'inspection-engine-select',
    phases: ['inspection'],
  },
  {
    id: 'implementation',
    label: '実装',
    testId: 'implementation-engine-select',
    phases: ['impl'],
  },
];

// ============================================================
// Props
// ============================================================

interface EngineConfigSectionProps {
  projectPath: string;
}

// ============================================================
// Component
// ============================================================

export function EngineConfigSection({
  projectPath,
}: EngineConfigSectionProps): React.ReactElement {
  const [config, setConfig] = useState<EngineConfig>({});
  const [engines, setEngines] = useState<Array<{ id: string; label: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load config and engines on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load engines first (can use default fallback)
        let availableEngines = [
          { id: 'claude', label: 'Claude' },
          { id: 'gemini', label: 'Gemini' },
        ];
        try {
          availableEngines = await window.electronAPI.getAvailableLLMEngines();
        } catch {
          // Use default engines on error
        }
        setEngines(availableEngines);

        // Load config
        try {
          const loadedConfig = await window.electronAPI.loadEngineConfig(projectPath);
          setConfig(loadedConfig);
        } catch {
          // Set empty config on error
          setConfig({});
        }
      } catch (error) {
        console.error('[EngineConfigSection] Failed to load data:', error);
        // Set empty config on error
        setConfig({});
        setEngines([
          { id: 'claude', label: 'Claude' },
          { id: 'gemini', label: 'Gemini' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [projectPath]);

  // Get section value from config
  const getSectionValue = useCallback(
    (section: SectionConfig): LLMEngineId | '' => {
      // Get the first phase value as representative
      const firstPhase = section.phases[0];
      return config[firstPhase] ?? '';
    },
    [config]
  );

  // Save config helper
  const saveConfig = useCallback(
    async (newConfig: EngineConfig) => {
      try {
        await window.electronAPI.saveEngineConfig(projectPath, newConfig);
        setConfig(newConfig);
      } catch (error) {
        console.error('[EngineConfigSection] Failed to save config:', error);
      }
    },
    [projectPath]
  );

  // Handle default engine change (Req 6.4)
  const handleDefaultChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as LLMEngineId | '';
      const newConfig: EngineConfig = {
        ...config,
        default: value || undefined,
      };
      await saveConfig(newConfig);
    },
    [config, saveConfig]
  );

  // Handle section change (Req 6.6)
  const handleSectionChange = useCallback(
    async (section: SectionConfig, e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as LLMEngineId | '';
      const newConfig: EngineConfig = { ...config };

      // Update all phases in the section
      for (const phase of section.phases) {
        if (value) {
          newConfig[phase] = value as LLMEngineId;
        } else {
          // Clear phase when "デフォルトを使用" is selected
          newConfig[phase] = undefined;
        }
      }

      await saveConfig(newConfig);
    },
    [config, saveConfig]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <h3 className="font-medium text-gray-700 dark:text-gray-300">
        LLM エンジン設定
      </h3>

      {/* Default Engine (Req 6.4) */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-400 w-24">
          デフォルト:
        </span>
        <select
          data-testid="default-engine-select"
          value={config.default ?? 'claude'}
          onChange={handleDefaultChange}
          className={clsx(
            'px-3 py-1.5 rounded-md text-sm',
            'bg-white dark:bg-gray-800',
            'border border-gray-300 dark:border-gray-600',
            'text-gray-700 dark:text-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
        >
          {engines.map((engine) => (
            <option key={engine.id} value={engine.id}>
              {engine.label}
            </option>
          ))}
        </select>
      </div>

      {/* Section Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
          フェーズごとのエンジン設定（空欄でデフォルトを使用）
        </p>

        {/* Section Selectors (Req 6.2, 6.3, 6.5) */}
        <div className="space-y-2">
          {SECTIONS.map((section) => (
            <div key={section.id} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400 w-24">
                {section.label}:
              </span>
              <select
                data-testid={section.testId}
                value={getSectionValue(section)}
                onChange={(e) => handleSectionChange(section, e)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm',
                  'bg-white dark:bg-gray-800',
                  'border border-gray-300 dark:border-gray-600',
                  'text-gray-700 dark:text-gray-300',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500'
                )}
              >
                <option value="">デフォルトを使用</option>
                {engines.map((engine) => (
                  <option key={engine.id} value={engine.id}>
                    {engine.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
