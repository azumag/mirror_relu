import { $, expect } from "@wdio/globals";
import { beforeEach, describe, it } from "mocha";

import { bridgeCall, clickSwitch, emitFrames, resetApp, setScenario, startApp, storedEvents } from "../support/app.js";

describe("口の開き検出", () => {
  beforeEach(async () => resetApp());

  it("継続時間未満では通知せず、超えると一度だけ記録する", async () => {
    await startApp();
    await setScenario("mouth-open");
    await emitFrames(5, 100);
    expect((await storedEvents()).length).toBe(0);
    await emitFrames(10, 100);
    const events = await storedEvents();
    expect(events.filter((event) => event.behavior === "mouth")).toHaveLength(1);
    await emitFrames(20, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "mouth")).toHaveLength(1);
  });

  it("閉口後の解除とクールダウンを経て再通知できる", async () => {
    await startApp();
    await setScenario("mouth-open");
    await emitFrames(15, 100);
    await setScenario("neutral");
    await emitFrames(5, 100);
    await bridgeCall<number>("advanceTime", 12_000);
    await emitFrames(2, 100);
    await setScenario("mouth-open");
    await emitFrames(15, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "mouth")).toHaveLength(2);
  });

  it("会話モード中は候補を破棄して口通知を抑止する", async () => {
    await startApp();
    await setScenario("mouth-open");
    await emitFrames(4, 100);
    await $("#conversationModeButton").click();
    await expect($("#conversationModeButton")).toHaveAttribute("aria-pressed", "true");
    await expect($("#conversationOverlay")).toBeDisplayed();
    await emitFrames(20, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "mouth")).toHaveLength(0);
    await $("#conversationModeButton").click();
    await emitFrames(4, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "mouth")).toHaveLength(0);
  });

  it("口検出をOFFにすると通知しない", async () => {
    await startApp();
    await clickSwitch("mouthEnabled");
    await setScenario("mouth-open");
    await emitFrames(20, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "mouth")).toHaveLength(0);
    await expect($("[data-detector=mouth] [data-role=state]")).toHaveText("OFF");
  });
});
