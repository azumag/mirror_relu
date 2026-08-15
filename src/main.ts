import "./styles.css";

import { CameraController, type CameraSource } from "./camera/camera-controller.js";
import { BehaviorEngine } from "./core/behavior-engine.js";
import { CalibrationSession } from "./core/calibration.js";
import {
  appendEvents,
  clearEvents,
  exportPayload,
  loadEvents,
} from "./core/event-store.js";
import {
  DEFAULT_SETTINGS,
  clearCalibration,
  completeOnboarding,
  hasCompletedOnboarding,
  loadCalibration,
  loadSettings,
  saveCalibration,
  saveSettings,
} from "./core/settings.js";
import type {
  AppModes,
  AppSettings,
  BehaviorEvent,
  CalibrationProfile,
  EngineResult,
  VisionFrame,
} from "./core/types.js";
import { AlertManager } from "./ui/alerts.js";
import {
  applySettingsToControls,
  formatSeconds,
  renderCalibration,
  renderDetectors,
  renderHistory,
  renderIdleDetectors,
  renderLiveMetrics,
  required,
  setMirrorState,
} from "./ui/render.js";
import { clearOverlay, drawOverlay } from "./ui/overlay.js";
import { VisionClient, type VisionClientCallbacks, type VisionSource } from "./vision/vision-client.js";
import type { E2EBridge } from "./e2e/bridge.js";

const E2E_FIXTURES = import.meta.env.VITE_E2E_FIXTURES === "1";

function assetUrl(relativePath: string): string {
  return new URL(`./${relativePath.replace(/^\.\//, "")}`, window.location.href).href.replace(/\/$/, "");
}

const video = required<HTMLVideoElement>("cameraVideo");
const overlayCanvas = required<HTMLCanvasElement>("overlayCanvas");
const cameraEmptyState = required<HTMLDivElement>("cameraEmptyState");
const cameraSelect = required<HTMLSelectElement>("cameraSelect");
const monitorButton = required<HTMLButtonElement>("monitorButton");
const monitorButtonLabel = required<HTMLSpanElement>("monitorButtonLabel");
const pauseButton = required<HTMLButtonElement>("pauseButton");
const conversationModeButton = required<HTMLButtonElement>("conversationModeButton");
const modelState = required<HTMLSpanElement>("modelState");
const inferenceBadge = required<HTMLSpanElement>("inferenceBadge");
const delegateBadge = required<HTMLSpanElement>("delegateBadge");
const facePresence = required<HTMLSpanElement>("facePresence");
const conversationOverlay = required<HTMLDivElement>("conversationOverlay");
const onboarding = required<HTMLDivElement>("onboarding");
const calibrationModal = required<HTMLDivElement>("calibrationModal");
const errorBanner = required<HTMLDivElement>("errorBanner");
const errorMessage = required<HTMLSpanElement>("errorMessage");
const toast = required<HTMLDivElement>("toast");
const toastTitle = required<HTMLElement>("toastTitle");
const toastMessage = required<HTMLElement>("toastMessage");

let settings: AppSettings = loadSettings();
// Persist the validated shape so malformed or stale local settings are repaired
// before any UI interaction can write them back again.
saveSettings(settings);
let calibration: CalibrationProfile | undefined = loadCalibration();
let events = loadEvents();
let running = false;
let paused = false;
let calibrating = false;
let conversationMode = false;
let frameCounter = 0;
let lastFrameDispatchAt = 0;
let animationFrameId = 0;
let pauseTimer: number | undefined;
let pauseUntilMs: number | undefined;
let toastTimer: number | undefined;
let latestEngineResult: EngineResult | undefined;
let effectiveDelegate = settings.delegate;
let nowProvider: () => Date = () => new Date();
let camera: CameraSource;
let vision: VisionSource;
let e2eBridge: E2EBridge | undefined;

const engine = new BehaviorEngine(() => nowProvider());
const calibrationSession = new CalibrationSession(45);
const alerts = new AlertManager();
const visionCallbacks: VisionClientCallbacks = {
  onFrame: handleVisionFrame,
  onState: (message) => setModelState(message, false),
  onError: showError,
  onDelegateChanged: (delegate) => {
    effectiveDelegate = delegate;
    delegateBadge.textContent = delegate;
  },
};

