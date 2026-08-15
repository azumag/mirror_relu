import type { DelegatePreference, VisionFrame } from "../core/types.js";

export interface VisionClientConfig {
  delegate: DelegatePreference;
  wasmRoot: string;
  faceModelUrl: string;
  handModelUrl: string;
}

export interface VisionClientCallbacks {
  onFrame: (frame: VisionFrame) => void;
  onState: (message: string) => void;
  onError: (message: string) => void;
  onDelegateChanged: (delegate: DelegatePreference) => void;
}

/**
 * Stable renderer-side boundary for real and deterministic vision sources.
 * Keeping this interface small prevents test-only controls from leaking into
 * the production MediaPipe client.
 */
export interface VisionSource {
  readonly isReady: boolean;
  readonly isBusy: boolean;
  initialize(config: VisionClientConfig): Promise<DelegatePreference>;
  process(video: HTMLVideoElement, timestampMs: number, includeHands: boolean): Promise<boolean>;
  dispose(): void;
}

interface WorkerMessage {
  type: string;
  frame?: VisionFrame;
  state?: string;
  error?: string;
  reason?: string;
  delegate?: DelegatePreference;
  label?: string;
  loaded?: number;
  total?: number;
}

export class VisionClient implements VisionSource {
  private readonly worker: Worker;
  private readonly callbacks: VisionClientCallbacks;
  private ready = false;
  private busy = false;
  private initPromise: Promise<DelegatePreference> | undefined;
  private resolveInit: ((delegate: DelegatePreference) => void) | undefined;
  private rejectInit: ((error: Error) => void) | undefined;
  private activeDelegate: DelegatePreference = "CPU";

  constructor(callbacks: VisionClientCallbacks) {
    this.callbacks = callbacks;
    this.worker = new Worker(new URL("./vision.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => this.handleMessage(event.data);
    this.worker.onerror = (event) => {
      this.busy = false;
      this.ready = false;
      const message = event.message || "Vision Workerで不明なエラーが発生しました。";
      this.rejectInit?.(new Error(message));
      this.initPromise = undefined;
      this.resolveInit = undefined;
      this.rejectInit = undefined;
      this.callbacks.onError(message);
    };
  }

  get isReady(): boolean {
    return this.ready;
  }

  get isBusy(): boolean {
    return this.busy;
  }

  initialize(config: VisionClientConfig): Promise<DelegatePreference> {
    if (this.ready) return Promise.resolve(this.activeDelegate);
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<DelegatePreference>((resolve, reject) => {
      this.resolveInit = resolve;
      this.rejectInit = reject;
    });

    this.callbacks.onState("推論モデルを読み込んでいます");
    this.worker.postMessage({ type: "INIT", ...config });
    return this.initPromise;
  }

  async process(video: HTMLVideoElement, timestampMs: number, includeHands: boolean): Promise<boolean> {
    if (!this.ready || this.busy || video.videoWidth === 0 || video.videoHeight === 0) return false;
    this.busy = true;

    try {
      const bitmap = await createImageBitmap(
        video,
        0,
        0,
        video.videoWidth,
        video.videoHeight,
        {
          resizeWidth: 640,
          resizeHeight: Math.max(360, Math.round((640 * video.videoHeight) / video.videoWidth)),
          resizeQuality: "medium",
        },
      );
      this.worker.postMessage(
        { type: "PROCESS", bitmap, timestampMs, includeHands },
        [bitmap],
      );
      return true;
    } catch (error) {
      this.busy = false;
      const message = error instanceof Error ? error.message : String(error);
      this.callbacks.onError(`カメラフレームを処理できませんでした: ${message}`);
      return false;
    }
  }

  dispose(): void {
    this.worker.postMessage({ type: "CLEANUP" });
    this.worker.terminate();
    this.ready = false;
    this.busy = false;
  }

  private handleMessage(message: WorkerMessage): void {
    switch (message.type) {
      case "INIT_DONE": {
        const delegate = message.delegate ?? "CPU";
        this.ready = true;
        this.busy = false;
        this.activeDelegate = delegate;
        this.callbacks.onDelegateChanged(delegate);
        this.callbacks.onState(`推論準備完了（${delegate}）`);
        this.resolveInit?.(delegate);
        this.initPromise = undefined;
        this.resolveInit = undefined;
        this.rejectInit = undefined;
        break;
      }
      case "INIT_STATE": {
        this.callbacks.onState("推論モデルを読み込んでいます");
        break;
      }
      case "LOAD_PROGRESS": {
        const loaded = message.loaded ?? 0;
        const total = message.total ?? 0;
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        const label = message.label === "hand" ? "手" : "顔";
        this.callbacks.onState(`${label}モデルを読み込み中${percent ? ` ${percent}%` : ""}`);
        break;
      }
      case "DELEGATE_FALLBACK": {
        this.callbacks.onState("GPU初期化に失敗したためCPUへ切り替えています");
        break;
      }
      case "RESULT": {
        this.busy = false;
        if (message.frame) this.callbacks.onFrame(message.frame);
        break;
      }
      case "ERROR": {
        this.busy = false;
        const error = message.error ?? "推論処理で不明なエラーが発生しました。";
        if (!this.ready) {
          this.rejectInit?.(new Error(error));
          this.initPromise = undefined;
          this.resolveInit = undefined;
          this.rejectInit = undefined;
        }
        this.callbacks.onError(error);
        break;
      }
    }
  }
}
