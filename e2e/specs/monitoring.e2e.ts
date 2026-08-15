import { $, expect } from "@wdio/globals";
import { beforeEach, describe, it } from "mocha";

import { bridgeCall, emitFrames, resetApp, setScenario, startApp, storedEvents } from "../support/app.js";
import { expectFaceDetected } from "../support/assertions.js";

describe("監視ライフサイクル", () => {
  beforeEach(async () => resetApp());

  it("開始後にneutralフレームを受けて顔検出状態になる", async () => {
    await startApp();
    await setScenario("neutral");
    await emitFrames(2);
    await expectFaceDetected();
    await expect($("#cameraEmptyState")).not.toBeDisplayed();
  });

  it("停止すると検出状態とメーターが待機状態へ戻る", async () => {
    await startApp();
    await setScenario("neutral");
    await emitFrames(2);
    await $("#monitorButton").click();
    await expect($("#monitorButtonLabel")).toHaveText("監視を開始");
    await expect($("#facePresence")).toHaveText(/待っています/);
    await expect($("#mouthMetric")).toHaveText("—");
  });

  it("停止後にフレームを流しても履歴は増えない", async () => {
    await startApp();
    await setScenario("mouth-open");
    await emitFrames(20, 100);
    const before = await storedEvents();
    await $("#monitorButton").click();
    await emitFrames(20, 100);
    const after = await storedEvents();
    expect(after.length).toBe(before.length);
  });

  it("一時休止とテストクロックによる自動再開が多重化しない", async () => {
    await startApp();
    await $("#pauseButton").click();
    await expect($("#pauseButton")).toHaveText(/今すぐ再開/);
    await bridgeCall<number>("advanceTime", 10 * 60 * 1000);
    await expect($("#pauseButton")).toHaveText(/10分休止/);
    const state = await bridgeCall<{ paused: boolean; cameraRunning: boolean }>("getAppState");
    expect(state.paused).toBe(false);
    expect(state.cameraRunning).toBe(true);
  });
});