async function createRuntime(): Promise<void> {
  if (!E2E_FIXTURES) {
    camera = new CameraController(video);
    vision = new VisionClient(visionCallbacks);
    return;
  }

  const { createE2ERuntime } = await import("./e2e/runtime.js");
  const runtime = createE2ERuntime(video, visionCallbacks);
  camera = runtime.camera;
  vision = runtime.vision;
  e2eBridge = runtime.bridge;
  nowProvider = () => runtime.clock.now();
  engine.setClock(nowProvider);
  e2eBridge.attachApp({
    getAppState: () => ({
      running,
      paused,
      calibrating,
      conversationMode,
      scenario: runtime.vision.getScenario(),
      modelReady: vision.isReady,
      cameraRunning: camera.isRunning,
      lastResult: latestEngineResult ?? null,
    }),
    reset: async () => {
      stopMonitoring();
      conversationMode = false;
      conversationModeButton.setAttribute("aria-pressed", "false");
      conversationOverlay.hidden = true;
      calibration = undefined;
      settings = loadSettings();
      events = loadEvents();
      renderHistory(events, nowProvider());
      renderCalibration(calibration);
      renderIdleDetectors(calibration);
      onboarding.hidden = false;
      const consent = required<HTMLInputElement>("onboardingConsent");
      const start = required<HTMLButtonElement>("onboardingStartButton");
      consent.checked = false;
      start.disabled = true;
    },
    advanceTime: async () => {
      if (pauseUntilMs !== undefined && nowProvider().getTime() >= pauseUntilMs) {
        await resumeFromPause();
      }
    },
  });

  // The native WebDriver plugin is loaded only into the E2E Tauri build. It
  // is intentionally not imported for the renderer/browser E2E session.
  if (window.location.protocol.startsWith("tauri") || window.location.hostname.endsWith("tauri.localhost")) {
    await import("@wdio/tauri-plugin");
  }
}

function currentModes(): AppModes {
  return { conversationMode, paused, calibrating };
}

function setModelState(message: string, ready: boolean): void {
  modelState.textContent = message;
  modelState.dataset.ready = String(ready);
}

function showError(message: string): void {
  errorMessage.textContent = message;
  errorBanner.hidden = false;
}

function hideError(): void {
  errorBanner.hidden = true;
  errorMessage.textContent = "";
}

function showToast(title: string, message: string): void {
  window.clearTimeout(toastTimer);
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 5_500);
}

function updateMonitorControls(): void {
  monitorButton.dataset.running = String(running);
  monitorButtonLabel.textContent = running ? "監視を停止" : "監視を開始";
  pauseButton.disabled = !running;
  pauseButton.textContent = paused ? "今すぐ再開" : "Ⅱ  10分休止";
  cameraEmptyState.hidden = running && !paused;
  cameraSelect.disabled = !running || paused;
  conversationOverlay.hidden = !conversationMode;

  if (!running) {
    facePresence.dataset.present = "false";
    facePresence.innerHTML = '<span class="stage-dot"></span>顔を待っています';
  }
}

async function ensureVisionReady(): Promise<void> {
  if (vision.isReady) return;
  const delegate = await vision.initialize({
    delegate: settings.delegate,
    wasmRoot: assetUrl("mediapipe/wasm"),
    faceModelUrl: assetUrl("mediapipe/models/face_landmarker.task"),
    handModelUrl: assetUrl("mediapipe/models/hand_landmarker.task"),
  });
  effectiveDelegate = delegate;
  delegateBadge.textContent = delegate;
  setModelState(`準備完了（${delegate}）`, true);
}

async function refreshCameraList(): Promise<void> {
  const devices = await camera.listDevices();
  const selected = settings.selectedCameraId;
  cameraSelect.replaceChildren();

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "既定のカメラ";
  cameraSelect.append(defaultOption);

  for (const device of devices) {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label;
    cameraSelect.append(option);
  }

  if (devices.some((device) => device.deviceId === selected)) {
    cameraSelect.value = selected;
  } else if (selected) {
    // A disconnected camera must not leave an unusable id in persisted state.
    settings.selectedCameraId = "";
    saveSettings(settings);
    cameraSelect.value = "";
  }
}

