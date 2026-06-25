import { useMemo } from 'react';
import type { GameConfig, Player } from '../types';
import {
  getBingoLines,
  getCenterCellIndex,
  getHighlightedCells,
  gridIndexToNameIndex,
  isPlayableCell,
} from '../lib/grid';

interface BoardProps {
  config: GameConfig;
  player: Player;
  onToggle: (nameIndex: number) => void;
}

export function Board({ config, player, onToggle }: BoardProps) {
  const { grid_rows, grid_cols, names } = config;
  const totalCells = grid_rows * grid_cols;
  const playableCount = player.marked.length;
  const centerCellIndex = getCenterCellIndex(grid_rows, grid_cols);
  const isFreeSquareEnabled = config.has_free_square ?? false;

  const lines = useMemo(
    () => getBingoLines(grid_rows, grid_cols, playableCount),
    [grid_rows, grid_cols, playableCount],
  );

  const highlighted = useMemo(
    () => getHighlightedCells(player.bingo_lines, lines),
    [player.bingo_lines, lines],
  );

  const cells = useMemo(() => {
    return Array.from({ length: totalCells }, (_, gridIndex) => {
      const isFree = isFreeSquareEnabled && centerCellIndex === gridIndex;
      const playable = isPlayableCell(gridIndex, playableCount);
      if (!playable) {
        return { gridIndex, name: null, nameIndex: null, isPlayable: false, isMarked: false, isFree: false };
      }
      if (isFree) {
        return { gridIndex, name: 'Free', nameIndex: null, isPlayable: true, isMarked: true, isFree: true };
      }
      const nameIndex = gridIndexToNameIndex(gridIndex, player.shuffled_indices);
      if (nameIndex === null) {
        return { gridIndex, name: null, nameIndex: null, isPlayable: false, isMarked: false, isFree: false };
      }
      return {
        gridIndex,
        name: names[nameIndex],
        nameIndex,
        isPlayable: true,
        isMarked: player.marked[nameIndex],
        isFree: false,
      };
    });
  }, [totalCells, playableCount, player.shuffled_indices, player.marked, names, isFreeSquareEnabled, centerCellIndex]);

  return (
    <div
      className="grid gap-1.5 w-full max-w-lg mx-auto"
      style={{ gridTemplateColumns: `repeat(${grid_cols}, minmax(0, 1fr))` }}
    >
      {cells.map((cell) => {
        if (!cell.isPlayable) {
          return (
            <div
              key={cell.gridIndex}
              className="aspect-square rounded-lg bg-white/5 border border-white/5"
              aria-hidden
            />
          );
        }

        const inBingoLine = highlighted.has(cell.gridIndex);
        const isFreeSquare = cell.isFree;
        return (
          <button
            key={cell.gridIndex}
            type="button"
            onClick={() => !isFreeSquare && cell.nameIndex !== null && onToggle(cell.nameIndex)}
            disabled={isFreeSquare}
            className={`
              aspect-square rounded-lg border-2 p-1 text-[10px] sm:text-xs font-semibold
              leading-tight flex items-center justify-center text-center
              transition-all active:scale-95 touch-manipulation
              ${isFreeSquare
                ? 'bg-purple-900/40 border-purple-500/50 text-purple-200 cursor-default'
                : cell.isMarked
                  ? 'bg-emerald-900/60 border-emerald-500/50 text-emerald-200/70 line-through opacity-70'
                  : inBingoLine
                    ? 'bg-amber-500/30 border-amber-400 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40'
              }
            `}
          >
            {cell.name}
          </button>
        );
      })}
    </div>
  );
}
