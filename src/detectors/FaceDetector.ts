import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerResult
} from '@mediapipe/tasks-vision'
import { FaceStatus, DetectionResult, MonitorSettings } from './types'

// MediaPipe Face Landmarkerのインデックス
const FACE_LANDMARKS = {
  // 口のランドマーク
  UPPER_LIP: 13,
  LOWER_LIP: 14,
  LEFT_MOUTH_CORNER: 61,
  RIGHT_MOUTH_CORNER: 291,

  // 目のランドマーク
  LEFT_EYE_CENTER: 468,
  RIGHT_EYE_CENTER: 473,
  LEFT_IRIS: 468,
  RIGHT_IRIS: 473,
  LEFT_EYE_INNER: 133,
  LEFT_EYE_OUTER: 33,
  RIGHT_EYE_INNER: 362,
  RIGHT_EYE_OUTER: 263,

  // 顎のランドマーク
  JAW_LEFT: 172,
  JAW_RIGHT: 397,
  CHIN: 152
}

export class FaceDetector {
  private faceLandmarker: FaceLandmarker | null = null
  private lastResult: FaceLandmarkerResult | null = null

  async initialize(): Promise<void> {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )

    this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU'
      },
      outputFaceBlendshapes: true,
      runningMode: 'VIDEO',
      numFaces: 1
    })
  }

  detect(video: HTMLVideoElement, timestamp: number): FaceLandmarkerResult | null {
    if (!this.faceLandmarker) return null

    this.lastResult = this.faceLandmarker.detectForVideo(video, timestamp)
    return this.lastResult
  }

  analyzeFaceStatus(result: FaceLandmarkerResult | null): FaceStatus {
    const defaultStatus: FaceStatus = {
      mouthOpen: 0,
      eyeGazeDeviation: 0,
      jawTension: 0
    }

    if (!result || result.faceLandmarks.length === 0) {
      return defaultStatus
    }

    const landmarks = result.faceLandmarks[0]

    // 口の開き具合を計算
    const upperLip = landmarks[FACE_LANDMARKS.UPPER_LIP]
    const lowerLip = landmarks[FACE_LANDMARKS.LOWER_LIP]
    const leftCorner = landmarks[FACE_LANDMARKS.LEFT_MOUTH_CORNER]
    const rightCorner = landmarks[FACE_LANDMARKS.RIGHT_MOUTH_CORNER]

    const mouthHeight = Math.abs(upperLip.y - lowerLip.y)
    const mouthWidth = Math.abs(leftCorner.x - rightCorner.x)
    const mouthOpen = mouthWidth > 0 ? mouthHeight / mouthWidth : 0

    // 斜視検出（目の位置が正常な協調運動から外れている）
    let eyeGazeDeviation = 0
    if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
      const blendshapes = result.faceBlendshapes[0].categories
      const eyeLookOutLeft = blendshapes.find(b => b.categoryName === 'eyeLookOutLeft')?.score || 0
      const eyeLookOutRight = blendshapes.find(b => b.categoryName === 'eyeLookOutRight')?.score || 0
      const eyeLookInLeft = blendshapes.find(b => b.categoryName === 'eyeLookInLeft')?.score || 0
      const eyeLookInRight = blendshapes.find(b => b.categoryName === 'eyeLookInRight')?.score || 0

      // 正常な協調運動: 左を見る時は左目が外、右目が内 / 右を見る時は逆
      // 斜視: この協調が崩れている

      // 片目の外斜視: 片目が外を向いているが、もう一方が対応して内を向いていない
      const leftExotropia = Math.max(0, eyeLookOutLeft - eyeLookInRight)
      const rightExotropia = Math.max(0, eyeLookOutRight - eyeLookInLeft)

      // 片目の内斜視: 片目が内を向いているが、もう一方が対応して外を向いていない
      const leftEsotropia = Math.max(0, eyeLookInLeft - eyeLookOutRight)
      const rightEsotropia = Math.max(0, eyeLookInRight - eyeLookOutLeft)

      // 両目の外斜視/内斜視
      const divergentStrabismus = Math.min(eyeLookOutLeft, eyeLookOutRight)
      const convergentStrabismus = Math.min(eyeLookInLeft, eyeLookInRight)

      eyeGazeDeviation = Math.max(
        leftExotropia,
        rightExotropia,
        leftEsotropia,
        rightEsotropia,
        divergentStrabismus,
        convergentStrabismus
      )

      // デバッグ出力（開発時のみ）
      if (eyeGazeDeviation > 0.05) {
        console.log('Eye tracking:', {
          outLeft: eyeLookOutLeft.toFixed(3),
          outRight: eyeLookOutRight.toFixed(3),
          inLeft: eyeLookInLeft.toFixed(3),
          inRight: eyeLookInRight.toFixed(3),
          leftExo: leftExotropia.toFixed(3),
          rightExo: rightExotropia.toFixed(3),
          leftEso: leftEsotropia.toFixed(3),
          rightEso: rightEsotropia.toFixed(3),
          result: eyeGazeDeviation.toFixed(3)
        })
      }
    }

    // 顎の緊張度を計算（Blendshapesから）
    let jawTension = 0
    if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
      const blendshapes = result.faceBlendshapes[0].categories
      const jawClench = blendshapes.find(b => b.categoryName === 'jawClench')?.score || 0
      const mouthClose = blendshapes.find(b => b.categoryName === 'mouthClose')?.score || 0
      jawTension = Math.max(jawClench, mouthClose * 0.5)
    }

    return {
      mouthOpen,
      eyeGazeDeviation,
      jawTension
    }
  }

  checkForIssues(status: FaceStatus, settings: MonitorSettings): DetectionResult[] {
    const results: DetectionResult[] = []

    // 口が開いている
    if (settings.mouthOpenEnabled && status.mouthOpen > settings.mouthOpenThreshold) {
      results.push({
        type: 'mouth_open',
        detected: true,
        confidence: status.mouthOpen,
        message: '口が開いています',
        level: status.mouthOpen > settings.mouthOpenThreshold * 1.5 ? 'danger' : 'warning'
      })
    }

    // 斜視検出
    if (settings.gazeDeviationEnabled && status.eyeGazeDeviation > settings.gazeDeviationThreshold) {
      results.push({
        type: 'gaze_deviation',
        detected: true,
        confidence: status.eyeGazeDeviation,
        message: '斜視を検出しました',
        level: status.eyeGazeDeviation > settings.gazeDeviationThreshold * 1.5 ? 'danger' : 'warning'
      })
    }

    // 噛み締め検出
    if (settings.jawTensionEnabled && status.jawTension > settings.jawTensionThreshold) {
      results.push({
        type: 'jaw_tension',
        detected: true,
        confidence: status.jawTension,
        message: '噛み締めを検出しました',
        level: status.jawTension > settings.jawTensionThreshold * 1.2 ? 'danger' : 'warning'
      })
    }

    return results
  }

  getLastResult(): FaceLandmarkerResult | null {
    return this.lastResult
  }

  close(): void {
    this.faceLandmarker?.close()
    this.faceLandmarker = null
  }
}