async function startCamera(): Promise<void> {
  await camera.start(settings.selectedCameraId);
  await refreshCameraList();
}

async function startMonitoring(): Promise<boolean> {
  if (running && !paused) return true;
  hideError();
  alerts.prime();
  monitorButton.disabled = true;
  monitorButtonLabel.textContent = "準備中…";

  try {
    await ensureVisionReady();
    await startCamera();
    running = true;
    paused = false;
    frameCounter = 0;
    lastFrameDispatchAt = 0;
    updateMonitorControls();
    scheduleLoop();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showError(message);
    camera.stop();
    running = false;
    paused = false;
    updateMonitorControls();
    return false;
  } finally {
    monitorButton.disabled = false;
    monitorButtonLabel.textContent = running ? "監視を停止" : "監視を開始";
  }
}

function stopMonitoring(): void {
  window.clearTimeout(pauseTimer);
  pauseTimer = undefined;
  pauseUntilMs = undefined;
  running = false;
  paused = false;
  calibrating = false;
  camera.stop();
  engine.reset();
  calibrationSession.reset();
  window.cancelAnimationFrame(animationFrameId);
  clearOverlay(overlayCanvas);
  latestEngineResult = undefined;
  inferenceBadge.textContent = "— ms";
  renderIdleDetectors(calibration);
  updateMonitorControls();
  calibrationModal.hidden = true;
  setModelState(vision.isReady ? `準備完了（${effectiveDelegate}）・停止中` : "停止中", vision.isReady);
}

async function pauseForTenMinutes(): Promise<void> {
  if (!running) return;
  if (paused) {
    await resumeFromPause();
    return;
  }

  paused = true;
  camera.stop();
  engine.reset();
  clearOverlay(overlayCanvas);
  updateMonitorControls();
  setModelState("10分休止中", true);
  pauseUntilMs = nowProvider().getTime() + 10 * 60 * 1000;
  pauseTimer = window.setTimeout(() => void resumeFromPause(), 10 * 60 * 1000);
}

async function resumeFromPause(): Promise<void> {
  if (!running || !paused) return;
  window.clearTimeout(pauseTimer);
  pauseTimer = undefined;
  pauseUntilMs = undefined;

  try {
    await startCamera();
    paused = false;
    updateMonitorControls();
    setModelState(`準備完了（${effectiveDelegate}）`, true);
    scheduleLoop();
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error));
    stopMonitoring();
  }
}

function scheduleLoop(): void {
  window.cancelAnimationFrame(animationFrameId);
  animationFrameId = window.requestAnimationFrame(processLoop);
}

function processLoop(timestampMs: number): void {
  if (!running || paused) return;

  const interval = 1000 / settings.processingFps;
  if (timestampMs - lastFrameDispatchAt >= interval && !vision.isBusy) {
    lastFrameDispatchAt = timestampMs;
    frameCounter += 1;
    const includeHands = frameCounter % settings.handEveryNFrames === 0;
    void vision.process(video, timestampMs, includeHands);
  }

  animationFrameId = window.requestAnimationFrame(processLoop);
}

function handleVisionFrame(frame: VisionFrame): void {
  if (!running || paused) return;

  const result = engine.update(
    frame,
    settings,
    currentModes(),
    calibrating ? undefined : calibration,
  );
  latestEngineResult = result;
  inferenceBadge.textContent = `${Math.round(frame.inferenceMs)} ms`;
  delegateBadge.textContent = frame.delegate;
  renderLiveMetrics(result);
  renderDetectors(result);
  drawOverlay(overlayCanvas, video, frame, result.metrics, settings.overlayEnabled);

  facePresence.dataset.present = String(result.metrics.hasFace);
  facePresence.innerHTML = result.metrics.hasFace
    ? '<span class="stage-dot"></span>顔を検出中'
    : '<span class="stage-dot"></span>顔を待っています';

  if (calibrating) updateCalibration(result);
  if (result.events.length > 0) handleEvents(result.events);
}

