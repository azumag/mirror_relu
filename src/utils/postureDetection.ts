import { NormalizedLandmark } from '@mediapipe/tasks-vision'

export interface PostureResult {
  isSlouchingDetected: boolean
  isScreenTooClose: boolean
  isMouthOpen: boolean
  isStrabismusDetected: boolean
  neckAngle: number
  faceDistance: number
  mouthOpenness: number
  eyeAlignment: number
}

// 2点間の距離を計算
const calculateDistance = (p1: NormalizedLandmark, p2: NormalizedLandmark): number => {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  const dz = (p1.z || 0) - (p2.z || 0)
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// 3点から角度を計算（度数法）
const calculateAngle = (
  p1: NormalizedLandmark,
  p2: NormalizedLandmark,
  p3: NormalizedLandmark
): number => {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }

  const dot = v1.x * v2.x + v1.y * v2.y
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)

  const cosAngle = dot / (mag1 * mag2)
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI)
}

// 複数点の中心を計算
const calculateCenter = (points: NormalizedLandmark[]): NormalizedLandmark => {
  const sum = points.reduce(
    (acc, p) => ({
      x: acc.x + p.x,
      y: acc.y + p.y,
      z: acc.z + (p.z || 0),
      visibility: acc.visibility + (p.visibility || 0)
    }),
    { x: 0, y: 0, z: 0, visibility: 0 }
  )

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
    z: sum.z / points.length,
    visibility: sum.visibility / points.length
  }
}

export const analyzePosture = (
  landmarks: NormalizedLandmark[],
  calibrationDistance: number | null = null
): PostureResult => {
  // MediaPipe Face Meshの主要なランドマークインデックス
  // 参考: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png

  const noseTip = landmarks[1]          // 鼻先
  const foreheadTop = landmarks[10]     // 額の上部
  const chin = landmarks[152]            // 顎
  const leftEye = landmarks[33]          // 左目内側
  const rightEye = landmarks[263]        // 右目内側
  const upperLip = landmarks[13]         // 上唇中央
  const lowerLip = landmarks[14]         // 下唇中央

  // 1. 画面距離の検出（両目の距離で推定）
  const eyeDistance = calculateDistance(leftEye, rightEye)
  const baselineDistance = calibrationDistance || 0.15 // デフォルト値
  const distanceRatio = eyeDistance / baselineDistance
  const isScreenTooClose = distanceRatio > 1.2 // 20%以上近い

  // 2. 猫背・前傾姿勢の検出（額-鼻-顎の角度で推定）
  const neckAngle = calculateAngle(foreheadTop, noseTip, chin)
  // 正常な姿勢では角度が大きい（170度程度）
  // 前傾すると角度が小さくなる（150度以下）
  const isSlouchingDetected = neckAngle < 155

  // 3. 口の開きの検出
  const mouthOpenness = calculateDistance(upperLip, lowerLip)
  const isMouthOpen = mouthOpenness > 0.02 // 閾値は調整が必要

  // 4. 斜視の検出
  // MediaPipe Face Meshの虹彩ランドマークを使用
  // 左目の虹彩: 468-472 (5点)
  // 右目の虹彩: 473-477 (5点)
  const leftIrisLandmarks = [468, 469, 470, 471, 472].map(i => landmarks[i])
  const rightIrisLandmarks = [473, 474, 475, 476, 477].map(i => landmarks[i])

  // 虹彩の中心を計算
  const leftIrisCenter = calculateCenter(leftIrisLandmarks)
  const rightIrisCenter = calculateCenter(rightIrisLandmarks)

  // 目のランドマーク（内側と外側）
  const leftEyeInner = landmarks[133]   // 左目の内側（目頭）
  const leftEyeOuter = landmarks[33]    // 左目の外側（目尻）
  const rightEyeInner = landmarks[362]  // 右目の内側（目頭）
  const rightEyeOuter = landmarks[263]  // 右目の外側（目尻）

  // 各目の中心（目頭と目尻の中点）
  const leftEyeCenter: NormalizedLandmark = {
    x: (leftEyeInner.x + leftEyeOuter.x) / 2,
    y: (leftEyeInner.y + leftEyeOuter.y) / 2,
    z: ((leftEyeInner.z || 0) + (leftEyeOuter.z || 0)) / 2,
    visibility: ((leftEyeInner.visibility || 0) + (leftEyeOuter.visibility || 0)) / 2
  }
  const rightEyeCenter: NormalizedLandmark = {
    x: (rightEyeInner.x + rightEyeOuter.x) / 2,
    y: (rightEyeInner.y + rightEyeOuter.y) / 2,
    z: ((rightEyeInner.z || 0) + (rightEyeOuter.z || 0)) / 2,
    visibility: ((rightEyeInner.visibility || 0) + (rightEyeOuter.visibility || 0)) / 2
  }

  // 虹彩が目の中心からどれくらいずれているかを計算（正規化）
  const leftEyeWidth = calculateDistance(leftEyeInner, leftEyeOuter)
  const rightEyeWidth = calculateDistance(rightEyeInner, rightEyeOuter)

  // 水平方向のずれを計算
  const leftIrisOffset = (leftIrisCenter.x - leftEyeCenter.x) / leftEyeWidth
  const rightIrisOffset = (rightIrisCenter.x - rightEyeCenter.x) / rightEyeWidth

  // 両目のずれの差を計算（0に近いほど正常、大きいほど斜視の可能性）
  const eyeAlignment = Math.abs(leftIrisOffset - rightIrisOffset)

  // 閾値を超えたら斜視の可能性
  // 正常な場合、両目の虹彩は同じように動くはず
  // 0.15以上の差があれば斜視の可能性
  const isStrabismusDetected = eyeAlignment > 0.15

  return {
    isSlouchingDetected,
    isScreenTooClose,
    isMouthOpen,
    isStrabismusDetected,
    neckAngle,
    faceDistance: eyeDistance,
    mouthOpenness,
    eyeAlignment
  }
}
