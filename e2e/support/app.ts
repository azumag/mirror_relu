import { $, browser } from "@wdio/globals";

import type { AppSettings, BehaviorEvent, CalibrationProfile, VisionFrame } from "../../src/core/types.js";
import type { E2EScenario, MirrorReluE2EBridge } from "../../src/e2e/bridge.js";

type BridgeMethod = keyof MirrorReluE2EBridge;

export async function bridgeCall<T>(method: BridgeMethod, ...args: unknown[]): Promise<T> {
  return browser.execute(
    async (name: BridgeMethod, parameters: unknown[]) => {
      const bridge = (window as unknown as { __MIRROR_RELU_E2E__?: MirrorReluE2EBridge }).__MIRROR_RELU_E2E__;
      if (!bridge) throw new Error("E2E bridge is not available; this test must use an E2E fixture build.");
      const fn = (bridge[name] as (...values: unknown[]) => Promise<unknown>).bind(bridge);
      return fn(...parameters);
    },
    method,
    args,
  ) as Promise<T>;
}

export async function resetApp(): Promise<void> {
  await browser.waitUntil(async () => Boolean(await browser.execute(() => Boolean((window as unknown as { __MIRROR_RELU_E2E__?: unknown }).__MIRROR_RELU_E2E__))));
  await bridgeCall<void>("reset");
  await browser.refresh();
  await $("body").waitForDisplayed();
}

export async function completeOnboarding(): Promise<void> {
  const onboarding = $("#onboarding");
  if (!(await onboarding.isDisplayed())) return;
  await $("#onboardingConsent").click();
  await $("#onboardingStartButton").waitForEnabled();
  await $("#onboardingStartButton").click();
  await $("#monitorButtonLabel").waitUntil(async () => (await $("#monitorButtonLabel").getText()) === "監視を停止");
}

export async function startApp(): Promise<void> {
  await completeOnboarding();
  const label = await $("#monitorButtonLabel").getText();
  if (label !== "監視を停止") {
    await $("#monitorButton").click();
    await $("#monitorButtonLabel").waitUntil(async () => (await $("#monitorButtonLabel").getText()) === "監視を停止");
  }
}

export async function clickSwitch(id: string): Promise<void> {
  await $(`#${id}`).parentElement().click();
}

export async function setRange(id: string, value: number): Promise<void> {
  await browser.execute(
    (inputId: string, nextValue: number) => {
      const input = document.getElementById(inputId);
      if (!(input instanceof HTMLInputElement)) throw new Error(`range not found: ${inputId}`);
      input.value = String(nextValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    id,
    value,
  );
}

export async function setScenario(scenario: E2EScenario): Promise<void> {
  await bridgeCall<void>("setScenario", scenario);
}

export async function emitFrames(count: number, intervalMs = 100): Promise<VisionFrame | undefined> {
  return bridgeCall<VisionFrame | undefined>("emitFrames", count, intervalMs);
}

export async function storedEvents(): Promise<BehaviorEvent[]> {
  return bridgeCall<BehaviorEvent[]>("getStoredEvents");
}

export async function storedSettings(): Promise<AppSettings | null> {
  return bridgeCall<AppSettings | null>("getStoredSettings");
}

export async function storedCalibration(): Promise<CalibrationProfile | null> {
  return bridgeCall<CalibrationProfile | null>("getStoredCalibration");
}
