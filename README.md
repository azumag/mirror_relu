# Mirror Re:lu

**Mirror Re:lu** は、Webカメラを静かなデスクトップミラーとして使い、顔まわりの無意識な動作が続いたときだけ知らせる Tauri 2 アプリです。

旧実装を継承せず、2026年8月にアーキテクチャから全面的に作り直しています。

## 現在の検出機能

- **口の開き**：唇間距離と顔サイズ、表情係数を組み合わせ、一定時間続いた場合に通知します。
- **顔への手接触**：顔領域と指先の近接を測り、接触やこする動きの候補を通知します。
- **左右視線差（ベータ）**：正面を向き、両目が見えているときだけ、キャリブレーションした本人基準との差を測ります。

単一フレームでは通知しません。すべての検出は「候補 → 継続確認 → 通知 → 解除 → クールダウン」の状態機械を通ります。

> [!IMPORTANT]
> 本アプリは医療機器ではなく、外斜視を含む疾患の診断・治療・矯正を行いません。急な眼位変化、複視、痛み、視力変化、明らかな悪化がある場合は、アプリの結果にかかわらず眼科へ相談してください。

## プライバシー

- カメラ映像、静止画、特徴点列は保存しません。
- 推論は MediaPipe Tasks Vision のローカルモデルを使い、Web Worker 内で実行します。
- 実行時の Content Security Policy は外部ネットワーク接続を許可しません。
- 保存するのは検出日時、種類、継続時間、数値指標、個人基準、設定だけです。
- モデルと WASM は開発・ビルド時に取得し、アプリへ同梱します。

詳細は [PRIVACY.md](./PRIVACY.md) を参照してください。

## 技術構成

```text
Webカメラ
  └─ CameraController
      └─ ImageBitmap（既定 10 fps / 640px）
          └─ Web Worker
              ├─ MediaPipe Face Landmarker
              ├─ MediaPipe Hand Landmarker
              └─ VisionFrame（特徴量のみ）
                  └─ BehaviorEngine
                      ├─ 口の開き
                      ├─ 顔への手接触・擦過候補
                      └─ 左右視線差（ベータ）
                          └─ 通知・ローカル履歴
```

- デスクトップシェル：Tauri 2 / Rust
- UI：TypeScript / Vite / CSS
- 画像推論：`@mediapipe/tasks-vision`
- 永続化：WebView の `localStorage`
- テスト：Node.js test runner + TypeScript

詳細は [docs/architecture.md](./docs/architecture.md) を参照してください。

## 開発環境

必要なもの：

- Node.js 22.12 以上
- npm 10 以上
- Rust 1.77.2 以上
- Tauri が要求する各OSのビルド依存パッケージ

```bash
npm install
npm test
npm run tauri dev
```

初回の `dev` / `build` / `tauri` 実行前に、固定URLの MediaPipe モデルを `public/mediapipe` へ取得します。モデルは Git 管理しません。

フロントエンドだけ確認する場合：

```bash
npm run dev
```

製品ビルド：

```bash
npm run tauri build
```

## 調整の考え方

感度を高くすると閾値が下がり、弱い変化でも候補になります。「通知まで」を長くすると一時的な動作を無視しやすくなります。まず本人基準を作り、照明・カメラ位置・眼鏡を大きく変えた場合は再キャリブレーションしてください。

会話や飲食中は **会話モード** を使うと、口の開きだけを一時停止できます。すべての監視を止める場合は **10分休止** または **監視を停止** を使います。

## 検証

```bash
npm test       # コア検出ロジック
npm run check  # TypeScript
npm run build  # 型検査 + Viteビルド
cargo check --manifest-path src-tauri/Cargo.toml
```

手動確認項目は [docs/manual-test.md](./docs/manual-test.md) にまとめています。

## 現在の制約

- 左右視線差はWebカメラの解像度、照明、眼鏡の反射、顔角度に大きく影響されます。
- 「顔をかく」と「眼鏡を直す」「髪を払う」「頬杖」を完全には区別できません。
- 初版は常駐トレイ、自動起動、バックグラウンド最小化をまだ実装していません。
- LinuxではWebKitGTKとカメラスタックの組み合わせにより挙動が異なる可能性があります。

## 開発方針

- 映像をRust側やネットワークへ渡さない
- 医療上の断定をしない
- 誤検知より通知連打を避ける
- 閾値と時間判定をUIから分離し、テスト可能にする
- 新しい検出器は共通の時間状態機械を利用する

貢献時の具体的なルールは [CONTRIBUTING.md](./CONTRIBUTING.md) と [AGENTS.md](./AGENTS.md) を参照してください。
