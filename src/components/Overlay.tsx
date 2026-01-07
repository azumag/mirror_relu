import { useEffect, useState } from 'react'
import { AlertLevel } from '../detectors/types'

interface OverlayStatus {
  type: string
  message: string
  level: AlertLevel
}

export default function Overlay() {
  const [status, setStatus] = useState<OverlayStatus>({
    type: 'none',
    message: '監視を開始してください',
    level: 'good'
  })

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onStatusUpdate((newStatus) => {
        setStatus(newStatus)
      })
    }
  }, [])

  const getBgColor = (level: AlertLevel) => {
    switch (level) {
      case 'good':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'danger':
        return 'bg-red-500'
    }
  }

  const getBorderColor = (level: AlertLevel) => {
    switch (level) {
      case 'good':
        return 'border-green-400'
      case 'warning':
        return 'border-yellow-400'
      case 'danger':
        return 'border-red-400'
    }
  }

  return (
    <div className="overlay-container w-full h-full p-2">
      <div
        className={`
          ${getBgColor(status.level)}
          ${getBorderColor(status.level)}
          bg-opacity-90 border-2 rounded-lg p-3
          transition-colors duration-300
        `}
      >
        <div className="flex items-center space-x-2">
          <div
            className={`
              w-3 h-3 rounded-full
              ${status.level === 'good' ? 'bg-green-300' : ''}
              ${status.level === 'warning' ? 'bg-yellow-300 animate-pulse' : ''}
              ${status.level === 'danger' ? 'bg-red-300 animate-ping' : ''}
            `}
          />
          <span className="text-white font-medium text-sm">
            Mirror ReLU
          </span>
        </div>
        <p className="text-white text-xs mt-1 opacity-90">
          {status.message}
        </p>
      </div>
    </div>
  )
}
