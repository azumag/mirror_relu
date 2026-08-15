import { $, browser, expect } from "@wdio/globals";
import { beforeEach, describe, it } from "mocha";

import { bridgeCall, emitFrames, resetApp, setScenario } from "../support/app.js";

describe("Native Tauri smoke", () => {
  beforeEach(async () => resetApp());

  it("アプリとメインウィンドウが起動し、初回案内を表示する", async () => {
    await expect($("body")).toBeDisplayed();
    await expect($("#onboarding")).toBeDisplayed();
    const state = await bridgeCall<{ ready: boolean }>("getAppState");
    expect(state.ready).toBe(true);
  });

  it("Tauri WebView上で合成シナリオを操作できる", async () => {
    await $("#onboardingConsent").click();
    await $("#onboardingStartButton").click();
    await $("#monitorButtonLabel").waitUntil(async () => (await $("#monitorButtonLabel").getText()) === "監視を停止");
    await setScenario("neutral");
    await emitFrames(2);
    await expect($("#facePresence")).toHaveText(/顔を検出中/);
  });

  it("再起動相当のページ再読込で同意状態が残る", async () => {
    await $("#onboardingConsent").click();
    await $("#onboardingStartButton").click();
    await $("#monitorButtonLabel").waitUntil(async () => (await $("#monitorButtonLabel").getText()) === "監視を停止");
    await browser.refresh();
    await expect($("#onboarding")).not.toBeDisplayed();
  });
});
