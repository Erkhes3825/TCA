// 患者の自由口述（音声認識の結果）を Azure OpenAI で読み、問診票の項目に当てはめる。
// Azure OpenAI のキーはこの関数の「アプリ設定」にだけ置く。ブラウザにも GitHub にも出さない。
//   AZURE_OPENAI_ENDPOINT     例: https://<リソース名>.openai.azure.com
//   AZURE_OPENAI_KEY          Azure OpenAI リソースのキー
//   AZURE_OPENAI_DEPLOYMENT   デプロイ名（Structured outputs に対応したモデル）
//   AZURE_OPENAI_API_VERSION  任意。既定 2024-10-21
//   ALLOWED_ORIGINS           任意。カンマ区切りで、呼び出しを許す公開元（speechToken と同じ）
//
// 訳す先（医療者が読む言葉）はリクエストの target（ja / zh / mn。無ければ日本語）。
//
// AI が話していないことを埋めないよう、各項目に「根拠になった原文の一部（evidence）」を返させ、
// evidence が患者の発話に実際に含まれていなければ、その項目は「見つからなかった」に戻す。
const { app } = require('@azure/functions');

/** 問診票の項目。src/lib/interpret.ts の INTERPRET_FIELDS と同じ並び・同じキー */
const FIELDS = {
  chiefComplaint: '主訴（何に困って来たか）',
  onset: '発症時期（いつから。「昨夜から」「3日前から」など）',
  symptomQuality: '症状の性質（どんな感じか。痛みなら鋭い・鈍い・間欠的、咳なら乾いた・痰が絡むなど）',
  aggravating: '増悪・寛解因子（何をすると悪化・軽快するか）',
  associated: '随伴症状（吐き気・嘔吐・下痢など、主訴以外の症状。「ない」と言った症状も含める）',
  fever: '発熱（熱感・悪寒・測った体温。「ない」も含める）',
  drugAllergy: '薬のアレルギー（薬の名前と症状。「ない」も含める）',
  regularMeds: '常用薬（普段飲んでいる薬。「ない」も含める）',
  bloodThinner: '抗凝固薬・抗血小板薬（血をさらさらにする薬）を飲んでいるか',
  pastIllness: '既往歴（治療中・過去の病気。「ない」も含める）',
  pregnancy: '妊娠の可能性',
  selfCare: '受診前の対処（飲んだ薬・試したこと）',
};

const MAX_CHARS = 8000;
/** Azure OpenAI の応答を待つ上限。アプリ側（20秒）より短くして、こちらのエラーを先に返す */
const MODEL_TIMEOUT_MS = 15000;

const item = {
  type: 'object',
  additionalProperties: false,
  required: ['found', 'denied', 'translated', 'restated', 'evidence', 'terms'],
  properties: {
    found: { type: 'boolean', description: '患者が実際にこの項目について話したか' },
    denied: { type: 'boolean', description: '患者が「ない」と明言したか（例: アレルギーはない）。found=false なら false' },
    translated: { type: 'string', description: '医療者向けの訳（指定された言語）。簡潔な問診票の書き方で。found=false なら空文字' },
    restated: { type: 'string', description: '患者の言語で、患者が確認できる短い言い直し。found=false なら空文字' },
    evidence: { type: 'string', description: '根拠になった患者の発話の一部を、一字一句そのまま。found=false なら空文字' },
    terms: {
      type: 'array',
      description: '患者の口語・方言・俗語を医療用語に置き換えた箇所',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'to'],
        properties: { from: { type: 'string', description: '患者の言葉（原文のまま）' }, to: { type: 'string', description: '医療用語（指定された言語）' } },
      },
    },
  },
};

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(FIELDS),
      properties: Object.fromEntries(Object.keys(FIELDS).map((k) => [k, item])),
    },
  },
};

/** 伝える言葉（医療者が読む言葉）。アプリの src/lib/target.ts と同じ */
const TARGETS = {
  ja: { name: '日本語', example: '昨夜から続く強い腹痛。右季肋部。', none: 'なし' },
  zh: { name: '中国語（簡体字）', example: '昨晚开始持续性剧烈腹痛，右季肋部。', none: '无' },
  mn: { name: 'モンゴル語（キリル文字）', example: 'Өчигдөр оройноос хэвлийн хүчтэй өвдөлт, баруун хавирганы доор.', none: 'Байхгүй' },
};

