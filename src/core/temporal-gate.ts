import type { DetectorState, TemporalGateSnapshot } from "./types.js";

export interface TemporalGateConfig {
  enterThreshold: number;
  exitThreshold: number;
  holdMs: number;
  releaseMs: number;
  cooldownMs: number;
}

const DEFAULT_CONFIG: TemporalGateConfig = {
  enterThreshold: 0.5,
  exitThreshold: 0.4,
  holdMs: 800,
  releaseMs: 250,
  cooldownMs: 10_000,
};

export class TemporalGate {
  private config: TemporalGateConfig;
  private state: DetectorState = "normal";
  private candidateSince: number | undefined;
  private activeSince: number | undefined;
  private belowSince: number | undefined;
  private cooldownUntil = 0;
  private lastValue = 0;

  constructor(config: Partial<TemporalGateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  configure(config: Partial<TemporalGateConfig>): void {
    this.config = { ...this.config, ...config };
  }

  reset(): void {
    this.state = "normal";
    this.candidateSince = undefined;
    this.activeSince = undefined;
    this.belowSince = undefined;
    this.cooldownUntil = 0;
    this.lastValue = 0;
  }

  update(value: number, nowMs: number, eligible = true): TemporalGateSnapshot {
    const previousState = this.state;
    this.lastValue = Number.isFinite(value) ? value : 0;
    let shouldAlert = false;

    if (!eligible) {
      this.reset();
      return this.snapshot(false, previousState !== this.state, nowMs);
    }

    switch (this.state) {
      case "normal": {
        if (this.lastValue >= this.config.enterThreshold) {
          this.state = "candidate";
          this.candidateSince = nowMs;
        }
        break;
      }

      case "candidate": {
        if (this.lastValue <= this.config.exitThreshold) {
          this.state = "normal";
          this.candidateSince = undefined;
        } else if (nowMs - (this.candidateSince ?? nowMs) >= this.config.holdMs) {
          this.state = "active";
          this.activeSince = this.candidateSince ?? nowMs;
          this.belowSince = undefined;
          shouldAlert = true;
        }
        break;
      }

      case "active": {
        if (this.lastValue <= this.config.exitThreshold) {
          this.belowSince ??= nowMs;
          if (nowMs - this.belowSince >= this.config.releaseMs) {
            this.state = "cooldown";
            this.cooldownUntil = nowMs + this.config.cooldownMs;
            this.belowSince = undefined;
          }
        } else {
          this.belowSince = undefined;
        }
        break;
      }

      case "cooldown": {
        if (nowMs >= this.cooldownUntil && this.lastValue <= this.config.exitThreshold) {
          this.state = "normal";
          this.cooldownUntil = 0;
          this.candidateSince = undefined;
          this.activeSince = undefined;
        }
        break;
      }
    }

    return this.snapshot(shouldAlert, previousState !== this.state, nowMs);
  }

  private snapshot(shouldAlert: boolean, changed: boolean, nowMs: number): TemporalGateSnapshot {
    const activeDurationMs =
      this.state === "active" && this.activeSince !== undefined
        ? Math.max(0, nowMs - this.activeSince)
        : 0;

    return {
      state: this.state,
      value: this.lastValue,
      enterThreshold: this.config.enterThreshold,
      activeDurationMs,
      shouldAlert,
      changed,
    };
  }
}
