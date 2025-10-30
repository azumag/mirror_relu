# アーキテクチャ設計書

## 1. システムアーキテクチャ概要

Mirror ReLuは、クライアントサイドで完結する姿勢検出システムです。

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / Desktop App                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   UI Layer  │  │ Alert System │  │  Statistics  │   │
│  │  (React)    │  │  (Audio API) │  │   (Charts)   │   │
│  └──────┬──────┘  └──────▲───────┘  └──────▲───────┘   │
│         │                │                   │            │
│         │                │                   │            │
│  ┌──────▼────────────────┴───────────────────┴───────┐  │
│  │         Detection Engine (Orchestrator)            │  │
│  │  - 検出ロジック統合                                   │  │
│  │  - 閾値判定                                          │  │
│  │  - アラートトリガー                                    │  │
│  └──────┬────────────────────────────────────────────┘  │
│         │                                                │
│  ┌──────▼──────────────────────────────────┐            │
│  │      AI Processing Layer                │            │
│  │  ┌────────────┐  ┌──────────────────┐  │            │
│  │  │ MediaPipe  │  │  TensorFlow.js   │  │            │
│  │  │ Face Mesh  │  │   (Optional)     │  │            │
│  │  │   & Pose   │  │                  │  │            │
│  │  └─────┬──────┘  └─────┬────────────┘  │            │
│  └────────┼─────────────────┼──────────────┘            │
│           │                 │                            │
│  ┌────────▼─────────────────▼──────────────┐            │
│  │       Camera Input (WebRTC)              │            │
│  │         getUserMedia API                 │            │
│  └──────────────────────────────────────────┘            │
│                                                           │
│  ┌───────────────────────────────────────────┐           │
│  │    Local Storage (Settings & Stats)       │           │
│  │  - IndexedDB / LocalStorage                │           │
│  └───────────────────────────────────────────┘           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 2. レイヤー別詳細設計

### 2.1 UI Layer

**責務**: ユーザーインターフェース、ユーザー操作の処理

**主要コンポーネント**:
```
src/components/
├── CameraPreview/          # カメラプレビュー表示
│   ├── CameraPreview.tsx
│   └── SkeletonOverlay.tsx # 検出結果のオーバーレイ
├── Settings/               # 設定画面
│   ├── DetectionSettings.tsx
│   ├── AlertSettings.tsx
│   └── CalibrationWizard.tsx
├── Dashboard/              # 統計ダッシュボード
│   ├── StatsOverview.tsx
│   ├── TrendChart.tsx
│   └── DetectionHistory.tsx
└── Common/
    ├── Button.tsx
    ├── Slider.tsx
    └── Toggle.tsx
```

### 2.2 Detection Engine

**責務**: AI出力の解釈、検出ロジック、アラート判定

**主要モジュール**:
```typescript
// src/engine/DetectionEngine.ts
class DetectionEngine {
  private detectors: Map<string, BaseDetector>;
  private alertManager: AlertManager;
  private statsCollector: StatsCollector;

  async processFrame(landmarks: Landmarks): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    for (const [name, detector] of this.detectors) {
      if (detector.isEnabled()) {
        const result = await detector.detect(landmarks);
        if (result.shouldAlert) {
          results.push(result);
        }
      }
    }

    return results;
  }
}
```

**検出器の種類**:
```typescript
// src/detectors/
interface BaseDetector {
  detect(landmarks: Landmarks): Promise<DetectionResult>;
  isEnabled(): boolean;
  getSensitivity(): Sensitivity;
}

// 各検出器
- SlouchingDetector      // 猫背検出
- ScreenDistanceDetector // 画面距離
- CheekRestDetector      // 頬杖
- NeckTiltDetector       // 首傾き
- FaceScratchDetector    // 顔掻き（動作検出）
- MouthOpenDetector      // 口開き
- JawClenchDetector      // 食いしばり
```

### 2.3 AI Processing Layer

