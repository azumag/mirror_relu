import { clamp, distance, normalizeBetween } from "./math.js";
import type {
  BehaviorMetrics,
  CalibrationProfile,
  ContactPoint,
  FaceFrame,
  Point3D,
  VisionFrame,
} from "./types.js";

const FACE = {
  noseTip: 1,
  forehead: 10,
  chin: 152,
  rightCheek: 234,
  leftCheek: 454,
  rightEyeOuter: 33,
  rightEyeInner: 133,
  rightEyeTopA: 159,
  rightEyeTopB: 158,
  rightEyeBottomA: 145,
  rightEyeBottomB: 153,
  leftEyeInner: 362,
  leftEyeOuter: 263,
  leftEyeTopA: 386,
  leftEyeTopB: 385,
  leftEyeBottomA: 374,
  leftEyeBottomB: 380,
  rightIrisCenter: 468,
  leftIrisCenter: 473,
  upperInnerLip: 13,
  lowerInnerLip: 14,
} as const;

const HAND_CONTACT_LANDMARKS = [3, 4, 7, 8, 11, 12, 15, 16, 19, 20] as const;

function point(points: Point3D[], index: number): Point3D | undefined {
  return points[index];
}

function eyeAspectRatio(
  points: Point3D[],
  outer: number,
  inner: number,
  topA: number,
  topB: number,
  bottomA: number,
  bottomB: number,
): number {
  const horizontal = distance(point(points, outer), point(points, inner));
  if (horizontal <= Number.EPSILON) return 0;

  const verticalA = distance(point(points, topA), point(points, bottomA));
  const verticalB = distance(point(points, topB), point(points, bottomB));
  return clamp((verticalA + verticalB) / (2 * horizontal), 0, 1);
}

function irisPosition(points: Point3D[], iris: number, cornerA: number, cornerB: number): number {
  const irisPoint = point(points, iris);
  const first = point(points, cornerA);
  const second = point(points, cornerB);
  if (!irisPoint || !first || !second) return 0.5;
  return normalizeBetween(irisPoint.x, first.x, second.x);
}

function faceBounds(face: FaceFrame): {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
} | null {
  const forehead = point(face.landmarks, FACE.forehead);
  const chin = point(face.landmarks, FACE.chin);
  const rightCheek = point(face.landmarks, FACE.rightCheek);
  const leftCheek = point(face.landmarks, FACE.leftCheek);

  if (!forehead || !chin || !rightCheek || !leftCheek) return null;

  return {
    centerX: (rightCheek.x + leftCheek.x) / 2,
    centerY: (forehead.y + chin.y) / 2,
    width: Math.max(distance(rightCheek, leftCheek), 0.001),
    height: Math.max(distance(forehead, chin), 0.001),
  };
}

function faceTouch(
  face: FaceFrame,
  hands: Point3D[][],
  eyeDistance: number,
): { score: number; contactPoint?: ContactPoint } {
  const bounds = faceBounds(face);
  if (!bounds || hands.length === 0) return { score: 0 };

  let bestScore = 0;
  let bestPoint: ContactPoint | undefined;

  hands.forEach((hand, handIndex) => {
    HAND_CONTACT_LANDMARKS.forEach((landmarkIndex) => {
      const candidate = hand[landmarkIndex];
      if (!candidate) return;

      const ellipseDistance = Math.hypot(
        (candidate.x - bounds.centerX) / (bounds.width * 0.57),
        (candidate.y - bounds.centerY) / (bounds.height * 0.58),
      );
      const ellipseScore = clamp(1.5 - ellipseDistance);

      let nearestFaceDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < face.landmarks.length; index += 6) {
        const facePoint = face.landmarks[index];
        if (!facePoint) continue;
        nearestFaceDistance = Math.min(nearestFaceDistance, distance(candidate, facePoint));
      }
      const proximityScore = clamp(1 - nearestFaceDistance / Math.max(eyeDistance * 0.34, 0.02));
      const score = Math.max(ellipseScore, proximityScore * 0.92);

      if (score > bestScore) {
        bestScore = score;
        bestPoint = { ...candidate, handIndex, landmarkIndex };
      }
    });
  });

  return bestPoint ? { score: bestScore, contactPoint: bestPoint } : { score: bestScore };
}

