import {
  HandLandmarker,
  FilesetResolver,
  HandLandmarkerResult
} from '@mediapipe/tasks-vision'
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { HandStatus, DetectionResult, MonitorSettings } from './types'

// 手のランドマークインデックス
const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_TIP: 16,
  PINKY_TIP: 20
}

export class HandDetector {
  private handLandmarker: HandLandmarker | null = null
  private lastResult: HandLandmarkerResult | null = null

  async initialize(): Promise<void> {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )

    this.handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 2
    })
  }

  detect(video: HTMLVideoElement, timestamp: number): HandLandmarkerResult | null {
    if (!this.handLandmarker) return null

    this.lastResult = this.handLandmarker.detectForVideo(video, timestamp)
    return this.lastResult
  }

  analyzeHandStatus(
    handResult: HandLandmarkerResult | null,
    faceResult: FaceLandmarkerResult | null
  ): HandStatus {
    const defaultStatus: HandStatus = {
      touchingFace: false,
      handNearFace: 1.0
    }

    if (!handResult || handResult.landmarks.length === 0) {
      return defaultStatus
    }

    if (!faceResult || faceResult.faceLandmarks.length === 0) {
      return defaultStatus
    }

    // 顔の境界ボックスを計算
    const faceLandmarks = faceResult.faceLandmarks[0]
    let minX = 1, maxX = 0, minY = 1, maxY = 0

    for (const landmark of faceLandmarks) {
      minX = Math.min(minX, landmark.x)
      maxX = Math.max(maxX, landmark.x)
      minY = Math.min(minY, landmark.y)
      maxY = Math.max(maxY, landmark.y)
    }

    // 顔の中心
    const faceCenterX = (minX + maxX) / 2
    const faceCenterY = (minY + maxY) / 2
    const faceWidth = maxX - minX
    const faceHeight = maxY - minY

    // 各手の指先と顔との距離を計算
    let minDistance = 1.0
    let isTouching = false

    for (const handLandmarks of handResult.landmarks) {
      // 指先のランドマークをチェック
      const fingerTips = [
        handLandmarks[HAND_LANDMARKS.THUMB_TIP],
        handLandmarks[HAND_LANDMARKS.INDEX_FINGER_TIP],
        handLandmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP],
        handLandmarks[HAND_LANDMARKS.RING_FINGER_TIP],
        handLandmarks[HAND_LANDMARKS.PINKY_TIP]
      ]

      for (const tip of fingerTips) {
        // 顔の中心からの距離（正規化）
        const dx = (tip.x - faceCenterX) / faceWidth
        const dy = (tip.y - faceCenterY) / faceHeight
        const distance = Math.sqrt(dx * dx + dy * dy)

        minDistance = Math.min(minDistance, distance)

        // 顔の境界ボックス内にあるかチェック
        if (
          tip.x >= minX - faceWidth * 0.1 &&
          tip.x <= maxX + faceWidth * 0.1 &&
          tip.y >= minY - faceHeight * 0.1 &&
          tip.y <= maxY + faceHeight * 0.1
        ) {
          isTouching = true
        }
      }
    }

    return {
      touchingFace: isTouching,
      handNearFace: minDistance
    }
  }

  checkForIssues(status: HandStatus, settings: MonitorSettings): DetectionResult[] {
    const results: DetectionResult[] = []

    // 顔を触っている
    if (settings.handFaceEnabled && (status.touchingFace || status.handNearFace < settings.handFaceDistanceThreshold)) {
      results.push({
        type: 'touching_face',
        detected: true,
        confidence: 1 - status.handNearFace,
        message: '顔を触っています',
        level: status.touchingFace ? 'danger' : 'warning'
      })
    }

    return results
  }

  getLastResult(): HandLandmarkerResult | null {
    return this.lastResult
  }

  close(): void {
    this.handLandmarker?.close()
    this.handLandmarker = null
  }
}
