import { useCallback, useEffect, useState } from 'react';
import type { GameConfig, Player } from '../types';
import {
  clearLocalPlayerId,
  createPlayer,
  getConfig,
  getLocalPlayerId,
  getPlayer,
  getPlayers,
  isUsingLocalMode,
  subscribePlayers,
  updatePlayerMarked,
} from '../lib/api';
import { playRandomFart, preloadSounds } from '../lib/sounds';
import { Board } from '../components/Board';
import { Leaderboard } from '../components/Leaderboard';
import { BingoOverlay } from '../components/BingoOverlay';
import { NameEntry } from '../components/NameEntry';

export function GamePage() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [bingoBonus, setBingoBonus] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  const refreshPlayers = useCallback(async () => {
    setPlayers(await getPlayers());
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const cfg = await getConfig();
      setConfig(cfg);

      const pid = getLocalPlayerId();
      if (pid) {
        const p = await getPlayer(pid);
        if (p) {
          setPlayer(p);
        } else {
          clearLocalPlayerId();
          setPlayer(null);
        }
      }

      await refreshPlayers();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load game data.');
    } finally {
      setLoading(false);
    }
  }, [refreshPlayers]);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    return subscribePlayers(refreshPlayers);
  }, [refreshPlayers]);

  async function handleJoin(name: string) {
    setJoinError(null);
    try {
      preloadSounds();
      const p = await createPlayer(name);
      setPlayer(p);
      setPlayers((prev) => {
        const without = prev.filter((row) => row.id !== p.id);
        return [...without, p].sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (b.bingo_count !== a.bingo_count) return b.bingo_count - a.bingo_count;
          return a.created_at.localeCompare(b.created_at);
        });
      });
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'Failed to join');
    }
  }

  async function handleToggle(nameIndex: number) {
    if (!player || !config) return;
    preloadSounds();

    const prevBingoCount = player.bingo_count;
    const newMarked = [...player.marked];
    newMarked[nameIndex] = !newMarked[nameIndex];

    // Only fart when marking (not unmarking)
    if (newMarked[nameIndex]) {
      void playRandomFart();
    }

    const updated = await updatePlayerMarked(player.id, newMarked, config);
    setPlayer(updated);
    setPlayers((prev) => {
      const without = prev.filter((row) => row.id !== updated.id);
      return [...without, updated].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.bingo_count !== a.bingo_count) return b.bingo_count - a.bingo_count;
        return a.created_at.localeCompare(b.created_at);
      });
    });

    if (updated.bingo_count > prevBingoCount) {
      setBingoBonus(config.bingo_bonus);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white/50">
        Loading…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center gap-3">
        <p className="text-red-300 text-sm">{loadError}</p>
        <button
          type="button"
          onClick={() => void init()}
          className="rounded-xl bg-amber-500 text-black font-bold px-4 py-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!config || !config.is_active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="text-4xl mb-4">⏸️</div>
        <p className="text-white/70">Game is not active yet. Check back soon!</p>
      </div>
    );
  }

  if (!player) {
    return (
      <>
        {isUsingLocalMode() && (
          <div className="bg-amber-500/20 border-b border-amber-400/30 text-amber-200 text-xs text-center py-1.5 px-2">
            Local demo mode — add Supabase env vars for live multiplayer
          </div>
        )}
        <NameEntry onSubmit={handleJoin} error={joinError} />
      </>
    );
  }

  return (
    <div className="min-h-screen pb-safe">
      {isUsingLocalMode() && (
        <div className="bg-amber-500/20 border-b border-amber-400/30 text-amber-200 text-xs text-center py-1.5 px-2">
          Local demo mode - add Supabase env vars for live multiplayer
        </div>
      )}

      {bingoBonus !== null && (
        <BingoOverlay bonus={bingoBonus} onDismiss={() => setBingoBonus(null)} />
      )}

      <header className="sticky top-0 z-10 bg-[#1a1a2e]/95 backdrop-blur border-b border-white/10 px-4 py-3 safe-top">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-black text-white">💨 Whoopie Bingo</h1>
            <p className="text-xs text-white/50">{player.display_name}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-amber-400">{player.score}</div>
            <div className="text-[10px] text-white/50">
              {player.squares_marked} sq · {player.bingo_count} bingo
            </div>
          </div>
        </div>
      </header>

      <main className="px-3 py-4 max-w-lg mx-auto space-y-4">
        <Board config={config} player={player} onToggle={handleToggle} />

        <button
          type="button"
          onClick={() => setShowLeaderboard((v) => !v)}
          className="w-full text-sm text-white/50 hover:text-white/80 py-1"
        >
          {showLeaderboard ? '▼ Hide leaderboard' : '▶ Show leaderboard'}
        </button>

        {showLeaderboard && (
          <section>
            <h2 className="text-sm font-bold text-white/70 mb-2 uppercase tracking-wide">
              Leaderboard
            </h2>
            <Leaderboard players={players} currentPlayerId={player.id} />
          </section>
        )}
      </main>
    </div>
  );
}
