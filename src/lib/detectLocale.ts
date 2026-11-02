import { LANGS, REGION_BY_COUNTRY, getLang, type LangId } from '../data/languages';

export interface Detection {
  /** 対応言語として判定できたか */
  ok: boolean;
  /** 判定に使った言語タグ（例 en-GB）。見つからなければ先頭のタグ */
  tag: string;
  /** tag が端末の言語リストの何番目か（0 始まり）。1 以上なら日本語などの後ろにあった言語 */
  rank: number;
  lang: LangId | null;
  /** 端末の国・地域（ISO 3166 の2文字。例 GB）。端末から読めなければ null */
  country: string | null;
  /** country をどこから読んだか。tag = 言語タグ、format = 端末の書式（日付・数字）設定 */
  countrySource: 'tag' | 'format' | null;
  /** 地域・方言。国・地域から決められないときは null（本人に選ばせる） */
  region: string | null;
}

/** 端末の優先言語リスト。ブラウザ外（SSR等）では空配列 */
export function readDeviceLocales(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages && navigator.languages.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

/**
 * 端末の書式設定（日付・数字の表記）の国・地域。言語タグに国が付いていないときの補い。
 * likely subtags で推測した国（en → US など）は使わない。明示されたものだけを返す
 */
export function readFormatCountry(): string | null {
  try {
    const loc = new Intl.DateTimeFormat().resolvedOptions().locale;
    return new Intl.Locale(loc).region ?? null;
  } catch {
    return null;
  }
}

/** ブラウザに国名データが無いことがある言語の補い（無いと端末の言語＝日本語の国名が出てしまう） */
const COUNTRY_NAME_OVERRIDES: Record<string, Record<string, string>> = {
  mn: { MN: 'Монгол Улс', CN: 'Хятад', JP: 'Япон', RU: 'Орос', KR: 'Солонгос' },
};

/** 国コード → 表示名（例 GB → United Kingdom / イギリス）。その言語の国名が無ければ英語 */
export function countryName(code: string, locale: string): string {
  const base = locale.split('-')[0];
  const override = COUNTRY_NAME_OVERRIDES[base]?.[code];
  if (override) return override;
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region', fallback: 'code' });
    const supported = dn.resolvedOptions().locale.split('-')[0] === base;
    return (supported ? dn : new Intl.DisplayNames(['en'], { type: 'region' })).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * 端末の言語リストを上から見て、最初の対応言語を採る。
 * 日本在住で「日本語・英語」の順に設定している人が多いので、日本語より後ろにある日本語以外の対応言語を優先する。
 * 日本語しか当たらなければ日本語を採る（iPhone の Safari は端末の言語を1つしか渡さないので、日本語設定の iPhone はここに来る）。
 * どれにも当たらなければ ok=false にして、一覧から選ばせる。誤判定は最初の画面で本人が直せる
 */
export function detectLocale(tags: readonly string[], formatCountry: string | null = null): Detection {
  let ja: Detection | null = null;
  for (let i = 0; i < tags.length; i++) {
    const d = detectTag(String(tags[i]), i, formatCountry);
    if (!d.ok) continue;
    if (d.lang !== 'ja') return d;
    ja ??= d;
  }
  if (ja) return ja;
  return { ok: false, tag: String(tags[0] ?? ''), rank: 0, lang: null, country: null, countrySource: null, region: null };
}

function detectTag(first: string, rank: number, formatCountry: string | null): Detection {
  const out: Detection = { ok: false, tag: first, rank, lang: null, country: null, countrySource: null, region: null };

  const parts = first.split(/[-_]/);
  let base = (parts[0] ?? '').toLowerCase();
  if (base === 'fil') base = 'tl';
  if (base === 'in') base = 'id'; // 旧インドネシア語コード
  if (!LANGS.some((l) => l.id === base)) return out;
  const lang = base as LangId;

  let country = '';
  let script = '';
  for (const p of parts.slice(1)) {
    if (p.length === 2) country = p.toUpperCase();
    else if (p.length === 4) script = p.toLowerCase();
  }
  const countrySource: Detection['countrySource'] = country ? 'tag' : formatCountry ? 'format' : null;
  if (!country && formatCountry) country = formatCountry.toUpperCase();
  // 日本語は話されている国がほぼ日本だけなので、国が読めなければ日本とみなす（iPhone の Safari は ja だけを渡すことがある）
  if (!country && lang === 'ja') country = 'JP';

  let region: string | null = null;
  if (lang === 'zh') {
    if (country === 'HK' || country === 'MO') region = '粤语（广东・香港）';
    else if (country === 'TW' || script === 'hant') region = '台湾华语';
    else if (country === 'CN' || country === 'SG' || script === 'hans') region = '普通话（大陆）';
  } else if (REGION_BY_COUNTRY[lang]) {
    region = REGION_BY_COUNTRY[lang]![country] ?? null;
  } else if (getLang(lang).regions.length === 1) {
    region = getLang(lang).regions[0];
  }

  return { ok: true, tag: first, rank, lang, country: country || null, countrySource, region };
}