export function emptyMetrics(): BehaviorMetrics {
  return {
    hasFace: false,
    mouthOpenRatio: 0,
    jawOpen: 0,
    mouthScore: 0,
    rightEyeOpen: 0,
    leftEyeOpen: 0,
    rightIrisPosition: 0.5,
    leftIrisPosition: 0.5,
    eyeDifference: 0,
    frontalScore: 0,
    faceTouchScore: 0,
    scratchMotionScore: 0,
    eyeDistance: 0,
  };
}

export function computeFrameMetrics(
  frame: VisionFrame,
  calibration?: CalibrationProfile,
): BehaviorMetrics {
  const face = frame.face;
  if (!face || face.landmarks.length < 474) return emptyMetrics();

  const landmarks = face.landmarks;
  const eyeDistance = distance(
    point(landmarks, FACE.rightEyeOuter),
    point(landmarks, FACE.leftEyeOuter),
  );
  if (eyeDistance <= Number.EPSILON) return emptyMetrics();

  const mouthDistance = distance(
    point(landmarks, FACE.upperInnerLip),
    point(landmarks, FACE.lowerInnerLip),
  );
  const mouthOpenRatio = clamp(mouthDistance / eyeDistance, 0, 1);
  const jawOpen = clamp(face.blendshapes.jawOpen ?? 0);
  const mouthScore = Math.max(mouthOpenRatio, jawOpen * 0.32);

  const rightEyeOpen = eyeAspectRatio(
    landmarks,
    FACE.rightEyeOuter,
    FACE.rightEyeInner,
    FACE.rightEyeTopA,
    FACE.rightEyeTopB,
    FACE.rightEyeBottomA,
    FACE.rightEyeBottomB,
  );
  const leftEyeOpen = eyeAspectRatio(
    landmarks,
    FACE.leftEyeOuter,
    FACE.leftEyeInner,
    FACE.leftEyeTopA,
    FACE.leftEyeTopB,
    FACE.leftEyeBottomA,
    FACE.leftEyeBottomB,
  );

  const rightIrisPosition = irisPosition(
    landmarks,
    FACE.rightIrisCenter,
    FACE.rightEyeOuter,
    FACE.rightEyeInner,
  );
  const leftIrisPosition = irisPosition(
    landmarks,
    FACE.leftIrisCenter,
    FACE.leftEyeInner,
    FACE.leftEyeOuter,
  );

  const baselineRight = calibration?.rightIrisPosition ?? 0.5;
  const baselineLeft = calibration?.leftIrisPosition ?? 0.5;
  const rightDeviation = rightIrisPosition - baselineRight;
  const leftDeviation = leftIrisPosition - baselineLeft;
  const rawDifference = Math.abs(rightDeviation - leftDeviation);
  const eyeDifference = Math.max(0, rawDifference - (calibration?.eyeDifferenceBaseline ?? 0));

  const eyeMidpointX =
    ((point(landmarks, FACE.rightEyeOuter)?.x ?? 0.5) +
      (point(landmarks, FACE.leftEyeOuter)?.x ?? 0.5)) /
    2;
  const noseX = point(landmarks, FACE.noseTip)?.x ?? eyeMidpointX;
  const normalizedNoseOffset = Math.abs(noseX - eyeMidpointX) / eyeDistance;
  const frontalScore = clamp(1 - normalizedNoseOffset / 0.34);

  const touch = faceTouch(face, frame.hands, eyeDistance);
  const base: BehaviorMetrics = {
    hasFace: true,
    mouthOpenRatio,
    jawOpen,
    mouthScore,
    rightEyeOpen,
    leftEyeOpen,
    rightIrisPosition,
    leftIrisPosition,
    eyeDifference,
    frontalScore,
    faceTouchScore: touch.score,
    scratchMotionScore: 0,
    eyeDistance,
  };

  return touch.contactPoint ? { ...base, contactPoint: touch.contactPoint } : base;
}
