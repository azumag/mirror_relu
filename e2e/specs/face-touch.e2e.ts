import { $, expect } from "@wdio/globals";
import { beforeEach, describe, it } from "mocha";

import { clickSwitch, emitFrames, resetApp, setScenario, startApp, storedEvents } from "../support/app.js";

describe("顔への手接触と擦過候補", () => {
  beforeEach(async () => resetApp());

  it("一瞬の接近では通知せず、継続後に一度通知する", async () => {
    await startApp();
    await setScenario("face-touch");
    await emitFrames(2, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "faceTouch")).toHaveLength(0);
    await emitFrames(8, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "faceTouch")).toHaveLength(1);
  });

  it("往復移動は通常接触と異なる擦過通知になる", async () => {
    await startApp();
    await setScenario("scratch-motion");
    await emitFrames(16, 100);
    const event = (await storedEvents()).find((entry) => entry.behavior === "faceTouch");
    expect(event).toBeDefined();
    expect(event?.message).toContain("こする");
  });

  it("顔接触検出をOFFにすると通知しない", async () => {
    await startApp();
    await clickSwitch("touchEnabled");
    await setScenario("face-touch");
    await emitFrames(20, 100);
    expect((await storedEvents()).filter((event) => event.behavior === "faceTouch")).toHaveLength(0);
  });
});
