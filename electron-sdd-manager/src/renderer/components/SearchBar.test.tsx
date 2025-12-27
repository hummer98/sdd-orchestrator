/**
 * SearchBar Component Tests
 * TDD: Testing search bar UI
 * Requirements: artifact-editor-search 1.1, 1.2, 1.3, 1.4, 1.5, 2.4, 3.1, 3.2, 5.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';
import { useEditorStore } from '../stores/editorStore';

describe('SearchBar', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    // Reset store state
    useEditorStore.setState({
      searchVisible: true,
      searchQuery: '',
      caseSensitive: false,
      matches: [],
      activeMatchIndex: -1,
    });
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('should render when visible is true', () => {
      render(<SearchBar visible={true} onClose={mockOnClose} />);
      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });

    it('should not render when visible is false', () => {
      render(<SearchBar visible={false} onClose={mockOnClose} />);
      expect(screen.queryByTestId('search-bar')).not.toBeInTheDocument();
    });
  });

  describe('search input', () => {
    it('should render search input field', () => {
      render(<SearchBar visible={true} onClose={mockOnClose} />);
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('should update search query when typing', () => {
      render(<SearchBar visible={true} onClose={mockOnClose} />);
      const input = screen.getByTestId('search-input');

      fireEvent.change(input, { target: { value: 'test query' } });

      expect(useEditorStore.getState().searchQuery).toBe('test query');
    });

    it('should display current search query', () => {
      useEditorStore.setState({ searchQuery: 'existing query' });
      render(<SearchBar visible={true} onClose={mockOnClose} />);

      const input = screen.getByTestId('search-input') as HTMLInputElement;
      expect(input.value).toBe('existing query');
    });

    it('should auto focus on mount', () => {
      render(<SearchBar visible={true} onClose={mockOnClose} />);
      const input = screen.getByTestId('search-input');

      // Note: In jsdom, focus might not work as expected
      // We check that the input has autoFocus attribute
      expect(input).toHaveAttribute('data-autofocus', 'true');
    });
  });

  describe('match count display', () => {
    it('should display "N件中M件目" when matches exist', () => {
      useEditorStore.setState({
        searchQuery: 'test',
        matches: [
          { start: 0, end: 4 },
          { start: 10, end: 14 },
          { start: 20, end: 24 },
        ],
        activeMatchIndex: 1,
      });
      render(<SearchBar visible={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('match-count')).toHaveTextContent('3件中2件目');
    });

    it('should display "0件" when no matches', () => {
      useEditorStore.setState({
        searchQuery: 'xyz',
        matches: [],
        activeMatchIndex: -1,
      });
      render(<SearchBar visible={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('match-count')).toHaveTextContent('0件');
    });

    it('should not display match count when query is empty', () => {
      useEditorStore.setState({
        searchQuery: '',
        matches: [],
        activeMatchIndex: -1,
      });
      render(<SearchBar visible={true} onClose={mockOnClose} />);

      expect(screen.queryByTestId('match-count')).not.toBeInTheDocument();
    });
  });

  describe('navigation buttons', () => {
    it('should render previous button', () => {
      render(<SearchBar visible={true} onClose={mockOnClose} />);
      expect(screen.getByTestId('search-prev-button')).toBeInTheDocument();
    });

    it('should render next button', () => {
      render(<SearchBar visible={true} onClose={mockOnClose} />);
      expect(screen.getByTestId('search-next-button')).toBeInTheDocument();
    });

    it('should call navigatePrev when previous button is clicked', () => {
      useEditorStore.setState({
        matches: [
          { start: 0, end: 4 },
          { start: 10, end: 14 },
        ],
        activeMatchIndex: 1,
      });
      render(<SearchBar visible={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('search-prev-button'));

      expect(useEditorStore.getState().activeMatchIndex).toBe(0);
    });

    it('should call navigateNext when next button is clicked', () => {
      useEditorStore.setState({
        matches: [
          { start: 0, end: 4 },
          { start: 10, end: 14 },
        ],
        activeMatchIndex: 0,
      });
      render(<SearchBar visible={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('search-next-button'));

      expect(useEditorStore.getState().activeMatchIndex).toBe(1);
    });

    it('should disable navigation buttons when no matches', () => {
      useEditorStore.setState({
        matches: [],
        activeMatchIndex: -1,
      });
      render(<SearchBar visible={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('search-prev-button')).toBeDisabled();
      expect(screen.getByTestId('search-next-button')).toBeDisabled();
    });
  });

  describe('case sensitive toggle', () => {
    it('should render case sensitive toggle button', () => {
      render(<SearchBar visible={true} onClose={mockOnClose} />);
      expect(screen.getByTestId('case-sensitive-toggle')).toBeInTheDocument();
    });

    it('should toggle case sensitive when clicked', () => {
      render(<SearchBar visible={true} onClose={mockOnClose} />);

      expect(useEditorStore.getState().caseSensitive).toBe(false);

      fireEvent.click(screen.getByTestId('case-sensitive-toggle'));

      expect(useEditorStore.getState().caseSensitive).toBe(true);
    });

    it('should show active state when case sensitive is on', () => {
      useEditorStore.setState({ caseSensitive: true });
      render(<SearchBar visible={true} onClose={mockOnClose} />);

      const toggle = screen.getByTestId('case-sensitive-toggle');
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('close button', () => {
    it('should render close button', () => {
      render(<SearchBar visible={true} onClose={mockOnClose} />);
      expect(screen.getByTestId('search-close-button')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(<SearchBar visible={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('search-close-button'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have proper aria labels', () => {
      render(<SearchBar visible={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('search-input')).toHaveAttribute(
        'aria-label',
        '検索'
      );
      expect(screen.getByTestId('search-prev-button')).toHaveAttribute(
        'aria-label',
        '前へ'
      );
      expect(screen.getByTestId('search-next-button')).toHaveAttribute(
        'aria-label',
        '次へ'
      );
      expect(screen.getByTestId('case-sensitive-toggle')).toHaveAttribute(
        'aria-label',
        '大文字・小文字を区別'
      );
      expect(screen.getByTestId('search-close-button')).toHaveAttribute(
        'aria-label',
        '閉じる'
      );
    });
  });
});
