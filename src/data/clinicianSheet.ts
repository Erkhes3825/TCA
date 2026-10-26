// 医療者向けビューのサンプル（患者フローのサンプル回答を日本語化したもの）。
// 実装時は患者フローの結果から生成する。
// 日本語の訳はどの言語でも同じ症例なので共通。言語ごとに変わるのは原文と、口語・方言の置き換え箇所。

import {
  FOLLOW_UPS, FOLLOW_UP_TEXT, SAMPLE_FOLLOW_UP_ANSWERS, getVoiceAnswer, isVoiceId,
  type FollowUpAnswers, type FollowUpId, type OptId, type VoiceId,
} from './followUps';

export type CaseLang = 'en' | 'zh' | 'vi';

export interface SheetRow {
  key: string;
  value: string;
  original: string;
  terms: { from: string; to: string }[];
  flag?: { label: string; tone: 'warn' | 'alert' };
}

export interface SheetCase {
  /** 切替ボタンの表示名 */
  label: string;
  /** 原文の lang 属性 */
  htmlLang: string;
  /** 原文欄の見出し */
  originalLabel: string;
  meta: { language: string; detection: string };
  allergyOriginal: string;
  rows: SheetRow[];
}

export const SHEET_META_COMMON: { k: string; v: string }[] = [
  { k: '受付番号', v: 'MQ-4821' },
  { k: '希望診療科', v: '内科' },
  { k: '年齢', v: '30〜49歳' },
  { k: '性別', v: '女性' },
];

export const SHEET_ALLERGY_LABEL = 'アレルギー：ペニシリン系抗菌薬';

/** 行の並びと日本語の訳（全言語共通） */
const ROWS_JA: Omit<SheetRow, 'original' | 'terms'>[] = [
  { key: '主訴', value: '昨夜から続く強い腹痛。主に右の肋骨の下（右季肋部）。' },
  { key: '痛みの性質', value: '鋭い、刺すような痛み。間欠的（痛んだり治まったりする）。' },
  { key: '増悪因子', value: '揚げ物（フライドチキン）を食べた後に悪化。' },
  { key: '痛みの強さ', value: 'NRS 7 / 10' },
  { key: '随伴症状', value: '悪心あり。嘔吐2回。下痢なし。' },
  { key: '発熱', value: '熱っぽさと悪寒あり。体温は未測定。', flag: { label: '体温未測定', tone: 'warn' } },
  { key: 'アレルギー', value: 'ペニシリン系抗菌薬', flag: { label: '要注意', tone: 'alert' } },
  { key: '常用薬', value: 'なし' },
];

const SCALE_NOTE = '0〜10のスケールで「7」を画面上で選択';

function rows(originals: Pick<SheetRow, 'original' | 'terms'>[]): SheetRow[] {
  return ROWS_JA.map((r, i) => ({ ...r, ...originals[i] }));
}

