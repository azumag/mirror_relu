/// <reference lib="webworker" />

import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  type FaceLandmarkerResult,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { DelegatePreference, FaceFrame, Point3D, VisionFrame } from "../core/types.js";

interface InitMessage {
  type: "INIT";
  wasmRoot: string;
  faceModelUrl: string;
  handModelUrl: string;
  delegate: DelegatePreference;
}

interface ProcessMessage {
  type: "PROCESS";
  bitmap: ImageBitmap;
  timestampMs: number;
  includeHands: boolean;
}

interface CleanupMessage {
  type: "CLEANUP";
}

type IncomingMessage = InitMessage | ProcessMessage | CleanupMessage;

const scope = self as unknown as DedicatedWorkerGlobalScope;
let faceLandmarker: FaceLandmarker | undefined;
let handLandmarker: HandLandmarker | undefined;
let activeDelegate: DelegatePreference = "CPU";
let lastTimestampMs = 0;
let cachedHands: Point3D[][] = [];
let cachedHandsAt = 0;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function closeTasks(): void {
  try {
    faceLandmarker?.close();
  } catch {
    // Best-effort cleanup.
  }
  try {
    handLandmarker?.close();
  } catch {
    // Best-effort cleanup.
  }
  faceLandmarker = undefined;
  handLandmarker = undefined;
  cachedHands = [];
  cachedHandsAt = 0;
}

async function fetchModel(url: string, label: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label}モデルを読み込めませんでした: HTTP ${response.status}`);

  const total = Number(response.headers.get("content-length") ?? 0);
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(await response.arrayBuffer());

  let received = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    scope.postMessage({ type: "LOAD_PROGRESS", label, loaded: received, total });
  }

  const result = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function createTasks(message: InitMessage, delegate: DelegatePreference): Promise<void> {
  const vision = await FilesetResolver.forVisionTasks(message.wasmRoot, true);
  const [faceModel, handModel] = await Promise.all([
    fetchModel(message.faceModelUrl, "face"),
    fetchModel(message.handModelUrl, "hand"),
  ]);

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetBuffer: faceModel,
      delegate,
    },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
  });

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetBuffer: handModel,
      delegate,
    },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.48,
    minHandPresenceConfidence: 0.48,
    minTrackingConfidence: 0.45,
  });

  activeDelegate = delegate;
}

async function initialize(message: InitMessage): Promise<void> {
  closeTasks();
  scope.postMessage({ type: "INIT_STATE", state: "loading" });

  try {
    await createTasks(message, message.delegate);
  } catch (gpuError) {
    closeTasks();
    if (message.delegate !== "GPU") throw gpuError;

    scope.postMessage({
      type: "DELEGATE_FALLBACK",
      reason: errorMessage(gpuError),
      delegate: "CPU",
    });
    await createTasks(message, "CPU");
  }

  scope.postMessage({ type: "INIT_DONE", delegate: activeDelegate });
}

function plainLandmarks(points: Array<{ x: number; y: number; z: number; visibility?: number }>): Point3D[] {
  return points.map((entry) => {
    const base: Point3D = { x: entry.x, y: entry.y, z: entry.z };
    return entry.visibility === undefined ? base : { ...base, visibility: entry.visibility };
  });
}

function plainFace(result: FaceLandmarkerResult): FaceFrame | undefined {
  const landmarks = result.faceLandmarks[0];
  if (!landmarks) return undefined;

  const blendshapes: Record<string, number> = {};
  const categories = result.faceBlendshapes[0]?.categories ?? [];
  for (const category of categories) {
    if (category.categoryName) blendshapes[category.categoryName] = category.score;
  }

  return {
    landmarks: plainLandmarks(landmarks),
    blendshapes,
  };
}

function plainHands(result: HandLandmarkerResult): Point3D[][] {
  return result.landmarks.map((hand) => plainLandmarks(hand));
}

function processFrame(message: ProcessMessage): void {
  if (!faceLandmarker || !handLandmarker) {
    message.bitmap.close();
    throw new Error("推論エンジンが初期化されていません。");
  }

  const timestampMs = Math.max(message.timestampMs, lastTimestampMs + 0.01);
  lastTimestampMs = timestampMs;
  const startedAt = performance.now();

  try {
    const faceResult = faceLandmarker.detectForVideo(message.bitmap, timestampMs);
    const face = plainFace(faceResult);

    if (message.includeHands) {
      cachedHands = plainHands(handLandmarker.detectForVideo(message.bitmap, timestampMs));
      cachedHandsAt = timestampMs;
    } else if (timestampMs - cachedHandsAt > 500) {
      cachedHands = [];
    }

    const base: VisionFrame = {
      timestampMs,
      hands: cachedHands,
      inferenceMs: performance.now() - startedAt,
      delegate: activeDelegate,
    };
    const frame = face ? { ...base, face } : base;
    scope.postMessage({ type: "RESULT", frame });
  } finally {
    message.bitmap.close();
  }
}

scope.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;

  void (async () => {
    try {
      if (message.type === "INIT") {
        await initialize(message);
      } else if (message.type === "PROCESS") {
        processFrame(message);
      } else if (message.type === "CLEANUP") {
        closeTasks();
        scope.postMessage({ type: "CLEANUP_DONE" });
      }
    } catch (error) {
      scope.postMessage({ type: "ERROR", error: errorMessage(error) });
    }
  })();
};
