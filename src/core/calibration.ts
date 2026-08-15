import { median } from "./math.js";
import type { BehaviorMetrics, CalibrationProfile } from "./types.js";

interface CalibrationSample {
  mouthClosedRatio: number;
  jawOpen: number;
  rightIrisPosition: number;
  leftIrisPosition: number;
  eyeDistance: number;
}

export interface CalibrationProgress {
  accepted: number;
  target: number;
  ratio: number;
  ready: boolean;
  rejectionReason: string;
}

export class CalibrationSession {
  private readonly targetSamples: number;
  private samples: CalibrationSample[] = [];

  constructor(targetSamples = 45) {
    this.targetSamples = Math.max(10, targetSamples);
  }

  reset(): void {
    this.samples = [];
  }

  add(metrics: BehaviorMetrics): CalibrationProgress {
    let rejectionReason = "";

    if (!metrics.hasFace) {
      rejectionReason = "顔をカメラ内に収めてください";
    } else if (metrics.frontalScore < 0.72) {
      rejectionReason = "カメラを正面から見てください";
    } else if (Math.min(metrics.leftEyeOpen, metrics.rightEyeOpen) < 0.13) {
      rejectionReason = "目を自然に開けてください";
    } else if (metrics.faceTouchScore > 0.35) {
      rejectionReason = "顔から手を離してください";
    } else {
      this.samples.push({
        mouthClosedRatio: metrics.mouthOpenRatio,
        jawOpen: metrics.jawOpen,
        rightIrisPosition: metrics.rightIrisPosition,
        leftIrisPosition: metrics.leftIrisPosition,
        eyeDistance: metrics.eyeDistance,
      });
    }

    const accepted = this.samples.length;
    return {
      accepted,
      target: this.targetSamples,
      ratio: Math.min(1, accepted / this.targetSamples),
      ready: accepted >= this.targetSamples,
      rejectionReason,
    };
  }

  finish(now = new Date()): CalibrationProfile {
    if (this.samples.length < this.targetSamples) {
      throw new Error("キャリブレーションに必要なサンプル数が不足しています。");
    }

    const rightIrisPosition = median(
      this.samples.map((sample) => sample.rightIrisPosition),
    );
    const leftIrisPosition = median(
      this.samples.map((sample) => sample.leftIrisPosition),
    );
    const eyeDifferenceBaseline = median(
      this.samples.map((sample) =>
        Math.abs(
          (sample.rightIrisPosition - rightIrisPosition) -
            (sample.leftIrisPosition - leftIrisPosition),
        ),
      ),
    );

    return {
      version: 1,
      createdAt: now.toISOString(),
      sampleCount: this.samples.length,
      mouthClosedRatio: median(this.samples.map((sample) => sample.mouthClosedRatio)),
      jawOpenBaseline: median(this.samples.map((sample) => sample.jawOpen)),
      rightIrisPosition,
      leftIrisPosition,
      eyeDifferenceBaseline,
      eyeDistance: median(this.samples.map((sample) => sample.eyeDistance)),
    };
  }
}
