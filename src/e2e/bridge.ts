import type { AppSettings, CalibrationProfile, BehaviorEvent, EngineResult } from "../core/types.js";
import type { FakeCameraController } from "./fake-camera-controller.js";
import type { DeterministicVisionClient } from "./deterministic-vision-client.js";
import { FakeClock } from "./fake-clock.js";
import { E2E_SCENARIOS, type E2EScenario } from "./scenarios.js";

export type { E2EScenario } from "./scenarios.js";

export interface MirrorReluE2EBridge {
  reset(): Promise<void>;
  setScenario(name: E2EScenario): Promise<void>;
  emitFrame(): Promise<unknown>;
  emitFrames(count: number, intervalMs?: number): Promise<unknown>;
  advanceTime(milliseconds: number): Promise<number>;
  getAppState(): Promise<unknown>;
  getStoredEvents(): Promise<BehaviorEvent[]>;
  getStoredSettings(): Promise<AppSettings | null>;
  getStoredCalibration(): Promise<CalibrationProfile | null>;
  simulateCameraError(name: string): Promise<void>;
  simulateVisionError(message: string): Promise<void>;
  removeCamera(deviceId: string): Promise<void>;
  getLastDownload(): Promise<{ filename: string; content: string; revokeCount: number } | null>;
}

interface AppStateProvider {
  getAppState: () => unknown;
  reset: () => Promise<void>;
  advanceTime: () => Promise<void>;
}

interface DownloadRecord {
  filename: string;
  content: string;
  revokeCount: number;
}

function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export class E2EBridge implements MirrorReluE2EBridge {
  private app: AppStateProvider | undefined;
  private download: DownloadRecord | null = null;

  constructor(
    private readonly clock: FakeClock,
    private readonly camera: FakeCameraController,
    private readonly vision: DeterministicVisionClient,
  ) {
    const globalWindow = window as unknown as { __MIRROR_RELU_E2E__?: MirrorReluE2EBridge };
    Object.defineProperty(globalWindow, "__MIRROR_RELU_E2E__", {
      configurable: true,
      enumerable: false,
      value: this,
      writable: false,
    });
  }

  attachApp(provider: AppStateProvider): void {
    this.app = provider;
  }

  captureDownload(filename: string, content: string, revokeCount: number): void {
    this.download = { filename, content, revokeCount };
  }

  async reset(): Promise<void> {
    localStorage.clear();
    this.clock.reset();
    this.camera.reset();
    this.vision.reset();
    this.download = null;
    await this.app?.reset();
    window.dispatchEvent(new CustomEvent("mirror-relu:e2e-reset"));
  }

  async setScenario(name: E2EScenario): Promise<void> {
    if (!E2E_SCENARIOS.includes(name)) throw new Error(`未知のE2Eシナリオです: ${name}`);
    this.vision.setScenario(name);
  }

  async emitFrame(): Promise<unknown> {
    return this.vision.emitFrame();
  }

  async emitFrames(count: number, intervalMs = 100): Promise<unknown> {
    return this.vision.emitFrames(count, intervalMs);
  }

  async advanceTime(milliseconds: number): Promise<number> {
    const now = this.clock.advance(milliseconds);
    await this.app?.advanceTime();
    return now;
  }

  async getAppState(): Promise<unknown> {
    return this.app?.getAppState() ?? { ready: false };
  }

  async getStoredEvents(): Promise<BehaviorEvent[]> {
    return readStorage<BehaviorEvent[]>("mirror-relu:events:v1") ?? [];
  }

  async getStoredSettings(): Promise<AppSettings | null> {
    return readStorage<AppSettings>("mirror-relu:settings:v1");
  }

  async getStoredCalibration(): Promise<CalibrationProfile | null> {
    return readStorage<CalibrationProfile>("mirror-relu:calibration:v1");
  }

  async simulateCameraError(name: string): Promise<void> {
    this.camera.failNext(name);
  }

  async simulateVisionError(message: string): Promise<void> {
    if (message.includes("初期化")) this.vision.failInitialization(message);
    else this.vision.failProcessing(message);
  }

  async removeCamera(deviceId: string): Promise<void> {
    this.camera.removeDevice(deviceId);
  }

  async getLastDownload(): Promise<DownloadRecord | null> {
    return this.download;
  }
}
