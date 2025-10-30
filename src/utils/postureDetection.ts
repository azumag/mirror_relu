import { NormalizedLandmark } from '@mediapipe/tasks-vision'

export interface PostureResult {
  isSlouchingDetected: boolean
  isScreenTooClose: boolean
  isMouthOpen: boolean
  neckAngle: number
  faceDistance: number
  mouthOpenness: number
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

  return {
    isSlouchingDetected,
    isScreenTooClose,
    isMouthOpen,
    neckAngle,
    faceDistance: eyeDistance,
    mouthOpenness
  }
}
