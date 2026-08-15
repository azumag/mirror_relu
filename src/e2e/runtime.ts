import type { CameraSource } from "../camera/camera-controller.js";
import type { VisionClientCallbacks } from "../vision/vision-client.js";
import { E2EBridge } from "./bridge.js";
import { FakeCameraController } from "./fake-camera-controller.js";
import { FakeClock } from "./fake-clock.js";
import { DeterministicVisionClient } from "./deterministic-vision-client.js";

export interface E2ERuntime {
  clock: FakeClock;
  camera: CameraSource;
  vision: DeterministicVisionClient;
  bridge: E2EBridge;
}

export function createE2ERuntime(video: HTMLVideoElement, callbacks: VisionClientCallbacks): E2ERuntime {
  const clock = new FakeClock();
  const camera = new FakeCameraController(video);
  const vision = new DeterministicVisionClient(callbacks, clock);
  const bridge = new E2EBridge(clock, camera, vision);
  return { clock, camera, vision, bridge };
}
