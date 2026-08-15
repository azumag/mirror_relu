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

function mergeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return structuredClone(DEFAULT_SETTINGS);
  const candidate = value as Partial<AppSettings>;

  return {
    ...DEFAULT_SETTINGS,
    ...candidate,
    version: 1,
    mouth: { ...DEFAULT_SETTINGS.mouth, ...(candidate.mouth ?? {}) },
    faceTouch: { ...DEFAULT_SETTINGS.faceTouch, ...(candidate.faceTouch ?? {}) },
    eyeAlignment: { ...DEFAULT_SETTINGS.eyeAlignment, ...(candidate.eyeAlignment ?? {}) },
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
    const profile = JSON.parse(raw) as CalibrationProfile;
    return profile.version === 1 ? profile : undefined;
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
