import { useMemo } from 'react';
import type { GameConfig, Player } from '../types';
import {
  getBingoLines,
  getHighlightedCells,
  gridIndexToNameIndex,
  isPlayableCell,
} from '../lib/grid';

interface AdminPlayerBoardsProps {
  config: GameConfig;
  players: Player[];
  onRerandomizePlayer: (player: Player) => void;
  rerandomizingPlayerId?: string | null;
}

export function AdminPlayerBoards({
  config,
  players,
  onRerandomizePlayer,
  rerandomizingPlayerId,
}: AdminPlayerBoardsProps) {
  const totalCells = config.grid_rows * config.grid_cols;

  const lines = useMemo(
    () => getBingoLines(config.grid_rows, config.grid_cols, config.names.length),
    [config.grid_rows, config.grid_cols, config.names.length],
  );

  if (players.length === 0) {
    return (
      <p className="text-white/40 text-sm">No players have joined yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {players.map((player) => {
        const highlighted = getHighlightedCells(player.bingo_lines, lines);

        return (
          <article key={player.id} className="rounded-xl border border-white/15 bg-white/5 p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="text-sm font-bold text-white">{player.display_name}</h3>
                <p className="text-[11px] text-white/50">{player.id.slice(0, 8)}</p>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <p className="text-sm font-bold text-amber-300">{player.score} pts</p>
                <p className="text-[11px] text-white/50">
                  {player.squares_marked} marked | {player.bingo_count} bingo
                </p>
                <button
                  type="button"
                  onClick={() => onRerandomizePlayer(player)}
                  disabled={rerandomizingPlayerId === player.id}
                  className="text-[11px] rounded-md border border-amber-400/40 px-2 py-1 text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {rerandomizingPlayerId === player.id ? 'Rerandomizing...' : 'Rerandomize board'}
                </button>
              </div>
            </div>

            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${config.grid_cols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: totalCells }, (_, gridIndex) => {
                const playable = isPlayableCell(gridIndex, config.names.length);

                if (!playable) {
                  return (
                    <div
                      key={gridIndex}
                      className="aspect-square rounded bg-white/5 border border-white/5"
                      aria-hidden
                    />
                  );
                }

                const nameIndex = gridIndexToNameIndex(gridIndex, player.shuffled_indices);
                const name = nameIndex !== null ? config.names[nameIndex] : null;
                const isMarked = nameIndex !== null ? player.marked[nameIndex] : false;
                const inBingoLine = highlighted.has(gridIndex);

                return (
                  <div
                    key={gridIndex}
                    className={[
                      'aspect-square rounded border p-0.5 text-[9px] leading-tight flex items-center justify-center text-center',
                      isMarked
                        ? 'bg-emerald-900/50 border-emerald-500/40 text-emerald-100/80 line-through'
                        : inBingoLine
                          ? 'bg-amber-500/25 border-amber-400/60 text-amber-100'
                          : 'bg-white/10 border-white/20 text-white/85',
                    ].join(' ')}
                  >
                    {name}
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
