import { countToday } from "../core/event-store.js";
import type {
  AppSettings,
  BehaviorEvent,
  BehaviorId,
  CalibrationProfile,
  DetectorSnapshot,
  EngineResult,
} from "../core/types.js";

export function required<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Required element #${id} was not found.`);
  return element as T;
}

export function formatSeconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(milliseconds % 1000 === 0 ? 0 : 1)}秒`;
}

function formatMetric(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "—";
}

export function setMirrorState(
  settings: AppSettings,
  video: HTMLVideoElement,
  overlayCanvas: HTMLCanvasElement,
): void {
  video.classList.toggle("mirrored", settings.mirrorVideo);
  overlayCanvas.classList.toggle("mirrored", settings.mirrorVideo);
}

export function renderLiveMetrics(result: EngineResult): void {
  required<HTMLElement>("mouthMetric").textContent = formatMetric(result.metrics.mouthOpenRatio);
  required<HTMLElement>("touchMetric").textContent = formatMetric(result.metrics.faceTouchScore);
  required<HTMLElement>("eyeMetric").textContent = formatMetric(result.metrics.eyeDifference);
  required<HTMLElement>("frontalMetric").textContent = formatMetric(result.metrics.frontalScore);
}

const STATE_LABELS: Record<DetectorSnapshot["state"], string> = {
  normal: "正常",
  candidate: "確認中",
  active: "通知",
  cooldown: "休止中",
};

function renderDetector(detector: DetectorSnapshot): void {
  const card = document.querySelector<HTMLElement>(`[data-detector="${detector.id}"]`);
  if (!card) return;

  card.dataset.state = detector.state;
  card.dataset.disabled = String(!detector.enabled);
  const state = card.querySelector<HTMLElement>('[data-role="state"]');
  const helper = card.querySelector<HTMLElement>('[data-role="helper"]');
  const meter = card.querySelector<HTMLElement>('[data-role="meter"]');
  const value = card.querySelector<HTMLElement>('[data-role="value"]');
  const threshold = card.querySelector<HTMLElement>('[data-role="threshold"]');

  if (state) state.textContent = detector.enabled ? STATE_LABELS[detector.state] : "OFF";
  if (helper) helper.textContent = detector.helper;
  if (meter) {
    const percentage = detector.threshold > 0 ? Math.min(100, (detector.value / detector.threshold) * 100) : 0;
    meter.style.width = `${percentage}%`;
  }
  if (value) value.textContent = formatMetric(detector.value);
  if (threshold) threshold.textContent = formatMetric(detector.threshold);
}

export function renderDetectors(result: EngineResult): void {
  renderDetector(result.detectors.mouth);
  renderDetector(result.detectors.faceTouch);
  renderDetector(result.detectors.eyeAlignment);
}

export function renderIdleDetectors(calibration?: CalibrationProfile): void {
  for (const id of ["mouth", "faceTouch", "eyeAlignment"] as BehaviorId[]) {
    const card = document.querySelector<HTMLElement>(`[data-detector="${id}"]`);
    if (!card) continue;
    card.dataset.state = "normal";
    const state = card.querySelector<HTMLElement>('[data-role="state"]');
    const helper = card.querySelector<HTMLElement>('[data-role="helper"]');
    const meter = card.querySelector<HTMLElement>('[data-role="meter"]');
    const value = card.querySelector<HTMLElement>('[data-role="value"]');
    const threshold = card.querySelector<HTMLElement>('[data-role="threshold"]');
    if (state) state.textContent = id === "eyeAlignment" && !calibration ? "要校正" : "待機";
    if (helper) helper.textContent = "監視を開始すると判定します";
    if (meter) meter.style.width = "0%";
    if (value) value.textContent = "—";
    if (threshold) threshold.textContent = "—";
  }

  required<HTMLElement>("mouthMetric").textContent = "—";
  required<HTMLElement>("touchMetric").textContent = "—";
  required<HTMLElement>("eyeMetric").textContent = "—";
  required<HTMLElement>("frontalMetric").textContent = "—";
}

export function renderHistory(events: BehaviorEvent[], now = new Date()): void {
  const counts = countToday(events, now);
  required<HTMLElement>("mouthCount").textContent = String(counts.mouth);
  required<HTMLElement>("touchCount").textContent = String(counts.faceTouch);
  required<HTMLElement>("eyeCount").textContent = String(counts.eyeAlignment);

  const list = required<HTMLDivElement>("eventList");
  list.replaceChildren();

  if (events.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "○";
    const copy = document.createElement("p");
    copy.textContent = "まだ記録はありません。通知は「失敗」ではなく、気づけた記録として残ります。";
    empty.append(icon, copy);
    list.append(empty);
    return;
  }

  for (const event of events.slice(0, 30)) {
    const item = document.createElement("article");
    item.className = "event-item";
    item.dataset.behavior = event.behavior;

    const color = document.createElement("span");
    color.className = "event-color";
    const copy = document.createElement("div");
    copy.className = "event-copy";
    const label = document.createElement("strong");
    label.textContent = event.label;
    const detail = document.createElement("span");
    detail.textContent = `${Math.round(event.confidence * 100)}%の確度で検出`;
    copy.append(label, detail);
    const time = document.createElement("time");
    time.className = "event-time";
    time.dateTime = event.occurredAt;
    time.textContent = new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(event.occurredAt));
    item.append(color, copy, time);
    list.append(item);
  }
}

export function renderCalibration(calibration?: CalibrationProfile): void {
  const summary = required<HTMLElement>("calibrationSummary");
  const dot = required<HTMLElement>("calibrationDot");
  const presence = required<HTMLElement>("calibrationPresence");
  presence.dataset.calibrated = String(Boolean(calibration));
  presence.textContent = calibration ? "本人基準あり" : "未校正";
  dot.dataset.ready = String(Boolean(calibration));

  if (!calibration) {
    summary.textContent = "未キャリブレーション";
    return;
  }

  const date = new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric" }).format(
    new Date(calibration.createdAt),
  );
  summary.textContent = `${date}・${calibration.sampleCount}フレーム`;
}

export function applySettingsToControls(
  settings: AppSettings,
  video: HTMLVideoElement,
  overlayCanvas: HTMLCanvasElement,
): void {
  const values: Array<[string, boolean]> = [
    ["mouthEnabled", settings.mouth.enabled],
    ["touchEnabled", settings.faceTouch.enabled],
    ["eyeEnabled", settings.eyeAlignment.enabled],
    ["soundEnabled", settings.soundEnabled],
    ["overlayEnabled", settings.overlayEnabled],
    ["mirrorVideo", settings.mirrorVideo],
  ];
  for (const [id, checked] of values) required<HTMLInputElement>(id).checked = checked;

  required<HTMLInputElement>("mouthSensitivity").value = String(settings.mouth.sensitivity);
  required<HTMLInputElement>("mouthHold").value = String(settings.mouth.holdMs);
  required<HTMLInputElement>("touchSensitivity").value = String(settings.faceTouch.sensitivity);
  required<HTMLInputElement>("touchHold").value = String(settings.faceTouch.holdMs);
  required<HTMLInputElement>("eyeSensitivity").value = String(settings.eyeAlignment.sensitivity);
  required<HTMLInputElement>("eyeHold").value = String(settings.eyeAlignment.holdMs);
  required<HTMLSelectElement>("processingFps").value = String(settings.processingFps);
  required<HTMLSelectElement>("delegateSelect").value = settings.delegate;

  required<HTMLOutputElement>("mouthSensitivityOutput").value = String(settings.mouth.sensitivity);
  required<HTMLOutputElement>("mouthHoldOutput").value = formatSeconds(settings.mouth.holdMs);
  required<HTMLOutputElement>("touchSensitivityOutput").value = String(settings.faceTouch.sensitivity);
  required<HTMLOutputElement>("touchHoldOutput").value = formatSeconds(settings.faceTouch.holdMs);
  required<HTMLOutputElement>("eyeSensitivityOutput").value = String(settings.eyeAlignment.sensitivity);
  required<HTMLOutputElement>("eyeHoldOutput").value = formatSeconds(settings.eyeAlignment.holdMs);
  setMirrorState(settings, video, overlayCanvas);
}
