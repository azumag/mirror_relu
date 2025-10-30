# 姿勢・癖矯正アラートアプリ 要件定義書

## 1. プロジェクト概要

### 1.1 プロジェクト名
**Mirror ReLu** (Posture & Habit Correction Alert System)

### 1.2 目的
Webカメラの映像をリアルタイムで解析し、ユーザーの悪い姿勢や癖を検出して音声アラートで通知することで、長時間のPC作業やゲーミングにおける健康リスクを低減する。

### 1.3 ターゲットユーザー
- 長時間デスクワークを行うオフィスワーカー
- リモートワーカー
- プログラマー・デザイナーなどのクリエイター
- ゲーマー（長時間ゲームをプレイする人）
- オンライン学習を行う学生

---

## 2. 機能要件

### 2.1 姿勢・癖検出機能

以下の姿勢・癖をリアルタイムで検出する：

| 検出項目 | 説明 | 優先度 |
|---------|------|--------|
| **猫背・前傾姿勢** | 背中が丸まっている状態、前に傾きすぎている状態 | 高 |
| **画面距離（近すぎ）** | 顔とモニターの距離が適正値より近い状態 | 高 |
| **頬杖** | 手で頬を支えている状態 | 中 |
| **首の傾き** | 首が左右に大きく傾いている状態 | 中 |
| **顔掻き** | 顔を掻く動作の頻度が高い状態 | 中 |
| **口が開いている** | 口が長時間開いたままの状態 | 中 |
| **食いしばり** | 歯を食いしばっている表情 | 低 |

### 2.2 検出設定のカスタマイズ機能

- **個別ON/OFF設定**: ユーザーが各検出項目を個別に有効/無効にできる
- **感度調整**: 各検出項目の感度を調整可能（低・中・高）
- **検出時間閾値**: 何秒間その状態が続いたらアラートを出すか設定可能
- **アラート間隔**: 同じアラートを再度出すまでの最小間隔を設定可能

### 2.3 アラート機能

- **音声アラート**: 検出内容に応じた音声通知
  - 例: 「猫背になっています」「画面に近づきすぎです」
  - 音声の種類を選択可能（男性/女性、トーン）
  - 音量調整機能
- **アラート履歴**: アラートが発生した時刻と内容を記録
- **統計表示**: 1日/1週間/1ヶ月の各癖の発生回数・時間を可視化

### 2.4 キャリブレーション機能

- **初回セットアップ**: 正しい姿勢を記憶させる
- **適正距離設定**: ユーザーの適正な画面距離を設定
- **再キャリブレーション**: いつでも基準姿勢を再設定可能

### 2.5 プライバシー保護機能

- **ローカル処理のみ**: カメラ映像は全てブラウザ/アプリ内で処理、外部送信なし
- **一時停止機能**: カメラ監視を一時的にOFF
- **視覚的インジケーター**: カメラ使用中であることを明示

---

## 3. 非機能要件

### 3.1 パフォーマンス要件

- **リアルタイム性**: 映像処理のレイテンシ < 500ms
- **CPU使用率**: 通常動作時のCPU使用率 < 30%
- **メモリ使用量**: < 500MB
- **フレームレート**: 15-30 FPS での処理

### 3.2 ユーザビリティ要件

- **簡単セットアップ**: 初回起動から使用開始まで3分以内
- **直感的UI**: 技術的知識がなくても操作可能
- **軽量動作**: バックグラウンドで動作し、作業を妨げない

### 3.3 互換性要件

- **ブラウザ対応** (Phase 1):
  - Chrome 90+
  - Edge 90+
  - Firefox 88+
  - Safari 14+ (将来対応)

- **OS対応** (Phase 2):
  - Windows 10/11
  - macOS 11+
  - Linux (Ubuntu 20.04+)

### 3.4 セキュリティ要件

- カメラ映像は一切保存しない
- 画像データはメモリ上でのみ処理
- 個人設定データは暗号化して保存
- カメラアクセス権限の明示的な要求

### 3.5 アクセシビリティ要件

- キーボードショートカットでの操作
- 色覚異常に配慮したUI配色
- 音声アラートの代替として視覚通知も選択可能（将来対応）

---

## 4. 技術要件

### 4.1 Phase 1: Webアプリ

#### フロントエンド技術スタック
- **フレームワーク**: React 18+ または Vue 3+
- **言語**: TypeScript
- **画像処理**:
  - TensorFlow.js
  - MediaPipe (顔検出・ポーズ推定)
- **音声**: Web Speech API または Howler.js
- **状態管理**: Zustand または Pinia
- **UI**: Tailwind CSS + shadcn/ui または Vuetify

#### カメラアクセス
- WebRTC (getUserMedia API)
- カメラ解像度: 640x480 以上

### 4.2 Phase 1.5: Chrome拡張機能

- **Manifest**: V3
- **権限**:
  - camera
  - storage (設定保存用)
  - notifications (オプション)
- **アーキテクチャ**:
  - Popup UI: 設定画面
  - Background Service Worker: 状態管理
  - Content Script: 必要に応じて

### 4.3 Phase 2: デスクトップアプリ

- **フレームワーク**: Electron または Tauri
- **クロスプラットフォーム対応**: Windows, macOS, Linux
- **システムトレイ常駐**: 起動時自動起動オプション
- **ネイティブ通知**: OS標準の通知システム統合

### 4.4 AIモデル要件

