export interface CameraDevice {
  deviceId: string;
  label: string;
}

/**
 * The renderer only depends on this small camera boundary.  The production
 * implementation below is backed by Media Capture, while the E2E build uses
 * a deterministic implementation that never asks the OS for a camera.
 */
export interface CameraSource {
  readonly isRunning: boolean;
  start(deviceId?: string): Promise<void>;
  stop(): void;
  listDevices(): Promise<CameraDevice[]>;
}

function cameraError(error: unknown): Error {
  if (!(error instanceof DOMException)) {
    return error instanceof Error ? error : new Error(String(error));
  }

  const messages: Record<string, string> = {
    NotAllowedError: "カメラ利用が許可されていません。OSとアプリのカメラ権限を確認してください。",
    NotFoundError: "利用可能なカメラが見つかりません。",
    NotReadableError: "カメラを開始できません。他のアプリが使用していないか確認してください。",
    OverconstrainedError: "選択したカメラ設定を利用できません。",
    SecurityError: "セキュリティ設定によりカメラを利用できません。",
  };
  return new Error(messages[error.name] ?? error.message);
}

export class CameraController implements CameraSource {
  private readonly video: HTMLVideoElement;
  private stream: MediaStream | undefined;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  get isRunning(): boolean {
    return Boolean(this.stream?.active);
  }

  async start(deviceId = ""): Promise<void> {
    this.stop();

    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
      facingMode: "user",
    };
    if (deviceId) videoConstraints.deviceId = { exact: deviceId };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: videoConstraints,
      });
      this.video.srcObject = this.stream;
      await new Promise<void>((resolve) => {
        if (this.video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          resolve();
          return;
        }
        this.video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
      await this.video.play();
    } catch (error) {
      this.stop();
      throw cameraError(error);
    }
  }

  stop(): void {
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = undefined;
    this.video.pause();
    this.video.srcObject = null;
  }

  async listDevices(): Promise<CameraDevice[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === "videoinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `カメラ ${index + 1}`,
      }));
  }
}
