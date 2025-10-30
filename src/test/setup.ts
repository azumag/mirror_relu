import '@testing-library/jest-dom'

// Mock Web Speech API
global.speechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => []),
  speaking: false,
  pending: false,
  paused: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
} as any

// Mock MediaDevices API
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(),
    enumerateDevices: vi.fn(() => Promise.resolve([]))
  }
})

// Mock performance.now()
global.performance = global.performance || ({} as any)
if (!global.performance.now) {
  let mockTime = 0
  global.performance.now = vi.fn(() => {
    mockTime += 16.67 // ~60fps
    return mockTime
  })
}
