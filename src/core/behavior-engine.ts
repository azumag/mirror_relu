import { confidenceAbove, lerp } from "./math.js";
import { computeFrameMetrics } from "./metrics.js";
import { TemporalGate } from "./temporal-gate.js";
import type {
  AppModes,
  AppSettings,
  BehaviorEvent,
  BehaviorId,
  BehaviorMetrics,
  CalibrationProfile,
  DetectorSnapshot,
  EngineResult,
  TemporalGateSnapshot,
  VisionFrame,
} from "./types.js";

interface ContactSample {
  timestampMs: number;
  x: number;
  y: number;
  eyeDistance: number;
}

interface Thresholds {
  mouth: number;
  faceTouch: number;
  eyeAlignment: number;
}

const LABELS: Record<BehaviorId, string> = {
  mouth: "口の開き",
  faceTouch: "顔への手接触",
  eyeAlignment: "左右視線差",
};

function eventId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && "randomUUID" in cryptoApi) return cryptoApi.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function thresholdsFor(settings: AppSettings, profile?: CalibrationProfile): Thresholds {
  const mouthSensitivity = settings.mouth.sensitivity / 100;
  const touchSensitivity = settings.faceTouch.sensitivity / 100;
  const eyeSensitivity = settings.eyeAlignment.sensitivity / 100;

  const mouthBaseline = profile?.mouthClosedRatio ?? 0.035;
  const mouthDelta = lerp(0.115, 0.038, mouthSensitivity);

  return {
    mouth: Math.max(0.072, mouthBaseline + mouthDelta),
    faceTouch: lerp(0.78, 0.42, touchSensitivity),
    eyeAlignment: lerp(0.19, 0.07, eyeSensitivity),
  };
}

function detectorHelper(
  behavior: BehaviorId,
  snapshot: TemporalGateSnapshot,
  eligible: boolean,
  metrics: BehaviorMetrics,
  profile?: CalibrationProfile,
): string {
  if (behavior === "eyeAlignment" && !profile) {
    return "利用には正面注視のキャリブレーションが必要です";
  }
  if (!eligible) {
    if (!metrics.hasFace) return "顔を検出していません";
    if (behavior === "eyeAlignment") return "正面を向き、両目が見えるときだけ測定します";
    return "現在は判定対象外です";
  }

  if (snapshot.state === "candidate") return "継続するか確認しています";
  if (snapshot.state === "active") {
    if (behavior === "mouth") return "口が開いた状態が続いています";
    if (behavior === "faceTouch") {
      return metrics.scratchMotionScore >= 0.55
        ? "顔の近くでこする動きが続いています"
        : "手が顔に触れている可能性があります";
    }
    return "普段の正面注視時より左右の視線差が大きい状態です";
  }
  if (snapshot.state === "cooldown") return "通知後のクールダウン中です";

  if (behavior === "mouth") return "口は自然な状態です";
  if (behavior === "faceTouch") return "顔への接触は見つかっていません";
  return "個人基準の範囲内です（試験機能）";
}

function makeDetectorSnapshot(
  id: BehaviorId,
  snapshot: TemporalGateSnapshot,
  enabled: boolean,
  eligible: boolean,
  metrics: BehaviorMetrics,
  profile?: CalibrationProfile,
): DetectorSnapshot {
  const spread = id === "faceTouch" ? 0.2 : id === "mouth" ? 0.05 : 0.08;
  return {
    id,
    label: LABELS[id],
    state: snapshot.state,
    value: snapshot.value,
    threshold: snapshot.enterThreshold,
    confidence: confidenceAbove(snapshot.value, snapshot.enterThreshold, spread),
    activeDurationMs: snapshot.activeDurationMs,
    enabled,
    eligible,
    helper: detectorHelper(id, snapshot, eligible, metrics, profile),
  };
}

export class BehaviorEngine {
  private readonly mouthGate = new TemporalGate();
  private readonly touchGate = new TemporalGate();
  private readonly eyeGate = new TemporalGate();
  private contactHistory: ContactSample[] = [];
  private now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  setClock(now: () => Date): void {
    this.now = now;
  }

  reset(): void {
    this.mouthGate.reset();
    this.touchGate.reset();
    this.eyeGate.reset();
    this.contactHistory = [];
  }

