/** Fisher–Yates shuffle returning a new array */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Suggest near-square grid dimensions for N names */
export function suggestGridDimensions(count: number): { rows: number; cols: number } {
  if (count <= 0) return { rows: 2, cols: 2 };
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { rows, cols };
}

/** Grid cell index is playable if it is among the first `playableCount` row-major slots */
export function isPlayableCell(
  gridIndex: number,
  playableCount: number,
): boolean {
  return gridIndex < playableCount;
}

/** Map grid index to name index via shuffled assignment into playable slots */
export function gridIndexToNameIndex(
  gridIndex: number,
  shuffledIndices: number[],
): number | null {
  const playableSlot = gridIndex;
  if (playableSlot >= shuffledIndices.length) return null;
  return shuffledIndices[playableSlot];
}

import type { BingoLine } from '../types';

/** All bingo lines for a grid; only includes playable cells per line */
export function getBingoLines(
  rows: number,
  cols: number,
  playableCount: number,
): BingoLine[] {
  const lines: BingoLine[] = [];
  let id = 0;

  for (let r = 0; r < rows; r++) {
    const cells: number[] = [];
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (isPlayableCell(idx, playableCount)) cells.push(idx);
    }
    if (cells.length > 0) lines.push({ id: id++, type: 'row', cells });
  }

  for (let c = 0; c < cols; c++) {
    const cells: number[] = [];
    for (let r = 0; r < rows; r++) {
      const idx = r * cols + c;
      if (isPlayableCell(idx, playableCount)) cells.push(idx);
    }
    if (cells.length > 0) lines.push({ id: id++, type: 'col', cells });
  }

  if (rows === cols) {
    const diag1: number[] = [];
    const diag2: number[] = [];
    for (let i = 0; i < rows; i++) {
      const d1 = i * cols + i;
      const d2 = i * cols + (cols - 1 - i);
      if (isPlayableCell(d1, playableCount)) diag1.push(d1);
      if (isPlayableCell(d2, playableCount)) diag2.push(d2);
    }
    if (diag1.length > 0) lines.push({ id: id++, type: 'diag', cells: diag1 });
    if (diag2.length > 0) lines.push({ id: id++, type: 'diag', cells: diag2 });
  }

  return lines;
}

/** nameIndex -> gridIndex for a player's shuffle */
export function nameIndexToGridIndex(
  nameIndex: number,
  shuffledIndices: number[],
): number {
  return shuffledIndices.indexOf(nameIndex);
}

/** Which grid cells belong to completed bingo lines */
export function getHighlightedCells(
  completedLineIds: number[],
  lines: BingoLine[],
): Set<number> {
  const set = new Set<number>();
  for (const lineId of completedLineIds) {
    const line = lines.find((l) => l.id === lineId);
    if (line) line.cells.forEach((c) => set.add(c));
  }
  return set;
}

/** Detect completed lines from marked state (by name index). Free square always counts as marked. */
export function detectCompletedLines(
  marked: boolean[],
  rows: number,
  cols: number,
  shuffledIndices: number[],
  freeSquareIndex?: number,
): number[] {
  const playableCount = marked.length;
  const lines = getBingoLines(rows, cols, playableCount);
  const completed: number[] = [];

  for (const line of lines) {
    const allMarked = line.cells.every((gridIdx) => {
      // Free square always counts as marked
      if (freeSquareIndex !== undefined && gridIdx === freeSquareIndex) {
        return true;
      }
      const nameIdx = gridIndexToNameIndex(gridIdx, shuffledIndices);
      return nameIdx !== null && marked[nameIdx];
    });
    if (allMarked) completed.push(line.id);
  }

  return completed;
}

export function computeScore(
  marked: boolean[],
  bingoLines: number[],
  squarePoints: number,
  bingoBonus: number,
  freeSquareIndex?: number,
): { squaresMarked: number; bingoCount: number; score: number } {
  // Count marked squares, excluding free square
  let squaresMarked = 0;
  for (let i = 0; i < marked.length; i++) {
    if (marked[i] && i !== freeSquareIndex) {
      squaresMarked++;
    }
  }
  const bingoCount = bingoLines.length;
  const score = squaresMarked * squarePoints + bingoCount * bingoBonus;
  return { squaresMarked, bingoCount, score };
}

export function parseNamesInput(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateNames(names: string[]): string | null {
  if (names.length < 4) return 'Need at least 4 names.';
  const lower = names.map((n) => n.toLowerCase());
  const dupes = lower.filter((n, i) => lower.indexOf(n) !== i);
  if (dupes.length > 0) return `Duplicate names: ${[...new Set(dupes)].join(', ')}`;
  return null;
}

export function validateGrid(
  rows: number,
  cols: number,
  nameCount: number,
): string | null {
  if (rows < 2 || cols < 2) return 'Grid must be at least 2×2.';
  if (rows * cols < 4) return 'Grid must have at least 4 cells.';
  if (rows * cols > nameCount) {
    return `Grid ${rows}×${cols} = ${rows * cols} cells, but you only have ${nameCount} names.`;
  }
  return null;
}

/** Get center cell grid index for a square grid (free square) */
export function getCenterCellIndex(rows: number, cols: number): number | null {
  if (rows !== cols) return null; // Only for square grids
  if (rows % 2 === 0) return null; // Only for odd dimensions (5x5, 7x7)
  const center = Math.floor(rows / 2);
  return center * cols + center;
}
