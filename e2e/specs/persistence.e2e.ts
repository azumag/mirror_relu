import { $, browser, expect } from "@wdio/globals";
import { beforeEach, describe, it } from "mocha";

import { bridgeCall, emitFrames, resetApp, setScenario, startApp, storedEvents } from "../support/app.js";

describe("履歴とJSON書き出し", () => {
  beforeEach(async () => resetApp());

  it("通知後に履歴と当日件数を更新し、削除できる", async () => {
    await startApp();
    await setScenario("mouth-open");
    await emitFrames(16, 100);
    await expect($("#eventList .event-item")).toExist();
    await expect($("#mouthCount")).toHaveText("1");
    await $("#toast").waitForDisplayed({ reverse: true });
    await browser.execute(() => {
      window.confirm = () => true;
    });
    await $("#clearHistoryButton").click();
    await expect($("#mouthCount")).toHaveText("0");
    expect(await storedEvents()).toHaveLength(0);
  });

  it("JSON書き出しを捕捉し、映像・特徴点を含めない", async () => {
    await startApp();
    await setScenario("mouth-open");
    await emitFrames(16, 100);
    await $("#toast").waitForDisplayed({ reverse: true });
    await $("#exportButton").click();
    const download = await bridgeCall<{ filename: string; content: string; revokeCount: number } | null>("getLastDownload");
    expect(download?.filename).toMatch(/^mirror-relu-.*\.json$/);
    expect(download?.revokeCount).toBe(1);
    const payload = JSON.parse(download?.content ?? "{}") as Record<string, unknown>;
    expect(payload.schemaVersion).toBe(1);
    expect(typeof payload.exportedAt).toBe("string");
    expect(payload.settings).toBeDefined();
    expect(payload.calibration).toBeDefined();
    expect(payload.events).toBeInstanceOf(Array);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("landmarks");
    expect(serialized).not.toContain("ImageBitmap");
    expect(serialized).not.toContain("blob:");
  });

  it("壊れた履歴JSONでも起動できる", async () => {
    await browser.execute(() => localStorage.setItem("mirror-relu:events:v1", "{broken"));
    await browser.refresh();
    await expect($("#eventList")).toBeDisplayed();
    expect(await storedEvents()).toHaveLength(0);
  });
});
