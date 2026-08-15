import type { BehaviorEvent, BehaviorId } from "../core/types.js";

const FREQUENCIES: Record<BehaviorId, number> = {
  mouth: 540,
  faceTouch: 660,
  eyeAlignment: 430,
};

export class AlertManager {
  private audioContext: AudioContext | undefined;

  prime(): void {
    const context = this.getContext();
    if (context.state === "suspended") void context.resume();
  }

  notify(event: BehaviorEvent, soundEnabled: boolean): void {
    if (soundEnabled) this.beep(FREQUENCIES[event.behavior]);
    document.body.dataset.alert = event.behavior;
    window.setTimeout(() => {
      delete document.body.dataset.alert;
    }, 900);
  }

  private getContext(): AudioContext {
    this.audioContext ??= new AudioContext();
    return this.audioContext;
  }

  private beep(frequency: number): void {
    const context = this.getContext();
    if (context.state === "suspended") void context.resume();

    const startedAt = context.currentTime;
    for (const offset of [0, 0.16]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startedAt + offset);
      gain.gain.setValueAtTime(0.0001, startedAt + offset);
      gain.gain.exponentialRampToValueAtTime(0.09, startedAt + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + offset + 0.11);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startedAt + offset);
      oscillator.stop(startedAt + offset + 0.12);
    }
  }
}
