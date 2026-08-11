export type SoundEvent =
  | 'cardDeal'
  | 'chip'
  | 'win'
  | 'lose'
  | 'rouletteSpin'
  | 'slotStop'
  | 'plinkoPeg'
  | 'button';

type SoundListener = (event: SoundEvent) => void;

const listeners = new Set<SoundListener>();

export const soundManager = {
  play(event: SoundEvent, enabled = true) {
    if (!enabled) return;
    listeners.forEach((listener) => listener(event));
  },
  subscribe(listener: SoundListener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
