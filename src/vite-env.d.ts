/// <reference types="vite/client" />

type CameraAccessStatus = 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown'

interface ElectronAPI {
  showNotification: (title: string, body: string) => Promise<void>
  updateOverlay: (status: { type: string; message: string; level: 'good' | 'warning' | 'danger' }) => Promise<void>
  toggleOverlay: (visible: boolean) => Promise<void>
  onStatusUpdate: (callback: (status: { type: string; message: string; level: 'good' | 'warning' | 'danger' }) => void) => void
  getCameraAccessStatus: () => Promise<CameraAccessStatus>
  requestCameraAccess: () => Promise<boolean>
  openPrivacySettings: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
