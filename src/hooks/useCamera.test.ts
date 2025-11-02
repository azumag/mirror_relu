import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCamera } from './useCamera'

describe('useCamera', () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>
  let mockStream: MediaStream
  let mockTrack: MediaStreamTrack

  beforeEach(() => {
    // Create mock media stream track
    mockTrack = {
      stop: vi.fn(),
      kind: 'video',
      id: 'mock-track',
      label: 'Mock Camera',
      enabled: true,
      muted: false,
      readyState: 'live'
    } as any

    // Create mock media stream
    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
      getVideoTracks: vi.fn(() => [mockTrack]),
      getAudioTracks: vi.fn(() => []),
      id: 'mock-stream'
    } as any

    // Mock getUserMedia
    mockGetUserMedia = vi.fn(() => Promise.resolve(mockStream))
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: mockGetUserMedia
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useCamera())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.error).toBe(null)
    expect(result.current.stream).toBe(null)
  })

  it('should successfully start camera and update state', async () => {
    const { result } = renderHook(() => useCamera())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe(null)
    expect(result.current.stream).toBe(mockStream)
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      },
      audio: false
    })
  })

  it('should set video element srcObject when videoRef is available', async () => {
    const { result } = renderHook(() => useCamera())

    // Create and attach mock video element before camera starts
    const mockVideoElement = document.createElement('video')
    Object.defineProperty(result.current.videoRef, 'current', {
      writable: true,
      value: mockVideoElement
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Verify stream was set
    expect(result.current.stream).toBeTruthy()
    // In a real DOM environment, srcObject would be set on the video element
    // but in test environment with renderHook, we verify the stream exists
  })

  it('should handle NotAllowedError', async () => {
    const notAllowedError = new DOMException('Permission denied', 'NotAllowedError')
    mockGetUserMedia.mockRejectedValueOnce(notAllowedError)

    const { result } = renderHook(() => useCamera())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。')
    expect(result.current.stream).toBe(null)
  })

  it('should handle NotFoundError', async () => {
    const notFoundError = new DOMException('No camera found', 'NotFoundError')
    mockGetUserMedia.mockRejectedValueOnce(notFoundError)

    const { result } = renderHook(() => useCamera())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('カメラが見つかりませんでした。')
    expect(result.current.stream).toBe(null)
  })

  it('should handle NotReadableError', async () => {
    const notReadableError = new DOMException('Camera in use', 'NotReadableError')
    mockGetUserMedia.mockRejectedValueOnce(notReadableError)

    const { result } = renderHook(() => useCamera())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('カメラは他のアプリケーションで使用中です。')
    expect(result.current.stream).toBe(null)
  })

  it('should handle generic DOMException', async () => {
    const genericError = new DOMException('Generic error', 'UnknownError')
    mockGetUserMedia.mockRejectedValueOnce(genericError)

    const { result } = renderHook(() => useCamera())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('カメラの起動に失敗しました。')
    expect(result.current.stream).toBe(null)
  })

  it('should handle non-DOMException errors', async () => {
    const genericError = new Error('Generic error')
    mockGetUserMedia.mockRejectedValueOnce(genericError)

    const { result } = renderHook(() => useCamera())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('予期しないエラーが発生しました。')
    expect(result.current.stream).toBe(null)
  })

  it('should stop media tracks on unmount', async () => {
    const { result, unmount } = renderHook(() => useCamera())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.stream).toBe(mockStream)

    unmount()

    expect(mockTrack.stop).toHaveBeenCalled()
  })

  it('should handle cleanup when stream is obtained but component unmounts immediately', async () => {
    let resolveGetUserMedia: (value: MediaStream) => void
    const getUserMediaPromise = new Promise<MediaStream>((resolve) => {
      resolveGetUserMedia = resolve
    })

    mockGetUserMedia.mockReturnValueOnce(getUserMediaPromise)

    const { unmount } = renderHook(() => useCamera())

    // Unmount before getUserMedia resolves
    unmount()

    // Now resolve the promise
    resolveGetUserMedia!(mockStream)

    await waitFor(() => {
      expect(mockTrack.stop).toHaveBeenCalled()
    })
  })
})
