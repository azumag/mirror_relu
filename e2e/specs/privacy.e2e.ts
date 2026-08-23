import { $, browser, expect } from "@wdio/globals";
import { beforeEach, describe, it } from "mocha";

import { completeOnboarding, emitFrames, resetApp, setScenario, startApp } from "../support/app.js";

describe("通信・アクセシビリティ境界", () => {
  beforeEach(async () => resetApp());

  it("E2E実行中に外部オリジンへ要求しない", async () => {
    await startApp();
    await setScenario("neutral");
    await emitFrames(5);
    const external = await browser.execute(() =>
      performance
        .getEntriesByType("resource")
        .map((entry) => (entry as PerformanceResourceTiming).name)
        .filter((name) => {
          try {
            return new URL(name).origin !== window.location.origin;
          } catch {
            return false;
          }
        }),
    );
    expect(external).toHaveLength(0);
  });

  it("主要操作に名前があり、会話モードのaria-pressedが同期する", async () => {
    await completeOnboarding();
    await expect($("#monitorButtonLabel")).toHaveText("監視を停止");
    await expect($("#conversationModeButton")).toHaveText(/会話モード/);
    await expect($("#onboarding section[role='dialog']")).toHaveAttribute("role", "dialog");
    await $("#conversationModeButton").click();
    await expect($("#conversationModeButton")).toHaveAttribute("aria-pressed", "true");
    await expect($("#conversationOverlay")).toHaveText(/口の開き通知を一時停止/);
  });
});
