export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type BehaviorId = "mouth" | "faceTouch" | "eyeAlignment";
export type DetectorState = "normal" | "candidate" | "active" | "cooldown";
export type DelegatePreference = "GPU" | "CPU";

export interface FaceFrame {
  landmarks: Point3D[];
  blendshapes: Record<string, number>;
}

export interface VisionFrame {
  timestampMs: number;
  face?: FaceFrame;
  hands: Point3D[][];
  inferenceMs: number;
  delegate: DelegatePreference;
}

export interface ContactPoint extends Point3D {
  handIndex: number;
  landmarkIndex: number;
}

export interface BehaviorMetrics {
  hasFace: boolean;
  mouthOpenRatio: number;
  jawOpen: number;
  mouthScore: number;
  rightEyeOpen: number;
  leftEyeOpen: number;
  rightIrisPosition: number;
  leftIrisPosition: number;
  eyeDifference: number;
  frontalScore: number;
  faceTouchScore: number;
  scratchMotionScore: number;
  eyeDistance: number;
  contactPoint?: ContactPoint;
}

export interface CalibrationProfile {
  version: 1;
  createdAt: string;
  sampleCount: number;
  mouthClosedRatio: number;
  jawOpenBaseline: number;
  rightIrisPosition: number;
  leftIrisPosition: number;
  eyeDifferenceBaseline: number;
  eyeDistance: number;
}

export interface DetectorSetting {
  enabled: boolean;
  sensitivity: number;
  holdMs: number;
  cooldownMs: number;
}

export interface AppSettings {
  version: 1;
  mouth: DetectorSetting;
  faceTouch: DetectorSetting;
  eyeAlignment: DetectorSetting;
  processingFps: number;
  handEveryNFrames: number;
  delegate: DelegatePreference;
  soundEnabled: boolean;
  overlayEnabled: boolean;
  mirrorVideo: boolean;
  selectedCameraId: string;
}

export interface AppModes {
  conversationMode: boolean;
  paused: boolean;
  calibrating: boolean;
}

export interface TemporalGateSnapshot {
  state: DetectorState;
  value: number;
  enterThreshold: number;
  activeDurationMs: number;
  shouldAlert: boolean;
  changed: boolean;
}

export interface DetectorSnapshot {
  id: BehaviorId;
  label: string;
  state: DetectorState;
  value: number;
  threshold: number;
  confidence: number;
  activeDurationMs: number;
  enabled: boolean;
  eligible: boolean;
  helper: string;
}

export interface BehaviorEvent {
  id: string;
  behavior: BehaviorId;
  occurredAt: string;
  confidence: number;
  durationMs: number;
  label: string;
  message: string;
  metrics: {
    mouthOpenRatio: number;
    faceTouchScore: number;
    scratchMotionScore: number;
    eyeDifference: number;
    frontalScore: number;
  };
}

export interface EngineResult {
  metrics: BehaviorMetrics;
  detectors: Record<BehaviorId, DetectorSnapshot>;
  events: BehaviorEvent[];
}
