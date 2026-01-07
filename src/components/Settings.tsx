import { MonitorSettings } from '../detectors/types'

interface SettingsProps {
  settings: MonitorSettings
  onSettingsChange: (settings: MonitorSettings) => void
  isOpen: boolean
  onClose: () => void
}

export function Settings({ settings, onSettingsChange, isOpen, onClose }: SettingsProps) {
  if (!isOpen) return null

  const updateSetting = <K extends keyof MonitorSettings>(
    key: K,
    value: MonitorSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* アラート設定 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">アラート</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm">音声アラート</span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">デスクトップ通知</span>
              <input
                type="checkbox"
                checked={settings.notificationEnabled}
                onChange={(e) => updateSetting('notificationEnabled', e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">オーバーレイ表示</span>
              <input
                type="checkbox"
                checked={settings.overlayEnabled}
                onChange={(e) => updateSetting('overlayEnabled', e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <div>
              <label className="text-sm block mb-1">
                アラート間隔: {(settings.alertCooldown / 1000).toFixed(1)}秒
              </label>
              <input
                type="range"
                min="1000"
                max="30000"
                step="1000"
                value={settings.alertCooldown}
                onChange={(e) => updateSetting('alertCooldown', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* 検出項目 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">検出項目</h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between">
              <span className="text-sm">肩の傾き</span>
              <input
                type="checkbox"
                checked={settings.shoulderTiltEnabled}
                onChange={(e) => updateSetting('shoulderTiltEnabled', e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">頭の前傾</span>
              <input
                type="checkbox"
                checked={settings.headForwardEnabled}
                onChange={(e) => updateSetting('headForwardEnabled', e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">猫背</span>
              <input
                type="checkbox"
                checked={settings.hunchedEnabled}
                onChange={(e) => updateSetting('hunchedEnabled', e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">口の開き</span>
              <input
                type="checkbox"
                checked={settings.mouthOpenEnabled}
                onChange={(e) => updateSetting('mouthOpenEnabled', e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">斜視</span>
              <input
                type="checkbox"
                checked={settings.gazeDeviationEnabled}
                onChange={(e) => updateSetting('gazeDeviationEnabled', e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">噛み締め</span>
              <input
                type="checkbox"
                checked={settings.jawTensionEnabled}
                onChange={(e) => updateSetting('jawTensionEnabled', e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">顔に手を近づける</span>
              <input
                type="checkbox"
                checked={settings.handFaceEnabled}
                onChange={(e) => updateSetting('handFaceEnabled', e.target.checked)}
                className="w-5 h-5"
              />
            </label>
          </div>
        </div>

        {/* 姿勢閾値 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">姿勢の感度</h3>
          <div className="space-y-3">
            <div className={settings.shoulderTiltEnabled ? '' : 'opacity-50'}>
              <label className="text-sm block mb-1">
                肩の傾き閾値: {settings.shoulderTiltThreshold}°
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={settings.shoulderTiltThreshold}
                onChange={(e) => updateSetting('shoulderTiltThreshold', Number(e.target.value))}
                className="w-full"
                disabled={!settings.shoulderTiltEnabled}
              />
            </div>
            <div className={settings.headForwardEnabled ? '' : 'opacity-50'}>
              <label className="text-sm block mb-1">
                頭の前傾閾値: {(settings.headForwardThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={settings.headForwardThreshold}
                onChange={(e) => updateSetting('headForwardThreshold', Number(e.target.value))}
                className="w-full"
                disabled={!settings.headForwardEnabled}
              />
            </div>
          </div>
        </div>

        {/* 顔の閾値 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">顔の感度</h3>
          <div className="space-y-3">
            <div className={settings.mouthOpenEnabled ? '' : 'opacity-50'}>
              <label className="text-sm block mb-1">
                口の開き閾値: {(settings.mouthOpenThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="0.6"
                step="0.05"
                value={settings.mouthOpenThreshold}
                onChange={(e) => updateSetting('mouthOpenThreshold', Number(e.target.value))}
                className="w-full"
                disabled={!settings.mouthOpenEnabled}
              />
            </div>
            <div className={settings.gazeDeviationEnabled ? '' : 'opacity-50'}>
              <label className="text-sm block mb-1">
                斜視閾値: {(settings.gazeDeviationThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={settings.gazeDeviationThreshold}
                onChange={(e) => updateSetting('gazeDeviationThreshold', Number(e.target.value))}
                className="w-full"
                disabled={!settings.gazeDeviationEnabled}
              />
            </div>
            <div className={settings.jawTensionEnabled ? '' : 'opacity-50'}>
              <label className="text-sm block mb-1">
                噛み締め閾値: {(settings.jawTensionThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.05"
                value={settings.jawTensionThreshold}
                onChange={(e) => updateSetting('jawTensionThreshold', Number(e.target.value))}
                className="w-full"
                disabled={!settings.jawTensionEnabled}
              />
            </div>
          </div>
        </div>

        {/* 手の閾値 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">手の感度</h3>
          <div className={settings.handFaceEnabled ? '' : 'opacity-50'}>
            <label className="text-sm block mb-1">
              顔接近閾値: {(settings.handFaceDistanceThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.05"
              max="0.3"
              step="0.01"
              value={settings.handFaceDistanceThreshold}
              onChange={(e) => updateSetting('handFaceDistanceThreshold', Number(e.target.value))}
              className="w-full"
              disabled={!settings.handFaceEnabled}
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}
