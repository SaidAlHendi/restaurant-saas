type AudioContextCtor = new () => AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return typeof window.AudioContext === 'function'
    ? window.AudioContext
    : (w.webkitAudioContext ?? null);
}

export type ChimePlayer = {
  /** Must run inside a user gesture (browsers block audio until then). */
  unlock: () => Promise<boolean>;
  play: () => void;
  isUnlocked: () => boolean;
};

/** Two short tones made with Web Audio: no file, no network. */
export function createChimePlayer(): ChimePlayer {
  let ctx: AudioContext | null = null;

  const tone = (context: AudioContext, frequency: number, startAt: number) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.4, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.35);
    osc.connect(gain).connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + 0.4);
  };

  return {
    unlock: async () => {
      const Ctor = audioContextCtor();
      if (!Ctor) {
        return false;
      }
      try {
        ctx ??= new Ctor();
        await ctx.resume();
        return ctx.state === 'running';
      } catch {
        return false;
      }
    },
    play: () => {
      if (ctx?.state !== 'running') {
        return;
      }
      const now = ctx.currentTime;
      tone(ctx, 880, now);
      tone(ctx, 1320, now + 0.18);
    },
    isUnlocked: () => ctx?.state === 'running',
  };
}
