/**
 * AgentIcon and AgentBranchIcon Tests
 * Requirements: 3.1, 3.2, 3.3, 2.3
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentIcon, AgentBranchIcon, AGENT_ICON_COLOR } from './AgentIcon';

describe('AgentIcon', () => {
  it('renders Bot icon', () => {
    render(<AgentIcon data-testid="agent-icon" />);
    const icon = screen.getByTestId('agent-icon');
    expect(icon).toBeDefined();
    // Bot icon should be rendered (lucide-react renders svg)
    expect(icon.tagName.toLowerCase()).toBe('svg');
  });

  it('applies className prop', () => {
    render(<AgentIcon className="w-6 h-6" data-testid="agent-icon" />);
    const icon = screen.getByTestId('agent-icon');
    // SVG elements use className.baseVal
    const classNames = icon.getAttribute('class') || '';
    expect(classNames).toContain('w-6');
    expect(classNames).toContain('h-6');
  });

  it('applies AGENT_ICON_COLOR by default', () => {
    render(<AgentIcon data-testid="agent-icon" />);
    const icon = screen.getByTestId('agent-icon');
    const classNames = icon.getAttribute('class') || '';
    expect(classNames).toContain('text-white');
  });

  it('allows className to override default color', () => {
    render(<AgentIcon className="text-blue-500" data-testid="agent-icon" />);
    const icon = screen.getByTestId('agent-icon');
    // Both classes should be present - CSS cascade handles priority
    const classNames = icon.getAttribute('class') || '';
    expect(classNames).toContain('text-blue-500');
  });

  it('sets data-testid attribute', () => {
    render(<AgentIcon data-testid="custom-testid" />);
    expect(screen.getByTestId('custom-testid')).toBeDefined();
  });
});

describe('AgentBranchIcon', () => {
  it('renders both Bot and GitBranch icons', () => {
    render(<AgentBranchIcon data-testid="agent-branch-icon" />);
    const container = screen.getByTestId('agent-branch-icon');
    expect(container).toBeDefined();
    // Container should have two svg children
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });

  it('applies gap-1 class for icon spacing', () => {
    render(<AgentBranchIcon data-testid="agent-branch-icon" />);
    const container = screen.getByTestId('agent-branch-icon');
    const classNames = container.getAttribute('class') || '';
    expect(classNames).toContain('gap-1');
  });

  it('applies flex layout', () => {
    render(<AgentBranchIcon data-testid="agent-branch-icon" />);
    const container = screen.getByTestId('agent-branch-icon');
    const classNames = container.getAttribute('class') || '';
    expect(classNames).toContain('flex');
  });

  it('applies className prop to both icons', () => {
    render(<AgentBranchIcon className="w-5 h-5" data-testid="agent-branch-icon" />);
    const container = screen.getByTestId('agent-branch-icon');
    const svgs = container.querySelectorAll('svg');
    // Both icons should have the size class
    expect(svgs[0].className.baseVal).toContain('w-5');
    expect(svgs[0].className.baseVal).toContain('h-5');
    expect(svgs[1].className.baseVal).toContain('w-5');
    expect(svgs[1].className.baseVal).toContain('h-5');
  });

  it('applies AGENT_ICON_COLOR to both icons', () => {
    render(<AgentBranchIcon data-testid="agent-branch-icon" />);
    const container = screen.getByTestId('agent-branch-icon');
    const svgs = container.querySelectorAll('svg');
    // Both icons should have the default color
    expect(svgs[0].className.baseVal).toContain('text-white');
    expect(svgs[1].className.baseVal).toContain('text-white');
  });
});

describe('AGENT_ICON_COLOR', () => {
  it('is defined as text-white', () => {
    expect(AGENT_ICON_COLOR).toBe('text-white');
  });
});
