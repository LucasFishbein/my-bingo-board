import { useState, type FormEvent } from 'react';

interface NameEntryProps {
  onSubmit: (name: string) => Promise<void>;
  error?: string | null;
}

export function NameEntry({ onSubmit, error }: NameEntryProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(name.trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-5xl mb-4">💨</div>
      <h1 className="text-3xl font-black text-white mb-2">Whoopie Bingo</h1>
      <p className="text-white/60 text-center mb-8 max-w-xs">
        Enter your name to join. You will get a unique randomized board for this game.
      </p>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={30}
          autoFocus
          className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400"
        />
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3 transition-colors"
        >
          {loading ? 'Joining…' : "Let's Go!"}
        </button>
      </form>
    </div>
  );
}
