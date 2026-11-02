export type LangId = 'en' | 'zh' | 'vi' | 'ko' | 'pt' | 'es' | 'tl' | 'id' | 'mn' | 'ja';

export interface Lang {
  id: LangId;
  /** その言語での言語名 */
  native: string;
  /** 日本語の言語名 */
  ja: string;
  /** HTML の lang 属性。中国語は簡体字のフォントで出すため zh-Hans */
  htmlLang: string;
  /** 地域・方言の選択肢。1つだけなら選択不要 */
  regions: string[];
}

// 2026-10：使用人口の少ないネパール語・タイ語を外し、モンゴル語（キリル文字）と日本語を加えた。
// 日本語は、端末の言語リストに日本語以外の対応言語が無いときだけ自動で選ぶ（detectLocale.ts）。
// 画面の文言は src/data/ui.ts。
export const LANGS: Lang[] = [
  { id: 'en', native: 'English', ja: '英語', htmlLang: 'en', regions: ['UK', 'US', 'Australia', 'India', 'Philippines', 'Nigeria'] },
  { id: 'zh', native: '中文（简体）', ja: '中国語', htmlLang: 'zh-Hans', regions: ['普通话（大陆）', '台湾华语', '粤语（广东・香港）'] },
  { id: 'vi', native: 'Tiếng Việt', ja: 'ベトナム語', htmlLang: 'vi', regions: ['Miền Bắc', 'Miền Trung', 'Miền Nam'] },
  { id: 'ko', native: '한국어', ja: '韓国語', htmlLang: 'ko', regions: ['표준어', '경상도', '전라도'] },
  { id: 'pt', native: 'Português', ja: 'ポルトガル語', htmlLang: 'pt', regions: ['Brasil', 'Portugal'] },
  { id: 'es', native: 'Español', ja: 'スペイン語', htmlLang: 'es', regions: ['México', 'España', 'Perú'] },
  { id: 'tl', native: 'Tagalog', ja: 'タガログ語', htmlLang: 'tl', regions: ['Standard'] },
  { id: 'id', native: 'Bahasa Indonesia', ja: 'インドネシア語', htmlLang: 'id', regions: ['Standard'] },
  { id: 'mn', native: 'Монгол', ja: 'モンゴル語', htmlLang: 'mn', regions: ['Халх (стандарт)'] },
  { id: 'ja', native: '日本語', ja: '日本語', htmlLang: 'ja', regions: ['標準'] },
];

/** 言語タグの国コード → 地域ラベル。ここに無い言語は国コードから地域を決めない */
export const REGION_BY_COUNTRY: Partial<Record<LangId, Record<string, string>>> = {
  en: { GB: 'UK', US: 'US', AU: 'Australia', IN: 'India', PH: 'Philippines', NG: 'Nigeria' },
  pt: { BR: 'Brasil', PT: 'Portugal' },
  es: { MX: 'México', ES: 'España', PE: 'Perú' },
};

export function getLang(id: LangId): Lang {
  const l = LANGS.find((x) => x.id === id);
  if (!l) throw new Error(`unknown lang: ${id}`);
  return l;
}
