// Azure AI Speech による音声認識（speech to text）。
// キーはこのアプリには入れない。Azure Functions（api/）がキーで一時トークン（約10分）を発行し、ブラウザはそれだけを使う。
// 認識の設定は config.json の speechTokenUrl。空なら「デモ（台本どおりに再生）」のまま動く。
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { getLang, type LangId } from '../data/languages';

/** languages.ts の regions と同じ並び。地域ごとの認識ロケール */
const LOCALES: Record<LangId, string[]> = {
  en: ['en-GB', 'en-US', 'en-AU', 'en-IN', 'en-PH', 'en-NG'],
  zh: ['zh-CN', 'zh-TW', 'zh-HK'],
  vi: ['vi-VN', 'vi-VN', 'vi-VN'],
  ko: ['ko-KR', 'ko-KR', 'ko-KR'],
  pt: ['pt-BR', 'pt-PT'],
  es: ['es-MX', 'es-ES', 'es-PE'],
  tl: ['fil-PH'],
  id: ['id-ID'],
  mn: ['mn-MN'],
  ja: ['ja-JP'],
};

export function speechLocale(lang: LangId, region: string | null): string {
  const list = LOCALES[lang];
  const i = region ? getLang(lang).regions.indexOf(region) : -1;
  return list[i >= 0 && i < list.length ? i : 0];
}

// speech-dict/<ロケール>/phrase-list.txt を、そのロケールの認識に渡す（今は zh-CN と ja-JP のみ）
const rawLists = import.meta.glob('../../speech-dict/*/phrase-list.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const PHRASES: Record<string, string[]> = {};
for (const [path, raw] of Object.entries(rawLists)) {
  const locale = path.split('/').slice(-2, -1)[0];
  PHRASES[locale] = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).slice(0, 500);
}

let configPromise: Promise<string | null> | undefined;
/** config.json の speechTokenUrl。無い・空・読めない（file:// で開いたとき等）なら null＝デモ */
export function loadSpeechUrl(): Promise<string | null> {
  configPromise ??= fetch(new URL('config.json', document.baseURI), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (j && typeof j.speechTokenUrl === 'string' && j.speechTokenUrl.trim() ? j.speechTokenUrl.trim() : null))
    .catch(() => null);
  return configPromise;
}

let tokenCache: { token: string; region: string; exp: number } | null = null;
async function getToken(url: string) {
  if (tokenCache && tokenCache.exp > Date.now()) return tokenCache;
  let j: { token?: string; region?: string };
  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error(String(res.status));
    j = await res.json();
  } catch {
    throw new SpeechError('network');
  }
  if (!j.token || !j.region) throw new SpeechError('network');
  // トークンの有効は10分。余裕を見て8分で取り直す
  tokenCache = { token: j.token, region: j.region, exp: Date.now() + 8 * 60 * 1000 };
  return tokenCache;
}

export type SpeechErrorKind = 'mic' | 'network' | 'empty';
export class SpeechError extends Error {
  constructor(public kind: SpeechErrorKind) { super(kind); }
}

export interface SpeechSession {
  /** 聞き取りを終えて、認識した文章を返す */
  stop: () => Promise<string>;
}

/** 聞き取りを始める。もう一度タップ（stop）するまで続く。onInterim には途中経過が随時入る */
export async function startListening(opts: { url: string; locale: string; onInterim: (text: string) => void }): Promise<SpeechSession> {
  const { token, region } = await getToken(opts.url);
  const config = sdk.SpeechConfig.fromAuthorizationToken(token, region);
  config.speechRecognitionLanguage = opts.locale;
  const rec = new sdk.SpeechRecognizer(config, sdk.AudioConfig.fromDefaultMicrophoneInput());

  const phrases = PHRASES[opts.locale];
  if (phrases?.length) {
    const grammar = sdk.PhraseListGrammar.fromRecognizer(rec);
    phrases.forEach((p) => grammar.addPhrase(p));
  }

  // 中国語・日本語は語の間に空白を入れない
  const sep = /^(zh|ja)/.test(opts.locale) ? '' : ' ';
  const finals: string[] = [];
  rec.recognizing = (_s, e) => opts.onInterim([...finals, e.result.text].join(sep));
  rec.recognized = (_s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
      finals.push(e.result.text);
      opts.onInterim(finals.join(sep));
    }
  };

  await new Promise<void>((resolve, reject) => {
    rec.startContinuousRecognitionAsync(resolve, () => reject(new SpeechError('mic')));
  });

  return {
    stop: () => new Promise<string>((resolve) => {
      const finish = () => { rec.close(); resolve(finals.join(sep)); };
      rec.stopContinuousRecognitionAsync(finish, finish);
    }),
  };
}
