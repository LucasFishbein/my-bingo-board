import type { Player } from '../types';

interface LeaderboardProps {
  players: Player[];
  currentPlayerId?: string;
}

export function Leaderboard({ players, currentPlayerId }: LeaderboardProps) {
  if (players.length === 0) {
    return (
      <div className="text-center text-white/50 text-sm py-4">
        No players yet — be the first!
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-1.5">
      {players.map((player, i) => {
        const isMe = player.id === currentPlayerId;
        return (
          <div
            key={player.id}
            className={`
              flex items-center justify-between rounded-xl px-3 py-2 text-sm
              ${isMe ? 'bg-amber-500/20 border border-amber-400/40' : 'bg-white/5 border border-white/10'}
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 text-center shrink-0">
                {i < 3 ? medals[i] : `${i + 1}.`}
              </span>
              <span className={`truncate ${isMe ? 'font-bold text-amber-200' : 'text-white/90'}`}>
                {player.display_name}
                {isMe && ' (you)'}
              </span>
            </div>
            <div className="text-right shrink-0 ml-2">
              <span className="font-bold text-white">{player.score}</span>
              <span className="text-white/50 text-xs ml-1">
                ({player.squares_marked}·{player.bingo_count}🎯)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
