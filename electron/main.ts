import { app, BrowserWindow, ipcMain, Notification, screen, systemPreferences, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

// macOSでカメラアクセス許可を要求
async function requestCameraAccess(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return true
  }

  const status = systemPreferences.getMediaAccessStatus('camera')
  console.log('Camera access status:', status)

  if (status === 'not-determined') {
    // 許可を要求
    const granted = await systemPreferences.askForMediaAccess('camera')
    console.log('Camera access granted:', granted)
    return granted
  }

  return status === 'granted'
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false  // 仮想デスクトップ切り替え時もバックグラウンドで動作
    }
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    if (overlayWindow) {
      overlayWindow.close()
    }
  })
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width } = primaryDisplay.workAreaSize

  overlayWindow = new BrowserWindow({
    width: 300,
    height: 100,
    x: width - 320,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 全ての仮想デスクトップで表示（macOS）
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWindow.setAlwaysOnTop(true, 'floating', 1)

  overlayWindow.setIgnoreMouseEvents(true, { forward: true })

  if (VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(`${VITE_DEV_SERVER_URL}#/overlay`)
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/overlay'
    })
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

// IPC handlers
ipcMain.handle('show-notification', (_event, title: string, body: string) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
})

// メインプロセスで音声を再生（仮想デスクトップ切り替え時も動作）
ipcMain.handle('play-beep', (_event, level: 'warning' | 'danger') => {
  if (process.platform === 'darwin') {
    // macOSのシステムサウンドを使用
    const sound = level === 'danger' ? 'Basso' : 'Tink'
    exec(`afplay /System/Library/Sounds/${sound}.aiff`)
  } else if (process.platform === 'win32') {
    // WindowsのPowerShellでビープ音
    const freq = level === 'danger' ? 880 : 440
    exec(`powershell -c "[console]::beep(${freq}, 200)"`)
  } else {
    shell.beep()
  }
})

// メインプロセスで音声読み上げ（仮想デスクトップ切り替え時も動作）
ipcMain.handle('speak', (_event, message: string) => {
  const escaped = message.replace(/"/g, '\\"')
  if (process.platform === 'darwin') {
    // macOSのsayコマンドを使用
    exec(`say -v Kyoko "${escaped}"`)
  } else if (process.platform === 'win32') {
    // WindowsのSAPIを使用
    exec(`powershell -c "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${escaped.replace(/'/g, "''")}')"`)
  }
})

ipcMain.handle('update-overlay', (_event, status: { type: string; message: string; level: 'good' | 'warning' | 'danger' }) => {
  if (overlayWindow) {
    overlayWindow.webContents.send('status-update', status)
  }
})

ipcMain.handle('toggle-overlay', (_event, visible: boolean) => {
  if (overlayWindow) {
    if (visible) {
      overlayWindow.show()
    } else {
      overlayWindow.hide()
    }
  }
})

// カメラアクセス状況を取得
ipcMain.handle('get-camera-access-status', () => {
  if (process.platform !== 'darwin') {
    return 'granted'
  }
  return systemPreferences.getMediaAccessStatus('camera')
})

// カメラアクセスを再要求
ipcMain.handle('request-camera-access', async () => {
  return await requestCameraAccess()
})

// システム設定を開く（macOS）
ipcMain.handle('open-privacy-settings', async () => {
  if (process.platform === 'darwin') {
    // macOS Ventura以降
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Camera')
  }
})

app.whenReady().then(async () => {
  // macOSでカメラアクセス許可を要求
  const cameraGranted = await requestCameraAccess()
  if (!cameraGranted) {
    console.warn('Camera access was not granted. The app may not work correctly.')
  }

  createMainWindow()
  createOverlayWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
      createOverlayWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
