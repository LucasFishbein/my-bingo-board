/**
 * Fart sound engine: tries MP3 files first, falls back to synthesized variants.
 * Drop .mp3 files into public/sounds/farts/ to use real sfx.
 */

const FART_FILES = Array.from({ length: 12 }, (_, i) => `fart${String(i + 1).padStart(2, '0')}.mp3`);

let lastIndex = -1;
let preloaded: HTMLAudioElement[] | null = null;
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/** Synthesized fart variants — works without mp3 files */
function playSynthFart(variant: number): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const duration = 0.25 + (variant % 5) * 0.05;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = variant % 2 === 0 ? 'sawtooth' : 'square';
  osc.frequency.setValueAtTime(80 + variant * 8, now);
  osc.frequency.exponentialRampToValueAtTime(35 + variant * 3, now + duration);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400 + variant * 30, now);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.05);

  // Noise burst for texture
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.08 + (variant % 3) * 0.02, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 200 + variant * 20;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
}

async function tryPlayMp3(index: number): Promise<boolean> {
  if (!preloaded) {
    preloaded = FART_FILES.map((file) => {
      const audio = new Audio(`/sounds/farts/${file}`);
      audio.preload = 'auto';
      return audio;
    });
  }
  const audio = preloaded[index];
  try {
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

export function preloadSounds(): void {
  getAudioContext().resume().catch(() => {});
  if (!preloaded) {
    preloaded = FART_FILES.map((file) => {
      const audio = new Audio(`/sounds/farts/${file}`);
      audio.preload = 'auto';
      audio.load();
      return audio;
    });
  }
}

export async function playRandomFart(): Promise<void> {
  preloadSounds();

  let idx: number;
  do {
    idx = Math.floor(Math.random() * FART_FILES.length);
  } while (idx === lastIndex && FART_FILES.length > 1);
  lastIndex = idx;

  const mp3Worked = await tryPlayMp3(idx);
  if (!mp3Worked) {
    playSynthFart(idx);
  }
}

export function playBingoSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = now + i * 0.12;
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}
