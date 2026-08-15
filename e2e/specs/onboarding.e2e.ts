import { $, browser, expect } from "@wdio/globals";
import { beforeEach, describe, it } from "mocha";

import { completeOnboarding, resetApp } from "../support/app.js";

describe("初回起動とオンボーディング", () => {
  beforeEach(async () => resetApp());

  it("同意前は開始ボタンが無効で、同意後に監視画面へ進める", async () => {
    await expect($("#onboarding")).toBeDisplayed();
    await expect($("#onboardingStartButton")).toBeDisabled();

    await $("#onboardingConsent").click();
    await expect($("#onboardingStartButton")).toBeEnabled();
    await $("#onboardingStartButton").click();
    await expect($("#onboarding")).not.toBeDisplayed();
    await expect($("#monitorButtonLabel")).toHaveText("監視を停止");
  });

  it("同意状態はページ再起動後も保持される", async () => {
    await completeOnboarding();
    await browser.refresh();
    await expect($("#onboarding")).not.toBeDisplayed();
    await expect($("#monitorButtonLabel")).toHaveText("監視を開始");
  });

  it("テストリセットで再び初回状態へ戻る", async () => {
    await completeOnboarding();
    await resetApp();
    await expect($("#onboarding")).toBeDisplayed();
    await expect($("#onboardingConsent")).not.toBeSelected();
  });
});
