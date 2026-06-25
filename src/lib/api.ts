import type { GameConfig, Player } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';
import {
  computeScore,
  detectCompletedLines,
  getCenterCellIndex,
  gridIndexToNameIndex,
  shuffle,
  suggestGridDimensions,
} from './grid';
import {
  clearLocalPlayerId,
  getLocalPlayerId,
  localCreatePlayer,
  localGetConfig,
  localGetPlayer,
  localGetPlayers,
  localRerandomizePlayer,
  localResetPlayers,
  localSaveConfig,
  localStartNewGame,
  localUpdatePlayer,
  setLocalPlayerId,
  subscribeLocalPlayers,
} from './localStore';
import { DEFAULT_CONFIG } from '../types';

export { clearLocalPlayerId, getLocalPlayerId, setLocalPlayerId };

function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function createFreshProgress(config: GameConfig, shuffled_indices?: number[]) {
  const usableCount = config.usable_names_count ?? config.names.length;
  const resolvedShuffle = shuffled_indices
    ?? shuffle(Array.from({ length: usableCount }, (_, i) => i));
  const marked = Array.from({ length: usableCount }, () => false);
  
  // Mark free square if enabled
  const freeSquareGridIdx = getCenterCellIndex(config.grid_rows, config.grid_cols);
  if (config.has_free_square && freeSquareGridIdx !== null) {
    const nameIdx = gridIndexToNameIndex(freeSquareGridIdx, resolvedShuffle);
    if (nameIdx !== null) {
      marked[nameIdx] = true;
    }
  }
  
  const bingo_lines = detectCompletedLines(
    marked,
    config.grid_rows,
    config.grid_cols,
    resolvedShuffle,
    config.has_free_square ? freeSquareGridIdx ?? undefined : undefined,
  );
  
  const centerNameIdx = getCenterCellIndex(config.grid_rows, config.grid_cols);
  const { squaresMarked, bingoCount, score } = computeScore(
    marked,
    bingo_lines,
    config.square_points,
    config.bingo_bonus,
    centerNameIdx ?? undefined,
  );

  return {
    shuffled_indices: resolvedShuffle,
    marked,
    bingo_lines,
    squares_marked: squaresMarked,
    bingo_count: bingoCount,
    score,
  };
}

export async function ensureAuth(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    await supabase.auth.signInAnonymously();
  }
}

export async function getConfig(): Promise<GameConfig> {
  if (!isSupabaseConfigured || !supabase) return localGetConfig();

  await ensureAuth();
  const { data, error } = await supabase
    .from('game_config')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  if (data && data.length > 0) return data[0] as GameConfig;

  const dims = suggestGridDimensions(DEFAULT_CONFIG.names.length);
  const seed = {
    names: DEFAULT_CONFIG.names,
    grid_rows: dims.rows,
    grid_cols: dims.cols,
    square_points: DEFAULT_CONFIG.square_points,
    bingo_bonus: DEFAULT_CONFIG.bingo_bonus,
    has_free_square: DEFAULT_CONFIG.has_free_square ?? false,
    usable_names_count: null,
    is_active: true,
  };
  const { data: inserted, error: insertError } = await supabase
    .from('game_config')
    .insert(seed)
    .select()
    .single();
  if (insertError) throw insertError;
  return inserted as GameConfig;
}

export async function saveConfig(
  partial: Partial<Omit<GameConfig, 'id' | 'updated_at'>>,
): Promise<GameConfig> {
  if (!isSupabaseConfigured || !supabase) return localSaveConfig(partial);

  const current = await getConfig();
  const { data, error } = await supabase
    .from('game_config')
    .update({ ...partial, updated_at: new Date().toISOString() })
    .eq('id', current.id)
    .select()
    .single();
  if (error) throw error;
  return data as GameConfig;
}

export async function getPlayers(): Promise<Player[]> {
  if (!isSupabaseConfigured || !supabase) return localGetPlayers();

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('score', { ascending: false })
    .order('bingo_count', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Player[];
}

export async function getPlayer(id: string): Promise<Player | null> {
  if (!isSupabaseConfigured || !supabase) return localGetPlayer(id);

  const { data, error } = await supabase.from('players').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Player) ?? null;
}

