import { AlertLevel } from '../detectors/types'

export class SoundAlert {
  private audioContext: AudioContext | null = null
  private enabled: boolean = true

  constructor() {
    // AudioContextは最初の操作時に初期化
  }

  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  async playBeep(level: AlertLevel): Promise<void> {
    if (!this.enabled) return
    if (level === 'good') return // goodの場合は音を鳴らさない

    // Electron環境ではメインプロセス経由で再生（仮想デスクトップ切り替え時も動作）
    if (window.electronAPI) {
      await window.electronAPI.playBeep(level)
      return
    }

    // ブラウザ環境ではWeb Audio APIを使用
    this.initAudioContext()
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    // レベルに応じて周波数と音量を変更
    switch (level) {
      case 'warning':
        oscillator.frequency.value = 440 // A4
        gainNode.gain.value = 0.3
        break
      case 'danger':
        oscillator.frequency.value = 880 // A5
        gainNode.gain.value = 0.5
        break
    }

    oscillator.type = 'sine'

    // フェードイン/アウト
    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(gainNode.gain.value, now + 0.05)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2)

    oscillator.start(now)
    oscillator.stop(now + 0.2)
  }

  async speak(message: string): Promise<void> {
    if (!this.enabled) return

    // Electron環境ではメインプロセス経由で読み上げ（仮想デスクトップ切り替え時も動作）
    if (window.electronAPI) {
      await window.electronAPI.speak(message)
      return
    }

    // ブラウザ環境ではWeb Speech APIを使用
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.lang = 'ja-JP'
      utterance.rate = 1.2
      utterance.volume = 0.7
      speechSynthesis.speak(utterance)
    }
  }

  close(): void {
    this.audioContext?.close()
    this.audioContext = null
  }
}