  update(
    frame: VisionFrame,
    settings: AppSettings,
    modes: AppModes,
    profile?: CalibrationProfile,
  ): EngineResult {
    let metrics = computeFrameMetrics(frame, profile);
    const thresholds = thresholdsFor(settings, profile);

    const scratchMotionScore = this.updateScratchMotion(metrics, frame.timestampMs);
    metrics = { ...metrics, scratchMotionScore };

    this.mouthGate.configure({
      enterThreshold: thresholds.mouth,
      exitThreshold: thresholds.mouth * 0.73,
      holdMs: settings.mouth.holdMs,
      releaseMs: 260,
      cooldownMs: settings.mouth.cooldownMs,
    });
    this.touchGate.configure({
      enterThreshold: thresholds.faceTouch,
      exitThreshold: thresholds.faceTouch * 0.72,
      holdMs: settings.faceTouch.holdMs,
      releaseMs: 300,
      cooldownMs: settings.faceTouch.cooldownMs,
    });
    this.eyeGate.configure({
      enterThreshold: thresholds.eyeAlignment,
      exitThreshold: thresholds.eyeAlignment * 0.68,
      holdMs: settings.eyeAlignment.holdMs,
      releaseMs: 550,
      cooldownMs: settings.eyeAlignment.cooldownMs,
    });

    const baseEligible = metrics.hasFace && !modes.paused && !modes.calibrating;
    const mouthEligible = baseEligible && settings.mouth.enabled && !modes.conversationMode;
    const touchEligible = baseEligible && settings.faceTouch.enabled && frame.hands.length > 0;
    const eyeEligible =
      baseEligible &&
      settings.eyeAlignment.enabled &&
      Boolean(profile) &&
      metrics.frontalScore >= 0.72 &&
      Math.min(metrics.leftEyeOpen, metrics.rightEyeOpen) >= 0.13;

    const mouth = this.mouthGate.update(metrics.mouthScore, frame.timestampMs, mouthEligible);
    const touchValue = Math.max(metrics.faceTouchScore, metrics.scratchMotionScore * 0.9);
    const touch = this.touchGate.update(touchValue, frame.timestampMs, touchEligible);
    const eye = this.eyeGate.update(metrics.eyeDifference, frame.timestampMs, eyeEligible);

    const detectors: Record<BehaviorId, DetectorSnapshot> = {
      mouth: makeDetectorSnapshot(
        "mouth",
        mouth,
        settings.mouth.enabled,
        mouthEligible,
        metrics,
        profile,
      ),
      faceTouch: makeDetectorSnapshot(
        "faceTouch",
        touch,
        settings.faceTouch.enabled,
        touchEligible,
        metrics,
        profile,
      ),
      eyeAlignment: makeDetectorSnapshot(
        "eyeAlignment",
        eye,
        settings.eyeAlignment.enabled,
        eyeEligible,
        metrics,
        profile,
      ),
    };

    const events: BehaviorEvent[] = [];
    if (mouth.shouldAlert) events.push(this.createEvent("mouth", detectors.mouth, metrics));
    if (touch.shouldAlert) events.push(this.createEvent("faceTouch", detectors.faceTouch, metrics));
    if (eye.shouldAlert) events.push(this.createEvent("eyeAlignment", detectors.eyeAlignment, metrics));

    return { metrics, detectors, events };
  }

  private updateScratchMotion(metrics: BehaviorMetrics, timestampMs: number): number {
    const contact = metrics.contactPoint;
    if (!contact || metrics.faceTouchScore < 0.28 || metrics.eyeDistance <= 0) {
      this.contactHistory = this.contactHistory.filter(
        (sample) => timestampMs - sample.timestampMs <= 300,
      );
      return 0;
    }

    this.contactHistory.push({
      timestampMs,
      x: contact.x,
      y: contact.y,
      eyeDistance: metrics.eyeDistance,
    });
    this.contactHistory = this.contactHistory.filter(
      (sample) => timestampMs - sample.timestampMs <= 1_250,
    );

    if (this.contactHistory.length < 4) return 0;

    let pathLength = 0;
    let directionChanges = 0;
    let previousVector: { x: number; y: number } | undefined;

    for (let index = 1; index < this.contactHistory.length; index += 1) {
      const previous = this.contactHistory[index - 1];
      const current = this.contactHistory[index];
      if (!previous || !current) continue;

      const vector = { x: current.x - previous.x, y: current.y - previous.y };
      pathLength += Math.hypot(vector.x, vector.y) / Math.max(current.eyeDistance, 0.001);

      if (previousVector) {
        const previousMagnitude = Math.hypot(previousVector.x, previousVector.y);
        const currentMagnitude = Math.hypot(vector.x, vector.y);
        if (previousMagnitude > 0.002 && currentMagnitude > 0.002) {
          const cosine =
            (previousVector.x * vector.x + previousVector.y * vector.y) /
            (previousMagnitude * currentMagnitude);
          if (cosine < -0.15) directionChanges += 1;
        }
      }
      previousVector = vector;
    }

    const movementComponent = Math.min(1, pathLength / 0.42);
    const reversalComponent = Math.min(1, directionChanges / 3);
    return movementComponent * 0.68 + reversalComponent * 0.32;
  }

  private createEvent(
    behavior: BehaviorId,
    detector: DetectorSnapshot,
    metrics: BehaviorMetrics,
  ): BehaviorEvent {
    const messages: Record<BehaviorId, string> = {
      mouth: "口が開いた状態が続いています。いったん力を抜いて閉じてみましょう。",
      faceTouch:
        metrics.scratchMotionScore >= 0.55
          ? "顔の近くでこする動きを検出しました。手を下ろして一呼吸置きましょう。"
          : "顔への手接触を検出しました。手を下ろしてみましょう。",
      eyeAlignment:
        "正面注視時の左右視線差が個人基準から外れました。これは診断ではなく、繰り返す場合は眼科で相談してください。",
    };

    return {
      id: eventId(),
      behavior,
      occurredAt: this.now().toISOString(),
      confidence: detector.confidence,
      durationMs: detector.activeDurationMs,
      label: detector.label,
      message: messages[behavior],
      metrics: {
        mouthOpenRatio: metrics.mouthOpenRatio,
        faceTouchScore: metrics.faceTouchScore,
        scratchMotionScore: metrics.scratchMotionScore,
        eyeDifference: metrics.eyeDifference,
        frontalScore: metrics.frontalScore,
      },
    };
  }
}

export { thresholdsFor };
