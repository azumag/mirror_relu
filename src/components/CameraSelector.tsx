import { CameraDevice } from './Camera'

interface CameraSelectorProps {
  devices: CameraDevice[]
  selectedDeviceId: string | undefined
  onSelect: (deviceId: string) => void
  isLoading: boolean
  onRefresh: () => void
}

export function CameraSelector({
  devices,
  selectedDeviceId,
  onSelect,
  isLoading,
  onRefresh
}: CameraSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm text-gray-400">カメラ:</label>
      <select
        value={selectedDeviceId || ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={isLoading || devices.length === 0}
        className="bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
      >
        {devices.length === 0 ? (
          <option value="">カメラが見つかりません</option>
        ) : (
          <>
            <option value="">カメラを選択...</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </>
        )}
      </select>
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        title="デバイス一覧を更新"
      >
        <svg
          className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  )
}
