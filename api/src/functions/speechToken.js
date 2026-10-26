// Azure AI Speech の一時トークン（有効10分）を発行する。
// Speech のキーはこの関数の「アプリ設定」にだけ置く。ブラウザにも GitHub にも出さない。
//   SPEECH_KEY      Speech リソースのキー
//   SPEECH_REGION   例: japaneast
//   ALLOWED_ORIGINS 任意。カンマ区切りで、呼び出しを許す公開元（例: https://ユーザー名.github.io）
const { app } = require('@azure/functions');

app.http('speechToken', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get('origin');
    if (allowed.length > 0 && !allowed.includes(origin)) {
      return { status: 403, jsonBody: { error: 'forbidden' } };
    }

    const key = process.env.SPEECH_KEY;
    const region = process.env.SPEECH_REGION;
    if (!key || !region) {
      context.error('SPEECH_KEY / SPEECH_REGION が設定されていません');
      return { status: 500, jsonBody: { error: 'not configured' } };
    }

    const res = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': key },
    });
    if (!res.ok) {
      context.error(`issueToken failed: ${res.status}`);
      return { status: 502, jsonBody: { error: 'token request failed' } };
    }
    return {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
      jsonBody: { token: await res.text(), region },
    };
  },
});
