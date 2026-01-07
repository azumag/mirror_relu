import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraHandle, useCameraDevices } from './components/Camera'
import { CameraSelector } from './components/CameraSelector'
import { StatusPanel } from './components/StatusPanel'
import { Settings } from './components/Settings'
import { FaceDetector } from './detectors/FaceDetector'
import { PoseDetector } from './detectors/PoseDetector'
import { HandDetector } from './detectors/HandDetector'
import { AlertManager } from './alerts/AlertManager'
import {
  DetectionResult,
  PostureStatus,
  FaceStatus,
  HandStatus,
  MonitorSettings,
  DEFAULT_SETTINGS
} from './detectors/types'

function App() {
  const cameraRef = useRef<CameraHandle>(null)
  const faceDetectorRef = useRef<FaceDetector | null>(null)
  const poseDetectorRef = useRef<PoseDetector | null>(null)
  const handDetectorRef = useRef<HandDetector | null>(null)
  const alertManagerRef = useRef<AlertManager | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const settingsRef = useRef<MonitorSettings>(DEFAULT_SETTINGS)

  // カメラデバイス
  const { devices, isLoading: isLoadingDevices, refreshDevices } = useCameraDevices()
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined)
  const [isCameraReady, setIsCameraReady] = useState(false)

  const [isMonitoring, setIsMonitoring] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [initStatus, setInitStatus] = useState('カメラを選択してください')
  const [settings, setSettings] = useState<MonitorSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)

  // settingsをrefに同期（runDetectionがstaleにならないように）
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const [postureStatus, setPostureStatus] = useState<PostureStatus | null>(null)
  const [faceStatus, setFaceStatus] = useState<FaceStatus | null>(null)
  const [handStatus, setHandStatus] = useState<HandStatus | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<DetectionResult[]>([])

  // デバイスが見つかったら最初のデバイスを選択
  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].deviceId)
    }
  }, [devices, selectedDeviceId])

  // 検出器の初期化
  const initializeDetectors = useCallback(async () => {
    try {
      setInitStatus('顔検出を初期化中...')
      faceDetectorRef.current = new FaceDetector()
      await faceDetectorRef.current.initialize()

      setInitStatus('姿勢検出を初期化中...')
      poseDetectorRef.current = new PoseDetector()
      await poseDetectorRef.current.initialize()

      setInitStatus('手検出を初期化中...')
      handDetectorRef.current = new HandDetector()
      await handDetectorRef.current.initialize()

      alertManagerRef.current = new AlertManager(settingsRef.current)

      setInitStatus('準備完了')
      setIsInitialized(true)
    } catch (error) {
      console.error('Failed to initialize detectors:', error)
      setInitStatus(`初期化エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }, [])

  // カメラ準備完了時
  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true)
    if (!isInitialized) {
      initializeDetectors()
    }
  }, [initializeDetectors, isInitialized])

  // カメラエラー時
  const handleCameraError = useCallback((error: Error) => {
    setIsCameraReady(false)
    setInitStatus(`カメラエラー: ${error.message}`)
  }, [])

  // カメラ選択変更時
  const handleCameraSelect = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId)
    setIsCameraReady(false)
    setIsMonitoring(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // 検出ループ
  const runDetection = useCallback(() => {
    const video = cameraRef.current?.getVideo()
    if (!video || !isMonitoring || !isInitialized || !isCameraReady) return

    const timestamp = performance.now()
    const allResults: DetectionResult[] = []
    const currentSettings = settingsRef.current

    // 顔検出
    if (faceDetectorRef.current) {
      const faceResult = faceDetectorRef.current.detect(video, timestamp)
      const status = faceDetectorRef.current.analyzeFaceStatus(faceResult)
      setFaceStatus(status)
      const faceIssues = faceDetectorRef.current.checkForIssues(status, currentSettings)
      allResults.push(...faceIssues)
    }

    // 姿勢検出
    if (poseDetectorRef.current) {
      const poseResult = poseDetectorRef.current.detect(video, timestamp)
      const status = poseDetectorRef.current.analyzePosture(poseResult)
      setPostureStatus(status)
      const poseIssues = poseDetectorRef.current.checkForIssues(status, currentSettings)
      allResults.push(...poseIssues)
    }

    // 手検出
    if (handDetectorRef.current && faceDetectorRef.current) {
      const handResult = handDetectorRef.current.detect(video, timestamp)
      const faceResult = faceDetectorRef.current.getLastResult()
      const status = handDetectorRef.current.analyzeHandStatus(handResult, faceResult)
      setHandStatus(status)
      const handIssues = handDetectorRef.current.checkForIssues(status, currentSettings)
      allResults.push(...handIssues)
    }

    // アラート処理
    if (alertManagerRef.current) {
      alertManagerRef.current.processDetectionResults(allResults)
    }

    setActiveAlerts(allResults.filter(r => r.detected))

    // 次のフレーム
    animationFrameRef.current = requestAnimationFrame(runDetection)
  }, [isMonitoring, isInitialized, isCameraReady])

  // モニタリング開始/停止
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      setIsMonitoring(false)
    } else {
      setIsMonitoring(true)
    }
  }, [isMonitoring])

  // モニタリング開始時に検出ループを開始
  useEffect(() => {
    if (isMonitoring && isInitialized && isCameraReady) {
      animationFrameRef.current = requestAnimationFrame(runDetection)
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isMonitoring, isInitialized, isCameraReady, runDetection])

  // 設定変更時にAlertManagerを更新
  useEffect(() => {
    if (alertManagerRef.current) {
      alertManagerRef.current.updateSettings(settings)
    }
  }, [settings])

  // クリーンアップ
  useEffect(() => {
    return () => {
      faceDetectorRef.current?.close()
      poseDetectorRef.current?.close()
      handDetectorRef.current?.close()
      alertManagerRef.current?.close()
    }
  }, [])

  const canStartMonitoring = isInitialized && isCameraReady && selectedDeviceId

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <h1 className="text-white font-bold text-lg">Mirror ReLU</h1>
        <CameraSelector
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelect={handleCameraSelect}
          isLoading={isLoadingDevices}
          onRefresh={refreshDevices}
        />
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* カメラビュー */}
        <div className="flex-1 relative">
          {selectedDeviceId ? (
            <Camera
              ref={cameraRef}
              selectedDeviceId={selectedDeviceId}
              onReady={handleCameraReady}
              onError={handleCameraError}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gray-900">
              <div className="text-center p-8">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-lg font-bold text-white mb-2">カメラを選択してください</p>
                <p className="text-sm text-gray-400">
                  上部のドロップダウンからカメラデバイスを選択してください
                </p>
              </div>
            </div>
          )}

          {/* 初期化ステータス（カメラ選択後） */}
          {selectedDeviceId && isCameraReady && !isInitialized && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
              <div className="text-white text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p>{initStatus}</p>
              </div>
            </div>
          )}

          {/* コントロールボタン */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
            <button
              onClick={toggleMonitoring}
              disabled={!canStartMonitoring}
              className={`
                px-6 py-3 rounded-full font-bold text-white
                ${canStartMonitoring
                  ? isMonitoring
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 cursor-not-allowed'
                }
                transition-colors
              `}
            >
              {isMonitoring ? '停止' : '監視開始'}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              設定
            </button>
          </div>
        </div>

        {/* ステータスパネル */}
        <div className="w-80 p-4 overflow-y-auto bg-gray-850">
          <StatusPanel
            postureStatus={postureStatus}
            faceStatus={faceStatus}
            handStatus={handStatus}
            activeAlerts={activeAlerts}
            isMonitoring={isMonitoring}
          />
        </div>
      </div>

      {/* 設定モーダル */}
      <Settings
        settings={settings}
        onSettingsChange={setSettings}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}

export default App
