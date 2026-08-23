# E2Eテスト

Mirror Re:lu のE2Eは、Tauri 2のWebdriverIO構成に合わせて二層に分けています。

## Renderer E2E

Renderer E2Eは `@wdio/tauri-service` の `mode: "browser"` でVite開発サーバーをChromeへ接続します。カメラやMediaPipeを起動せず、コンパイル時フラグ `VITE_E2E_FIXTURES=1` のときだけ `FakeCameraController` と `DeterministicVisionClient` をロードします。

```bash
npm ci
npm run e2e:renderer
```

このテストは次をコード生成のVisionFrameだけで確認します。

- 初回案内、同意、再読み込み、状態リセット
- 監視の開始・停止・休止・テストクロックによる自動再開
- 口の開き、顔への手接触、擦過候補、左右視線差
- 本人基準、設定、カメラ一覧、ローカル履歴、JSON書き出し
- カメラ／Visionエラー、外部オリジンへの要求、主要アクセシビリティ属性

写真、動画、実在人物の顔データ、ランドマーク列はリポジトリへ保存しません。E2Eブリッジはテストビルドのモジュール内だけに存在し、URLパラメーターや `localStorage` だけでは有効化できません。

## Native Tauri E2E

Native E2Eは公式の `@wdio/tauri-service` とembedded providerを利用します。`tauri-plugin-wdio` と `tauri-plugin-wdio-webdriver` はCargoの `e2e` featureでだけ登録し、通常ビルドのcapabilityには含めません。

```bash
npm run e2e:tauri
```

`src-tauri/tauri.e2e.conf.json` が `e2e` capabilityを追加し、`src-tauri/tauri.conf.json` の通常ビルドは `default` capabilityだけを使用します。LinuxではWebKitGTK、macOSではembedded WebDriver、WindowsではWebView2の実行環境が必要です。

## 反復実行と成果物

フレームの時刻は `FakeClock` から供給され、テストは固定秒数の待機を使いません。Rendererの失敗時スクリーンショットは `artifacts/e2e/renderer`、Nativeのスクリーンショットは `artifacts/e2e/tauri` に保存します。ログはWebdriverIOの標準出力とCIの成果物で確認します。

```bash
npm run e2e:renderer
npm run e2e:renderer
npm run e2e:renderer
npm run e2e:production-guard
```

## 製品ビルド混入検査

通常の `npm run build` 後に `npm run e2e:production-guard` を実行します。生成されたJavaScript、CSS、HTMLにブリッジ名、シナリオ名、Fake実装、WDIOプラグイン名がないことを検査します。E2E専用Cargo featureも通常の `cargo check`／製品ビルドでは有効になりません。

## CI

`.github/workflows/e2e.yml` はPull RequestでRenderer E2EとUbuntu Native smokeを必須にし、`main`、手動実行、週次ではUbuntu・Windows・macOSを実行します。テスト失敗時はOS別にスクリーンショットとWebDriverログを保存します。実カメラを使わないため、CI成果物に画像データは含まれません。

## 制約

自動E2Eはカメラ権限ダイアログ、MediaPipeモデルの実認識精度、OSごとのWebViewカメラ挙動を保証しません。これらは [manual-e2e-hardware.md](./manual-e2e-hardware.md) の手順で実機確認します。
