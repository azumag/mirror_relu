import { useEffect, useState, useCallback } from 'react'
import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision'

export const useMediaPipe = (videoElement: HTMLVideoElement | null) => {
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<FaceLandmarkerResult | null>(null)

  useEffect(() => {
    let mounted = true

    const initializeMediaPipe = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('Initializing MediaPipe...')

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true
        })

        if (!mounted) {
          landmarker.close()
          return
        }

        console.log('MediaPipe initialized successfully')
        setFaceLandmarker(landmarker)
        setIsLoading(false)
      } catch (err) {
        if (!mounted) return

        console.error('MediaPipe initialization error:', err)
        setError('AI モデルの読み込みに失敗しました。')
        setIsLoading(false)
      }
    }

    initializeMediaPipe()

    return () => {
      mounted = false
      if (faceLandmarker) {
        faceLandmarker.close()
      }
    }
  }, [])

  const detectFace = useCallback(async () => {
    if (!faceLandmarker || !videoElement) return null

    try {
      const startTimeMs = performance.now()
      const result = faceLandmarker.detectForVideo(videoElement, startTimeMs)
      setLastResult(result)
      return result
    } catch (err) {
      console.error('Face detection error:', err)
      return null
    }
  }, [faceLandmarker, videoElement])

  return {
    faceLandmarker,
    isLoading,
    error,
    detectFace,
    lastResult
  }
}
