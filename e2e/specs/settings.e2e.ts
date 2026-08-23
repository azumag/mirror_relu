import { $, browser, expect, $$ } from "@wdio/globals";
import { beforeEach, describe, it } from "mocha";

import { clickSwitch, resetApp, setRange, startApp, storedSettings } from "../support/app.js";

describe("設定とカメラ切り替え", () => {
  beforeEach(async () => resetApp());

  it("検出ON/OFF、感度、通知時間、推論頻度、表示設定を保存する", async () => {
    await startApp();
    await clickSwitch("mouthEnabled");
    await setRange("mouthSensitivity", 80);
    await setRange("mouthHold", 1500);
    await $("#processingFps").selectByAttribute("value", "15");
    await $("#delegateSelect").selectByAttribute("value", "CPU");
    await clickSwitch("mirrorVideo");
    const settings = await storedSettings();
    expect(settings?.mouth.enabled).toBe(false);
    expect(settings?.mouth.sensitivity).toBe(80);
    expect(settings?.mouth.holdMs).toBe(1500);
    expect(settings?.processingFps).toBe(15);
    expect(settings?.delegate).toBe("CPU");
    expect(settings?.mirrorVideo).toBe(false);
  });

  it("範囲外や不足した設定値は安全な標準値へ戻る", async () => {
    await browser.execute(() => {
      localStorage.setItem(
        "mirror-relu:settings:v1",
        JSON.stringify({ mouth: { sensitivity: 9999 }, processingFps: -4 }),
      );
    });
    await browser.refresh();
    await expect($("#mouthSensitivity")).toHaveValue("100");
    await expect($("#processingFps")).toHaveValue("10");
    expect((await storedSettings())?.faceTouch.enabled).toBe(true);
  });

  it("2台の合成カメラを表示し、選択状態を保持する", async () => {
    await startApp();
    const cameraSelect = $("#cameraSelect");
    expect(await $$("#cameraSelect option")).toHaveLength(3);
    await cameraSelect.selectByAttribute("value", "e2e-camera-usb");
    expect((await storedSettings())?.selectedCameraId).toBe("e2e-camera-usb");
    await browser.refresh();
    await expect(cameraSelect).toBeDisplayed();
    await expect($("#cameraSelect")).toHaveValue("e2e-camera-usb");
  });
});