export const SHEET_CASES: Record<CaseLang, SheetCase> = {
  en: {
    label: 'English',
    htmlLang: 'en',
    originalLabel: '原文（English / UK）',
    meta: { language: '英語（イギリス）', detection: '端末設定 en-GB → 本人確認済み' },
    allergyOriginal: "I'm allergic to penicillin.",
    rows: rows([
      { original: "My tummy's been killing me since last night, mostly up here, under my ribs on the right.", terms: [{ from: 'tummy', to: '腹部（口語）' }, { from: 'killing me', to: '強い痛み（慣用表現）' }] },
      { original: 'Sort of sharp and stabbing. It comes and goes,', terms: [{ from: 'comes and goes', to: '間欠的' }] },
      { original: 'and it got worse after I had fried chicken.', terms: [{ from: 'fried chicken', to: '脂肪の多い食事' }] },
      { original: SCALE_NOTE, terms: [] },
      { original: "I've been feeling queasy and threw up twice. No runs, though.", terms: [{ from: 'queasy', to: '悪心' }, { from: 'threw up', to: '嘔吐' }, { from: 'the runs', to: '下痢（口語）' }] },
      { original: "I felt a bit hot and shivery, but I didn't check.", terms: [{ from: 'shivery', to: '悪寒' }] },
      { original: "I'm allergic to penicillin.", terms: [] },
      { original: 'Nothing regular.', terms: [] },
    ]),
  },
  zh: {
    label: '中文',
    htmlLang: 'zh-Hans',
    originalLabel: '原文（中文 / 普通话）',
    meta: { language: '中国語（普通話）', detection: '端末設定 zh-CN → 本人確認済み' },
    allergyOriginal: '我对青霉素过敏。',
    rows: rows([
      { original: '从昨天晚上开始肚子疼得要命，主要是这儿，右边肋骨下面。', terms: [{ from: '肚子', to: '腹部（口語）' }, { from: '疼得要命', to: '強い痛み（慣用表現）' }] },
      { original: '一阵一阵的，像针扎一样，', terms: [{ from: '一阵一阵的', to: '間欠的' }, { from: '像针扎一样', to: '刺すような痛み' }] },
      { original: '吃了炸鸡以后更疼了。', terms: [{ from: '炸鸡', to: '脂肪の多い食事' }] },
      { original: SCALE_NOTE, terms: [] },
      { original: '老是想吐，吐了两回，没拉肚子。', terms: [{ from: '想吐', to: '悪心（口語）' }, { from: '拉肚子', to: '下痢（口語）' }] },
      { original: '感觉身上有点发热，还打冷战，没量体温。', terms: [{ from: '打冷战', to: '悪寒（口語）' }] },
      { original: '我对青霉素过敏，', terms: [] },
      { original: '平时不吃什么药。', terms: [] },
    ]),
  },
  vi: {
    label: 'Tiếng Việt',
    htmlLang: 'vi',
    originalLabel: '原文（Tiếng Việt / Miền Nam）',
    meta: { language: 'ベトナム語（南部）', detection: '端末設定 vi-VN → 方言は本人が選択（南部）' },
    allergyOriginal: 'Tui bị dị ứng penicillin.',
    rows: rows([
      { original: 'Từ tối qua tới giờ bụng tui đau muốn xỉu, chủ yếu ở đây nè, dưới xương sườn bên phải.', terms: [{ from: 'đau muốn xỉu', to: '強い痛み（慣用表現）' }] },
      { original: 'Đau nhói nhói như kim đâm, lúc đau lúc không,', terms: [{ from: 'lúc đau lúc không', to: '間欠的' }] },
      { original: 'ăn gà rán xong là đau dữ hơn.', terms: [{ from: 'gà rán', to: '脂肪の多い食事' }] },
      { original: SCALE_NOTE, terms: [] },
      { original: 'Tui thấy lợm giọng, ói hai lần rồi. Mà không có tiêu chảy.', terms: [{ from: 'lợm giọng', to: '悪心（口語）' }, { from: 'ói', to: '嘔吐（南部方言）' }] },
      { original: 'Thấy người hâm hấp, ớn lạnh, mà chưa đo nhiệt độ.', terms: [{ from: 'hâm hấp', to: '微熱感（口語）' }, { from: 'ớn lạnh', to: '悪寒' }] },
      { original: 'Tui bị dị ứng penicillin.', terms: [] },
      { original: 'Không có uống thuốc gì thường xuyên.', terms: [] },
    ]),
  },
};

export const CASE_LANGS: CaseLang[] = ['en', 'zh', 'vi'];

// ===== 聞き足しの回答 =====
// 患者画面で答えた内容があればそれを、無ければサンプル症例の回答を出す（lib/uiLang.tsx の recallFollowUps）。
// 選択肢で答えたものは、原文欄に患者が押したボタンの文言を出す。

/** 聞き足しのうち、サンプル症例の自由口述で拾えたため聞いていない項目 */
export const FOLLOW_UP_SKIPPED = '悪寒、常用薬、薬のアレルギーの有無';

const FOLLOW_UP_KEYS: Record<FollowUpId, string> = {
  onsetConfirm: '発症時期', onsetMode: '発症様式', course: '経過', selfCare: '受診前の対処', fatigue: '倦怠感・食欲',
  bloodThinner: '抗凝固薬・抗血小板薬', allergyDetail: '薬剤アレルギーの内容', foodLatex: '食物・ラテックスアレルギー',
  illness: '既往歴', surgery: '手術歴・入院歴', pregnancy: '妊娠の可能性', breastfeeding: '授乳',
  smoking: '喫煙', alcohol: '飲酒', travel: '渡航歴（1か月以内）', heightWeight: '身長・体重',
  insurance: '健康保険', firstVisit: '初診／再診', interpreter: '通訳',
};

/** 声で答えたものの日本語（どの言語でも同じ症例なので共通） */
const VOICE_JA: Record<VoiceId, string> = {
  selfCare: 'アセトアミノフェン2錠を昨夜内服。効果は乏しい。',
  fatigue: '強い倦怠感。食欲低下。',
  allergyDetail: 'ペニシリン：小児期に全身の皮疹。',
  alcohol: '週末に1〜2杯程度。',
};

