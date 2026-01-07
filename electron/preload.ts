const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', title, body),

  updateOverlay: (status: { type: string; message: string; level: 'good' | 'warning' | 'danger' }) =>
    ipcRenderer.invoke('update-overlay', status),

  toggleOverlay: (visible: boolean) =>
    ipcRenderer.invoke('toggle-overlay', visible),

  // メインプロセスで音声を再生（仮想デスクトップ切り替え時も動作）
  playBeep: (level: 'warning' | 'danger') =>
    ipcRenderer.invoke('play-beep', level),

  // メインプロセスで音声読み上げ
  speak: (message: string) =>
    ipcRenderer.invoke('speak', message),

  onStatusUpdate: (callback: (status: { type: string; message: string; level: 'good' | 'warning' | 'danger' }) => void) => {
    ipcRenderer.on('status-update', (_event: unknown, status: unknown) => callback(status as { type: string; message: string; level: 'good' | 'warning' | 'danger' }))
  },

  // カメラアクセス関連
  getCameraAccessStatus: () =>
    ipcRenderer.invoke('get-camera-access-status'),

  requestCameraAccess: () =>
    ipcRenderer.invoke('request-camera-access'),

  openPrivacySettings: () =>
    ipcRenderer.invoke('open-privacy-settings')
})
