export interface GameConfig {
  id: string;
  names: string[];
  grid_rows: number;
  grid_cols: number;
  square_points: number;
  bingo_bonus: number;
  is_active: boolean;
  updated_at: string;
  has_free_square?: boolean;
  usable_names_count?: number;
}

export interface Player {
  id: string;
  display_name: string;
  shuffled_indices: number[];
  marked: boolean[];
  bingo_lines: number[];
  squares_marked: number;
  bingo_count: number;
  score: number;
  created_at: string;
}

export interface BingoLine {
  id: number;
  type: 'row' | 'col' | 'diag';
  cells: number[];
}

export interface BoardCell {
  gridIndex: number;
  nameIndex: number | null;
  name: string | null;
  isPlayable: boolean;
  isMarked: boolean;
}

export const DEFAULT_NAMES = [
  'Alice',
  'Bob',
  'Carol',
  'Dave',
  'Eve',
  'Frank',
  'Grace',
  'Henry',
  'Ivy',
  'Jack',
  'Kate',
  'Leo',
  'Mia',
  'Noah',
  'Olivia',
  'Paul',
  'Quinn',
  'Rose',
  'Sam',
  'Tina',
  'Uma',
  'Victor',
  'Wendy',
  'Xander',
  'Yara',
];

export const DEFAULT_CONFIG: Omit<GameConfig, 'id' | 'updated_at'> = {
  names: DEFAULT_NAMES,
  grid_rows: 5,
  grid_cols: 5,
  square_points: 1,
  bingo_bonus: 5,
  is_active: true,
};
