/**
 * useDeviceType - Hook for responsive device type detection
 *
 * This hook provides device type information for responsive UI rendering.
 * It uses both User Agent detection and window size for accurate categorization.
 *
 * Design Decision: DD-003 in design.md
 * - Mobile: Width < 768px or mobile User Agent
 * - Tablet: 768px <= Width < 1024px or tablet User Agent
 * - Desktop: Width >= 1024px (Electron always treated as desktop)
 */

import { useState, useEffect, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Device type categories
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Device type detection result
 */
export interface DeviceTypeInfo {
  /**
   * Current device type
   */
  deviceType: DeviceType;

  /**
   * Is mobile device (phone)
   */
  isMobile: boolean;

  /**
   * Is tablet device
   */
  isTablet: boolean;

  /**
   * Is desktop device
   */
  isDesktop: boolean;

  /**
   * Current window width in pixels
   */
  width: number;

  /**
   * Current window height in pixels
   */
  height: number;
}

// =============================================================================
// Breakpoints
// =============================================================================

const BREAKPOINTS = {
  mobile: 768,  // < 768px = mobile
  tablet: 1024, // 768-1023px = tablet, >= 1024px = desktop
} as const;

// =============================================================================
// User Agent Detection
// =============================================================================

/**
 * Detect device type from User Agent string
 */
function detectFromUserAgent(): DeviceType | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const userAgent = navigator.userAgent.toLowerCase();

  // Check for mobile devices
  const mobileKeywords = [
    'iphone',
    'android',
    'mobile',
    'blackberry',
    'opera mini',
    'iemobile',
    'wpdesktop',
    'windows phone',
  ];

  for (const keyword of mobileKeywords) {
    if (userAgent.includes(keyword)) {
      // Special case: iPad sometimes includes 'mobile' but should be tablet
      if (userAgent.includes('ipad')) {
        return 'tablet';
      }
      return 'mobile';
    }
  }

  // Check for tablet devices
  const tabletKeywords = ['ipad', 'tablet', 'kindle', 'silk', 'playbook'];

  for (const keyword of tabletKeywords) {
    if (userAgent.includes(keyword)) {
      return 'tablet';
    }
  }

  return null;
}

/**
 * Detect device type from window size
 */
function detectFromWindowSize(width: number): DeviceType {
  if (width < BREAKPOINTS.mobile) {
    return 'mobile';
  }
  if (width < BREAKPOINTS.tablet) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Get window dimensions safely
 */
function getWindowDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768 }; // Default to desktop size
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * useDeviceType - Hook for responsive device type detection
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { deviceType, isMobile, isTablet, isDesktop } = useDeviceType();
 *
 *   return (
 *     <div>
 *       {isMobile && <MobileLayout />}
 *       {isTablet && <TabletLayout />}
 *       {isDesktop && <DesktopLayout />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDeviceType(): DeviceTypeInfo {
  const [dimensions, setDimensions] = useState(getWindowDimensions);

  // Handle window resize
  useEffect(() => {
    function handleResize() {
      setDimensions(getWindowDimensions());
    }

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Determine device type
  const deviceInfo = useMemo<DeviceTypeInfo>(() => {
    const { width, height } = dimensions;

    // First try User Agent detection
    const userAgentType = detectFromUserAgent();

    // Then use window size (or override with User Agent if detected)
    const sizeType = detectFromWindowSize(width);

    // User Agent takes precedence for mobile/tablet, but window size can override
    // This allows testing responsive layouts on desktop by resizing the browser
    let deviceType: DeviceType;

    if (userAgentType === 'mobile') {
      // Mobile UA: always mobile
      deviceType = 'mobile';
    } else if (userAgentType === 'tablet') {
      // Tablet UA: tablet unless window is very small
      deviceType = sizeType === 'mobile' ? 'mobile' : 'tablet';
    } else {
      // Desktop UA or unknown: use window size
      deviceType = sizeType;
    }

    return {
      deviceType,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      width,
      height,
    };
  }, [dimensions]);

  return deviceInfo;
}
