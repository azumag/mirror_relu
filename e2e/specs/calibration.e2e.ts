import { $, expect } from "@wdio/globals";
import { beforeEach, describe, it } from "mocha";

import { emitFrames, resetApp, setScenario, startApp, storedCalibration } from "../support/app.js";

describe("本人基準キャリブレーション", () => {
  beforeEach(async () => resetApp());

  it("有効なneutralサンプルで完了し、ローカル保存する", async () => {
    await startApp();
    await $("#calibrateButton").click();
    await expect($("#calibrationModal")).toBeDisplayed();
    await setScenario("neutral");
    await emitFrames(45, 100);
    await expect($("#calibrationModal")).not.toBeDisplayed();
    const profile = await storedCalibration();
    expect(profile?.sampleCount).toBe(45);
  });

  it("no-face、横向き、目を閉じたフレームを採用しない", async () => {
    await startApp();
    await $("#calibrateButton").click();
    await setScenario("no-face");
    await emitFrames(3);
    await setScenario("turned-head");
    await emitFrames(3);
    await setScenario("eyes-closed");
    await emitFrames(3);
    await expect($("#calibrationProgressText")).toHaveText(/0 \/ 45/);
    await setScenario("neutral");
    await emitFrames(45);
    expect((await storedCalibration())?.sampleCount).toBe(45);
  });

  it("中止すると未完了サンプルを破棄する", async () => {
    await startApp();
    await $("#calibrateButton").click();
    await setScenario("neutral");
    await emitFrames(4);
    await $("#cancelCalibrationButton").click();
    await expect($("#calibrationModal")).not.toBeDisplayed();
    expect(await storedCalibration()).toBeNull();
  });
});