**責務**: カメラ映像から特徴点（landmarks）を抽出

#### MediaPipe統合

```typescript
// src/ai/MediaPipeProcessor.ts
import { FaceMesh, Pose } from '@mediapipe/tasks-vision';

class MediaPipeProcessor {
  private faceMesh: FaceMesh;
  private pose: Pose;

  async initialize() {
    this.faceMesh = await FaceMesh.createFromOptions({
      baseOptions: {
        modelAssetPath: '/models/face_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numFaces: 1
    });

    this.pose = await Pose.createFromOptions({
      baseOptions: {
        modelAssetPath: '/models/pose_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO'
    });
  }

  async process(videoFrame: HTMLVideoElement): Promise<ProcessedData> {
    const faceResults = this.faceMesh.detectForVideo(videoFrame, timestamp);
    const poseResults = this.pose.detectForVideo(videoFrame, timestamp);

    return {
      faceLandmarks: faceResults.faceLandmarks[0],
      poseLandmarks: poseResults.landmarks[0],
      timestamp: Date.now()
    };
  }
}
```

**使用するランドマーク**:
- **Face Mesh**: 478個の顔特徴点
  - 口の開閉: 唇周辺の点
  - 顔の向き: 鼻筋、顔輪郭
  - 食いしばり: 顎の筋肉ライン
- **Pose**: 33個の身体特徴点
  - 姿勢: 肩、首、背骨のライン
  - 頬杖: 手と顔の距離

### 2.4 Alert System

**責務**: 音声アラートの生成と再生

```typescript
// src/alert/AlertManager.ts
class AlertManager {
  private audioContext: AudioContext;
  private lastAlertTime: Map<string, number>;

  async playAlert(detectionType: string, settings: AlertSettings) {
    // アラート間隔チェック
    if (!this.shouldPlayAlert(detectionType, settings.alertInterval)) {
      return;
    }

    // 音声合成
    const utterance = new SpeechSynthesisUtterance(
      this.getMessage(detectionType, settings.language)
    );
    utterance.voice = this.getVoice(settings.voiceType);
    utterance.volume = settings.volume / 100;

    speechSynthesis.speak(utterance);

    this.lastAlertTime.set(detectionType, Date.now());
  }

  private getMessage(type: string, lang: string): string {
    const messages = {
      slouching: {
        ja: '猫背になっています',
        en: 'You are slouching'
      },
      screenDistance: {
        ja: '画面に近づきすぎです',
        en: 'You are too close to the screen'
      },
      // ... 他の検出項目
    };
    return messages[type][lang];
  }
}
```

### 2.5 Statistics & Storage

**責務**: 検出履歴の保存、統計計算

```typescript
// src/stats/StatsCollector.ts
class StatsCollector {
  private db: IDBDatabase;

  async recordDetection(type: string, duration: number) {
    const transaction = this.db.transaction(['detections'], 'readwrite');
    const store = transaction.objectStore('detections');

    await store.add({
      type,
      timestamp: new Date(),
      duration
    });
  }

  async getStatistics(period: 'day' | 'week' | 'month'): Promise<Statistics> {
    // IndexedDBからデータ取得して集計
    const detections = await this.getDetectionsForPeriod(period);

    return {
      totalDetections: detections.length,
      byType: this.groupByType(detections),
      trend: this.calculateTrend(detections)
    };
  }
}
```

**IndexedDB スキーマ**:
```typescript
// DB: mirror-relu
// Stores:
//   - settings: ユーザー設定
//   - detections: 検出履歴
//   - calibration: キャリブレーションデータ

interface DetectionRecord {
  id?: number;
  type: string;
  timestamp: Date;
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high';
}
```

---

## 3. データフロー

### 3.1 通常動作時のフロー

