/**
 * Remote UI Root Application Component
 *
 * Task 9.1-9.3: Remote UIアプリケーション統合
 * Requirements: 2.4, 4.1
 *
 * Entry point for the Remote UI application:
 * - ApiClientProvider (WebSocketApiClient) - API abstraction layer
 * - PlatformProvider (Web platform capabilities) - Platform-specific features
 * - Device-responsive layout (MobileLayout / DesktopLayout)
 */

import { ApiClientProvider, PlatformProvider, useDeviceType } from '../shared';
import { MobileLayout, DesktopLayout } from './layouts';

/**
 * AppContent - Main content component that uses device type to select layout
 *
 * This component must be inside providers to use useDeviceType hook.
 */
function AppContent() {
  const { isMobile } = useDeviceType();

  // Device-responsive layout selection
  // MobileLayout for mobile devices, DesktopLayout for tablets and desktops
  const Layout = isMobile ? MobileLayout : DesktopLayout;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              SDD Orchestrator
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Remote UI - React Migration in Progress
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/**
 * App - Root component with providers
 *
 * Provider nesting order:
 * 1. ApiClientProvider - outermost, provides API client
 * 2. PlatformProvider - provides platform capabilities
 * 3. AppContent - uses providers and renders layout
 */
export default function App() {
  return (
    <ApiClientProvider>
      <PlatformProvider>
        <AppContent />
      </PlatformProvider>
    </ApiClientProvider>
  );
}
