import { $, expect } from "@wdio/globals";
import { beforeEach, describe, it } from "mocha";

import { emitFrames, resetApp, setScenario, startApp, storedEvents } from "../support/app.js";

async function calibrate(): Promise<void> {
  await $("#calibrateButton").click();
  await setScenario("neutral");
  await emitFrames(45, 100);
  await expect($("#calibrationPresence")).toHaveText("本人基準あり");
}

describe("左右視線差", () => {
  beforeEach(async () => resetApp());

  it("未校正とneutralでは通知しない", async () => {
    await startApp();
    await setScenario("eye-deviation");
    await emitFrames(30, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "eyeAlignment")).toHaveLength(0);
    await calibrate();
    await setScenario("neutral");
    await emitFrames(30, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "eyeAlignment")).toHaveLength(0);
  });

  it("校正後に正面の視線差が継続すると一度だけ通知する", async () => {
    await startApp();
    await calibrate();
    await setScenario("eye-deviation");
    await emitFrames(25, 100);
    const events = (await storedEvents()).filter((event) => event.behavior === "eyeAlignment");
    expect(events).toHaveLength(1);
    expect(events[0]?.message).toContain("診断ではなく");
    await emitFrames(20, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "eyeAlignment")).toHaveLength(1);
  });

  it("横向き・閉眼では視線差を判定しない", async () => {
    await startApp();
    await calibrate();
    await setScenario("turned-head");
    await emitFrames(30, 100);
    await setScenario("eyes-closed");
    await emitFrames(30, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "eyeAlignment")).toHaveLength(0);
  });
});