```
1. カメラ → VideoElement (30fps)
   │
2. VideoElement → MediaPipeProcessor.process()
   │
3. MediaPipeProcessor → Landmarks (顔478点 + 身体33点)
   │
4. Landmarks → DetectionEngine.processFrame()
   │
5. DetectionEngine → 各Detector.detect()
   │
6. Detectors → DetectionResult[]
   │
7. DetectionResult → AlertManager (条件満たせば)
   │
8. AlertManager → 音声アラート再生
   │
9. DetectionResult → StatsCollector.recordDetection()
   │
10. StatsCollector → IndexedDB保存
```

### 3.2 キャリブレーションフロー

```
1. ユーザー「正しい姿勢」でスタート
   │
2. 5秒間Landmarks収集
   │
3. 平均値を「基準姿勢」として保存
   │
4. 基準姿勢 → LocalStorage/IndexedDB
   │
5. Detectorが基準姿勢と比較して検出
```

---

## 4. 検出アルゴリズム詳細

### 4.1 猫背検出 (Slouching)

```typescript
class SlouchingDetector implements BaseDetector {
  detect(landmarks: ProcessedData): DetectionResult {
    const { poseLandmarks } = landmarks;

    // 肩と首の角度を計算
    const leftShoulder = poseLandmarks[11];
    const rightShoulder = poseLandmarks[12];
    const neck = poseLandmarks[0];

    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2
    };

    // 首の前傾角度
    const angle = this.calculateAngle(neck, shoulderMidpoint);

    // キャリブレーションデータとの差分
    const deviation = angle - this.calibration.correctAngle;

    return {
      type: 'slouching',
      detected: deviation > this.getThreshold(),
      severity: this.calculateSeverity(deviation),
      shouldAlert: this.shouldTriggerAlert(deviation)
    };
  }
}
```

### 4.2 画面距離検出

```typescript
class ScreenDistanceDetector implements BaseDetector {
  detect(landmarks: ProcessedData): DetectionResult {
    const { faceLandmarks } = landmarks;

    // 両目の距離から顔の大きさ（≒距離）を推定
    const leftEye = faceLandmarks[33];
    const rightEye = faceLandmarks[263];

    const eyeDistance = this.calculateDistance(leftEye, rightEye);

    // キャリブレーション時の距離と比較
    const ratio = eyeDistance / this.calibration.eyeDistanceAtOptimal;

    // ratio > 1 = 近い, ratio < 1 = 遠い
    const tooClose = ratio > 1.2; // 20%近い

    return {
      type: 'screenDistance',
      detected: tooClose,
      severity: this.calculateSeverity(ratio),
      shouldAlert: tooClose
    };
  }
}
```

### 4.3 口が開いている検出

```typescript
class MouthOpenDetector implements BaseDetector {
  private openDuration: number = 0;

  detect(landmarks: ProcessedData): DetectionResult {
    const { faceLandmarks } = landmarks;

    // 上唇と下唇の距離
    const upperLip = faceLandmarks[13];
    const lowerLip = faceLandmarks[14];

    const mouthOpenness = this.calculateDistance(upperLip, lowerLip);
    const threshold = this.getThreshold(); // 感度による

    const isOpen = mouthOpenness > threshold;

    if (isOpen) {
      this.openDuration += 1/30; // 30fps想定
    } else {
      this.openDuration = 0;
    }

    // 5秒以上開いていたらアラート
    return {
      type: 'mouthOpen',
      detected: isOpen,
      severity: this.openDuration > 5 ? 'high' : 'medium',
      shouldAlert: this.openDuration > 5
    };
  }
}
```

### 4.4 顔掻き検出（動作検出）

