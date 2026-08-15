import { equal, ok } from "node:assert/strict";
import { test } from "node:test";

import { computeFrameMetrics, emptyMetrics } from "../src/core/metrics.js";
import type { CalibrationProfile, Point3D, VisionFrame } from "../src/core/types.js";

function point(x: number, y: number, z = 0): Point3D {
  return { x, y, z };
}

function faceLandmarks(): Point3D[] {
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

  points[468] = point(0.4, 0.4);
  points[473] = point(0.6, 0.4);
  points[13] = point(0.5, 0.52);
  points[14] = point(0.5, 0.56);
  return points;
}

function frame(overrides: Partial<VisionFrame> = {}): VisionFrame {
  return {
    timestampMs: 1_000,
    face: { landmarks: faceLandmarks(), blendshapes: { jawOpen: 0.1 } },
    hands: [],
    inferenceMs: 20,
    delegate: "CPU",
    ...overrides,
  };
}

const calibration: CalibrationProfile = {
  version: 1,
  createdAt: "2026-08-16T00:00:00.000Z",
  sampleCount: 45,
  mouthClosedRatio: 0.03,
  jawOpenBaseline: 0.02,
  rightIrisPosition: 0.5,
  leftIrisPosition: 0.5,
  eyeDifferenceBaseline: 0.05,
  eyeDistance: 0.3,
};

test("顔がないフレームはゼロ指標を返す", () => {
  const noFace: VisionFrame = {
    timestampMs: 1_000,
    hands: [],
    inferenceMs: 20,
    delegate: "CPU",
  };
  equal(computeFrameMetrics(noFace).hasFace, false);
  equal(emptyMetrics().rightIrisPosition, 0.5);
});

test("口・目・正面度を顔サイズで正規化して計算する", () => {
  const metrics = computeFrameMetrics(frame(), calibration);
  equal(metrics.hasFace, true);
  ok(Math.abs(metrics.mouthOpenRatio - 0.1333) < 0.001);
  ok(Math.abs(metrics.rightEyeOpen - 0.2) < 0.001);
  ok(Math.abs(metrics.leftEyeOpen - 0.2) < 0.001);
  ok(metrics.frontalScore > 0.99);
  ok(metrics.eyeDifference < 0.001);
});

test("左右虹彩位置の非対称を個人基準との差として返す", () => {
  const landmarks = faceLandmarks();
  landmarks[468] = point(0.37, 0.4);
  const metrics = computeFrameMetrics(
    frame({ face: { landmarks, blendshapes: { jawOpen: 0 } } }),
    calibration,
  );

  ok(Math.abs(metrics.rightIrisPosition - 0.2) < 0.001);
  ok(Math.abs(metrics.eyeDifference - 0.25) < 0.001);
});

test("顔領域内の指先を接触候補として返す", () => {
  const hand = Array.from({ length: 21 }, () => point(0.9, 0.9));
  hand[8] = point(0.5, 0.5);
  const metrics = computeFrameMetrics(frame({ hands: [hand] }));

  ok(metrics.faceTouchScore > 0.8);
  equal(metrics.contactPoint?.landmarkIndex, 8);
});
