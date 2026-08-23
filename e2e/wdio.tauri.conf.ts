import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { browser } from "@wdio/globals";

const artifacts = "artifacts/e2e/tauri";
mkdirSync(artifacts, { recursive: true });
const binaryName = process.platform === "win32" ? "mirror-relu.exe" : "mirror-relu";
const appBinaryPath = resolve(process.env.MIRROR_RELU_TAURI_BINARY ?? `src-tauri/target/release/${binaryName}`);

export const config = {
  runner: "local",
  specs: ["./specs/native-smoke.e2e.ts"],
  maxInstances: 1,
  framework: "mocha",
  reporters: ["spec"],
  logLevel: process.env.WDIO_LOG_LEVEL ?? "warn",
  waitforTimeout: 15_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,
  services: [
    ["@wdio/tauri-service", {
      appBinaryPath,
      driverProvider: "embedded",
      captureFrontendLogs: true,
      captureBackendLogs: true,
      frontendLogLevel: "warn",
      startTimeout: 120_000,
      commandTimeout: 60_000,
    }],
  ],
  capabilities: [
    {
      browserName: "tauri",
      "tauri:options": { application: appBinaryPath },
      "wdio:tauriServiceOptions": { driverProvider: "embedded" },
    },
  ],
  mochaOpts: {
    timeout: 90_000,
    fullStackTrace: true,
  },
  afterTest: async (_test: unknown, _context: unknown, result: { passed: boolean }) => {
    if (!result.passed) {
      await browser.saveScreenshot(`${artifacts}/failure-${Date.now()}.png`);
    }
  },
};
