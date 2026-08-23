import type { CameraDevice, CameraSource } from "../camera/camera-controller.js";

const DEVICES: CameraDevice[] = [
  { deviceId: "e2e-camera-front", label: "合成カメラ（正面）" },
  { deviceId: "e2e-camera-usb", label: "合成カメラ（USB相当）" },
];

const ERROR_MESSAGES: Record<string, string> = {
  permission: "カメラ利用が許可されていません。OSとアプリのカメラ権限を確認してください。",
  notFound: "利用可能なカメラが見つかりません。",
  notReadable: "カメラを開始できません。他のアプリが使用していないか確認してください。",
};

export class FakeCameraController implements CameraSource {
  private running = false;
  private nextError: string | undefined;
  private devices = [...DEVICES];

  constructor(private readonly video: HTMLVideoElement) {
    video.dataset.e2eCamera = "idle";
  }

  get isRunning(): boolean {
    return this.running;
  }

  async start(deviceId = ""): Promise<void> {
    if (this.nextError) {
      const error = this.nextError;
      this.nextError = undefined;
      throw new Error(ERROR_MESSAGES[error] ?? error);
    }
    if (deviceId && !this.devices.some((device) => device.deviceId === deviceId)) {
      throw new Error(ERROR_MESSAGES.notFound);
    }
    this.running = true;
    this.video.dataset.e2eCamera = deviceId || DEVICES[0]?.deviceId || "e2e-camera-front";
  }

  stop(): void {
    this.running = false;
    this.video.dataset.e2eCamera = "idle";
  }

  async listDevices(): Promise<CameraDevice[]> {
    return this.devices.map((device) => ({ ...device }));
  }

  failNext(name: string): void {
    this.nextError = name;
  }

  removeDevice(deviceId: string): void {
    this.devices = this.devices.filter((device) => device.deviceId !== deviceId);
  }

  reset(): void {
    this.running = false;
    this.nextError = undefined;
    this.devices = [...DEVICES];
    this.video.dataset.e2eCamera = "idle";
  }
}
