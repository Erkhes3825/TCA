# api/ — Azure AI Speech の一時トークンを出す Azure Functions

Web アプリ（GitHub Pages）から音声認識を使うための、小さな中継サーバーです。

```
スマホ（GitHub Pages） → この Function（キーはここだけ） → Azure AI Speech
```

**Speech のキーは、この Function の「アプリ設定」にだけ入れます。** `src/` や `docs/`、GitHub には絶対に書かない（リポジトリが公開だと、誰でも見えて、他人に使われて課金されます）。

## 1. Azure で作るもの

Azure ポータル（https://portal.azure.com）で、リージョンはすべて **Japan East** にそろえます。

1. **Speech サービス**（リソースの種類「Speech」）
   - 価格レベルは **Free F0**（試用向け。毎月の無料枠あり。最新の枠は公式の料金ページで確認）
   - 作成後、「キーとエンドポイント」の **キー1** と **場所／リージョン** を控える
2. **Function App**
   - ホスティングは **Flex Consumption**（Linux Consumption は 2028-09-30 に終了予定のため）
   - ランタイムは **Node.js 22**
   - 名前は世界で一意（例：`tsutaeru-api-あなたの名前`）

## 2. アプリ設定を入れる

Function App →「環境変数」（旧：構成）→ アプリ設定に追加：

| 名前 | 値 |
| --- | --- |
| `SPEECH_KEY` | Speech の キー1 |
| `SPEECH_REGION` | `japaneast` |
| `ALLOWED_ORIGINS` | `https://ユーザー名.github.io`（末尾の `/` は付けない） |

## 3. CORS を設定する

Function App →「CORS」→ 許可するオリジンに `https://ユーザー名.github.io` を追加して保存。

## 4. この api/ をデプロイする

[Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local) を入れて：

```bash
cd api
npm install
func azure functionapp publish <Function App の名前>
```

終わると `https://<名前>.azurewebsites.net/api/speechToken` が使えます（Flex Consumption ではドメインが少し違うことがあります。ポータルの「関数」→ speechToken →「関数の URL の取得」で確認）。

動作確認（パソコンのターミナルで。`ALLOWED_ORIGINS` を設定しているので Origin を付ける）：

```bash
curl -X POST -H "Origin: https://ユーザー名.github.io" https://<名前>.azurewebsites.net/api/speechToken
```

`{"token":"eyJ...","region":"japaneast"}` が返れば成功です。

## 5. アプリに URL を教える

`docs/config.json`（開発中は `public/config.json`）を書き換えます。

```json
{
  "speechTokenUrl": "https://<名前>.azurewebsites.net/api/speechToken"
}
```

空のままだと、今までどおりデモ（台本の再生）で動きます。URL は秘密ではないので、公開リポジトリに入れて構いません。

## 6. 注意

- この関数は誰でも呼べます（Origin の確認は、ブラウザ以外からは回避できます）。無料枠を超えて使われないよう、Azure の**予算アラート**（Cost Management）を必ず設定してください。公開を広げる段階では、利用制限や認証を足します。
- 実在の患者の音声は、同意・契約・データの扱いを確認するまで入れないでください。
