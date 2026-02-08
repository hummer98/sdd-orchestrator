/**
 * Metrics Display E2E Tests
 * Requirements: 5.1-5.4 (spec-productivity-metrics)
 *
 * These tests verify the metrics UI display:
 * - Metrics are shown in the workflow footer when a spec is selected
 * - Metrics display AI time, Human time, and Total time
 *
 * Prerequisites:
 * - Run with: npm run test:e2e
 * - Test fixtures are in e2e-wdio/fixtures/test-project/
 * - Project selection: SDD_PROJECT_PATH env var (wdio.conf.ts)
 */

import { selectSpecViaUI } from './helpers/auto-execution.helpers';

describe('Metrics Display Feature', () => {
  before(async () => {
    // Project is selected via SDD_PROJECT_PATH env var (wdio.conf.ts)
    // Wait for app to initialize and specs to load
    await browser.pause(3000);

    // Select the test spec via UI click
    const selected = await selectSpecViaUI('test-feature');
    expect(selected).toBe(true);
  });

  describe('Workflow Footer Metrics (Requirements 5.1-5.3)', () => {
    it('should display the workflow view after selecting a spec', async () => {
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });
      expect(await workflowView.isExisting()).toBe(true);
    });

    it('should display metrics section in the footer', async () => {
      const footerMetrics = await $('[data-testid="footer-metrics"]');
      await footerMetrics.waitForExist({ timeout: 5000 });
      expect(await footerMetrics.isDisplayed()).toBe(true);
    });

    it('should display AI time with a valid value', async () => {
      const aiTime = await $('[data-testid="footer-metrics-ai"]');
      await aiTime.waitForExist({ timeout: 5000 });
      const text = await aiTime.getText();
      // The fixture has AI metrics data, so it should show a real value, not '--'
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toBe('--');
    });

    it('should display Human time with a valid value', async () => {
      const humanTime = await $('[data-testid="footer-metrics-human"]');
      await humanTime.waitForExist({ timeout: 5000 });
      const text = await humanTime.getText();
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toBe('--');
    });

    it('should display Total time with a valid value', async () => {
      const totalTime = await $('[data-testid="footer-metrics-total"]');
      await totalTime.waitForExist({ timeout: 5000 });
      const text = await totalTime.getText();
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toBe('--');
    });
  });
});
