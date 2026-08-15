import type { FaceFrame, Point3D, VisionFrame } from "../core/types.js";

export const E2E_SCENARIOS = [
  "neutral",
  "no-face",
  "mouth-open",
  "face-touch",
  "scratch-motion",
  "eye-deviation",
  "turned-head",
  "eyes-closed",
  "camera-permission-denied",
  "camera-not-found",
  "vision-initialization-failure",
  "vision-processing-failure",
] as const;

export type E2EScenario = (typeof E2E_SCENARIOS)[number];

function point(x: number, y: number, z = 0): Point3D {
  return { x, y, z };
}

function baseLandmarks(options: {
  mouthGap?: number;
  rightIrisX?: number;
  leftIrisX?: number;
  noseX?: number;
  eyesClosed?: boolean;
} = {}): Point3D[] {
  const {
    mouthGap = 0.006,
    rightIrisX = 0.4,
    leftIrisX = 0.6,
    noseX = 0.5,
    eyesClosed = false,
  } = options;
  const points = Array.from({ length: 478 }, () => point(0.5, 0.5));

  points[1] = point(noseX, 0.46);
  points[10] = point(0.5, 0.2);
  points[152] = point(0.5, 0.8);
  points[234] = point(0.3, 0.5);
  points[454] = point(0.7, 0.5);

  const eyeTop = eyesClosed ? 0.4 : 0.39;
  const eyeBottom = eyesClosed ? 0.4 : 0.41;
  points[33] = point(0.35, 0.4);
  points[133] = point(0.45, 0.4);
  points[159] = point(0.4, eyeTop);
  points[158] = point(0.42, eyeTop);
  points[145] = point(0.4, eyeBottom);
  points[153] = point(0.42, eyeBottom);
  points[362] = point(0.55, 0.4);
  points[263] = point(0.65, 0.4);
  points[386] = point(0.6, eyeTop);
  points[385] = point(0.58, eyeTop);
  points[374] = point(0.6, eyeBottom);
  points[380] = point(0.58, eyeBottom);
  points[468] = point(rightIrisX, 0.4);
  points[473] = point(leftIrisX, 0.4);
  points[13] = point(0.5, 0.53 - mouthGap / 2);
  points[14] = point(0.5, 0.53 + mouthGap / 2);
  return points;
}

function handAt(x: number, y: number): Point3D[] {
  const hand = Array.from({ length: 21 }, () => point(0.9, 0.9));
  hand[8] = point(x, y);
  return hand;
}

function frameForScenario(scenario: E2EScenario, timestampMs: number, sequence: number): VisionFrame {
  if (scenario === "no-face") {
    return { timestampMs, hands: [], inferenceMs: 1, delegate: "CPU" };
  }

  const faceOptions =
    scenario === "mouth-open"
      ? { mouthGap: 0.18 }
      : scenario === "eye-deviation"
        ? { rightIrisX: 0.37, leftIrisX: 0.6 }
        : scenario === "turned-head"
          ? { noseX: 0.68 }
          : scenario === "eyes-closed"
            ? { eyesClosed: true }
            : undefined;
  const face: FaceFrame = {
    landmarks: baseLandmarks(faceOptions),
    blendshapes: { jawOpen: scenario === "mouth-open" ? 0.7 : 0 },
  };

  let hands: Point3D[][] = [];
  if (scenario === "face-touch") hands = [handAt(0.5, 0.5)];
  if (scenario === "scratch-motion") {
    const positions = [0.46, 0.56, 0.47, 0.57, 0.46, 0.56];
    hands = [handAt(positions[sequence % positions.length] ?? 0.5, 0.5)];
  }

  return { timestampMs, face, hands, inferenceMs: 1, delegate: "CPU" };
}

export function createScenarioFrame(
  scenario: E2EScenario,
  timestampMs: number,
  sequence = 0,
): VisionFrame {
  return frameForScenario(scenario, timestampMs, sequence);
}
