# Whoopie Bingo

A mobile-first party game PWA. Cross out names on a bingo board, trigger whoopie sounds on every tap, score bonus points for completing lines, and compete on a live leaderboard.

## Quick start (local demo)

Works immediately without any backend — data stays in your browser's localStorage.

```bash
cd fart-bingo
npm install
npm run dev
```

Open http://localhost:5173 to play. Admin panel: http://localhost:5173/admin (default password: `whoopie-admin`).

## Live multiplayer (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. **Authentication → Providers → Anonymous** → enable.
3. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
4. Copy `.env.example` to `.env.local` and add your URL + anon key.
5. Set `VITE_ADMIN_SECRET` to a password only you know.
6. Restart `npm run dev`.

## Deploy to Vercel

```bash
npm run build
```

Or connect the repo to Vercel and set the same env vars in the dashboard. Share the HTTPS URL with players — they open it in Safari and tap **Add to Home Screen**.

## Features

- **Variable board size** — admin adds any number of names (min 4); grid auto-sizes or manual override
- **Per-player shuffle** — same names, different layout for each player
- **Bingo lines** — rows, columns, and diagonals (on square grids) award bonus points
- **Random fart sounds** — 12 variants (synthesized by default; drop `.mp3` files in `public/sounds/farts/` to use real sfx)
- **Live leaderboard** — realtime via Supabase (or local in demo mode)

## Game workflow

1. Host/admin opens `/admin`, enters names for the board, and sets:
	- points per marked spot
	- bingo line bonus (on a 5x5 board: straight line of 5)
2. Players open `/` and enter their name on first join.
3. Each player gets their own randomized board layout.
4. That board layout stays fixed for that player for the duration of the game.
5. Admin can reset progress/scores without removing joined players.

## Admin dashboard (`/admin`)

- Paste names (one per line)
- Set square points and bingo bonus
- Preview board layout
- Watch live player boards update in realtime
- Reset board progress and scores while keeping joined players
- Rerandomize a specific player board (and reset that player's progress)
- Start a new game with options:
	- keep current players and rerandomize all boards
	- clear all players and require fresh joins

## iPhone tips

- Must use **Safari** → Share → **Add to Home Screen** for full-screen PWA
- Sounds play on tap (iOS requires a user gesture — tapping squares counts)
- Works on any iPhone with a modern browser

## Project structure

```
fart-bingo/
├── src/
│   ├── components/   Board, Leaderboard, BingoOverlay, …
│   ├── lib/          grid logic, sounds, api, localStore
│   └── pages/        GamePage, AdminPage
├── public/sounds/farts/   optional mp3 sfx
└── supabase/schema.sql    database setup
```
