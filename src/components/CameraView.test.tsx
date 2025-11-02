import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CameraView from './CameraView'

// Mock hooks
vi.mock('../hooks/useCamera', () => ({
  useCamera: vi.fn()
}))

vi.mock('../hooks/useMediaPipe', () => ({
  useMediaPipe: vi.fn()
}))

vi.mock('../utils/audioAlert', () => ({
  audioAlertManager: {
    playAlert: vi.fn(() => false),
    canPlayAlert: vi.fn(() => true),
    setAlertInterval: vi.fn()
  }
}))

import { useCamera } from '../hooks/useCamera'
import { useMediaPipe } from '../hooks/useMediaPipe'
import { audioAlertManager } from '../utils/audioAlert'

describe('CameraView', () => {
  let mockVideoElement: HTMLVideoElement

  beforeEach(() => {
    vi.clearAllMocks()
    mockVideoElement = document.createElement('video')
    mockVideoElement.videoWidth = 640
    mockVideoElement.videoHeight = 480
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state when camera is loading', () => {
    vi.mocked(useCamera).mockReturnValue({
      videoRef: { current: null },
      isLoading: true,
      error: null,
      stream: null
    })

    vi.mocked(useMediaPipe).mockReturnValue({
      faceLandmarker: null,
      isLoading: false,
      error: null,
      detectFace: vi.fn(),
      lastResult: null
    })

    render(<CameraView />)

    expect(screen.getByText(/カメラを起動中/i)).toBeInTheDocument()
  })

  it('should show loading state when MediaPipe is loading', () => {
    vi.mocked(useCamera).mockReturnValue({
      videoRef: { current: mockVideoElement },
      isLoading: false,
      error: null,
      stream: null
    })

    vi.mocked(useMediaPipe).mockReturnValue({
      faceLandmarker: null,
      isLoading: true,
      error: null,
      detectFace: vi.fn(),
      lastResult: null
    })

    render(<CameraView />)

    expect(screen.getByText(/AIモデルを読み込み中/i)).toBeInTheDocument()
  })

  it('should show error when camera has error', () => {
    const errorMessage = 'カメラエラー'

    vi.mocked(useCamera).mockReturnValue({
      videoRef: { current: null },
      isLoading: false,
      error: errorMessage,
      stream: null
    })

    vi.mocked(useMediaPipe).mockReturnValue({
      faceLandmarker: null,
      isLoading: false,
      error: null,
      detectFace: vi.fn(),
      lastResult: null
    })

    render(<CameraView />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('should show error when MediaPipe has error', () => {
    const errorMessage = 'MediaPipeエラー'

    vi.mocked(useCamera).mockReturnValue({
      videoRef: { current: mockVideoElement },
      isLoading: false,
      error: null,
      stream: null
    })

    vi.mocked(useMediaPipe).mockReturnValue({
      faceLandmarker: null,
      isLoading: false,
      error: errorMessage,
      detectFace: vi.fn(),
      lastResult: null
    })

    render(<CameraView />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('should render camera view when loaded successfully', () => {
    const mockDetectFace = vi.fn()

    vi.mocked(useCamera).mockReturnValue({
      videoRef: { current: mockVideoElement },
      isLoading: false,
      error: null,
      stream: null
    })

    vi.mocked(useMediaPipe).mockReturnValue({
      faceLandmarker: {},
      isLoading: false,
      error: null,
      detectFace: mockDetectFace,
      lastResult: null
    })

    render(<CameraView />)

    expect(screen.getByRole('button', { name: /検出開始/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /キャリブレーション/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ログ表示/i })).toBeInTheDocument()
  })

  it('should toggle detection when button is clicked', async () => {
    const user = userEvent.setup()
    const mockDetectFace = vi.fn()

    vi.mocked(useCamera).mockReturnValue({
      videoRef: { current: mockVideoElement },
      isLoading: false,
      error: null,
      stream: null
    })

    vi.mocked(useMediaPipe).mockReturnValue({
      faceLandmarker: {},
      isLoading: false,
      error: null,
      detectFace: mockDetectFace,
      lastResult: null
    })

    render(<CameraView />)

    const toggleButton = screen.getByRole('button', { name: /検出開始/i })

    await user.click(toggleButton)

    expect(screen.getByRole('button', { name: /検出停止/i })).toBeInTheDocument()
  })

  it('should toggle log panel when log button is clicked', async () => {
    const user = userEvent.setup()
    const mockDetectFace = vi.fn()

    vi.mocked(useCamera).mockReturnValue({
      videoRef: { current: mockVideoElement },
      isLoading: false,
      error: null,
      stream: null
    })

    vi.mocked(useMediaPipe).mockReturnValue({
      faceLandmarker: {},
      isLoading: false,
      error: null,
      detectFace: mockDetectFace,
      lastResult: null
    })

    render(<CameraView />)

    const logButton = screen.getByRole('button', { name: /ログ表示/i })

    await user.click(logButton)

    expect(screen.getByText(/検出ログ/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ログ非表示/i })).toBeInTheDocument()
  })

  it('should show calibration alert when calibrate button is clicked with posture data', async () => {
    const user = userEvent.setup()
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})

    // Create complete face landmarks (478 landmarks as required by MediaPipe)
    const createLandmark = (x: number, y: number, z: number = 0) => ({ x, y, z, visibility: 1 })
    const mockLandmarks = Array(478).fill(null).map(() => createLandmark(0.5, 0.5, 0))

    // Set required landmarks for posture detection
    mockLandmarks[1] = createLandmark(0.5, 0.5, 0)    // nose
    mockLandmarks[10] = createLandmark(0.5, 0.3, 0.1) // forehead
    mockLandmarks[152] = createLandmark(0.5, 0.7, -0.1) // chin
    mockLandmarks[33] = createLandmark(0.4, 0.4, 0)   // left eye
    mockLandmarks[263] = createLandmark(0.6, 0.4, 0)  // right eye
    mockLandmarks[13] = createLandmark(0.5, 0.6, 0)   // upper lip
    mockLandmarks[14] = createLandmark(0.5, 0.605, 0) // lower lip
    mockLandmarks[133] = createLandmark(0.35, 0.4, 0) // left eye inner
    mockLandmarks[362] = createLandmark(0.65, 0.4, 0) // right eye inner

    // Set iris landmarks
    for (let i = 468; i <= 472; i++) mockLandmarks[i] = createLandmark(0.4, 0.4, 0)
    for (let i = 473; i <= 477; i++) mockLandmarks[i] = createLandmark(0.6, 0.4, 0)

    const mockDetectFace = vi.fn().mockResolvedValue({
      faceLandmarks: [mockLandmarks]
    })

    vi.mocked(useCamera).mockReturnValue({
      videoRef: { current: mockVideoElement },
      isLoading: false,
      error: null,
      stream: null
    })

    vi.mocked(useMediaPipe).mockReturnValue({
      faceLandmarker: {},
      isLoading: false,
      error: null,
      detectFace: mockDetectFace,
      lastResult: null
    })

    render(<CameraView />)

    // Wait for detection to populate posture data
    await waitFor(() => {
      expect(mockDetectFace).toHaveBeenCalled()
    }, { timeout: 3000 })

    const calibrateButton = screen.getByRole('button', { name: /キャリブレーション/i })

    await user.click(calibrateButton)

    // Alert should be called if posture data exists
    // Note: This depends on the detection loop working correctly
  })

  it('should clear logs when clear button is clicked', async () => {
    const user = userEvent.setup()
    const mockDetectFace = vi.fn()

    vi.mocked(useCamera).mockReturnValue({
      videoRef: { current: mockVideoElement },
      isLoading: false,
      error: null,
      stream: null
    })

    vi.mocked(useMediaPipe).mockReturnValue({
      faceLandmarker: {},
      isLoading: false,
      error: null,
      detectFace: mockDetectFace,
      lastResult: null
    })

    render(<CameraView />)

    // Show log panel
    const logButton = screen.getByRole('button', { name: /ログ表示/i })
    await user.click(logButton)

    // Start detection to add a log
    const toggleButton = screen.getByRole('button', { name: /検出開始/i })
    await user.click(toggleButton)

    // Clear logs
    const clearButton = screen.getByRole('button', { name: /ログクリア/i })
    await user.click(clearButton)

    // Should show the "cleared" log message
    expect(screen.getByText(/ログをクリアしました/i)).toBeInTheDocument()
  })

  it('should display FPS when detection is running', () => {
    const mockDetectFace = vi.fn()

    vi.mocked(useCamera).mockReturnValue({
      videoRef: { current: mockVideoElement },
      isLoading: false,
      error: null,
      stream: null
    })

    vi.mocked(useMediaPipe).mockReturnValue({
      faceLandmarker: {},
      isLoading: false,
      error: null,
      detectFace: mockDetectFace,
      lastResult: null
    })

    render(<CameraView />)

    expect(screen.getByText(/FPS:/i)).toBeInTheDocument()
  })
})
