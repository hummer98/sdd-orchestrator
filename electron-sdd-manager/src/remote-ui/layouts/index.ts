/**
 * Layouts barrel export
 *
 * Task 10.1: Added TAB_CONFIG and MobileLayoutProps exports
 * for MobileLayout consumers who need access to tab configuration
 * and prop types (especially showTabBar for DetailPage visibility control).
 *
 * Requirements: 1.4 (DetailPage時に底部タブ非表示)
 */

export { MobileLayout, TAB_CONFIG } from './MobileLayout';
export type { MobileTab, MobileLayoutProps } from './MobileLayout';

export { DesktopLayout } from './DesktopLayout';
