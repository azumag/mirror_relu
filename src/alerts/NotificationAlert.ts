export class NotificationAlert {
  private enabled: boolean = true

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  async show(title: string, body: string): Promise<void> {
    if (!this.enabled) return

    // Electron環境ではIPC経由で通知
    if (window.electronAPI) {
      await window.electronAPI.showNotification(title, body)
    } else {
      // ブラウザ環境ではWeb Notification API
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body })
        } else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            new Notification(title, { body })
          }
        }
      }
    }
  }
}
