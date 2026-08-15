# MediaPipe runtime assets

このディレクトリの実行時アセットはGit管理しません。

`npm run setup:assets` が以下を行います。

1. 固定バージョン `@mediapipe/tasks-vision@1.0.0` からWASMをコピー
2. Google公式の固定URLからFace Landmarker / Hand Landmarkerモデルを取得
3. 既知のファイルサイズを検証
4. SHA-256付きの `asset-manifest.json` を生成

Tauriの開発・ビルド前にも自動実行されます。完成したアプリは、推論中にモデル取得や映像送信のための外部通信を必要としません。
