import { equal, ok, throws } from "node:assert/strict";
import { test } from "node:test";

import { CalibrationSession } from "../src/core/calibration.js";
import { emptyMetrics } from "../src/core/metrics.js";
import type { BehaviorMetrics } from "../src/core/types.js";

function validMetrics(index: number): BehaviorMetrics {
  return {
    ...emptyMetrics(),
    hasFace: true,
    mouthOpenRatio: 0.03 + index * 0.001,
    jawOpen: 0.02,
    rightEyeOpen: 0.2,
    leftEyeOpen: 0.2,
    rightIrisPosition: 0.48 + index * 0.001,
    leftIrisPosition: 0.52 - index * 0.001,
    eyeDifference: 0.02 + index * 0.001,
    frontalScore: 0.95,
    eyeDistance: 0.3,
  };
}

test("顔姿勢の条件を満たさないサンプルを除外する", () => {
  const session = new CalibrationSession(10);
  const missing = session.add(emptyMetrics());
  equal(missing.accepted, 0);
  equal(missing.rejectionReason, "顔をカメラ内に収めてください");

  const turned = session.add({ ...validMetrics(0), frontalScore: 0.5 });
  equal(turned.accepted, 0);
  equal(turned.rejectionReason, "カメラを正面から見てください");
});

test("十分なサンプルの中央値から本人基準を作る", () => {
  const session = new CalibrationSession(10);
  for (let index = 0; index < 10; index += 1) session.add(validMetrics(index));

  const profile = session.finish(new Date("2026-08-16T00:00:00.000Z"));
  equal(profile.sampleCount, 10);
  equal(profile.createdAt, "2026-08-16T00:00:00.000Z");
  ok(Math.abs(profile.mouthClosedRatio - 0.0345) < 0.0001);
  ok(Math.abs(profile.rightIrisPosition - 0.4845) < 0.0001);
  ok(Math.abs(profile.eyeDifferenceBaseline - 0.005) < 0.0001);
});

test("不足した状態では完了できない", () => {
  const session = new CalibrationSession(10);
  session.add(validMetrics(0));
  throws(() => session.finish(), /サンプル数が不足/);
});
