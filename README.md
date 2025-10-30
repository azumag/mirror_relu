# Mirror ReLu - 姿勢・癖矯正アラートシステム

> Webカメラで姿勢と癖をリアルタイム検出し、健康的なPC作業環境をサポート

![Status](https://img.shields.io/badge/status-planning-yellow)
![Version](https://img.shields.io/badge/version-0.1.0-blue)

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
- [ ] プロジェクトセットアップ
- [ ] カメラアクセス & MediaPipe統合
- [ ] 基本的な姿勢検出（猫背、画面距離、頬杖、首傾き）
- [ ] 音声アラートシステム
- [ ] 設定UI・キャリブレーション機能
- [ ] 統計ダッシュボード

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

## 🛠 技術スタック（予定）

### フロントエンド
- **フレームワーク**: React 18+ / TypeScript
- **AI/ML**: TensorFlow.js + MediaPipe
- **音声**: Web Speech API
- **状態管理**: Zustand
- **UI**: Tailwind CSS + shadcn/ui

### 将来的な拡張
- **デスクトップ**: Electron または Tauri
- **拡張機能**: Chrome Extension Manifest V3

## 📋 ドキュメント

- [要件定義書](./REQUIREMENTS.md) - 詳細な機能要件、技術要件、開発計画

## 🤝 コントリビューション

（開発開始後に追記予定）

## 📄 ライセンス

（未定 - 今後決定）

## 🔗 関連リソース

- [MediaPipe](https://google.github.io/mediapipe/)
- [TensorFlow.js](https://www.tensorflow.org/js)

---

**開発状況**: 要件定義完了 → 次は技術選定とプロジェクトセットアップ
