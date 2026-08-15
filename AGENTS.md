# AGENTS.md

## プロジェクトの目的

Mirror Re:lu は、自分を責めるためではなく、無意識な顔まわりの動作に気づくためのローカル推論アプリです。医療診断や矯正効果を目的にしません。

## 変更時の不変条件

1. カメラ映像をネットワーク、Rust IPC、永続ストレージへ渡さない。
2. 画像・動画・顔特徴点列・手特徴点列を保存しない。
3. 外斜視などの疾患名を検出結果として断定しない。
4. 一定時間の継続確認とクールダウンを外さない。
5. 顔が正面でない、目が閉じている、未校正の場合は左右視線差を判定しない。
6. 感度変更で時間判定を壊さない。
7. 新しい依存・通信・権限を追加する場合はREADME、PRIVACY、SECURITYも見直す。

## 主な責務

- `src/vision`: MediaPipe初期化とフレーム推論。数値化の意味を持たせない。
- `src/core/metrics.ts`: 特徴点から正規化指標を計算。
- `src/core/behavior-engine.ts`: 閾値、判定資格、通知イベント。
- `src/core/temporal-gate.ts`: 時間方向の状態機械。
- `src/main.ts`: UI、カメラライフサイクル、履歴。
- `src-tauri`: 最小限のデスクトップシェルと権限。

## 完了前の確認

```bash
npm test
npm run check
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

検出式を変更した場合は、照明、眼鏡、横向き、まばたき、会話、顔への一瞬の接触を手動で確認すること。
