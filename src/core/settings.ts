import type { AppSettings, CalibrationProfile } from "./types.js";

const SETTINGS_KEY = "mirror-relu:settings:v1";
const CALIBRATION_KEY = "mirror-relu:calibration:v1";
const ONBOARDING_KEY = "mirror-relu:onboarding:v1";

export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  mouth: {
    enabled: true,
    sensitivity: 58,
    holdMs: 1_150,
    cooldownMs: 12_000,
  },
  faceTouch: {
    enabled: true,
    sensitivity: 55,
    holdMs: 520,
    cooldownMs: 8_000,
  },
  eyeAlignment: {
    enabled: true,
    sensitivity: 42,
    holdMs: 2_200,
    cooldownMs: 30_000,
  },
  processingFps: 10,
  handEveryNFrames: 2,
  delegate: "GPU",
  soundEnabled: true,
  overlayEnabled: true,
  mirrorVideo: true,
  selectedCameraId: "",
};

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

function numberInRange(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

const PROCESSING_FPS_OPTIONS = [6, 8, 10, 12, 15] as const;

function processingFpsOrDefault(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && PROCESSING_FPS_OPTIONS.includes(value as (typeof PROCESSING_FPS_OPTIONS)[number])
    ? value
    : DEFAULT_SETTINGS.processingFps;
}

function detectorSetting(
  value: unknown,
  defaults: AppSettings["mouth"],
): AppSettings["mouth"] {
  const candidate = value && typeof value === "object" ? (value as Partial<AppSettings["mouth"]>) : {};
  return {
    enabled: booleanOr(candidate.enabled, defaults.enabled),
    sensitivity: numberInRange(candidate.sensitivity, defaults.sensitivity, 0, 100),
    holdMs: numberInRange(candidate.holdMs, defaults.holdMs, 100, 10_000),
    cooldownMs: numberInRange(candidate.cooldownMs, defaults.cooldownMs, 0, 300_000),
  };
}

function mergeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return structuredClone(DEFAULT_SETTINGS);
  const candidate = value as Partial<AppSettings>;

  return {
    version: 1,
    mouth: detectorSetting(candidate.mouth, DEFAULT_SETTINGS.mouth),
    faceTouch: detectorSetting(candidate.faceTouch, DEFAULT_SETTINGS.faceTouch),
    eyeAlignment: detectorSetting(candidate.eyeAlignment, DEFAULT_SETTINGS.eyeAlignment),
    processingFps: processingFpsOrDefault(candidate.processingFps),
    handEveryNFrames: Math.round(
      numberInRange(candidate.handEveryNFrames, DEFAULT_SETTINGS.handEveryNFrames, 1, 30),
    ),
    delegate: candidate.delegate === "CPU" || candidate.delegate === "GPU" ? candidate.delegate : DEFAULT_SETTINGS.delegate,
    soundEnabled: booleanOr(candidate.soundEnabled, DEFAULT_SETTINGS.soundEnabled),
    overlayEnabled: booleanOr(candidate.overlayEnabled, DEFAULT_SETTINGS.overlayEnabled),
    mirrorVideo: booleanOr(candidate.mirrorVideo, DEFAULT_SETTINGS.mirrorVideo),
    selectedCameraId:
      typeof candidate.selectedCameraId === "string" ? candidate.selectedCameraId.slice(0, 256) : DEFAULT_SETTINGS.selectedCameraId,
  };
}

export function loadSettings(): AppSettings {
  if (!storageAvailable()) return structuredClone(DEFAULT_SETTINGS);
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? mergeSettings(JSON.parse(raw)) : structuredClone(DEFAULT_SETTINGS);
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings: AppSettings): void {
  if (!storageAvailable()) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadCalibration(): CalibrationProfile | undefined {
  if (!storageAvailable()) return undefined;
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY);
    if (!raw) return undefined;
    const profile = JSON.parse(raw) as Partial<CalibrationProfile>;
    if (profile.version !== 1 || typeof profile.createdAt !== "string") return undefined;
    const numericFields: Array<keyof Pick<CalibrationProfile, "sampleCount" | "mouthClosedRatio" | "jawOpenBaseline" | "rightIrisPosition" | "leftIrisPosition" | "eyeDifferenceBaseline" | "eyeDistance">> = [
      "sampleCount",
      "mouthClosedRatio",
      "jawOpenBaseline",
      "rightIrisPosition",
      "leftIrisPosition",
      "eyeDifferenceBaseline",
      "eyeDistance",
    ];
    if (numericFields.some((field) => typeof profile[field] !== "number" || !Number.isFinite(profile[field]))) {
      return undefined;
    }
    return profile as CalibrationProfile;
  } catch {
    return undefined;
  }
}

export function saveCalibration(profile: CalibrationProfile): void {
  if (!storageAvailable()) return;
  localStorage.setItem(CALIBRATION_KEY, JSON.stringify(profile));
}

export function clearCalibration(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(CALIBRATION_KEY);
}

export function hasCompletedOnboarding(): boolean {
  return storageAvailable() && localStorage.getItem(ONBOARDING_KEY) === "done";
}

export function completeOnboarding(): void {
  if (!storageAvailable()) return;
  localStorage.setItem(ONBOARDING_KEY, "done");
}
