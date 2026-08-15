import { $, expect } from "@wdio/globals";

export async function expectError(message: string): Promise<void> {
  await $("#errorBanner").waitForDisplayed();
  await expect($("#errorMessage")).toHaveText(expect.stringContaining(message));
}

export async function expectFaceDetected(): Promise<void> {
  await $("#facePresence").waitUntil(async () => (await $("#facePresence").getText()).includes("顔を検出中"));
}
