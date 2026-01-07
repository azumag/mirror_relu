import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react'

export interface CameraHandle {
  getVideo: () => HTMLVideoElement | null
}

export interface CameraDevice {
  deviceId: string
  label: string
}

interface CameraProps {
  selectedDeviceId?: string
  onReady?: () => void
  onError?: (error: Error) => void
}

type CameraState = 'initializing' | 'no_devices' | 'permission_denied' | 'ready' | 'error'

export const Camera = forwardRef<CameraHandle, CameraProps>(({ selectedDeviceId, onReady, onError }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef<boolean>(true)
  const initIdRef = useRef<number>(0)
  const [state, setState] = useState<CameraState>('initializing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useImperativeHandle(ref, () => ({
    getVideo: () => videoRef.current
  }))

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const initCamera = useCallback(async (deviceId?: string) => {
    // 初期化IDをインクリメントして、古い初期化をキャンセル可能にする
    const currentInitId = ++initIdRef.current

    setState('initializing')
    setErrorMessage('')
    stopCurrentStream()

    try {
      // まずデバイスが存在するか確認
      const devices = await navigator.mediaDevices.enumerateDevices()

      // アンマウントまたは新しい初期化が開始された場合は中断
      if (!mountedRef.current || currentInitId !== initIdRef.current) return

      const videoDevices = devices.filter(d => d.kind === 'videoinput')

      if (videoDevices.length === 0) {
        setState('no_devices')
        setErrorMessage('カメラデバイスが見つかりません')
        onError?.(new Error('カメラデバイスが見つかりません'))
        return
      }

      // カメラにアクセス
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // アンマウントまたは新しい初期化が開始された場合はストリームを停止して中断
      if (!mountedRef.current || currentInitId !== initIdRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch (playError) {
          // play()が中断された場合（コンポーネントアンマウントやメディア削除）は無視
          if (playError instanceof Error &&
              (playError.name === 'AbortError' ||
               playError.message.includes('interrupted') ||
               playError.message.includes('removed from the document'))) {
            console.log('Video play interrupted (component unmounted or media removed)')
            return
          }
          throw playError
        }

        // 再度マウント状態を確認
        if (!mountedRef.current || currentInitId !== initIdRef.current) return

        setState('ready')
        onReady?.()
      }
    } catch (err) {
      // アンマウント後はエラー処理をスキップ
      if (!mountedRef.current || currentInitId !== initIdRef.current) return

      console.error('Camera initialization error:', err)

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setState('permission_denied')
          setErrorMessage('カメラへのアクセスが拒否されました。ブラウザの設定でカメラへのアクセスを許可してください。')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setState('no_devices')
          setErrorMessage('カメラデバイスが見つかりません。カメラが正しく接続されているか確認してください。')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setState('error')
          setErrorMessage('カメラが他のアプリケーションで使用中です。他のアプリを閉じてから再試行してください。')
        } else if (err.name === 'OverconstrainedError') {
          setState('error')
          setErrorMessage('選択したカメラが利用できません。別のカメラを選択してください。')
        } else {
          setState('error')
          setErrorMessage(`カメラエラー: ${err.message}`)
        }
        onError?.(err)
      } else {
        setState('error')
        setErrorMessage('カメラの初期化に失敗しました')
        onError?.(new Error('カメラの初期化に失敗しました'))
      }
    }
  }, [stopCurrentStream, onReady, onError])

  useEffect(() => {
    mountedRef.current = true
    initCamera(selectedDeviceId)

    return () => {
      mountedRef.current = false
      stopCurrentStream()
    }
  }, [selectedDeviceId, initCamera, stopCurrentStream])

  const handleRetry = async () => {
    // Electron環境の場合、まずカメラアクセスを要求
    if (window.electronAPI) {
      await window.electronAPI.requestCameraAccess()
    }
    initCamera(selectedDeviceId)
  }

  const handleOpenSettings = async () => {
    // macOSのシステム設定（プライバシー > カメラ）を開く
    if (window.electronAPI) {
      await window.electronAPI.openPrivacySettings()
    }
  }

  // エラー状態の表示
  if (state === 'no_devices' || state === 'permission_denied' || state === 'error') {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">
            {state === 'no_devices' && '📷'}
            {state === 'permission_denied' && '🔒'}
            {state === 'error' && '⚠️'}
          </div>
          <p className="text-lg font-bold text-white mb-2">
            {state === 'no_devices' && 'カメラが見つかりません'}
            {state === 'permission_denied' && 'アクセス許可が必要です'}
            {state === 'error' && 'カメラエラー'}
          </p>
          <p className="text-sm text-gray-400 mb-4">{errorMessage}</p>

          {state === 'permission_denied' && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-gray-300 mb-2">macOSで許可する手順:</p>
              <ol className="text-xs text-gray-400 list-decimal list-inside space-y-1">
                <li>システム設定を開く</li>
                <li>「プライバシーとセキュリティ」を選択</li>
                <li>「カメラ」を選択</li>
                <li>「Electron」または「Terminal」を許可</li>
                <li>アプリを再起動</li>
              </ol>
            </div>
          )}

          <div className="flex space-x-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              再試行
            </button>
            {state === 'permission_denied' && (
              <button
                onClick={handleOpenSettings}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                設定を開く
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
      />
      {state === 'initializing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <div className="text-white">カメラを初期化中...</div>
          </div>
        </div>
      )}
    </div>
  )
})

Camera.displayName = 'Camera'

// カメラデバイス列挙用のフック
export function useCameraDevices() {
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshDevices = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // 権限を要求（デバイス名を取得するために必要）
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
        tempStream.getTracks().forEach(track => track.stop())
      } catch {
        // 権限がなくてもデバイス列挙は試みる
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `カメラ ${index + 1}`
        }))

      setDevices(videoDevices)
    } catch (err) {
      console.error('Failed to enumerate devices:', err)
      setError('カメラデバイスの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshDevices()

    // デバイスの接続/切断を監視
    const handleDeviceChange = () => {
      refreshDevices()
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [refreshDevices])

  return { devices, isLoading, error, refreshDevices }
}
