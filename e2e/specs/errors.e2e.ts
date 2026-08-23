import { $, expect } from "@wdio/globals";
import { beforeEach, describe, it } from "mocha";

import { bridgeCall, emitFrames, resetApp, startApp, storedEvents } from "../support/app.js";
import { expectError } from "../support/assertions.js";

async function consentOnly(): Promise<void> {
  await $("#onboardingConsent").click();
  await $("#onboardingStartButton").click();
}

describe("カメラとVisionのエラー処理", () => {
  beforeEach(async () => resetApp());

  it("権限拒否を日本語で表示し、バナーを閉じられる", async () => {
    await bridgeCall<void>("simulateCameraError", "permission");
    await consentOnly();
    await expectError("カメラ利用が許可されていません");
    await $("#dismissErrorButton").click();
    await expect($("#errorBanner")).not.toBeDisplayed();
  });

  it("カメラ未検出を表示し、再試行できる", async () => {
    await bridgeCall<void>("simulateCameraError", "notFound");
    await consentOnly();
    await expectError("カメラが見つかりません");
    await $("#monitorButton").click();
    await expect($("#monitorButtonLabel")).toHaveText("監視を停止");
  });

  it("Vision初期化失敗時は監視中へ進まない", async () => {
    await bridgeCall<void>("simulateVisionError", "Vision初期化に失敗しました");
    await consentOnly();
    await expectError("Vision初期化に失敗しました");
    await expect($("#monitorButtonLabel")).toHaveText("監視を開始");
  });

  it("Vision処理失敗後もbusy状態を解除し、再試行できる", async () => {
    await startApp();
    await bridgeCall<void>("simulateVisionError", "Vision処理失敗");
    await expectError("Vision処理失敗");
    await $("#dismissErrorButton").click();
    await emitFrames(2);
    expect(await storedEvents()).toHaveLength(0);
  });
});
