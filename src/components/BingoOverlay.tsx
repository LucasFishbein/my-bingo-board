import { useEffect } from 'react';
import { playBingoSound } from '../lib/sounds';

interface BingoOverlayProps {
  bonus: number;
  onDismiss: () => void;
}

export function BingoOverlay({ bonus, onDismiss }: BingoOverlayProps) {
  useEffect(() => {
    playBingoSound();
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onDismiss}
      role="dialog"
      aria-label="Bingo!"
    >
      <div className="text-center animate-bounce">
        <div className="text-6xl sm:text-8xl font-black text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">
          BINGO!
        </div>
        <div className="text-2xl text-white mt-4 font-bold">+{bonus} bonus points</div>
        <div className="text-white/50 text-sm mt-6">tap to dismiss</div>
      </div>
    </div>
  );
}
