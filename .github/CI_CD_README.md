# GitHub Actions Workflows

このディレクトリには、Mirror ReLuプロジェクトのCI/CDワークフローが含まれています。

## ワークフロー

### 1. `test.yml` - テストとビルド

**トリガー:**
- `main`ブランチへのpush
- `claude/**`ブランチへのpush
- `main`ブランチへのPull Request

**ジョブ:**

#### Test Job
- **実行環境**: Ubuntu Latest
- **Node.jsバージョン**: 18.x, 20.x (マトリックス戦略)
- **ステップ**:
  1. コードのチェックアウト
  2. Node.jsのセットアップ
  3. 依存関係のインストール (`npm ci`)
  4. Linterの実行 (`npm run lint`)
  5. テストの実行 (`npm run test:run`)
  6. カバレッジレポートのアップロード (Node 20.xのみ、Codecov)

#### Build Job
- **実行環境**: Ubuntu Latest
- **依存**: Test Jobが成功した後に実行
- **ステップ**:
  1. コードのチェックアウト
  2. Node.js 20.xのセットアップ
  3. 依存関係のインストール
  4. プロジェクトのビルド (`npm run build`)
  5. ビルド成果物のアップロード (7日間保持)

### 2. `pr-checks.yml` - Pull Requestチェック

**トリガー:**
- Pull Requestが開かれた時
- Pull Requestが更新された時 (synchronize)
- Pull Requestが再開された時 (reopened)

**ジョブ:**

#### PR Quality Check
- **実行環境**: Ubuntu Latest
- **ステップ**:
  1. コードのチェックアウト
  2. Node.js 20.xのセットアップ
  3. 依存関係のインストール
  4. Linterの実行 (失敗時は即座に停止)
  5. ユニットテストの実行 (失敗時は即座に停止)
  6. ビルドチェック (失敗時は即座に停止)
  7. PRへのコメント投稿 (結果通知)

## ワークフローの特徴

### マトリックス戦略
`test.yml`では、複数のNode.jsバージョン（18.x, 20.x）でテストを実行し、互換性を確保します。

### キャッシング
`actions/setup-node@v4`の`cache: 'npm'`により、npm依存関係がキャッシュされ、ビルド時間が短縮されます。

### 並列実行
異なるNode.jsバージョンのテストジョブは並列実行され、CI時間を最適化します。

### 成果物の保存
ビルド成果物は7日間保持され、デバッグやデプロイに利用できます。

### エラーハンドリング
- PR Checksでは、各ステップが失敗した場合、即座にワークフローを停止します
- Testワークフローでは、カバレッジアップロードは失敗しても続行します（`continue-on-error: true`）

## ローカルでのテスト

CI環境で実行されるコマンドは、ローカルでも実行できます：

```bash
# 依存関係のインストール
npm ci

# Linterの実行
npm run lint

# テストの実行
npm run test:run

# ビルドの実行
npm run build
```

## ステータスバッジ

README.mdに以下のバッジを追加できます：

```markdown
![Test](https://github.com/azumag/mirror_relu/actions/workflows/test.yml/badge.svg)
![PR Checks](https://github.com/azumag/mirror_relu/actions/workflows/pr-checks.yml/badge.svg)
```

## トラブルシューティング

### テストが失敗する場合
1. Actions タブでログを確認
2. ローカルで同じコマンドを実行して再現
3. 依存関係の問題の場合は `npm ci` を実行

### ビルドが失敗する場合
1. TypeScriptのコンパイルエラーを確認
2. `npm run build` をローカルで実行
3. `tsc --noEmit` でタイプチェックのみ実行

### Linterエラー
1. `npm run lint` をローカルで実行
2. 自動修正: `npm run lint -- --fix` (ESLintの設定により異なる)

## 今後の拡張

- [ ] E2Eテストの追加
- [ ] デプロイワークフローの追加
- [ ] セキュリティスキャンの統合
- [ ] パフォーマンステストの自動実行
- [ ] リリースの自動化
