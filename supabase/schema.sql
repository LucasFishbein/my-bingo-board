-- Fart Bingo Supabase schema
-- Run in Supabase SQL Editor after creating a project.
-- Enable Anonymous sign-in: Authentication → Providers → Anonymous → ON

create table if not exists game_config (
  id uuid primary key default gen_random_uuid(),
  names text[] not null default '{}',
  grid_rows int not null default 5,
  grid_cols int not null default 5,
  square_points int not null default 1,
  bingo_bonus int not null default 5,
  has_free_square boolean not null default false,
  usable_names_count int default null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  shuffled_indices int[] not null default '{}',
  marked boolean[] not null default '{}',
  bingo_lines int[] not null default '{}',
  squares_marked int not null default 0,
  bingo_count int not null default 0,
  score int not null default 0,
  created_at timestamptz not null default now(),
  constraint players_display_name_unique unique (display_name)
);

create index if not exists players_score_idx on players (score desc, bingo_count desc);

alter table game_config enable row level security;
alter table players enable row level security;

-- Everyone can read game config and leaderboard
create policy "game_config_select" on game_config for select using (true);
create policy "players_select" on players for select using (true);

-- Authenticated users can insert their own player row
create policy "players_insert" on players for insert
  with check (auth.uid() = id);

-- Users can only update their own board
create policy "players_update" on players for update
  using (auth.uid() = id);

-- Admin updates to game_config via service role or edge function in production.
-- For MVP, allow authenticated updates (admin page uses same anon key + secret gate in UI).
create policy "game_config_update" on game_config for update using (true);
create policy "game_config_insert" on game_config for insert with check (true);

-- Allow delete all players for game reset (admin)
create policy "players_delete" on players for delete using (true);

-- Realtime
alter publication supabase_realtime add table players;

-- Seed default config if empty
insert into game_config (names, grid_rows, grid_cols)
select
  array['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Henry','Ivy','Jack','Kate','Leo','Mia','Noah','Olivia','Paul','Quinn','Rose','Sam','Tina','Uma','Victor','Wendy','Xander','Yara'],
  5, 5
where not exists (select 1 from game_config);
