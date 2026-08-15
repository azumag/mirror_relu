import { equal, ok } from "node:assert/strict";
import { test } from "node:test";

import { BehaviorEngine, thresholdsFor } from "../src/core/behavior-engine.js";
import { DEFAULT_SETTINGS } from "../src/core/settings.js";
import type {
  AppModes,
  AppSettings,
  CalibrationProfile,
  Point3D,
  VisionFrame,
} from "../src/core/types.js";

function point(x: number, y: number, z = 0): Point3D {
  return { x, y, z };
}

function landmarks(mouthGap = 0.06, rightIrisX = 0.4, leftIrisX = 0.6): Point3D[] {
  const points = Array.from({ length: 478 }, () => point(0.5, 0.5));
  points[1] = point(0.5, 0.46);
  points[10] = point(0.5, 0.2);
  points[152] = point(0.5, 0.8);
  points[234] = point(0.3, 0.5);
  points[454] = point(0.7, 0.5);
  points[33] = point(0.35, 0.4);
  points[133] = point(0.45, 0.4);
  points[159] = point(0.4, 0.39);
  points[158] = point(0.42, 0.39);
  points[145] = point(0.4, 0.41);
  points[153] = point(0.42, 0.41);
  points[362] = point(0.55, 0.4);
  points[263] = point(0.65, 0.4);
  points[386] = point(0.6, 0.39);
  points[385] = point(0.58, 0.39);
  points[374] = point(0.6, 0.41);
  points[380] = point(0.58, 0.41);
  points[468] = point(rightIrisX, 0.4);
  points[473] = point(leftIrisX, 0.4);
  points[13] = point(0.5, 0.53 - mouthGap / 2);
  points[14] = point(0.5, 0.53 + mouthGap / 2);
  return points;
}

function frame(
  timestampMs: number,
  mouthGap = 0.06,
  rightIrisX = 0.4,
  leftIrisX = 0.6,
): VisionFrame {
  return {
    timestampMs,
    face: {
      landmarks: landmarks(mouthGap, rightIrisX, leftIrisX),
      blendshapes: { jawOpen: 0.1 },
    },
    hands: [],
    inferenceMs: 15,
    delegate: "CPU",
  };
}

function settings(): AppSettings {
  const value = structuredClone(DEFAULT_SETTINGS);
  value.mouth.holdMs = 100;
  value.eyeAlignment.holdMs = 100;
  return value;
}

const activeModes: AppModes = {
  conversationMode: false,
  paused: false,
  calibrating: false,
};

const calibration: CalibrationProfile = {
  version: 1,
  createdAt: "2026-08-16T00:00:00.000Z",
  sampleCount: 45,
  mouthClosedRatio: 0.03,
  jawOpenBaseline: 0.02,
  rightIrisPosition: 0.5,
  leftIrisPosition: 0.5,
  eyeDifferenceBaseline: 0.01,
  eyeDistance: 0.3,
};

test("口の開きが継続したときだけイベントを一度生成する", () => {
  const engine = new BehaviorEngine();
  const config = settings();

  equal(engine.update(frame(1_000), config, activeModes, calibration).events.length, 0);
  const result = engine.update(frame(1_100), config, activeModes, calibration);
  equal(result.events.length, 1);
  equal(result.events[0]?.behavior, "mouth");
  equal(engine.update(frame(1_200), config, activeModes, calibration).events.length, 0);
});

test("会話モードでは口の候補状態を作らない", () => {
  const engine = new BehaviorEngine();
  const config = settings();
  const modes = { ...activeModes, conversationMode: true };

  engine.update(frame(1_000), config, modes, calibration);
  const result = engine.update(frame(1_500), config, modes, calibration);
  equal(result.events.length, 0);
  equal(result.detectors.mouth.eligible, false);
  equal(result.detectors.mouth.state, "normal");
});

test("左右視線差は校正済みかつ正面のときだけ判定する", () => {
  const engine = new BehaviorEngine();
  const config = settings();
  config.mouth.enabled = false;

  const first = engine.update(frame(1_000, 0.01, 0.37, 0.6), config, activeModes);
  equal(first.detectors.eyeAlignment.eligible, false);

  engine.update(frame(2_000, 0.01, 0.37, 0.6), config, activeModes, calibration);
  const alerted = engine.update(frame(2_100, 0.01, 0.37, 0.6), config, activeModes, calibration);
  equal(alerted.events[0]?.behavior, "eyeAlignment");
});

test("感度を上げるとすべての進入閾値が下がる", () => {
  const low = settings();
  low.mouth.sensitivity = 0;
  low.faceTouch.sensitivity = 0;
  low.eyeAlignment.sensitivity = 0;

  const high = settings();
  high.mouth.sensitivity = 100;
  high.faceTouch.sensitivity = 100;
  high.eyeAlignment.sensitivity = 100;

  const lowThresholds = thresholdsFor(low, calibration);
  const highThresholds = thresholdsFor(high, calibration);
  ok(highThresholds.mouth < lowThresholds.mouth);
  ok(highThresholds.faceTouch < lowThresholds.faceTouch);
  ok(highThresholds.eyeAlignment < lowThresholds.eyeAlignment);
});
