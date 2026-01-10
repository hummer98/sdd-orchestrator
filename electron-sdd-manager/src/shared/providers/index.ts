/**
 * Shared providers barrel export
 *
 * This module exports all React context providers that are shared between
 * Electron renderer and Remote UI applications.
 */

export { PlatformProvider, usePlatform, PlatformContext } from './PlatformProvider';
export type { PlatformCapabilities, PlatformType } from './PlatformProvider';