- **顔検出**: MediaPipe Face Mesh または Face Detection
- **ポーズ推定**: MediaPipe Pose または PoseNet
- **表情認識**:
  - 口の開閉: MediaPipe Face Mesh (lip landmarks)
  - 食いしばり: 顔筋肉の緊張度（Face Mesh + カスタムロジック）
- **動作検出**: 時系列データから動きパターン抽出

---

## 5. データモデル

### 5.1 ユーザー設定 (LocalStorage / IndexedDB)

```typescript
interface UserSettings {
  // 検出設定
  detectionSettings: {
    slouching: DetectionConfig;
    screenDistance: DetectionConfig;
    cheekRest: DetectionConfig;
    neckTilt: DetectionConfig;
    faceScratch: DetectionConfig;
    mouthOpen: DetectionConfig;
    jawClench: DetectionConfig;
  };

  // アラート設定
  alertSettings: {
    voiceType: 'male' | 'female' | 'neutral';
    volume: number; // 0-100
    language: 'ja' | 'en';
  };

  // キャリブレーション
  calibration: {
    correctPosture: PostureData | null;
    optimalDistance: number; // cm
    lastCalibrated: Date;
  };
}

interface DetectionConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  durationThreshold: number; // seconds
  alertInterval: number; // seconds
}
```

### 5.2 統計データ

```typescript
interface Statistics {
  date: Date;
  detections: {
    [key: string]: {
      count: number;
      totalDuration: number; // seconds
      timestamps: Date[];
    }
  };
}
```

---

## 6. UI/UX設計方針

### 6.1 メイン画面構成

1. **カメラプレビュー**:
   - 小さなプレビューウィンドウ（最小化可能）
   - 検出中の姿勢をオーバーレイ表示

2. **ステータスパネル**:
   - 現在の姿勢状態（良好/注意）
   - 有効な検出項目の一覧

3. **設定パネル**:
   - 検出項目の個別ON/OFF
   - 感度・閾値のスライダー調整
   - 音声設定

4. **統計ダッシュボード**:
   - 本日の検出サマリー
   - 週間/月間トレンドグラフ
   - 改善スコア

### 6.2 ワークフロー

```
初回起動
  ↓
カメラ権限要求
  ↓
キャリブレーション（正しい姿勢登録）
  ↓
検出項目選択
  ↓
監視開始
  ↓
[バックグラウンドで継続監視]
  ↓
姿勢問題検出 → 音声アラート → 統計記録
```

---

## 7. 開発フェーズ計画

### Phase 1: MVP（Webアプリ） - 4-6週間

**Week 1-2: 基盤開発**
- プロジェクトセットアップ
- カメラアクセス実装
- MediaPipe統合
- 基本的な顔検出

**Week 3-4: コア機能実装**
- 猫背検出アルゴリズム
- 画面距離検出
- 頬杖検出
- 音声アラート基本実装

**Week 5-6: UI/UX実装**
- 設定画面
- キャリブレーション機能
- 基本的な統計表示
- テスト・バグ修正

### Phase 1.5: Chrome拡張化 - 2-3週間

- Manifest V3対応
- バックグラウンド動作最適化
- 拡張機能UI実装
- Chrome Web Storeリリース準備

### Phase 2: デスクトップアプリ - 4-6週間

- Electron/Tauri移行
- システムトレイ統合
- 自動起動機能
- ネイティブ通知
- インストーラー作成

### Phase 3: 機能拡張 - 継続的

- 追加検出項目（顔掻き、口開き、食いしばり）
- 高度な統計・レポート機能
- カスタム音声アラート
- 多言語対応
- モバイル対応（iOS/Android）

---

## 8. 成功指標（KPI）

- **検出精度**: 各姿勢の正検出率 > 85%
- **誤検知率**: < 10%
- **ユーザー満足度**: アンケートで4.0/5.0以上
- **パフォーマンス**: CPU使用率 < 30%, メモリ < 500MB
- **継続利用率**: 1ヶ月後の継続利用率 > 60%

---

## 9. リスクと対策

| リスク | 影響 | 対策 |
|-------|------|------|
| AI検出精度が低い | 高 | 複数モデルの比較検証、ユーザーフィードバック機能 |
| パフォーマンス問題 | 高 | 軽量モデル選択、フレームレート調整、最適化 |
| プライバシー懸念 | 中 | ローカル処理の明示、オープンソース化検討 |
| ブラウザ互換性 | 中 | Polyfill使用、段階的機能提供 |
| ユーザーがアラートを無視 | 中 | ゲーミフィケーション要素、統計可視化 |

---

## 10. 今後の拡張アイデア

- **AIコーチング**: 改善アドバイスの提供
- **ストレッチタイマー**: 定期的な休憩リマインダー
- **チーム機能**: 組織での健康管理
- **ウェアラブル連携**: スマートウォッチとの統合
- **VRChat等対応**: VTuber・配信者向け機能

---

## 11. 参考資料

### 技術リファレンス
- [MediaPipe](https://google.github.io/mediapipe/)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Chrome Extensions MV3](https://developer.chrome.com/docs/extensions/mv3/)

### 競合・類似サービス
- Posture Reminder アプリ各種
- Eye Care アプリ
- Time Out / Stretchly（休憩リマインダー）

---

**文書作成日**: 2025-10-30
**バージョン**: 1.0
**作成者**: Development Team