function handleEvents(incoming: BehaviorEvent[]): void {
  events = appendEvents(events, incoming);
  renderHistory(events, nowProvider());

  for (const event of incoming) {
    alerts.notify(event, settings.soundEnabled);
    showToast(event.label, event.message);
  }
}

async function beginCalibration(): Promise<void> {
  if (!running || paused) {
    const started = await startMonitoring();
    if (!started) return;
  }

  calibrating = true;
  calibrationSession.reset();
  engine.reset();
  calibrationModal.hidden = false;
  required<HTMLElement>("calibrationProgressBar").style.width = "0%";
  required<HTMLElement>("calibrationProgressText").textContent = "姿勢を確認しています";
  required<HTMLElement>("calibrationHint").textContent = "口を自然に閉じ、レンズの近くを見てください";
}

function updateCalibration(result: EngineResult): void {
  const progress = calibrationSession.add(result.metrics);
  required<HTMLElement>("calibrationProgressBar").style.width = `${progress.ratio * 100}%`;
  required<HTMLElement>("calibrationProgressText").textContent = `${progress.accepted} / ${progress.target}`;
  required<HTMLElement>("calibrationHint").textContent =
    progress.rejectionReason || "そのまま自然に呼吸してください";

  if (!progress.ready) return;
  calibrating = false;
  calibration = calibrationSession.finish();
  saveCalibration(calibration);
  engine.reset();
  calibrationModal.hidden = true;
  renderCalibration(calibration);
  renderIdleDetectors(calibration);
  showToast("キャリブレーション完了", "口と左右視線位置の本人基準を端末内に保存しました。");
}

function cancelCalibration(): void {
  calibrating = false;
  calibrationSession.reset();
  engine.reset();
  calibrationModal.hidden = true;
}

function persistSettings(): void {
  saveSettings(settings);
  setMirrorState(settings, video, overlayCanvas);
  if (latestEngineResult) renderDetectors(latestEngineResult);
}

function bindCheckbox(id: string, update: (checked: boolean) => void): void {
  required<HTMLInputElement>(id).addEventListener("change", (event) => {
    update((event.currentTarget as HTMLInputElement).checked);
    persistSettings();
  });
}

function bindRange(
  id: string,
  outputId: string,
  update: (value: number) => void,
  format: (value: number) => string = String,
): void {
  required<HTMLInputElement>(id).addEventListener("input", (event) => {
    const value = (event.currentTarget as HTMLInputElement).valueAsNumber;
    update(value);
    required<HTMLOutputElement>(outputId).value = format(value);
    persistSettings();
  });
}

function bindSettings(): void {
  bindCheckbox("mouthEnabled", (checked) => (settings.mouth.enabled = checked));
  bindCheckbox("touchEnabled", (checked) => (settings.faceTouch.enabled = checked));
  bindCheckbox("eyeEnabled", (checked) => (settings.eyeAlignment.enabled = checked));
  bindCheckbox("soundEnabled", (checked) => (settings.soundEnabled = checked));
  bindCheckbox("overlayEnabled", (checked) => {
    settings.overlayEnabled = checked;
    if (!checked) clearOverlay(overlayCanvas);
  });
  bindCheckbox("mirrorVideo", (checked) => (settings.mirrorVideo = checked));

  bindRange("mouthSensitivity", "mouthSensitivityOutput", (value) => (settings.mouth.sensitivity = value));
  bindRange("mouthHold", "mouthHoldOutput", (value) => (settings.mouth.holdMs = value), formatSeconds);
  bindRange("touchSensitivity", "touchSensitivityOutput", (value) => (settings.faceTouch.sensitivity = value));
  bindRange("touchHold", "touchHoldOutput", (value) => (settings.faceTouch.holdMs = value), formatSeconds);
  bindRange("eyeSensitivity", "eyeSensitivityOutput", (value) => (settings.eyeAlignment.sensitivity = value));
  bindRange("eyeHold", "eyeHoldOutput", (value) => (settings.eyeAlignment.holdMs = value), formatSeconds);

  required<HTMLSelectElement>("processingFps").addEventListener("change", (event) => {
    settings.processingFps = Number((event.currentTarget as HTMLSelectElement).value);
    persistSettings();
  });
  required<HTMLSelectElement>("delegateSelect").addEventListener("change", (event) => {
    settings.delegate = (event.currentTarget as HTMLSelectElement).value as AppSettings["delegate"];
    persistSettings();
    if (vision.isReady) showToast("推論方式を保存しました", "変更はアプリを再起動したときに反映されます。");
  });
}

