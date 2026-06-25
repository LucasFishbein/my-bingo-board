import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { GameConfig, Player } from '../types';
import {
  getConfig,
  getPlayers,
  isUsingLocalMode,
  rerandomizePlayerBoard,
  resetAllPlayers,
  saveConfig,
  startNewGame,
  subscribePlayers,
} from '../lib/api';
import { ADMIN_SECRET } from '../lib/supabase';
import {
  parseNamesInput,
  suggestGridDimensions,
  validateGrid,
  validateNames,
} from '../lib/grid';
import { BoardPreview } from '../components/BoardPreview';
import { AdminPlayerBoards } from '../components/AdminPlayerBoards';

const AUTH_KEY = 'fart-bingo-admin-auth';

export function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1');
  const [password, setPassword] = useState('');
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [namesText, setNamesText] = useState('');
  const [gridRows, setGridRows] = useState(5);
  const [gridCols, setGridCols] = useState(5);
  const [squarePoints, setSquarePoints] = useState(1);
  const [bingoBonus, setBingoBonus] = useState(5);
  const [autoGrid, setAutoGrid] = useState(true);
  const [hasFreeSq, setHasFreeSq] = useState(false);
  const [usableCount, setUsableCount] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rerandomizingPlayerId, setRerandomizingPlayerId] = useState<string | null>(null);

  const refreshPlayers = useCallback(async () => {
    setPlayers(await getPlayers());
  }, []);

  useEffect(() => {
    if (!authed) return;

    async function initAdmin() {
      try {
        const cfg = await getConfig();
        setConfig(cfg);
        setNamesText(cfg.names.join('\n'));
        setGridRows(cfg.grid_rows);
        setGridCols(cfg.grid_cols);
        setSquarePoints(cfg.square_points);
        setBingoBonus(cfg.bingo_bonus);
        setHasFreeSq(cfg.has_free_square ?? false);
        setUsableCount(cfg.usable_names_count ?? cfg.names.length);
        await refreshPlayers();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      }
    }

    void initAdmin();
  }, [authed, refreshPlayers]);

  useEffect(() => {
    if (!authed) return;
    return subscribePlayers(() => {
      void refreshPlayers();
    });
  }, [authed, refreshPlayers]);

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (password === ADMIN_SECRET) {
      sessionStorage.setItem(AUTH_KEY, '1');
      setAuthed(true);
      setError(null);
    } else {
      setError('Wrong password');
    }
  }

  function handleNamesChange(text: string) {
    setNamesText(text);
    if (autoGrid) {
      const names = parseNamesInput(text);
      const dims = suggestGridDimensions(names.length || 4);
      setGridRows(dims.rows);
      setGridCols(dims.cols);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const names = parseNamesInput(namesText);
    const nameErr = validateNames(names);
    if (nameErr) {
      setError(nameErr);
      return;
    }
    const gridErr = validateGrid(gridRows, gridCols, names.length);
    if (gridErr) {
      setError(gridErr);
      return;
    }

    setLoading(true);
    try {
      const updated = await saveConfig({
        names,
        grid_rows: gridRows,
        grid_cols: gridCols,
        square_points: squarePoints,
        bingo_bonus: bingoBonus,
        is_active: true,
        has_free_square: hasFreeSq,
        usable_names_count: usableCount,
      });
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!confirm('Reset all player boards and scores? Players stay in the game.')) return;
    setLoading(true);
    try {
      await resetAllPlayers();
      await refreshPlayers();
      alert('All player progress reset. Players are still joined.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRerandomizePlayer(player: Player) {
    if (!confirm(`Rerandomize ${player.display_name}'s board and reset their progress?`)) return;
    setRerandomizingPlayerId(player.id);
    try {
      await rerandomizePlayerBoard(player.id);
      await refreshPlayers();
    } finally {
      setRerandomizingPlayerId(null);
    }
  }

  async function handleStartNewGameRetainPlayers() {
    if (!confirm('Start a new game and keep all current players? This rerandomizes every board and resets scores.')) return;
    setLoading(true);
    try {
      await startNewGame(true);
      await refreshPlayers();
      alert('New game started. All current players were kept and boards rerandomized.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartNewGameNewPlayers() {
    if (!confirm('Start a completely new game with new players only? This removes all current players.')) return;
    setLoading(true);
    try {
      await startNewGame(false);
      await refreshPlayers();
      alert('New game started with no players. Everyone must join again.');
    } finally {
      setLoading(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-black text-white mb-6">Admin Login</h1>
        <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-amber-500 text-black font-bold py-3"
          >
            Enter
          </button>
        </form>
        <Link to="/" className="mt-6 text-white/50 text-sm hover:text-white/80">
          ← Back to game
        </Link>
      </div>
    );
  }

  const previewConfig: GameConfig = {
    id: config?.id ?? 'preview',
    names: parseNamesInput(namesText),
    grid_rows: gridRows,
    grid_cols: gridCols,
    square_points: squarePoints,
    bingo_bonus: bingoBonus,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      {isUsingLocalMode() && (
        <div className="mb-4 bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs text-center py-1.5 px-2 rounded-md">
          Local demo mode - add Supabase env vars for live shared updates across devices
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
        <Link to="/" className="text-amber-400 text-sm hover:underline">
          Play →
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="space-y-2">
          <label className="block text-sm font-bold text-white/70">
            Names (one per line, or comma-separated)
          </label>
          <textarea
            value={namesText}
            onChange={(e) => handleNamesChange(e.target.value)}
            rows={10}
            className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white text-sm font-mono"
            placeholder="Alice&#10;Bob&#10;Carol&#10;..."
          />
          <p className="text-xs text-white/40">
            {parseNamesInput(namesText).length} names
          </p>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-white/70 mb-2">
              <input
                type="checkbox"
                checked={autoGrid}
                onChange={(e) => setAutoGrid(e.target.checked)}
              />
              Auto grid size
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={2}
                max={20}
                value={gridRows}
                disabled={autoGrid}
                onChange={(e) => setGridRows(Number(e.target.value))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white disabled:opacity-50"
                placeholder="Rows"
              />
              <span className="text-white/50 self-center">×</span>
              <input
                type="number"
                min={2}
                max={20}
                value={gridCols}
                disabled={autoGrid}
                onChange={(e) => setGridCols(Number(e.target.value))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white disabled:opacity-50"
                placeholder="Cols"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Points per marked spot</label>
              <input
                type="number"
                min={0}
                max={100}
                value={squarePoints}
                onChange={(e) => setSquarePoints(Number(e.target.value))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Bingo line bonus</label>
              <input
                type="number"
                min={0}
                max={100}
                value={bingoBonus}
                onChange={(e) => setBingoBonus(Number(e.target.value))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-white"
              />
              <p className="text-[11px] text-white/40 mt-1">
                On a 5x5 board, this is a completed straight line of 5.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-lg bg-white/5 border border-white/10 p-3">
          <h3 className="text-sm font-bold text-white/70">Game Options</h3>
          
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={hasFreeSq}
              onChange={(e) => setHasFreeSq(e.target.checked)}
              className="w-4 h-4"
            />
            Free Square (center cell pre-marked for all players)
          </label>

          <div>
            <label className="block text-xs text-white/50 mb-2">
              Names to use in grid: {usableCount}
            </label>
            <input
              type="range"
              min={4}
              max={parseNamesInput(namesText).length || 25}
              value={usableCount}
              onChange={(e) => setUsableCount(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-[11px] text-white/40 mt-1">
              Use a subset of your names to fill a smaller grid. Grid must be completely filled.
            </p>
          </div>
        </section>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 disabled:opacity-50"
          >
            {loading ? 'Saving…' : saved ? 'Saved!' : 'Save config'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="rounded-xl bg-red-500/20 border border-red-400/40 text-red-300 font-bold px-4 py-3"
          >
            Reset progress
          </button>
        </div>
      </form>

      <section className="mt-8 rounded-xl border border-white/15 bg-white/5 p-4 space-y-3">
        <h2 className="text-sm font-bold text-white/70 uppercase">Start new game</h2>
        <p className="text-xs text-white/50">
          Choose whether to keep current players (with rerandomized boards) or clear everyone and start fresh.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleStartNewGameRetainPlayers}
            disabled={loading}
            className="flex-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-semibold px-3 py-2 disabled:opacity-50"
          >
            Start new game (keep players)
          </button>
          <button
            type="button"
            onClick={handleStartNewGameNewPlayers}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 font-semibold px-3 py-2 disabled:opacity-50"
          >
            Start new game (new players)
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-white/70 mb-3 uppercase">Board preview</h2>
        {previewConfig.names.length >= 4 ? (
          <BoardPreview config={previewConfig} />
        ) : (
          <p className="text-white/40 text-sm">Add at least 4 names to preview.</p>
        )}
      </section>

      {config && (
        <section className="mt-8">
          <h2 className="text-sm font-bold text-white/70 mb-3 uppercase">Live player boards</h2>
          <AdminPlayerBoards
            config={config}
            players={players}
            onRerandomizePlayer={handleRerandomizePlayer}
            rerandomizingPlayerId={rerandomizingPlayerId}
          />
        </section>
      )}
    </div>
  );
}
