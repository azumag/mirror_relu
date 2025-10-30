import { useEffect, useRef, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { useMediaPipe } from '../hooks/useMediaPipe'
import { analyzePosture, PostureResult } from '../utils/postureDetection'
import { audioAlertManager } from '../utils/audioAlert'
import './CameraView.css'

const CameraView = () => {
  const { videoRef, isLoading: cameraLoading, error: cameraError } = useCamera()
  const { detectFace, isLoading: mediapipeLoading, error: mediapipeError } = useMediaPipe(videoRef.current)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  const [postureData, setPostureData] = useState<PostureResult | null>(null)
  const [fps, setFps] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)
  const [calibrationDistance, setCalibrationDistance] = useState<number | null>(null)
  const [showLog, setShowLog] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)

  // ログ追加関数
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ja-JP', { hour12: false })
    const logMessage = `[${timestamp}] ${message}`
    setLogs(prev => [...prev.slice(-99), logMessage]) // 最新100件まで保持
  }

  // ログの自動スクロール
  useEffect(() => {
    if (showLog && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, showLog])

  // 検出ループ
  useEffect(() => {
    if (cameraLoading || mediapipeLoading || !videoRef.current) {
      return
    }

    let frameCount = 0
    let lastFpsUpdate = Date.now()
    let mounted = true

    const detect = async () => {
      if (!mounted || !videoRef.current) return

      const result = await detectFace()

      if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0]

        // 姿勢分析
        const posture = analyzePosture(landmarks, calibrationDistance)
        setPostureData(posture)

        // アラート判定
        if (isDetecting) {
          if (posture.isSlouchingDetected) {
            if (audioAlertManager.playAlert('slouching')) {
              addLog('🚨 アラート: 猫背を検出')
            }
          }
          if (posture.isScreenTooClose) {
            if (audioAlertManager.playAlert('screenDistance')) {
              addLog('🚨 アラート: 画面に近すぎます')
            }
          }
          if (posture.isMouthOpen) {
            if (audioAlertManager.playAlert('mouthOpen')) {
              addLog('🚨 アラート: 口が開いています')
            }
          }
          if (posture.isStrabismusDetected) {
            if (audioAlertManager.playAlert('strabismus')) {
              addLog('🚨 アラート: 目の向きが揃っていません')
            }
          }
        }

        // キャンバスに描画
        drawLandmarks(landmarks)
      }

      // FPS計算
      frameCount++
      const now = Date.now()
      if (now - lastFpsUpdate >= 1000) {
        setFps(frameCount)
        frameCount = 0
        lastFpsUpdate = now
      }

      animationFrameRef.current = requestAnimationFrame(detect)
    }

    // 検出開始
    detect()

    return () => {
      mounted = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [detectFace, cameraLoading, mediapipeLoading, isDetecting, calibrationDistance])

  const drawLandmarks = (landmarks: any) => {
    if (!canvasRef.current || !videoRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // キャンバスサイズを動画に合わせる
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight

    // クリア
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 主要なランドマークを描画
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'

    // いくつかの重要なポイントのみ描画（全478点は多すぎるため）
    const keyPoints = [1, 10, 152, 33, 263, 13, 14] // 鼻、額、顎、目、口

    keyPoints.forEach(index => {
      const landmark = landmarks[index]
      if (landmark) {
        const x = landmark.x * canvas.width
        const y = landmark.y * canvas.height

        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fill()
      }
    })

    // 姿勢状態を表示
    if (postureData) {
      ctx.font = '16px Arial'
      ctx.fillStyle = postureData.isSlouchingDetected ? 'red' : 'green'
      ctx.fillText(
        `姿勢: ${postureData.isSlouchingDetected ? '悪い' : '良好'}`,
        10,
        30
      )

      ctx.fillStyle = postureData.isScreenTooClose ? 'red' : 'green'
      ctx.fillText(
        `距離: ${postureData.isScreenTooClose ? '近すぎ' : '適正'}`,
        10,
        55
      )
    }
  }

  const handleCalibrate = () => {
    if (postureData) {
      setCalibrationDistance(postureData.faceDistance)
      addLog(`✅ キャリブレーション完了: 基準距離=${postureData.faceDistance.toFixed(3)}`)
      alert('キャリブレーション完了！現在の距離を基準として設定しました。')
    }
  }

  const toggleDetection = () => {
    const newState = !isDetecting
    setIsDetecting(newState)
    if (newState) {
      addLog('▶️ 検出を開始しました')
    } else {
      addLog('⏸️ 検出を停止しました')
    }
  }

  const toggleLog = () => {
    setShowLog(!showLog)
  }

  const clearLog = () => {
    setLogs([])
    addLog('🗑️ ログをクリアしました')
  }

  if (cameraError || mediapipeError) {
    return (
      <div className="camera-view error">
        <h2>エラー</h2>
        <p>{cameraError || mediapipeError}</p>
      </div>
    )
  }

  if (cameraLoading || mediapipeLoading) {
    return (
      <div className="camera-view loading">
        <div className="spinner"></div>
        <p>
          {cameraLoading && 'カメラを起動中...'}
          {mediapipeLoading && 'AIモデルを読み込み中...'}
        </p>
      </div>
    )
  }

  return (
    <div className="camera-view">
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="overlay-canvas" />
      </div>

      <div className="controls">
        <button
          onClick={toggleDetection}
          className={isDetecting ? 'active' : ''}
        >
          {isDetecting ? '検出停止' : '検出開始'}
        </button>
        <button onClick={handleCalibrate}>
          キャリブレーション
        </button>
        <button onClick={toggleLog} className={showLog ? 'active' : ''}>
          {showLog ? 'ログ非表示' : 'ログ表示'}
        </button>
        {showLog && (
          <button onClick={clearLog}>
            ログクリア
          </button>
        )}
      </div>

      {showLog && (
        <div className="log-panel">
          <div className="log-header">
            <h3>検出ログ</h3>
            <span className="log-count">{logs.length}件</span>
          </div>
          <div className="log-content">
            {logs.length === 0 ? (
              <div className="log-empty">ログがありません</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="log-item">
                  {log}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      <div className="info-panel">
        <div className="info-item">
          <span className="label">FPS:</span>
          <span className="value">{fps}</span>
        </div>

        {postureData && (
          <>
            <div className="info-item">
              <span className="label">首の角度:</span>
              <span className="value">{postureData.neckAngle.toFixed(1)}°</span>
            </div>
            <div className="info-item">
              <span className="label">顔の距離:</span>
              <span className="value">{postureData.faceDistance.toFixed(3)}</span>
            </div>
            <div className="info-item">
              <span className="label">口の開き:</span>
              <span className="value">{postureData.mouthOpenness.toFixed(3)}</span>
            </div>
            <div className="info-item">
              <span className="label">目の向き:</span>
              <span className="value">{postureData.eyeAlignment.toFixed(3)}</span>
            </div>

            <div className="status-badges">
              <div className={`badge ${postureData.isSlouchingDetected ? 'warning' : 'success'}`}>
                {postureData.isSlouchingDetected ? '⚠ 猫背' : '✓ 姿勢良好'}
              </div>
              <div className={`badge ${postureData.isScreenTooClose ? 'warning' : 'success'}`}>
                {postureData.isScreenTooClose ? '⚠ 距離近い' : '✓ 距離適正'}
              </div>
              <div className={`badge ${postureData.isMouthOpen ? 'warning' : 'success'}`}>
                {postureData.isMouthOpen ? '⚠ 口開き' : '✓ 口閉じ'}
              </div>
              <div className={`badge ${postureData.isStrabismusDetected ? 'warning' : 'success'}`}>
                {postureData.isStrabismusDetected ? '⚠ 斜視疑い' : '✓ 目の向き正常'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CameraView
