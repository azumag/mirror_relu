class AudioAlertManager {
  private lastAlertTime: Map<string, number> = new Map()
  private alertInterval: number = 5000 // 5秒間隔

  private messages: Record<string, string> = {
    slouching: '猫背になっています。背筋を伸ばしましょう。',
    screenDistance: '画面に近づきすぎです。距離を取ってください。',
    mouthOpen: '口が開いています。',
    strabismus: '目の向きが揃っていません。正面を見てください。',
  }

  canPlayAlert(alertType: string): boolean {
    const lastTime = this.lastAlertTime.get(alertType) || 0
    const now = Date.now()
    return now - lastTime >= this.alertInterval
  }

  playAlert(alertType: string, volume: number = 0.8): void {
    if (!this.canPlayAlert(alertType)) {
      return
    }

    const message = this.messages[alertType]
    if (!message) return

    // Web Speech API を使用
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.lang = 'ja-JP'
      utterance.volume = volume
      utterance.rate = 1.0
      utterance.pitch = 1.0

      speechSynthesis.speak(utterance)
      this.lastAlertTime.set(alertType, Date.now())

      console.log(`[Alert] ${alertType}: ${message}`)
    } else {
      console.warn('Web Speech API is not supported in this browser')
      // フォールバック: コンソールログのみ
      console.log(`[Alert] ${alertType}: ${message}`)
      this.lastAlertTime.set(alertType, Date.now())
    }
  }

  setAlertInterval(interval: number): void {
    this.alertInterval = interval
  }
}

export const audioAlertManager = new AudioAlertManager()
