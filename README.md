# yoru — Vercel版

画面とAPIの中継をVercelに公開できる版です。メッセージの保存・0時の開封判定は、現在公開中のSitesとそのデータベースを使います。新しいデータベース契約や環境変数は不要です。Vercelだけで独立稼働する版ではありません。元のSitesを停止・削除・非公開にすると、実際のボードの読み書きも停止します。

## GitHubに入れるもの

ZIPを解凍した中身を、リポジトリの一番上に置いてください。package.json と vercel.json が同じ階層に見える状態にします。以前の版をアップロード済みなら、以前の内容をこの版に置き換えてください（特にpackage.jsonとscripts/）。旧版のserver/、drizzle/、.openai/、dist/は、この版には不要です。

```
api/
public/
scripts/
tests/
package.json
vercel.json
README.md
.gitignore
```

## Vercelで公開する

1. Vercelの Add New → Project でGitHubリポジトリをImportします。
2. Framework Preset は Other。Root Directory は package.json のある階層（上記の配置なら初期値のまま）。
3. Build Command は npm run build、Output Directory は public。vercel.json に設定済みです。以前の設定を手入力している場合は、この値に合わせてください。
4. Environment Variables は不要です。Deployを押します。
5. 発行されたURLでボードを作成し、ボードのシェアリンクを友だちへ送ります。友だちに共有するのは本番のURLです。Vercel側のDeployment Protectionが有効な場合は、友だちが本番サイトを閲覧できる設定にしてください。

デプロイ先の名前や独自ドメインを変えても、ボードのシェアリンクは開いているサイトのURLを使います。

## データの引き継ぎについて

保存先は従来のSitesと共通です。既存ボードは、URLの /b/ 以降のIDを新しいVercelのドメインでも使えます。ただし「思い出」の一覧に必要な所有キーはブラウザとドメインごとに保存されるので、以前のドメインで作成したボードが新しいドメインの一覧に自動では現れません。以前のボードのリンクを保管してください。新しいVercel URL上で作るボードは、そのドメインの「思い出」に保存されます。

## 確認

Node.js 22 で npm test、npm run build を実行できます。ローカルでVercelのルーティングを含めて表示する場合は、公式Vercel CLIの vercel dev を使用してください。ローカルからも実際の共通データベースに保存されます。

https://vercel.com/docs/deployments
https://vercel.com/docs/functions/runtimes/node-js
https://vercel.com/docs/routing/rewrites
