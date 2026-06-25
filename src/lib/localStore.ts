import type { GameConfig, Player } from '../types';
import { DEFAULT_CONFIG } from '../types';
import {
  computeScore,
  detectCompletedLines,
  getCenterCellIndex,
  gridIndexToNameIndex,
  shuffle,
  suggestGridDimensions,
} from './grid';

const CONFIG_KEY = 'fart-bingo-config';
const PLAYERS_KEY = 'fart-bingo-players';
const PLAYER_ID_KEY = 'fart-bingo-player-id';

function loadConfig(): GameConfig {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (raw) return JSON.parse(raw) as GameConfig;
  const dims = suggestGridDimensions(DEFAULT_CONFIG.names.length);
  const config: GameConfig = {
    id: 'local',
    ...DEFAULT_CONFIG,
    grid_rows: dims.rows,
    grid_cols: dims.cols,
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  return config;
}

function saveConfig(config: GameConfig): GameConfig {
  const updated = { ...config, updated_at: new Date().toISOString() };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

function loadPlayers(): Player[] {
  const raw = localStorage.getItem(PLAYERS_KEY);
  return raw ? (JSON.parse(raw) as Player[]) : [];
}

function savePlayers(players: Player[]): void {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  window.dispatchEvent(new CustomEvent('fart-bingo-players-changed'));
}

export function getLocalPlayerId(): string | null {
  return localStorage.getItem(PLAYER_ID_KEY);
}

export function setLocalPlayerId(id: string): void {
  localStorage.setItem(PLAYER_ID_KEY, id);
}

export function clearLocalPlayerId(): void {
  localStorage.removeItem(PLAYER_ID_KEY);
}

function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function createFreshProgress(config: GameConfig, shuffled_indices: number[]) {
  const usableCount = config.usable_names_count ?? config.names.length;
  const marked = Array.from({ length: usableCount }, () => false);
  
  // Mark free square if enabled
  const freeSquareGridIdx = getCenterCellIndex(config.grid_rows, config.grid_cols);
  if (config.has_free_square && freeSquareGridIdx !== null) {
    const nameIdx = gridIndexToNameIndex(freeSquareGridIdx, shuffled_indices);
    if (nameIdx !== null) {
      marked[nameIdx] = true;
    }
  }
  
  const bingo_lines = detectCompletedLines(
    marked,
    config.grid_rows,
    config.grid_cols,
    shuffled_indices,
    config.has_free_square ? freeSquareGridIdx ?? undefined : undefined,
  );
  
  const centerNameIdx = freeSquareGridIdx;
  const { squaresMarked, bingoCount, score } = computeScore(
    marked,
    bingo_lines,
    config.square_points,
    config.bingo_bonus,
    centerNameIdx ?? undefined,
  );

  return {
    shuffled_indices,
    marked,
    bingo_lines,
    squares_marked: squaresMarked,
    bingo_count: bingoCount,
    score,
  };
}

export async function localGetConfig(): Promise<GameConfig> {
  return loadConfig();
}

export async function localSaveConfig(
  partial: Partial<Omit<GameConfig, 'id' | 'updated_at'>>,
): Promise<GameConfig> {
  const current = loadConfig();
  return saveConfig({ ...current, ...partial });
}

export async function localGetPlayers(): Promise<Player[]> {
  return loadPlayers().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.bingo_count !== a.bingo_count) return b.bingo_count - a.bingo_count;
    return a.created_at.localeCompare(b.created_at);
  });
}

export async function localGetPlayer(id: string): Promise<Player | null> {
  return loadPlayers().find((p) => p.id === id) ?? null;
}

