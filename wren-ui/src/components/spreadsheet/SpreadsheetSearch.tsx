import { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Input, Button, Typography } from 'antd';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import UpOutlined from '@ant-design/icons/UpOutlined';
import DownOutlined from '@ant-design/icons/DownOutlined';

const { Text } = Typography;

// ── Types ───────────────────────────────────────────────

export interface SearchMatch {
  rowIndex: number;
  colIndex: number;
}

export interface SpreadsheetSearchProps {
  /** Whether search bar is open */
  visible: boolean;
  /** Called to close the search bar */
  onClose: () => void;
  /** Total columns in the data */
  columnCount: number;
  /** Total rows in the data */
  rowCount: number;
  /** Called when search term or active match changes */
  onSearchChange: (term: string, matches: SearchMatch[], activeIndex: number) => void;
  /** Raw data to search through (already filtered by column configs) */
  data: any[][];
  /** Column names (already filtered) */
  columnNames: string[];
}

// ── Styles ──────────────────────────────────────────────

const SearchBarContainer = styled.div`
  position: absolute;
  top: 8px;
  right: 16px;
  z-index: 1100;
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid var(--gray-5, #d9d9d9);
  border-radius: 6px;
  padding: 4px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
`;

const SearchInput = styled(Input)`
  && {
    width: 200px;
    border: none;
    box-shadow: none;
    font-size: 13px;
    padding: 2px 4px;

    &:focus {
      box-shadow: none;
    }
  }
`;

const NavButton = styled(Button)`
  && {
    width: 24px;
    height: 24px;
    min-width: 24px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
  }
`;

const MatchCount = styled(Text)`
  && {
    font-size: 11px;
    color: var(--gray-6);
    white-space: nowrap;
    min-width: 60px;
    text-align: center;
  }
`;

// ── Component ───────────────────────────────────────────

export default function SpreadsheetSearch(props: SpreadsheetSearchProps) {
  const {
    visible,
    onClose,
    data,
    columnNames,
    onSearchChange,
  } = props;

  const [searchTerm, setSearchTerm] = useState('');
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!visible) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    // Use timeout so the opening click doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  // Focus input when search becomes visible
  useEffect(() => {
    if (visible && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!visible) {
      setSearchTerm('');
      setMatches([]);
      setActiveIndex(0);
      onSearchChange('', [], -1);
    }
  }, [visible]);

  // Perform search whenever term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setMatches([]);
      setActiveIndex(0);
      onSearchChange('', [], -1);
      return;
    }

    const term = searchTerm.toLowerCase();
    const found: SearchMatch[] = [];

    // Search column names (row -1 in our indexing, but row 0 in the grid)
    columnNames.forEach((name, colIdx) => {
      if (name.toLowerCase().includes(term)) {
        found.push({ rowIndex: -1, colIndex: colIdx });
      }
    });

    // Search data rows
    data.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        if (cell !== null && cell !== undefined) {
          const str = typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
          if (str.toLowerCase().includes(term)) {
            found.push({ rowIndex: rowIdx, colIndex: colIdx });
          }
        }
      });
    });

    setMatches(found);
    const newActiveIdx = found.length > 0 ? 0 : -1;
    setActiveIndex(newActiveIdx);
    onSearchChange(searchTerm, found, newActiveIdx);
  }, [searchTerm, data, columnNames]);

  const goToMatch = useCallback(
    (idx: number) => {
      setActiveIndex(idx);
      onSearchChange(searchTerm, matches, idx);
    },
    [searchTerm, matches, onSearchChange],
  );

  const handleNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (activeIndex + 1) % matches.length;
    goToMatch(next);
  }, [activeIndex, matches, goToMatch]);

  const handlePrev = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (activeIndex - 1 + matches.length) % matches.length;
    goToMatch(prev);
  }, [activeIndex, matches, goToMatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrev();
        } else {
          handleNext();
        }
      }
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [handleNext, handlePrev, onClose],
  );

  if (!visible) return null;

  return (
    <SearchBarContainer ref={containerRef}>
      <SearchOutlined style={{ color: 'var(--gray-6)', fontSize: 14 }} />
      <SearchInput
        ref={inputRef}
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <MatchCount>
        {matches.length > 0
          ? `${activeIndex + 1} / ${matches.length}`
          : searchTerm
            ? 'No matches'
            : ''}
      </MatchCount>
      <NavButton
        type="text"
        size="small"
        icon={<UpOutlined />}
        onClick={handlePrev}
        disabled={matches.length === 0}
      />
      <NavButton
        type="text"
        size="small"
        icon={<DownOutlined />}
        onClick={handleNext}
        disabled={matches.length === 0}
      />
      <NavButton
        type="text"
        size="small"
        icon={<CloseOutlined />}
        onClick={onClose}
      />
    </SearchBarContainer>
  );
}
