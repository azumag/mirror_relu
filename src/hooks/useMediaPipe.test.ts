import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMediaPipe } from './useMediaPipe'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// Mock factory function
const createMockFaceLandmarker = () => ({
  close: vi.fn(),
  detectForVideo: vi.fn()
})

// Mock MediaPipe modules
vi.mock('@mediapipe/tasks-vision', () => {
  return {
    FaceLandmarker: {
      createFromOptions: vi.fn()
    },
    FilesetResolver: {
      forVisionTasks: vi.fn(() => Promise.resolve({}))
    }
  }
})

describe('useMediaPipe', () => {
  let mockVideoElement: HTMLVideoElement

  beforeEach(() => {
    vi.clearAllMocks()
    mockVideoElement = document.createElement('video')
    mockVideoElement.width = 640
    mockVideoElement.height = 480

    // Reset mock to return new instance for each test
    vi.mocked(FaceLandmarker.createFromOptions).mockImplementation(() =>
      Promise.resolve(createMockFaceLandmarker() as any)
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useMediaPipe(null))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.error).toBe(null)
    expect(result.current.faceLandmarker).toBe(null)
    expect(result.current.lastResult).toBe(null)
  })

  it('should successfully initialize MediaPipe', async () => {
    const { result } = renderHook(() => useMediaPipe(mockVideoElement))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe(null)
    expect(result.current.faceLandmarker).toBeTruthy()
    expect(FilesetResolver.forVisionTasks).toHaveBeenCalledWith(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )
    expect(FaceLandmarker.createFromOptions).toHaveBeenCalled()
  })

  it('should initialize with correct options', async () => {
    const { result } = renderHook(() => useMediaPipe(mockVideoElement))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const createOptionsCall = vi.mocked(FaceLandmarker.createFromOptions).mock.calls[0]
    const options = createOptionsCall[1]

    expect(options).toEqual({
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true
    })
  })

  it('should handle initialization error', async () => {
    const error = new Error('Failed to load model')
    vi.mocked(FilesetResolver.forVisionTasks).mockRejectedValueOnce(error)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useMediaPipe(mockVideoElement))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('AI モデルの読み込みに失敗しました。')
    expect(result.current.faceLandmarker).toBe(null)
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('should close face landmarker on unmount', async () => {
    const { result, unmount } = renderHook(() => useMediaPipe(mockVideoElement))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const landmarker = result.current.faceLandmarker

    unmount()

    if (landmarker) {
      expect(landmarker.close).toHaveBeenCalled()
    }
  })

  it('should handle cleanup when initialization completes after unmount', async () => {
    const mockLandmarker = {
      close: vi.fn(),
      detectForVideo: vi.fn()
    }

    let resolveCreateFromOptions: (value: any) => void
    const createFromOptionsPromise = new Promise((resolve) => {
      resolveCreateFromOptions = resolve
    })

    vi.mocked(FaceLandmarker.createFromOptions).mockReturnValueOnce(createFromOptionsPromise as any)

    const { unmount } = renderHook(() => useMediaPipe(mockVideoElement))

    // Unmount before initialization completes
    unmount()

    // Now resolve the promise
    resolveCreateFromOptions!(mockLandmarker)

    await waitFor(() => {
      expect(mockLandmarker.close).toHaveBeenCalled()
    })
  })

  describe('detectFace', () => {
    it('should return null when faceLandmarker is not initialized', async () => {
      const { result } = renderHook(() => useMediaPipe(null))

      const detectionResult = await result.current.detectFace()

      expect(detectionResult).toBe(null)
    })

    it('should return null when videoElement is not provided', async () => {
      const { result } = renderHook(() => useMediaPipe(null))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const detectionResult = await result.current.detectFace()

      expect(detectionResult).toBe(null)
    })

    it('should detect face when both landmarker and video are available', async () => {
      const mockResult = {
        faceLandmarks: [
          [{ x: 0.5, y: 0.5, z: 0 }]
        ]
      }

      // Setup mock to return result before rendering hook
      const mockDetectForVideo = vi.fn().mockReturnValue(mockResult)
      vi.mocked(FaceLandmarker.createFromOptions).mockResolvedValueOnce({
        close: vi.fn(),
        detectForVideo: mockDetectForVideo
      } as any)

      const { result } = renderHook(() => useMediaPipe(mockVideoElement))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.faceLandmarker).toBeTruthy()
      })

      const detectionResult = await result.current.detectFace()

      expect(mockDetectForVideo).toHaveBeenCalled()
      expect(detectionResult).toEqual(mockResult)

      // Wait for lastResult to be updated
      await waitFor(() => {
        expect(result.current.lastResult).toEqual(mockResult)
      })
    })

    it('should handle detection errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useMediaPipe(mockVideoElement))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      if (result.current.faceLandmarker) {
        vi.mocked(result.current.faceLandmarker.detectForVideo).mockImplementationOnce(() => {
          throw new Error('Detection failed')
        })
      }

      const detectionResult = await result.current.detectFace()

      expect(detectionResult).toBe(null)
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should use performance.now() for timestamp', async () => {
      const mockResult = {
        faceLandmarks: [
          [{ x: 0.5, y: 0.5, z: 0 }]
        ]
      }

      const performanceNowSpy = vi.spyOn(performance, 'now')

      const { result } = renderHook(() => useMediaPipe(mockVideoElement))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      if (result.current.faceLandmarker) {
        vi.mocked(result.current.faceLandmarker.detectForVideo).mockReturnValueOnce(mockResult as any)
      }

      await result.current.detectFace()

      expect(performanceNowSpy).toHaveBeenCalled()
    })
  })
})