export async function localCreatePlayer(
  displayName: string,
  config: GameConfig,
): Promise<Player> {
  const normalizedName = normalizeDisplayName(displayName);
  if (!normalizedName) {
    throw new Error('Enter a name to join.');
  }

  const players = loadPlayers();
  const exists = players.some(
    (p) => p.display_name.toLowerCase() === normalizedName.toLowerCase(),
  );
  if (exists) throw new Error('That name is already taken. Pick another!');

  const usableCount = config.usable_names_count ?? config.names.length;
  const shuffled_indices = shuffle(Array.from({ length: usableCount }, (_, i) => i));
  const fresh = createFreshProgress(config, shuffled_indices);

  const player: Player = {
    id: crypto.randomUUID(),
    display_name: normalizedName,
    shuffled_indices: fresh.shuffled_indices,
    marked: fresh.marked,
    bingo_lines: fresh.bingo_lines,
    squares_marked: fresh.squares_marked,
    bingo_count: fresh.bingo_count,
    score: fresh.score,
    created_at: new Date().toISOString(),
  };

  players.push(player);
  savePlayers(players);
  setLocalPlayerId(player.id);
  return player;
}

export async function localUpdatePlayer(
  id: string,
  marked: boolean[],
  config: GameConfig,
): Promise<Player> {
  const players = loadPlayers();
  const idx = players.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error('Player not found');

  const shuffled_indices = players[idx].shuffled_indices;
  const freeSquareGridIdx = getCenterCellIndex(config.grid_rows, config.grid_cols);
  const bingo_lines = detectCompletedLines(
    marked,
    config.grid_rows,
    config.grid_cols,
    shuffled_indices,
    config.has_free_square ? freeSquareGridIdx ?? undefined : undefined,
  );
  
  const centerNameIdx = freeSquareGridIdx;
  const { squaresMarked, bingoCount, score } = computeScore(
    marked,
    bingo_lines,
    config.square_points,
    config.bingo_bonus,
    centerNameIdx ?? undefined,
  );

  players[idx] = {
    ...players[idx],
    marked,
    bingo_lines,
    squares_marked: squaresMarked,
    bingo_count: bingoCount,
    score,
  };
  savePlayers(players);
  return players[idx];
}

export async function localResetPlayers(): Promise<void> {
  const config = loadConfig();
  const players = loadPlayers();

  const resetPlayers = players.map((player) => {
    const fresh = createFreshProgress(config, player.shuffled_indices);

    return {
      ...player,
      marked: fresh.marked,
      bingo_lines: fresh.bingo_lines,
      squares_marked: fresh.squares_marked,
      bingo_count: fresh.bingo_count,
      score: fresh.score,
    };
  });

  savePlayers(resetPlayers);
}

export async function localRerandomizePlayer(playerId: string): Promise<Player> {
  const config = loadConfig();
  const players = loadPlayers();
  const idx = players.findIndex((p) => p.id === playerId);
  if (idx === -1) throw new Error('Player not found');

  const shuffled_indices = shuffle(Array.from({ length: config.names.length }, (_, i) => i));
  const fresh = createFreshProgress(config, shuffled_indices);

  players[idx] = {
    ...players[idx],
    shuffled_indices: fresh.shuffled_indices,
    marked: fresh.marked,
    bingo_lines: fresh.bingo_lines,
    squares_marked: fresh.squares_marked,
    bingo_count: fresh.bingo_count,
    score: fresh.score,
  };

  savePlayers(players);
  return players[idx];
}

export async function localStartNewGame(retainPlayers: boolean): Promise<void> {
  if (!retainPlayers) {
    savePlayers([]);
    return;
  }

  const config = loadConfig();
  const players = loadPlayers();

  const refreshed = players.map((player) => {
    const shuffled_indices = shuffle(Array.from({ length: config.names.length }, (_, i) => i));
    const fresh = createFreshProgress(config, shuffled_indices);
    return {
      ...player,
      shuffled_indices: fresh.shuffled_indices,
      marked: fresh.marked,
      bingo_lines: fresh.bingo_lines,
      squares_marked: fresh.squares_marked,
      bingo_count: fresh.bingo_count,
      score: fresh.score,
    };
  });

  savePlayers(refreshed);
}

export function subscribeLocalPlayers(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener('fart-bingo-players-changed', handler);
  return () => window.removeEventListener('fart-bingo-players-changed', handler);
}
