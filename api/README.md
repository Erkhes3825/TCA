# api/ — 音声認識と AI 解釈の Azure Functions

Web アプリ（GitHub Pages）から Azure を使うための、小さな中継サーバーです。関数は2つあります。

| 関数 | 役割 | 使う Azure のサービス |
| --- | --- | --- |
| `speechToken` | 音声認識の一時トークン（約10分）を出す | Azure AI Speech |
| `interpret` | 患者の自由口述を読み、問診票の項目（主訴・発症時期・常用薬など）に当てはめる。当てはまらなかった項目だけをアプリが聞き足す | Azure OpenAI |

```
スマホ（GitHub Pages） → この Function（キーはここだけ） → Azure AI Speech / Azure OpenAI
```

構成図（問診の流れ・AI が当てはめる項目の対応表・作業の一覧つき）：https://claude.ai/artifact/JsoZnSoiVfXAEVyJkfL3qC

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

**`public/config.json` と `docs/config.json` の両方**を、同じ内容に書き換えます。
公開サイトが読むのは `docs/config.json` ですが、`npm run build` のたびに `public/config.json` の内容で上書きされます。片方だけ直すと、次のビルドで URL が消え、エラーも出ずにデモや音声認識だけの動きに戻ります。

```json
{
  "speechTokenUrl": "https://<名前>.azurewebsites.net/api/speechToken"
}
```

空のままだと、今までどおりデモ（台本の再生）で動きます。URL は秘密ではないので、公開リポジトリに入れて構いません。

## 6. AI 解釈（interpret）を使う

使わなくても音声認識は動きます（その場合、聞き足しは全部聞きます）。

1. Azure ポータルで **Azure OpenAI** のリソースを作る（リージョンは Japan East を推奨。使えるモデルはリージョンで違うので、作成画面で確認）
2. Azure AI Foundry でモデルを **デプロイ** する。**Structured outputs（JSON Schema で出力を固定する機能）に対応したモデル**を選ぶ（対応モデルは [公式の説明](https://learn.microsoft.com/azure/ai-services/openai/how-to/structured-outputs) で確認）。デプロイ名を控える
3. Function App のアプリ設定に追加：

| 名前 | 値 |
| --- | --- |
| `AZURE_OPENAI_ENDPOINT` | `https://<リソース名>.openai.azure.com` |
| `AZURE_OPENAI_KEY` | Azure OpenAI の キー1 |
| `AZURE_OPENAI_DEPLOYMENT` | 2 で控えたデプロイ名 |
| `AZURE_OPENAI_API_VERSION` | 任意。既定は `2024-10-21`。エラーになる場合は、モデルに合う API バージョンを公式の説明で確認して入れる |

4. もう一度デプロイ（`func azure functionapp publish <Function App の名前>`）
5. **`public/config.json` と `docs/config.json` の両方**に URL を足す（片方だけだと、次のビルドで消える。5 章を参照）

```json
{
  "speechTokenUrl": "https://<名前>.azurewebsites.net/api/speechToken",
  "interpretUrl": "https://<名前>.azurewebsites.net/api/interpret"
}
```

動作確認：

```bash
curl -X POST -H "Origin: https://ユーザー名.github.io" -H "Content-Type: application/json" \
  -d '{"lang":"en","locale":"en-GB","qa":[{"q":"What brings you in today?","a":"My tummy has been killing me since last night."}]}' \
  https://<名前>.azurewebsites.net/api/interpret
```

`{"items":{"chiefComplaint":{"found":true,"ja":"…"…` が返れば成功です。

**AI が話していないことを埋めない工夫**：各項目に「根拠になった患者の発話（evidence）」を返させ、それが実際の発話に含まれていなければ、関数がその項目を「見つからなかった」に戻します。医療者画面の原文欄には、この根拠の発話を出します。

## 7. 注意

- この関数は誰でも呼べます（Origin の確認は、ブラウザ以外からは回避できます）。無料枠を超えて使われないよう、Azure の**予算アラート**（Cost Management）を必ず設定してください。公開を広げる段階では、利用制限や認証を足します。
- 実在の患者の音声・回答は、同意・契約・データの扱いを確認するまで入れないでください。病歴などは要配慮個人情報です。Azure OpenAI に送った内容の扱い（保存・ログ・学習への利用の有無）は、使う前に Microsoft の公式の説明で確認してください。
- `interpret` は呼ばれるたびに Azure OpenAI の料金がかかります（1人の問診で1〜2回呼びます）。予算アラートを必ず設定してください。
