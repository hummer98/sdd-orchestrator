/**
 * IPValidator Unit Tests
 * TDD: Testing private IP validation and local IP detection
 * Requirements: 9.1 - プライベートIPアドレス範囲の検証
 */

import { describe, it, expect } from 'vitest';
import { isPrivateIP, getLocalIP } from './ipValidator';

describe('isPrivateIP', () => {
  describe('Class A Private Range (10.0.0.0/8)', () => {
    it('should return true for 10.0.0.1', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
    });

    it('should return true for 10.255.255.255', () => {
      expect(isPrivateIP('10.255.255.255')).toBe(true);
    });

    it('should return true for 10.128.64.32', () => {
      expect(isPrivateIP('10.128.64.32')).toBe(true);
    });
  });

  describe('Class B Private Range (172.16.0.0/12)', () => {
    it('should return true for 172.16.0.1', () => {
      expect(isPrivateIP('172.16.0.1')).toBe(true);
    });

    it('should return true for 172.31.255.255', () => {
      expect(isPrivateIP('172.31.255.255')).toBe(true);
    });

    it('should return true for 172.20.10.5', () => {
      expect(isPrivateIP('172.20.10.5')).toBe(true);
    });

    it('should return false for 172.15.0.1 (outside range)', () => {
      expect(isPrivateIP('172.15.0.1')).toBe(false);
    });

    it('should return false for 172.32.0.1 (outside range)', () => {
      expect(isPrivateIP('172.32.0.1')).toBe(false);
    });
  });

  describe('Class C Private Range (192.168.0.0/16)', () => {
    it('should return true for 192.168.0.1', () => {
      expect(isPrivateIP('192.168.0.1')).toBe(true);
    });

    it('should return true for 192.168.255.255', () => {
      expect(isPrivateIP('192.168.255.255')).toBe(true);
    });

    it('should return true for 192.168.1.100', () => {
      expect(isPrivateIP('192.168.1.100')).toBe(true);
    });

    it('should return false for 192.167.0.1 (outside range)', () => {
      expect(isPrivateIP('192.167.0.1')).toBe(false);
    });

    it('should return false for 192.169.0.1 (outside range)', () => {
      expect(isPrivateIP('192.169.0.1')).toBe(false);
    });
  });

  describe('Loopback Address (127.0.0.0/8)', () => {
    it('should return true for 127.0.0.1', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true);
    });

    it('should return true for 127.255.255.255', () => {
      expect(isPrivateIP('127.255.255.255')).toBe(true);
    });

    it('should return true for 127.0.1.1', () => {
      expect(isPrivateIP('127.0.1.1')).toBe(true);
    });
  });

  describe('Link-Local Address (169.254.0.0/16)', () => {
    it('should return true for 169.254.0.1', () => {
      expect(isPrivateIP('169.254.0.1')).toBe(true);
    });

    it('should return true for 169.254.255.255', () => {
      expect(isPrivateIP('169.254.255.255')).toBe(true);
    });

    it('should return true for 169.254.1.1', () => {
      expect(isPrivateIP('169.254.1.1')).toBe(true);
    });

    it('should return false for 169.253.0.1 (outside range)', () => {
      expect(isPrivateIP('169.253.0.1')).toBe(false);
    });

    it('should return false for 169.255.0.1 (outside range)', () => {
      expect(isPrivateIP('169.255.0.1')).toBe(false);
    });
  });

  describe('Public IP Addresses', () => {
    it('should return false for 8.8.8.8 (Google DNS)', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
    });

    it('should return false for 1.1.1.1 (Cloudflare DNS)', () => {
      expect(isPrivateIP('1.1.1.1')).toBe(false);
    });

    it('should return false for 142.250.185.46 (google.com)', () => {
      expect(isPrivateIP('142.250.185.46')).toBe(false);
    });

    it('should return false for 203.0.113.1 (TEST-NET-3)', () => {
      expect(isPrivateIP('203.0.113.1')).toBe(false);
    });

    it('should return false for 198.51.100.1 (TEST-NET-2)', () => {
      expect(isPrivateIP('198.51.100.1')).toBe(false);
    });
  });

  describe('IPv6 Loopback Address (::1)', () => {
    it('should return true for ::1 (IPv6 loopback)', () => {
      expect(isPrivateIP('::1')).toBe(true);
    });
  });

  describe('IPv4-mapped IPv6 Addresses (::ffff:x.x.x.x)', () => {
    it('should return true for ::ffff:127.0.0.1 (loopback)', () => {
      expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true);
    });

    it('should return true for ::ffff:192.168.1.1 (private)', () => {
      expect(isPrivateIP('::ffff:192.168.1.1')).toBe(true);
    });

    it('should return true for ::ffff:10.0.0.1 (private)', () => {
      expect(isPrivateIP('::ffff:10.0.0.1')).toBe(true);
    });

    it('should return false for ::ffff:8.8.8.8 (public)', () => {
      expect(isPrivateIP('::ffff:8.8.8.8')).toBe(false);
    });

    it('should handle uppercase ::FFFF:192.168.1.1', () => {
      expect(isPrivateIP('::FFFF:192.168.1.1')).toBe(true);
    });
  });

  describe('Invalid IP Formats', () => {
    it('should return false for empty string', () => {
      expect(isPrivateIP('')).toBe(false);
    });

    it('should return false for invalid format "abc.def.ghi.jkl"', () => {
      expect(isPrivateIP('abc.def.ghi.jkl')).toBe(false);
    });

    it('should return false for incomplete IP "192.168.1"', () => {
      expect(isPrivateIP('192.168.1')).toBe(false);
    });

    it('should return false for IP with out-of-range octet "192.168.1.256"', () => {
      expect(isPrivateIP('192.168.1.256')).toBe(false);
    });

    it('should return false for IP with negative octet "192.168.-1.1"', () => {
      expect(isPrivateIP('192.168.-1.1')).toBe(false);
    });

    it('should return false for IP with port "192.168.1.1:8080"', () => {
      expect(isPrivateIP('192.168.1.1:8080')).toBe(false);
    });

    it('should return false for null-like values', () => {
      expect(isPrivateIP(null as unknown as string)).toBe(false);
      expect(isPrivateIP(undefined as unknown as string)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should return true for 10.0.0.0 (network address)', () => {
      expect(isPrivateIP('10.0.0.0')).toBe(true);
    });

    it('should return true for 192.168.0.0 (network address)', () => {
      expect(isPrivateIP('192.168.0.0')).toBe(true);
    });

    it('should handle leading zeros: "010.000.000.001"', () => {
      // Leading zeros should be handled - typically parsed as decimal
      expect(isPrivateIP('010.000.000.001')).toBe(true);
    });

    it('should handle spaces: " 192.168.1.1 " should return false (strict format)', () => {
      expect(isPrivateIP(' 192.168.1.1 ')).toBe(false);
    });
  });
});

describe('getLocalIP', () => {
  it('should return a valid IPv4 address', () => {
    const ip = getLocalIP();
    // Should be a valid IPv4 format
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    expect(ip).toMatch(ipv4Regex);
  });

  it('should return a private IP address (including loopback as fallback)', () => {
    const ip = getLocalIP();
    // The local IP should be a private address (can be loopback if no network)
    expect(isPrivateIP(ip)).toBe(true);
  });

  it('should return consistent results on multiple calls', () => {
    const ip1 = getLocalIP();
    const ip2 = getLocalIP();
    expect(ip1).toBe(ip2);
  });
});
