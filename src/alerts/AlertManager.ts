import { DetectionResult, MonitorSettings, AlertLevel } from '../detectors/types'
import { SoundAlert } from './SoundAlert'
import { NotificationAlert } from './NotificationAlert'

export class AlertManager {
  private soundAlert: SoundAlert
  private notificationAlert: NotificationAlert
  private lastAlertTime: Map<string, number> = new Map()
  private settings: MonitorSettings

  constructor(settings: MonitorSettings) {
    this.soundAlert = new SoundAlert()
    this.notificationAlert = new NotificationAlert()
    this.settings = settings
  }

  updateSettings(settings: MonitorSettings): void {
    this.settings = settings
    this.soundAlert.setEnabled(settings.soundEnabled)
    this.notificationAlert.setEnabled(settings.notificationEnabled)
  }

  private canAlert(type: string): boolean {
    const lastTime = this.lastAlertTime.get(type) || 0
    const now = Date.now()
    return now - lastTime >= this.settings.alertCooldown
  }

  private recordAlert(type: string): void {
    this.lastAlertTime.set(type, Date.now())
  }

  async processDetectionResults(results: DetectionResult[]): Promise<void> {
    // 最も深刻な問題を見つける
    let mostSevere: DetectionResult | null = null
    const levelPriority: Record<AlertLevel, number> = {
      good: 0,
      warning: 1,
      danger: 2
    }

    for (const result of results) {
      if (result.detected && this.canAlert(result.type)) {
        if (!mostSevere || levelPriority[result.level] > levelPriority[mostSevere.level]) {
          mostSevere = result
        }
      }
    }

    if (mostSevere) {
      // 音声アラート
      if (this.settings.soundEnabled) {
        await this.soundAlert.playBeep(mostSevere.level)
      }

      // デスクトップ通知
      if (this.settings.notificationEnabled) {
        await this.notificationAlert.show(
          'Mirror ReLU',
          mostSevere.message
        )
      }

      // オーバーレイ更新
      if (this.settings.overlayEnabled && window.electronAPI) {
        await window.electronAPI.updateOverlay({
          type: mostSevere.type,
          message: mostSevere.message,
          level: mostSevere.level
        })
      }

      this.recordAlert(mostSevere.type)
    } else if (results.length === 0 || results.every(r => !r.detected)) {
      // 問題がない場合はオーバーレイを緑に
      if (this.settings.overlayEnabled && window.electronAPI) {
        await window.electronAPI.updateOverlay({
          type: 'none',
          message: '良好な状態です',
          level: 'good'
        })
      }
    }
  }

  getActiveAlerts(): string[] {
    const now = Date.now()
    const active: string[] = []

    for (const [type, time] of this.lastAlertTime.entries()) {
      if (now - time < this.settings.alertCooldown) {
        active.push(type)
      }
    }

    return active
  }

  close(): void {
    this.soundAlert.close()
  }
}
