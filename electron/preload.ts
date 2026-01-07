const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', title, body),

  updateOverlay: (status: { type: string; message: string; level: 'good' | 'warning' | 'danger' }) =>
    ipcRenderer.invoke('update-overlay', status),

  toggleOverlay: (visible: boolean) =>
    ipcRenderer.invoke('toggle-overlay', visible),

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
