import type { GameConfig } from '../types';
import { isPlayableCell } from '../lib/grid';

interface BoardPreviewProps {
  config: GameConfig;
}

/** Static preview for admin — names in order, no shuffle */
export function BoardPreview({ config }: BoardPreviewProps) {
  const { names, grid_rows, grid_cols } = config;
  const totalCells = grid_rows * grid_cols;

  return (
    <div
      className="grid gap-1 w-full max-w-md mx-auto"
      style={{ gridTemplateColumns: `repeat(${grid_cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: totalCells }, (_, i) => {
        const playable = isPlayableCell(i, names.length);
        return (
          <div
            key={i}
            className={`
              aspect-square rounded text-[9px] flex items-center justify-center text-center p-0.5
              ${playable ? 'bg-white/10 border border-white/20 text-white/80' : 'bg-white/5 border border-white/5'}
            `}
          >
            {playable ? names[i] : ''}
          </div>
        );
      })}
    </div>
  );
}
