export type AlertLevel = 'good' | 'warning' | 'danger'

export interface DetectionResult {
  type: string
  detected: boolean
  confidence: number
  message: string
  level: AlertLevel
}

export interface PostureStatus {
  shoulderTilt: number      // 肩の傾き（度）
  headForward: number       // 頭の前傾（正規化値）
  isHunched: boolean        // 猫背かどうか
}

export interface FaceStatus {
  mouthOpen: number         // 口の開き具合（0-1）
  eyeGazeDeviation: number  // 視線のずれ（0-1）
  jawTension: number        // 顎の緊張度（0-1）
}

export interface HandStatus {
  touchingFace: boolean     // 顔を触っているか
  handNearFace: number      // 手と顔の距離（正規化値）
}

export interface MonitorSettings {
  // 表示設定
  previewEnabled: boolean

  // 検出項目の有効/無効
  shoulderTiltEnabled: boolean
  headForwardEnabled: boolean
  hunchedEnabled: boolean
  mouthOpenEnabled: boolean
  gazeDeviationEnabled: boolean
  jawTensionEnabled: boolean
  handFaceEnabled: boolean

  // 姿勢の閾値
  shoulderTiltThreshold: number
  headForwardThreshold: number

  // 顔の閾値
  mouthOpenThreshold: number
  gazeDeviationThreshold: number
  jawTensionThreshold: number

  // 手の閾値
  handFaceDistanceThreshold: number

  // アラート設定
  alertCooldown: number     // アラート間隔（ms）
  soundEnabled: boolean
  notificationEnabled: boolean
  overlayEnabled: boolean
}

export const DEFAULT_SETTINGS: MonitorSettings = {
  // 表示設定
  previewEnabled: true,

  // デフォルトで有効な検出項目
  shoulderTiltEnabled: true,
  headForwardEnabled: false,  // 一旦無効
  hunchedEnabled: true,
  mouthOpenEnabled: true,
  gazeDeviationEnabled: true,
  jawTensionEnabled: false,   // 一旦無効
  handFaceEnabled: true,

  shoulderTiltThreshold: 10,
  headForwardThreshold: 0.3,
  mouthOpenThreshold: 0.3,
  gazeDeviationThreshold: 0.08,
  jawTensionThreshold: 0.6,
  handFaceDistanceThreshold: 0.15,
  alertCooldown: 5000,
  soundEnabled: true,
  notificationEnabled: true,
  overlayEnabled: true
}
