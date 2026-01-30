/**
 * Git components barrel export
 *
 * This module exports all Git-related UI components used by both
 * Electron renderer and Remote UI applications.
 *
 * Requirements: 10.3, 10.4 - GitView shared component for Electron/Remote UI
 * git-view-source-mode: Extended with source view components
 */

export { GitView } from './GitView';
export type { GitViewProps } from './GitView';
export { GitFileTree } from './GitFileTree';
export { GitDiffViewer } from './GitDiffViewer';

// git-view-source-mode: Source view components
export { ViewModeToggle } from './ViewModeToggle';
export type { ViewModeToggleProps } from './ViewModeToggle';
export { SourceCodeViewer } from './SourceCodeViewer';
export type { SourceCodeViewerProps } from './SourceCodeViewer';
export { ImageViewer } from './ImageViewer';
export type { ImageViewerProps } from './ImageViewer';
export { MarkdownViewer } from './MarkdownViewer';
export type { MarkdownViewerProps } from './MarkdownViewer';
export { BinaryFileIndicator } from './BinaryFileIndicator';
export type { BinaryFileIndicatorProps } from './BinaryFileIndicator';
export { SourceContentViewer } from './SourceContentViewer';
export type { SourceContentViewerProps } from './SourceContentViewer';
