import {
  PoseLandmarker,
  FilesetResolver,
  PoseLandmarkerResult
} from '@mediapipe/tasks-vision'
import { PostureStatus, DetectionResult, MonitorSettings } from './types'

// MediaPipe Pose Landmarkerのインデックス
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24
}

export class PoseDetector {
  private poseLandmarker: PoseLandmarker | null = null
  private lastResult: PoseLandmarkerResult | null = null
  private _baselinePosture: PostureStatus | null = null

  async initialize(): Promise<void> {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )

    this.poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numPoses: 1
    })
  }

  detect(video: HTMLVideoElement, timestamp: number): PoseLandmarkerResult | null {
    if (!this.poseLandmarker) return null

    this.lastResult = this.poseLandmarker.detectForVideo(video, timestamp)
    return this.lastResult
  }

  analyzePosture(result: PoseLandmarkerResult | null): PostureStatus {
    const defaultStatus: PostureStatus = {
      shoulderTilt: 0,
      headForward: 0,
      isHunched: false
    }

    if (!result || result.landmarks.length === 0) {
      return defaultStatus
    }

    const landmarks = result.landmarks[0]

    // 肩の傾きを計算（度）
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
    const shoulderDeltaY = leftShoulder.y - rightShoulder.y
    const shoulderDeltaX = Math.abs(leftShoulder.x - rightShoulder.x)
    const shoulderTilt = Math.atan2(shoulderDeltaY, shoulderDeltaX) * (180 / Math.PI)

    // 頭の前傾を計算
    // 耳と肩の水平位置の差を使用
    const leftEar = landmarks[POSE_LANDMARKS.LEFT_EAR]
    const rightEar = landmarks[POSE_LANDMARKS.RIGHT_EAR]

    // 耳が肩より前にある場合は正の値（前傾）
    // カメラに向かっている場合、z座標を使用
    const leftEarZ = leftEar.z || 0
    const rightEarZ = rightEar.z || 0
    const leftShoulderZ = leftShoulder.z || 0
    const rightShoulderZ = rightShoulder.z || 0
    const earCenterZ = (leftEarZ + rightEarZ) / 2
    const shoulderCenterZ = (leftShoulderZ + rightShoulderZ) / 2

    // 前傾度合い（耳が肩より前にあるほど大きい値）
    // z座標は相対値でノイズが多いため、y座標も併用
    const headForward = earCenterZ - shoulderCenterZ

    // 猫背の検出
    // 耳と肩の垂直位置関係も考慮（猫背だと耳が下がる）
    const earCenterY = (leftEar.y + rightEar.y) / 2
    const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2
    // 耳が肩に近い（垂直距離が小さい）場合は猫背の可能性
    const earShoulderVerticalDist = shoulderCenterY - earCenterY

    // 猫背判定: 頭が大きく前に出ている AND 耳と肩の垂直距離が小さい
    // 閾値を緩めに設定して誤検出を減らす
    const isHunched = headForward > 0.15 && earShoulderVerticalDist < 0.15

    return {
      shoulderTilt: Math.abs(shoulderTilt),
      headForward: Math.max(0, headForward),
      isHunched
    }
  }

  calibrateBaseline(result: PoseLandmarkerResult | null): void {
    this._baselinePosture = this.analyzePosture(result)
  }

  getBaselinePosture(): PostureStatus | null {
    return this._baselinePosture
  }

  checkForIssues(status: PostureStatus, settings: MonitorSettings): DetectionResult[] {
    const results: DetectionResult[] = []

    // 肩の傾き
    if (settings.shoulderTiltEnabled && status.shoulderTilt > settings.shoulderTiltThreshold) {
      results.push({
        type: 'shoulder_tilt',
        detected: true,
        confidence: status.shoulderTilt / 30, // 30度を最大として正規化
        message: `肩が傾いています（${status.shoulderTilt.toFixed(1)}°）`,
        level: status.shoulderTilt > settings.shoulderTiltThreshold * 1.5 ? 'danger' : 'warning'
      })
    }

    // 頭の前傾
    if (settings.headForwardEnabled && status.headForward > settings.headForwardThreshold) {
      results.push({
        type: 'head_forward',
        detected: true,
        confidence: status.headForward,
        message: '頭が前に出ています',
        level: status.headForward > settings.headForwardThreshold * 1.5 ? 'danger' : 'warning'
      })
    }

    // 猫背
    if (settings.hunchedEnabled && status.isHunched) {
      results.push({
        type: 'hunched',
        detected: true,
        confidence: 0.8,
        message: '猫背になっています',
        level: 'warning'
      })
    }

    return results
  }

  getLastResult(): PoseLandmarkerResult | null {
    return this.lastResult
  }

  close(): void {
    this.poseLandmarker?.close()
    this.poseLandmarker = null
  }
}
