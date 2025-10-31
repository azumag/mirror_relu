# Mirror ReLu - 姿勢・癖矯正アラートシステム

> Webカメラで姿勢と癖をリアルタイム検出し、健康的なPC作業環境をサポート

![Status](https://img.shields.io/badge/status-PoC-green)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Test](https://github.com/azumag/mirror_relu/actions/workflows/test.yml/badge.svg)
![PR Checks](https://github.com/azumag/mirror_relu/actions/workflows/pr-checks.yml/badge.svg)

## 📖 概要

**Mirror ReLu**は、Webカメラの映像をAIでリアルタイム解析し、悪い姿勢や無意識の癖を検出して音声アラートで通知するアプリケーションです。長時間のデスクワークやゲーミングによる健康リスクを軽減します。

### 主な機能

- 🎯 **多様な検出項目**: 猫背、画面との距離、頬杖、首の傾き、顔掻き、口の開き、食いしばり
- 🔧 **カスタマイズ可能**: 各検出項目を個別にON/OFF、感度調整
- 🔊 **音声アラート**: 検出内容に応じた音声通知
- 🔒 **プライバシー重視**: 全ての映像処理はローカルで完結、外部送信なし
- 📊 **統計機能**: 姿勢の改善状況を可視化

## 🎯 ターゲットユーザー

- デスクワーカー・リモートワーカー
- プログラマー・デザイナー
- ゲーマー
- オンライン学習を行う学生

## 🚀 開発ロードマップ

### Phase 1: Webアプリ (MVP) - 現在ここ
- [x] プロジェクトセットアップ
- [x] カメラアクセス & MediaPipe統合
- [x] 基本的な姿勢検出（猫背、画面距離、口開き） **← PoC完了**
- [x] 音声アラートシステム（Web Speech API）
- [x] 基本的なキャリブレーション機能
- [ ] 設定UI（詳細設定）
- [ ] 統計ダッシュボード
- [ ] 追加検出項目（頬杖、首傾き、顔掻き、食いしばり）

### Phase 1.5: Chrome拡張機能
- [ ] Manifest V3対応
- [ ] 拡張機能UI実装
- [ ] Chrome Web Storeリリース

### Phase 2: デスクトップアプリ
- [ ] Electron/Tauri移行
- [ ] システムトレイ常駐
- [ ] クロスプラットフォーム対応（Windows/Mac/Linux）

### Phase 3: 機能拡張
- [ ] 高度な検出（顔掻き、口開き、食いしばり）
- [ ] 詳細統計・レポート機能
- [ ] 多言語対応

## 🛠 技術スタック

### 実装済み (PoC)
- **フレームワーク**: React 18.3 + TypeScript + Vite
- **AI/ML**: MediaPipe Face Landmarker
- **音声**: Web Speech API
- **状態管理**: React Hooks

### 将来的な拡張
- **状態管理**: Zustand
- **UI**: Tailwind CSS + shadcn/ui
- **デスクトップ**: Electron または Tauri
- **拡張機能**: Chrome Extension Manifest V3

## 🚀 クイックスタート

### 必要要件
- Node.js 18+
- npm または yarn
- Webカメラ
- モダンブラウザ（Chrome, Edge, Firefox推奨）

### インストール & 起動

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

### テストの実行

```bash
# 全てのテストを実行
npm test

# テストをワンショットで実行
npm run test:run

# カバレッジレポートを生成
npm run test:coverage
```

詳細は[テストガイド](./TEST_README.md)を参照してください。

### 使い方

1. **カメラを起動**: 「カメラを起動」ボタンをクリック
2. **キャリブレーション**: 正しい姿勢で「キャリブレーション」ボタンをクリック
3. **検出開始**: 「検出開始」ボタンで姿勢監視を開始
4. **アラート**: 猫背や画面に近すぎる場合、音声で警告されます

### PoC で実装済みの機能

- ✅ リアルタイム顔検出（MediaPipe Face Landmarker）
- ✅ 猫背検出（首の角度から推定）
- ✅ 画面距離検出（両目の距離から推定）
- ✅ 口の開き検出
- ✅ 音声アラート（日本語）
- ✅ キャリブレーション機能
- ✅ リアルタイムFPS表示
- ✅ ランドマーク可視化

## 📋 ドキュメント

- [要件定義書](./REQUIREMENTS.md) - 詳細な機能要件、技術要件、開発計画
- [アーキテクチャ設計書](./ARCHITECTURE.md) - システムアーキテクチャと技術詳細
- [テストガイド](./TEST_README.md) - テストの実行方法とテストカバレッジ
- [CI/CDセットアップ](./.github/WORKFLOW_SETUP.md) - GitHub Actionsワークフローの手動セットアップ手順
- [CI/CD詳細](./.github/CI_CD_README.md) - ワークフローの詳細説明

## 🤝 コントリビューション

（開発開始後に追記予定）

## 📄 ライセンス

（未定 - 今後決定）

## 🔗 関連リソース

- [MediaPipe](https://google.github.io/mediapipe/)
- [TensorFlow.js](https://www.tensorflow.org/js)

---

## 📝 次のステップ

- [ ] 追加の検出項目実装（頬杖、首傾き、顔掻き、食いしばり）
- [ ] 詳細設定UI（感度調整、アラート間隔など）
- [ ] 統計・履歴機能
- [ ] パフォーマンス最適化
- [ ] UI/UXの改善

---

**開発状況**: PoC完了 ✅ 基本的な姿勢検出と音声アラートが動作します！