```typescript
class FaceScratchDetector implements BaseDetector {
  private handPositionHistory: Position[] = [];
  private facePositionHistory: Position[] = [];

  detect(landmarks: ProcessedData): DetectionResult {
    const { poseLandmarks, faceLandmarks } = landmarks;

    const leftHand = poseLandmarks[15];
    const rightHand = poseLandmarks[16];
    const faceCenter = this.getFaceCenter(faceLandmarks);

    // 手と顔の距離
    const leftDist = this.calculateDistance(leftHand, faceCenter);
    const rightDist = this.calculateDistance(rightHand, faceCenter);

    const handNearFace = Math.min(leftDist, rightDist) < 0.1; // 閾値

    // 履歴を使って「掻く動作」（往復運動）を検出
    this.handPositionHistory.push(leftHand, rightHand);
    if (this.handPositionHistory.length > 30) { // 1秒分
      this.handPositionHistory.shift();
    }

    const isScratching = handNearFace && this.detectRepetitiveMotion();

    return {
      type: 'faceScratch',
      detected: isScratching,
      severity: 'medium',
      shouldAlert: isScratching
    };
  }

  private detectRepetitiveMotion(): boolean {
    // 位置履歴から往復運動パターンを検出
    // フーリエ変換または簡易的なピーク検出
    // 実装例: 速度の変化を見る
    return false; // TODO: 実装
  }
}
```

---

## 5. パフォーマンス最適化

### 5.1 フレームレート調整

```typescript
class FrameRateController {
  private targetFPS: number = 15; // 省電力
  private lastProcessTime: number = 0;

  shouldProcessFrame(currentTime: number): boolean {
    const interval = 1000 / this.targetFPS;
    if (currentTime - this.lastProcessTime >= interval) {
      this.lastProcessTime = currentTime;
      return true;
    }
    return false;
  }
}
```

### 5.2 Worker活用（将来的）

```typescript
// メインスレッドの負荷軽減のため、AI処理をWorkerで実行
// src/workers/detection.worker.ts
self.addEventListener('message', async (e) => {
  const { imageData } = e.data;
  const landmarks = await processWithMediaPipe(imageData);
  self.postMessage({ landmarks });
});
```

---

## 6. エラーハンドリング

```typescript
class ErrorHandler {
  handleCameraError(error: DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
        // カメラ権限が拒否された
        this.showPermissionGuide();
        break;
      case 'NotFoundError':
        // カメラが見つからない
        this.showNoCameraMessage();
        break;
      case 'NotReadableError':
        // カメラが他のアプリで使用中
        this.showCameraInUseMessage();
        break;
    }
  }

  handleModelLoadError(error: Error) {
    // モデルファイルの読み込み失敗
    // フォールバック: 軽量モデルに切り替え、またはオフライン通知
    this.fallbackToLightModel();
  }
}
```

---

## 7. セキュリティ考慮事項

### 7.1 データプライバシー

- カメラフレームはメモリ上でのみ処理、ディスクに保存しない
- ランドマークデータ（座標）のみを一時保持
- 統計データは匿名化（画像は含まない）

### 7.2 Content Security Policy (CSP)

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'wasm-unsafe-eval';
               connect-src 'self';
               media-src 'self';
               img-src 'self' blob:;">
```

---

## 8. テスト戦略

### 8.1 ユニットテスト
- 各Detectorのロジック
- AlertManagerのタイミング制御
- StatsCollectorの集計ロジック

### 8.2 統合テスト
- カメラ → AI → 検出 → アラートの一連のフロー
- 設定変更の反映確認

### 8.3 E2Eテスト
- 初回セットアップフロー
- キャリブレーション機能

### 8.4 パフォーマンステスト
- 長時間稼働時のメモリリーク確認
- CPU使用率モニタリング

---

## 9. デプロイメント

### Phase 1: Webアプリ
- **ホスティング**: Vercel / Netlify
- **CI/CD**: GitHub Actions
- **モデルファイル**: CDN配信

### Phase 1.5: Chrome拡張
- **配布**: Chrome Web Store
- **アップデート**: 自動更新

### Phase 2: デスクトップ
- **ビルド**: Electron Builder / Tauri
- **配布**: GitHub Releases / 専用サイト
- **自動更新**: electron-updater

---

**文書作成日**: 2025-10-30
**バージョン**: 1.0
