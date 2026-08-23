import type { VisionClientCallbacks, VisionClientConfig, VisionSource } from "../vision/vision-client.js";
import type { DelegatePreference, VisionFrame } from "../core/types.js";
import { FakeClock } from "./fake-clock.js";
import { createScenarioFrame, type E2EScenario } from "./scenarios.js";

export class DeterministicVisionClient implements VisionSource {
  private ready = false;
  private nextInitializationError: string | undefined;
  private sequence = 0;
  private scenario: E2EScenario = "neutral";

  constructor(
    private readonly callbacks: VisionClientCallbacks,
    private readonly clock: FakeClock,
  ) {}

  get isReady(): boolean {
    return this.ready;
  }

  get isBusy(): boolean {
    return false;
  }

  async initialize(_config: VisionClientConfig): Promise<DelegatePreference> {
    if (this.nextInitializationError) {
      const message = this.nextInitializationError;
      this.nextInitializationError = undefined;
      this.callbacks.onError(message);
      throw new Error(message);
    }
    this.ready = true;
    this.callbacks.onDelegateChanged("CPU");
    this.callbacks.onState("推論準備完了（CPU）");
    return "CPU";
  }

  async process(_video: HTMLVideoElement, _timestampMs: number, _includeHands: boolean): Promise<boolean> {
    return false;
  }

  emitFrame(intervalMs = 100): VisionFrame {
    if (!this.ready) throw new Error("決定論的Visionクライアントが初期化されていません。");
    this.clock.advance(intervalMs);
    const frame = createScenarioFrame(this.scenario, this.clock.nowMs(), this.sequence);
    this.sequence += 1;
    this.callbacks.onFrame(frame);
    return frame;
  }

  emitFrames(count: number, intervalMs = 100): VisionFrame | undefined {
    if (!Number.isInteger(count) || count < 0) throw new Error("emitFramesのcountは0以上の整数で指定してください。");
    let last: VisionFrame | undefined;
    for (let index = 0; index < count; index += 1) last = this.emitFrame(intervalMs);
    return last;
  }

  setScenario(scenario: E2EScenario): void {
    this.scenario = scenario;
    this.sequence = 0;
  }

  getScenario(): E2EScenario {
    return this.scenario;
  }

  failInitialization(message: string): void {
    this.nextInitializationError = message;
  }

  failProcessing(message: string): void {
    this.callbacks.onError(message);
  }

  reset(): void {
    this.ready = false;
    this.nextInitializationError = undefined;
    this.sequence = 0;
    this.scenario = "neutral";
  }

  dispose(): void {
    this.ready = false;
  }
}
