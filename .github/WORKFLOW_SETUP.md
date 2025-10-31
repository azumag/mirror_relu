# CI/CD セットアップガイド

このプロジェクトには自動テストとビルドのためのGitHub Actionsワークフローが用意されています。

## ⚠️ 重要: ワークフローファイルの手動セットアップが必要です

GitHub App の権限制限により、ワークフローファイルは自動プッシュできません。
以下の手順に従って、**GitHub Web UI上で手動で作成**してください。

## セットアップ手順

### ステップ 1: GitHubリポジトリにアクセス

1. https://github.com/azumag/mirror_relu にアクセス
2. ブランチを `claude/add-unit-integration-tests-011CUe7xb7BFYSNpdBCAxuaT` に切り替え

### ステップ 2: ワークフローディレクトリを作成

1. リポジトリのルートで「Add file」→「Create new file」をクリック
2. ファイル名に `.github/workflows/test.yml` と入力（ディレクトリも自動作成されます）

### ステップ 3: ワークフローファイルを作成

以下の2つのファイルを作成してください。内容は `.github/workflow-templates/` ディレクトリにあります。

#### ファイル1: `.github/workflows/test.yml`

テンプレート: `.github/workflow-templates/test.yml.template` の内容をコピー

**このワークフローの機能:**
- `main`ブランチおよび`claude/**`ブランチへのpush時に実行
- Pull Request作成時に実行
- Node.js 18.x と 20.x でテストを実行
- Linter、テスト、ビルドを実行
- カバレッジレポートをCodecovにアップロード
- ビルド成果物を保存

#### ファイル2: `.github/workflows/pr-checks.yml`

テンプレート: `.github/workflow-templates/pr-checks.yml.template` の内容をコピー

**このワークフローの機能:**
- Pull Request作成・更新時に実行
- Linter、テスト、ビルドを順次実行
- 失敗時は即座に停止
- 結果をPRにコメント

### ステップ 4: コミット

1. 各ファイルを作成後、適切なコミットメッセージを入力
   - 例: `Add CI/CD workflow for automated testing`
2. `claude/add-unit-integration-tests-011CUe7xb7BFYSNpdBCAxuaT` ブランチにコミット

### ステップ 5: 動作確認

ワークフローファイルを追加後、以下を確認してください：

1. **Actions** タブでワークフローが表示されることを確認
2. 新しいコミットをpushしてワークフローが実行されることを確認
3. PR作成時にテストが自動実行されることを確認

## ワークフローの概要

### `test.yml` - メインテストワークフロー

```yaml
トリガー:
  - push: main, claude/**
  - pull_request: main

ジョブ:
  1. test (Node.js 18.x, 20.x)
     - コードチェックアウト
     - 依存関係インストール
     - Linter実行
     - テスト実行
     - カバレッジアップロード

  2. build (test成功後)
     - ビルド実行
     - 成果物アップロード
```

### `pr-checks.yml` - PR品質チェック

```yaml
トリガー:
  - pull_request: opened, synchronize, reopened

ジョブ:
  - Linter実行（失敗時停止）
  - テスト実行（失敗時停止）
  - ビルド実行（失敗時停止）
  - PR結果コメント
```

## テンプレートファイルの場所

ワークフローのテンプレートは以下のディレクトリにあります：

```
.github/
  └── workflow-templates/
      ├── test.yml.template        # メインテストワークフロー
      └── pr-checks.yml.template   # PRチェックワークフロー
```

これらのファイルの内容をコピーして、`.github/workflows/`ディレクトリに配置してください。

## よくある質問

### Q: なぜ自動でセットアップできないのですか？

A: GitHub Appには`workflows`権限が必要ですが、セキュリティ上の理由でこの権限が制限されています。そのため、ワークフローファイルは手動で作成する必要があります。

### Q: テンプレートをそのまま使えますか？

A: はい。`.template`拡張子を除いて、内容をそのままコピーしてください。

### Q: ワークフローが実行されない場合は？

A: 以下を確認してください：
1. ファイル名が正しいか（`.github/workflows/*.yml`）
2. YAMLの構文が正しいか
3. ブランチ名が正しいか

### Q: カバレッジアップロードでエラーが出ます

A: Codecovのトークンが必要な場合があります。Settings → Secrets → Actions から`CODECOV_TOKEN`を設定してください。エラーは`continue-on-error: true`により無視されるため、テストには影響しません。

## 次のステップ

ワークフローをセットアップ後：

1. ✅ PRを作成してテストが自動実行されることを確認
2. ✅ README.mdのバッジが正しく表示されることを確認
3. ✅ テストが失敗した場合、PRマージをブロックする設定を追加（オプション）

## 参考リンク

- [GitHub Actions ドキュメント](https://docs.github.com/ja/actions)
- [Workflow syntax](https://docs.github.com/ja/actions/reference/workflow-syntax-for-github-actions)
- [テストガイド](../../TEST_README.md)
