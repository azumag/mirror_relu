import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { audioAlertManager } from './audioAlert'

describe('AudioAlertManager', () => {
  beforeEach(() => {
    // Reset the alert manager state before each test
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Clear the lastAlertTime map to reset state between tests
    ;(audioAlertManager as any).lastAlertTime.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('canPlayAlert', () => {
    it('should return true for first time alert', () => {
      const canPlay = audioAlertManager.canPlayAlert('slouching')
      expect(canPlay).toBe(true)
    })

    it('should return false if called within interval', () => {
      audioAlertManager.playAlert('slouching')

      vi.advanceTimersByTime(3000) // 3 seconds

      const canPlay = audioAlertManager.canPlayAlert('slouching')
      expect(canPlay).toBe(false)
    })

    it('should return true after interval has passed', () => {
      audioAlertManager.playAlert('slouching')

      vi.advanceTimersByTime(6000) // 6 seconds (more than default 5s interval)

      const canPlay = audioAlertManager.canPlayAlert('slouching')
      expect(canPlay).toBe(true)
    })

    it('should track different alert types independently', () => {
      audioAlertManager.playAlert('slouching')

      vi.advanceTimersByTime(1000)

      expect(audioAlertManager.canPlayAlert('slouching')).toBe(false)
      expect(audioAlertManager.canPlayAlert('screenDistance')).toBe(true)
    })
  })

  describe('playAlert', () => {
    it('should play alert for valid alert type', () => {
      const result = audioAlertManager.playAlert('slouching')

      expect(result).toBe(true)
      expect(global.speechSynthesis.speak).toHaveBeenCalledOnce()
    })

    it('should return false for unknown alert type', () => {
      const result = audioAlertManager.playAlert('unknown_alert')

      expect(result).toBe(false)
      expect(global.speechSynthesis.speak).not.toHaveBeenCalled()
    })

    it('should not play if called within interval', () => {
      audioAlertManager.playAlert('slouching')
      vi.clearAllMocks()

      vi.advanceTimersByTime(3000)

      const result = audioAlertManager.playAlert('slouching')

      expect(result).toBe(false)
      expect(global.speechSynthesis.speak).not.toHaveBeenCalled()
    })

    it('should configure utterance with correct settings', () => {
      audioAlertManager.playAlert('slouching', 0.5)

      const speakCall = vi.mocked(global.speechSynthesis.speak).mock.calls[0][0]

      expect(speakCall.lang).toBe('ja-JP')
      expect(speakCall.volume).toBe(0.5)
      expect(speakCall.rate).toBe(1.0)
      expect(speakCall.pitch).toBe(1.0)
      expect(speakCall.text).toBe('猫背になっています。背筋を伸ばしましょう。')
    })

    it('should use default volume of 0.8 if not specified', () => {
      audioAlertManager.playAlert('slouching')

      const speakCall = vi.mocked(global.speechSynthesis.speak).mock.calls[0][0]

      expect(speakCall.volume).toBe(0.8)
    })

    it('should play correct message for each alert type', () => {
      const alertTypes = [
        { type: 'slouching', message: '猫背になっています。背筋を伸ばしましょう。' },
        { type: 'screenDistance', message: '画面に近づきすぎです。距離を取ってください。' },
        { type: 'mouthOpen', message: '口が開いています。' },
        { type: 'strabismus', message: '目の向きが揃っていません。正面を見てください。' }
      ]

      alertTypes.forEach(({ type, message }, index) => {
        if (index > 0) {
          vi.advanceTimersByTime(6000) // Reset interval between alerts
        }
        vi.clearAllMocks()
        audioAlertManager.playAlert(type)

        const speakCall = vi.mocked(global.speechSynthesis.speak).mock.calls[0][0]
        expect(speakCall.text).toBe(message)
      })
    })
  })

  describe('setAlertInterval', () => {
    it('should update the alert interval', () => {
      audioAlertManager.setAlertInterval(10000) // 10 seconds

      audioAlertManager.playAlert('slouching')

      vi.advanceTimersByTime(6000) // 6 seconds
      expect(audioAlertManager.canPlayAlert('slouching')).toBe(false)

      vi.advanceTimersByTime(5000) // 11 seconds total
      expect(audioAlertManager.canPlayAlert('slouching')).toBe(true)
    })

    it('should affect subsequent alerts', () => {
      audioAlertManager.setAlertInterval(3000) // 3 seconds

      audioAlertManager.playAlert('slouching')

      vi.advanceTimersByTime(2000)
      expect(audioAlertManager.canPlayAlert('slouching')).toBe(false)

      vi.advanceTimersByTime(2000) // 4 seconds total
      expect(audioAlertManager.canPlayAlert('slouching')).toBe(true)
    })
  })

  describe('fallback behavior', () => {
    it('should handle missing speechSynthesis gracefully', () => {
      // Create a fresh manager instance to avoid interference from previous tests
      const freshManager = new (audioAlertManager.constructor as any)()

      const originalSpeechSynthesis = global.speechSynthesis

      // Remove speechSynthesis
      delete (global as any).speechSynthesis

      const consoleLogSpy = vi.spyOn(console, 'log')
      const consoleWarnSpy = vi.spyOn(console, 'warn')

      const result = freshManager.playAlert('slouching')

      expect(result).toBe(true)
      expect(consoleWarnSpy).toHaveBeenCalledWith('Web Speech API is not supported in this browser')
      expect(consoleLogSpy).toHaveBeenCalledWith('[Alert] slouching: 猫背になっています。背筋を伸ばしましょう。')

      // Restore
      global.speechSynthesis = originalSpeechSynthesis
      consoleLogSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })
  })
})
