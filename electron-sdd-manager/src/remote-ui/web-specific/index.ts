/**
 * Web-specific components barrel export
 *
 * Task 7: Remote UI固有コンポーネント
 * これらのコンポーネントはRemote UIでのみ使用される。
 */

// AuthPage (Task 7.1)
export { AuthPage } from './AuthPage';
export type { AuthPageProps, AuthErrorType } from './AuthPage';

// ReconnectOverlay (Task 7.2)
export { ReconnectOverlay } from './ReconnectOverlay';
export type { ReconnectOverlayProps } from './ReconnectOverlay';
