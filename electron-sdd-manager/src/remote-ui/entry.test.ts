/**
 * Test for Remote UI entry point files
 * Validates that all required entry point files exist and have correct structure
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const remoteUiDir = resolve(__dirname, '.');

describe('Remote UI entry point', () => {
  describe('index.html', () => {
    const indexHtmlPath = resolve(remoteUiDir, 'index.html');

    it('should exist', () => {
      expect(existsSync(indexHtmlPath)).toBe(true);
    });

    it('should reference main.tsx as module entry', () => {
      const content = readFileSync(indexHtmlPath, 'utf-8');
      expect(content).toContain('type="module"');
      expect(content).toContain('src="/main.tsx"');
    });

    it('should have root div element', () => {
      const content = readFileSync(indexHtmlPath, 'utf-8');
      expect(content).toContain('id="root"');
    });

    it('should have proper HTML5 doctype', () => {
      const content = readFileSync(indexHtmlPath, 'utf-8');
      expect(content.toLowerCase()).toContain('<!doctype html>');
    });

    it('should have viewport meta tag for responsive design', () => {
      const content = readFileSync(indexHtmlPath, 'utf-8');
      expect(content).toContain('viewport');
      expect(content).toContain('width=device-width');
    });
  });

  describe('main.tsx', () => {
    const mainTsxPath = resolve(remoteUiDir, 'main.tsx');

    it('should exist', () => {
      expect(existsSync(mainTsxPath)).toBe(true);
    });

    it('should import React and ReactDOM', () => {
      const content = readFileSync(mainTsxPath, 'utf-8');
      expect(content).toContain("from 'react'");
      expect(content).toContain("from 'react-dom/client'");
    });

    it('should import App component', () => {
      const content = readFileSync(mainTsxPath, 'utf-8');
      expect(content).toContain("import App from './App'");
    });

    it('should import styles', () => {
      const content = readFileSync(mainTsxPath, 'utf-8');
      expect(content).toContain("import './styles/index.css'");
    });

    it('should render to root element', () => {
      const content = readFileSync(mainTsxPath, 'utf-8');
      expect(content).toContain("getElementById('root')");
      expect(content).toContain('createRoot');
    });
  });

  describe('App.tsx', () => {
    const appTsxPath = resolve(remoteUiDir, 'App.tsx');

    it('should exist', () => {
      expect(existsSync(appTsxPath)).toBe(true);
    });

    it('should export a default function component', () => {
      const content = readFileSync(appTsxPath, 'utf-8');
      expect(content).toContain('export default function App');
    });
  });

  describe('styles/index.css', () => {
    const stylesPath = resolve(remoteUiDir, 'styles/index.css');

    it('should exist', () => {
      expect(existsSync(stylesPath)).toBe(true);
    });

    it('should import tailwindcss', () => {
      const content = readFileSync(stylesPath, 'utf-8');
      expect(content).toContain('@import "tailwindcss"');
    });
  });
});