const system = (target) => [
  `あなたは医療機関の問診を手伝う通訳者です。患者が自分の言語で話した内容を読み、問診票の各項目に当てはめ、医療者向けに${target.name}に訳します。`,
  '守ること:',
  '- 患者が話した内容だけを使う。推測・補完・診断・病名の推定はしない。',
  '- 話していない項目は found=false にする。少しでも迷ったら found=false にして、医療者が聞き足せるようにする。',
  `- 「ない」と明言した場合は found=true、denied=true で、translated は「${target.none}」と書く（例: 下痢${target.none}）。`,
  '- 同じ項目について後から言い直した回答（確認画面での訂正を含む）があれば、後の回答を採る。',
  '- evidence には根拠の発話を一字一句そのまま写す（翻訳しない、言い換えない）。',
  `- translated は${target.name}の問診票の簡潔な書き方（例: 「${target.example}」）。`,
  `- 口語・方言・俗語・薬の現地名を医療用語にしたものは terms に入れる（to は${target.name}）。`,
  '- restated は患者の言語で書く。',
  '項目:',
  ...Object.entries(FIELDS).map(([k, v]) => `- ${k}: ${v}`),
].join('\n');

/** 認識結果の表記ゆれ（空白・全角）に強くするための正規化 */
const norm = (s) => String(s).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

app.http('interpret', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get('origin');
    if (allowed.length > 0 && !allowed.includes(origin)) {
      return { status: 403, jsonBody: { error: 'forbidden' } };
    }

    const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
    const key = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
    if (!endpoint || !key || !deployment) {
      context.error('AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_KEY / AZURE_OPENAI_DEPLOYMENT が設定されていません');
      return { status: 500, jsonBody: { error: 'not configured' } };
    }

    // { lang: 'en', target: 'ja', locale: 'en-GB', qa: [{ q: '質問（患者の言語）', a: '認識結果' }] }
    let body;
    try { body = await request.json(); } catch { return { status: 400, jsonBody: { error: 'bad json' } }; }
    const qa = Array.isArray(body?.qa) ? body.qa.filter((x) => x && typeof x.q === 'string' && typeof x.a === 'string' && x.a.trim()) : [];
    if (qa.length === 0) return { status: 400, jsonBody: { error: 'no answers' } };
    const transcript = qa.map((x, i) => `Q${i + 1}: ${x.q}\nA${i + 1}: ${x.a}`).join('\n\n');
    if (transcript.length > MAX_CHARS) return { status: 413, jsonBody: { error: 'too long' } };

    let res;
    try {
      res = await fetch(`${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`, {
        method: 'POST',
        signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
        headers: { 'api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: system(Object.hasOwn(TARGETS, body.target) ? TARGETS[body.target] : TARGETS.ja) },
            { role: 'user', content: `患者の言語: ${String(body.locale || body.lang || '不明')}\n\n${transcript}` },
          ],
          
          response_format: { type: 'json_schema', json_schema: { name: 'intake', strict: true, schema } },
        }),
      });
    } catch (e) {
      context.error(`chat/completions did not answer: ${e}`);
      return { status: 504, jsonBody: { error: 'model timeout' } };
    }
    if (!res.ok) {
      context.error(`chat/completions failed: ${res.status} ${(await res.text()).slice(0, 500)}`);
      return { status: 502, jsonBody: { error: 'model request failed' } };
    }

    let items;
    try {
      const j = await res.json();
      items = JSON.parse(j.choices[0].message.content).items;
    } catch (e) {
      context.error(`unexpected model output: ${e}`);
      return { status: 502, jsonBody: { error: 'bad model output' } };
    }

    // 根拠が患者の発話に無いものは採らない
    const said = norm(qa.map((x) => x.a).join(' '));
    for (const k of Object.keys(FIELDS)) {
      const it = items[k];
      if (!it || !it.found) continue;
      if (!it.evidence || !said.includes(norm(it.evidence))) {
        items[k] = { found: false, denied: false, translated: '', restated: '', evidence: '', terms: [] };
      }
    }

    return { status: 200, headers: { 'Cache-Control': 'no-store' }, jsonBody: { items } };
  },
});