function exportData(): void {
  const content = exportPayload(events, settings, calibration ?? null, nowProvider());
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mirror-relu-${nowProvider().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);

  if (e2eBridge) {
    e2eBridge.captureDownload(anchor.download, content, 1);
  }
}

function resetSettings(): void {
  settings = structuredClone(DEFAULT_SETTINGS);
  saveSettings(settings);
  applySettingsToControls(settings, video, overlayCanvas);
  engine.reset();
  showToast("設定を初期化しました", "感度と通知時間を標準値へ戻しました。");
}

function installEventHandlers(): void {
  monitorButton.addEventListener("click", () => {
    alerts.prime();
    if (running) stopMonitoring();
    else void startMonitoring();
  });
  required<HTMLButtonElement>("emptyStartButton").addEventListener("click", () => {
    alerts.prime();
    if (!hasCompletedOnboarding()) onboarding.hidden = false;
    else void startMonitoring();
  });
  pauseButton.addEventListener("click", () => void pauseForTenMinutes());
  conversationModeButton.addEventListener("click", () => {
    conversationMode = !conversationMode;
    conversationModeButton.setAttribute("aria-pressed", String(conversationMode));
    conversationOverlay.hidden = !conversationMode;
    engine.reset();
  });
  cameraSelect.addEventListener("change", async (event) => {
    settings.selectedCameraId = (event.currentTarget as HTMLSelectElement).value;
    persistSettings();
    if (!running || paused) return;
    try {
      await startCamera();
    } catch (error) {
      showError(error instanceof Error ? error.message : String(error));
    }
  });

  const consent = required<HTMLInputElement>("onboardingConsent");
  const onboardingStart = required<HTMLButtonElement>("onboardingStartButton");
  consent.addEventListener("change", () => {
    onboardingStart.disabled = !consent.checked;
  });
  onboardingStart.addEventListener("click", () => {
    if (!consent.checked) return;
    completeOnboarding();
    onboarding.hidden = true;
    alerts.prime();
    void startMonitoring();
  });

  required<HTMLButtonElement>("calibrateButton").addEventListener("click", () => void beginCalibration());
  required<HTMLButtonElement>("cancelCalibrationButton").addEventListener("click", cancelCalibration);
  required<HTMLButtonElement>("dismissErrorButton").addEventListener("click", hideError);
  required<HTMLButtonElement>("exportButton").addEventListener("click", exportData);
  required<HTMLButtonElement>("clearHistoryButton").addEventListener("click", () => {
    if (!window.confirm("検出履歴をすべて削除しますか？")) return;
    events = clearEvents();
    renderHistory(events, nowProvider());
  });
  required<HTMLButtonElement>("clearCalibrationButton").addEventListener("click", () => {
    if (!calibration || !window.confirm("保存した本人基準を削除しますか？")) return;
    clearCalibration();
    calibration = undefined;
    engine.reset();
    renderCalibration(calibration);
    renderIdleDetectors(calibration);
    showToast("本人基準を削除しました", "左右視線差を使うには再度キャリブレーションしてください。");
  });
  required<HTMLButtonElement>("resetSettingsButton").addEventListener("click", () => {
    if (window.confirm("検出設定を初期値へ戻しますか？")) resetSettings();
  });
}

async function initialize(): Promise<void> {
  await createRuntime();
  applySettingsToControls(settings, video, overlayCanvas);
  bindSettings();
  installEventHandlers();
  renderHistory(events, nowProvider());
  renderCalibration(calibration);
  renderIdleDetectors(calibration);
  updateMonitorControls();
  setModelState("停止中", false);
  delegateBadge.textContent = settings.delegate;

  if (E2E_FIXTURES) {
    await refreshCameraList();
  }

  onboarding.hidden = hasCompletedOnboarding();
  window.addEventListener("beforeunload", () => {
    camera.stop();
    vision.dispose();
  });
}

void initialize();