export async function createPlayer(displayName: string): Promise<Player> {
  const normalizedName = normalizeDisplayName(displayName);
  if (!normalizedName) {
    throw new Error('Enter a name to join.');
  }

  const config = await getConfig();
  if (!isSupabaseConfigured || !supabase) {
    return localCreatePlayer(normalizedName, config);
  }

  await ensureAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Auth failed');

  const { data: allNames, error: namesError } = await supabase
    .from('players')
    .select('display_name');
  if (namesError) throw namesError;

  const nameTaken = (allNames ?? []).some(
    (row) => row.display_name.toLowerCase() === normalizedName.toLowerCase(),
  );
  if (nameTaken) {
    throw new Error('That name is already taken. Pick another!');
  }

  const { data: existingPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (existingPlayer) {
    setLocalPlayerId(existingPlayer.id);
    return existingPlayer as Player;
  }

  const usableCount = config.usable_names_count ?? config.names.length;
  const shuffled_indices = shuffle(Array.from({ length: usableCount }, (_, i) => i));
  const fresh = createFreshProgress(config, shuffled_indices);

  const { data, error } = await supabase
    .from('players')
    .insert({
      id: user.id,
      display_name: normalizedName,
      shuffled_indices: fresh.shuffled_indices,
      marked: fresh.marked,
      bingo_lines: fresh.bingo_lines,
      squares_marked: fresh.squares_marked,
      bingo_count: fresh.bingo_count,
      score: fresh.score,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('That name is already taken. Pick another!');
    throw error;
  }
  setLocalPlayerId(data.id);
  return data as Player;
}

export async function updatePlayerMarked(
  playerId: string,
  marked: boolean[],
  config: GameConfig,
): Promise<Player> {
  if (!isSupabaseConfigured || !supabase) {
    return localUpdatePlayer(playerId, marked, config);
  }

  const { data: existing } = await supabase
    .from('players')
    .select('shuffled_indices')
    .eq('id', playerId)
    .single();
  if (!existing) throw new Error('Player not found');

  const shuffled_indices = existing.shuffled_indices as number[];
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

  const { data, error } = await supabase
    .from('players')
    .update({
      marked,
      bingo_lines,
      squares_marked: squaresMarked,
      bingo_count: bingoCount,
      score,
    })
    .eq('id', playerId)
    .select()
    .single();
  if (error) throw error;
  return data as Player;
}

export async function resetAllPlayers(): Promise<void> {
  const config = await getConfig();

  if (!isSupabaseConfigured || !supabase) {
    return localResetPlayers();
  }

  const marked = Array.from({ length: config.names.length }, () => false);
  const { error } = await supabase
    .from('players')
    .update({
      marked,
      bingo_lines: [],
      squares_marked: 0,
      bingo_count: 0,
      score: 0,
    })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) throw error;
}

export async function rerandomizePlayerBoard(playerId: string): Promise<void> {
  const config = await getConfig();

  if (!isSupabaseConfigured || !supabase) {
    await localRerandomizePlayer(playerId);
    return;
  }

  const fresh = createFreshProgress(config);
  const { error } = await supabase
    .from('players')
    .update({
      shuffled_indices: fresh.shuffled_indices,
      marked: fresh.marked,
      bingo_lines: fresh.bingo_lines,
      squares_marked: fresh.squares_marked,
      bingo_count: fresh.bingo_count,
      score: fresh.score,
    })
    .eq('id', playerId);

  if (error) throw error;
}

export async function startNewGame(retainPlayers: boolean): Promise<void> {
  const config = await getConfig();

  if (!retainPlayers) {
    if (!isSupabaseConfigured || !supabase) {
      await localStartNewGame(false);
      clearLocalPlayerId();
      return;
    }

    const { error } = await supabase
      .from('players')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;

    clearLocalPlayerId();
    return;
  }

  if (!isSupabaseConfigured || !supabase) {
    await localStartNewGame(true);
    return;
  }

  const client = supabase;
  const players = await getPlayers();
  await Promise.all(players.map(async (player) => {
    const fresh = createFreshProgress(config);
    const { error } = await client
      .from('players')
      .update({
        shuffled_indices: fresh.shuffled_indices,
        marked: fresh.marked,
        bingo_lines: fresh.bingo_lines,
        squares_marked: fresh.squares_marked,
        bingo_count: fresh.bingo_count,
        score: fresh.score,
      })
      .eq('id', player.id);
    if (error) throw error;
  }));
}

export function subscribePlayers(onChange: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return subscribeLocalPlayers(onChange);
  }

  const channel = supabase
    .channel('players-leaderboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
      onChange();
    })
    .subscribe();

  return () => {
    void supabase!.removeChannel(channel);
  };
}

export function isUsingLocalMode(): boolean {
  return !isSupabaseConfigured;
}