const VOICE_TERMS: Record<CaseLang, Record<VoiceId, SheetRow['terms']>> = {
  en: {
    selfCare: [{ from: 'paracetamol', to: 'アセトアミノフェン（英国での一般名）' }, { from: 'didn’t really touch it', to: '効果が乏しい（口語）' }],
    fatigue: [{ from: 'wiped out', to: '強い倦怠感（口語）' }, { from: 'can’t face food', to: '食欲低下（口語）' }],
    allergyDetail: [{ from: 'came out in a rash', to: '皮疹' }],
    alcohol: [],
  },
  zh: {
    selfCare: [{ from: '扑热息痛', to: 'アセトアミノフェン（中国での通称）' }],
    fatigue: [{ from: '没劲儿', to: '倦怠感（口語）' }],
    allergyDetail: [{ from: '起疹子', to: '皮疹（口語）' }],
    alcohol: [],
  },
  vi: {
    selfCare: [{ from: 'Panadol', to: 'アセトアミノフェン（商品名）' }, { from: 'hổng', to: '否定（南部方言）' }],
    fatigue: [{ from: 'mệt rã rời', to: '強い倦怠感（口語）' }, { from: 'hổng', to: '否定（南部方言）' }],
    allergyDetail: [{ from: 'nổi mẩn đỏ', to: '皮疹' }],
    alcohol: [{ from: 'nhậu', to: '飲酒（口語）' }],
  },
};

function choiceValueJa(id: FollowUpId, a: OptId): string {
  if (id === 'onsetConfirm') return a === 'correct' ? '昨夜から（聞き取り内容を本人が確認）' : '本人が修正を希望（聞き取りは「昨夜から」）';
  if (id === 'firstVisit') return a === 'yes' ? '初診' : '再診';
  if (id === 'interpreter' && a === 'need') return '希望あり';
  if (id === 'interpreter' && a === 'noNeed') return '不要';
  return FOLLOW_UP_TEXT.ja.opt[a];
}

/** 目立たせる回答。病名の推定はせず、確認が要る回答に印を付けるだけ */
function choiceFlag(id: FollowUpId, a: OptId): SheetRow['flag'] {
  if (a === 'unknown') return { label: '不明', tone: 'warn' };
  if (a === 'noAnswer') return { label: '回答なし', tone: 'warn' };
  if ((id === 'bloodThinner' || id === 'foodLatex') && a === 'yes') return { label: '要注意', tone: 'alert' };
  if (id === 'pregnancy' && a === 'yes') return { label: '要確認', tone: 'alert' };
  if (id === 'onsetConfirm' && a === 'fix') return { label: '要確認', tone: 'warn' };
  if (id === 'interpreter' && a === 'need') return { label: '通訳希望', tone: 'warn' };
  if (id === 'insurance' && a === 'noInsurance') return { label: '保険なし', tone: 'warn' };
  return undefined;
}

export function followUpRows(lang: CaseLang, stored: { asked: FollowUpId[]; answers: FollowUpAnswers } | null): SheetRow[] {
  const asked = stored?.asked ?? FOLLOW_UPS.map((f) => f.id);
  const answers = stored?.answers ?? SAMPLE_FOLLOW_UP_ANSWERS;
  const t = FOLLOW_UP_TEXT[lang];
  const ja = FOLLOW_UP_TEXT.ja;
  return asked.map((id): SheetRow => {
    const key = FOLLOW_UP_KEYS[id];
    const a = answers[id];
    if (a === undefined) return { key, value: '未回答', original: '—', terms: [], flag: { label: '未回答', tone: 'warn' } };
    if (Array.isArray(a)) {
      return {
        key,
        value: a.map((x) => (x === 'none' ? 'なし' : ja.illness[x])).join('、'),
        original: a.map((x) => (x === 'none' ? t.opt.none : t.illness[x])).join(' / '),
        terms: [],
      };
    }
    if (typeof a === 'object') return { key, value: `${a.h} cm / ${a.w} kg`, original: `${a.h} cm / ${a.w} kg`, terms: [] };
    if (a === 'voice') {
      if (!isVoiceId(id)) return { key, value: '—', original: '—', terms: [] };
      return { key, value: VOICE_JA[id], original: getVoiceAnswer(lang, id).answer, terms: VOICE_TERMS[lang][id] };
    }
    return { key, value: choiceValueJa(id, a), original: t.opt[a], terms: [], flag: choiceFlag(id, a) };
  });
}
