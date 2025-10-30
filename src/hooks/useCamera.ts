import { useEffect, useRef, useState } from 'react'

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    let mounted = true
    let currentStream: MediaStream | null = null

    const startCamera = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          },
          audio: false
        })

        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop())
          return
        }

        currentStream = mediaStream
        setStream(mediaStream)

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }

        setIsLoading(false)
      } catch (err) {
        if (!mounted) return

        console.error('Camera access error:', err)

        if (err instanceof DOMException) {
          switch (err.name) {
            case 'NotAllowedError':
              setError('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。')
              break
            case 'NotFoundError':
              setError('カメラが見つかりませんでした。')
              break
            case 'NotReadableError':
              setError('カメラは他のアプリケーションで使用中です。')
              break
            default:
              setError('カメラの起動に失敗しました。')
          }
        } else {
          setError('予期しないエラーが発生しました。')
        }

        setIsLoading(false)
      }
    }

    startCamera()

    return () => {
      mounted = false
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return { videoRef, isLoading, error, stream }
}
