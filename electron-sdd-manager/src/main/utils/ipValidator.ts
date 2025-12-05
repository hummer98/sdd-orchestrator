/**
 * IP Validator Utility
 * Validates private IP addresses for remote access security
 * Requirements: 9.1 - プライベートIPアドレス範囲の検証
 */

import { networkInterfaces } from 'os';

/**
 * Private IP address ranges (RFC 1918):
 * - Class A: 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
 * - Class B: 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
 * - Class C: 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
 *
 * Additional allowed ranges:
 * - Loopback: 127.0.0.0/8 (127.0.0.0 - 127.255.255.255)
 * - Link-local: 169.254.0.0/16 (169.254.0.0 - 169.254.255.255)
 */

/**
 * Validate IPv4 address format
 * @param ip IP address string to validate
 * @returns true if valid IPv4 format with all octets in range 0-255
 */
function isValidIPv4Format(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // Strict IPv4 regex: 4 groups of 1-3 digits separated by dots
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);

  if (!match) {
    return false;
  }

  // Check each octet is in range 0-255
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) {
      return false;
    }
  }

  return true;
}

/**
 * Parse IPv4 address into numeric octets
 * @param ip Valid IPv4 address string
 * @returns Array of 4 numeric octets
 */
function parseIPv4(ip: string): [number, number, number, number] {
  const parts = ip.split('.').map((part) => parseInt(part, 10));
  return [parts[0], parts[1], parts[2], parts[3]];
}

/**
 * Check if IP is in Class A private range (10.0.0.0/8)
 */
function isClassAPrivate(octets: [number, number, number, number]): boolean {
  return octets[0] === 10;
}

/**
 * Check if IP is in Class B private range (172.16.0.0/12)
 */
function isClassBPrivate(octets: [number, number, number, number]): boolean {
  return octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31;
}

/**
 * Check if IP is in Class C private range (192.168.0.0/16)
 */
function isClassCPrivate(octets: [number, number, number, number]): boolean {
  return octets[0] === 192 && octets[1] === 168;
}

/**
 * Check if IP is a loopback address (127.0.0.0/8)
 */
function isLoopback(octets: [number, number, number, number]): boolean {
  return octets[0] === 127;
}

/**
 * Check if IP is a link-local address (169.254.0.0/16)
 */
function isLinkLocal(octets: [number, number, number, number]): boolean {
  return octets[0] === 169 && octets[1] === 254;
}

/**
 * Check if an IP address is a private (non-routable) address
 *
 * Validates against:
 * - RFC 1918 private ranges (10.x, 172.16-31.x, 192.168.x)
 * - Loopback addresses (127.x.x.x, ::1, ::ffff:127.x.x.x)
 * - Link-local addresses (169.254.x.x)
 * - IPv6 loopback (::1)
 * - IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
 *
 * @param ip IP address string to validate
 * @returns true if the IP is a private address, false otherwise
 *
 * @example
 * isPrivateIP('192.168.1.1'); // true
 * isPrivateIP('10.0.0.1'); // true
 * isPrivateIP('::1'); // true (IPv6 loopback)
 * isPrivateIP('::ffff:127.0.0.1'); // true (IPv4-mapped IPv6)
 * isPrivateIP('8.8.8.8'); // false
 */
export function isPrivateIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // Handle IPv6 loopback address
  if (ip === '::1') {
    return true;
  }

  // Handle IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
  const ipv4MappedPrefix = '::ffff:';
  if (ip.toLowerCase().startsWith(ipv4MappedPrefix)) {
    const ipv4Part = ip.slice(ipv4MappedPrefix.length);
    return isPrivateIPv4(ipv4Part);
  }

  return isPrivateIPv4(ip);
}

/**
 * Check if an IPv4 address is private
 */
function isPrivateIPv4(ip: string): boolean {
  // Validate format first
  if (!isValidIPv4Format(ip)) {
    return false;
  }

  const octets = parseIPv4(ip);

  // Check all private/local ranges
  return (
    isClassAPrivate(octets) ||
    isClassBPrivate(octets) ||
    isClassCPrivate(octets) ||
    isLoopback(octets) ||
    isLinkLocal(octets)
  );
}

/**
 * Get the local network IP address of this machine
 *
 * Scans network interfaces to find the first non-loopback IPv4 address.
 * Prefers external interfaces (en0, eth0) over internal ones.
 *
 * @returns Local IPv4 address string, or '127.0.0.1' if no suitable address found
 *
 * @example
 * const ip = getLocalIP(); // '192.168.1.100'
 */
export function getLocalIP(): string {
  const interfaces = networkInterfaces();
  const fallback = '127.0.0.1';

  // Priority order for interface names (common interface names)
  const priorityInterfaces = ['en0', 'en1', 'eth0', 'eth1', 'wlan0', 'wlan1'];

  // First, try priority interfaces
  for (const name of priorityInterfaces) {
    const iface = interfaces[name];
    if (iface) {
      for (const info of iface) {
        if (info.family === 'IPv4' && !info.internal) {
          return info.address;
        }
      }
    }
  }

  // Then, try any other interface
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const info of iface) {
        if (info.family === 'IPv4' && !info.internal) {
          return info.address;
        }
      }
    }
  }

  return fallback;
}
