import { DetectionResult, PostureStatus, FaceStatus, HandStatus } from '../detectors/types'

interface StatusPanelProps {
  postureStatus: PostureStatus | null
  faceStatus: FaceStatus | null
  handStatus: HandStatus | null
  activeAlerts: DetectionResult[]
  isMonitoring: boolean
}

export function StatusPanel({
  postureStatus,
  faceStatus,
  handStatus,
  activeAlerts,
  isMonitoring
}: StatusPanelProps) {
  const getStatusColor = (value: number, threshold: number) => {
    if (value < threshold * 0.5) return 'bg-green-500'
    if (value < threshold) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatValue = (value: number) => (value * 100).toFixed(0)

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">モニター状態</h2>
        <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
      </div>

      {/* アクティブなアラート */}
      {activeAlerts.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">検出中の問題</h3>
          <div className="space-y-2">
            {activeAlerts.map((alert, index) => (
              <div
                key={index}
                className={`p-2 rounded ${
                  alert.level === 'danger' ? 'bg-red-600' : 'bg-yellow-600'
                }`}
              >
                <p className="text-sm font-medium">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 姿勢ステータス */}
      {postureStatus && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">姿勢</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">肩の傾き</span>
              <div className="flex items-center">
                <div className="w-24 h-2 bg-gray-600 rounded-full mr-2">
                  <div
                    className={`h-full rounded-full ${getStatusColor(postureStatus.shoulderTilt, 10)}`}
                    style={{ width: `${Math.min(postureStatus.shoulderTilt / 30 * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs w-12">{postureStatus.shoulderTilt.toFixed(1)}°</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">頭の前傾</span>
              <div className="flex items-center">
                <div className="w-24 h-2 bg-gray-600 rounded-full mr-2">
                  <div
                    className={`h-full rounded-full ${getStatusColor(postureStatus.headForward, 0.3)}`}
                    style={{ width: `${Math.min(postureStatus.headForward * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs w-12">{formatValue(postureStatus.headForward)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">猫背</span>
              <span className={`text-xs px-2 py-1 rounded ${postureStatus.isHunched ? 'bg-red-600' : 'bg-green-600'}`}>
                {postureStatus.isHunched ? '検出' : '正常'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 顔ステータス */}
      {faceStatus && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">顔</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">口の開き</span>
              <div className="flex items-center">
                <div className="w-24 h-2 bg-gray-600 rounded-full mr-2">
                  <div
                    className={`h-full rounded-full ${getStatusColor(faceStatus.mouthOpen, 0.3)}`}
                    style={{ width: `${Math.min(faceStatus.mouthOpen * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs w-12">{formatValue(faceStatus.mouthOpen)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">斜視</span>
              <div className="flex items-center">
                <div className="w-24 h-2 bg-gray-600 rounded-full mr-2">
                  <div
                    className={`h-full rounded-full ${getStatusColor(faceStatus.eyeGazeDeviation, 0.2)}`}
                    style={{ width: `${Math.min(faceStatus.eyeGazeDeviation * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs w-12">{formatValue(faceStatus.eyeGazeDeviation)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">噛み締め</span>
              <div className="flex items-center">
                <div className="w-24 h-2 bg-gray-600 rounded-full mr-2">
                  <div
                    className={`h-full rounded-full ${getStatusColor(faceStatus.jawTension, 0.6)}`}
                    style={{ width: `${Math.min(faceStatus.jawTension * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs w-12">{formatValue(faceStatus.jawTension)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 手ステータス */}
      {handStatus && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">手</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm">顔への接触</span>
            <span className={`text-xs px-2 py-1 rounded ${handStatus.touchingFace ? 'bg-red-600' : 'bg-green-600'}`}>
              {handStatus.touchingFace ? '検出' : 'なし'}
            </span>
          </div>
        </div>
      )}

      {!postureStatus && !faceStatus && !handStatus && (
        <p className="text-gray-500 text-sm text-center">
          検出待機中...
        </p>
      )}
    </div>
  )
}
