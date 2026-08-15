import { equal } from "node:assert/strict";
import { test } from "node:test";

import { TemporalGate } from "../src/core/temporal-gate.js";

test("一定時間を超えたときだけ一度通知する", () => {
  const gate = new TemporalGate({
    enterThreshold: 0.7,
    exitThreshold: 0.5,
    holdMs: 500,
    releaseMs: 200,
    cooldownMs: 1_000,
  });

  equal(gate.update(0.8, 100).state, "candidate");
  equal(gate.update(0.8, 599).shouldAlert, false);

  const active = gate.update(0.8, 600);
  equal(active.state, "active");
  equal(active.shouldAlert, true);
  equal(active.activeDurationMs, 500);

  equal(gate.update(0.9, 900).shouldAlert, false);
});

test("解除時間とクールダウンを経て通常状態へ戻る", () => {
  const gate = new TemporalGate({
    enterThreshold: 0.7,
    exitThreshold: 0.5,
    holdMs: 100,
    releaseMs: 200,
    cooldownMs: 1_000,
  });

  gate.update(0.8, 100);
  gate.update(0.8, 200);
  equal(gate.update(0.4, 300).state, "active");
  equal(gate.update(0.4, 500).state, "cooldown");
  equal(gate.update(0.9, 1_600).state, "cooldown");
  equal(gate.update(0.4, 1_601).state, "normal");
});

test("判定対象外になったら候補状態を破棄する", () => {
  const gate = new TemporalGate({ enterThreshold: 0.5, holdMs: 500 });
  equal(gate.update(0.7, 100).state, "candidate");
  equal(gate.update(0.7, 200, false).state, "normal");
  equal(gate.update(0.7, 700).state, "candidate");
  equal(gate.update(0.7, 701).shouldAlert, false);
});
