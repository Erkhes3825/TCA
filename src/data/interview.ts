// モックのサンプル症例：30〜49歳・女性・内科・腹痛。
// 実装時は AI の応答に置き換わる部分。
// 回答まで通しで作ってあるのは英語（イギリス）・中国語（普通話）・ベトナム語（南部）の3つ。
// それ以外の言語は質問だけ訳し、回答は英語のサンプルを出す（画面に注記あり）。
// 英語以外のサンプル回答はモック用の作文。本番前にネイティブチェックが必要。
import type { LangId } from './languages';
import { UI, type DeptId } from './ui';

export const DEPARTMENT_IDS: { id: DeptId; ja: string }[] = [
  { id: 'im', ja: '内科' },
  { id: 'pe', ja: '小児科' },
  { id: 'or', ja: '整形外科' },
  { id: 'de', ja: '皮膚科' },
  { id: 'ob', ja: '産婦人科' },
  { id: 'en', ja: '耳鼻咽喉科' },
];

/** 年齢・性別は UI.ages / UI.sexes の何番目か */
export const AGE_COUNT = 5;
export const SEX_COUNT = 3;

export interface TermMap { from: string; to: string }

export interface Turn {
  /** 回答の種類。scale は 0〜10 の痛みスケール */
  kind: 'voice' | 'scale';
  q: string;
  qJa: string;
  /** 患者の発話（音声認識結果のつもり） */
  answer?: string;
  /** AI が整えた内容（患者の言語） */
  understood?: string;
  /** 口語・方言 → 医療用語の置き換え */
  terms?: TermMap[];
  /** 確認画面での項目名 */
  reviewKey: string;
}

/** 質問の並び。文言は UI[lang].questions / reviewKeys */
const TURN_BASE: { kind: Turn['kind']; qJa: string }[] = [
  { kind: 'voice', qJa: '今日はどうされましたか？ご自身の言葉でどうぞ。' },
  { kind: 'voice', qJa: 'どんな痛みですか？' },
  { kind: 'scale', qJa: '今の痛みの強さは？（0＝痛みなし、10＝想像できる最悪の痛み）' },
  { kind: 'voice', qJa: 'ほかに気になる症状はありますか？' },
  { kind: 'voice', qJa: '熱はありますか？' },
  { kind: 'voice', qJa: 'アレルギーや、普段飲んでいる薬はありますか？' },
];

type Answer = Required<Pick<Turn, 'answer' | 'understood' | 'terms'>> | null;

/** サンプル回答（TURN_BASE と同じ順。scale は null） */
const ANSWERS: Partial<Record<LangId, Answer[]>> = {
  en: [
    {
      answer: "My tummy's been killing me since last night, mostly up here, under my ribs on the right.",
      understood: 'Strong abdominal pain since last night, mainly under the right ribs.',
      terms: [{ from: 'tummy', to: 'abdomen' }, { from: 'killing me', to: 'severe pain' }],
    },
    {
      answer: 'Sort of sharp and stabbing. It comes and goes, and it got worse after I had fried chicken.',
      understood: 'Sharp, stabbing pain that comes and goes. Worse after fatty food.',
      terms: [{ from: 'comes and goes', to: 'intermittent' }, { from: 'fried chicken', to: 'fatty meal' }],
    },
    null,
    {
      answer: "I've been feeling queasy and threw up twice. No runs, though.",
      understood: 'Nausea. Vomited twice. No diarrhoea.',
      terms: [{ from: 'queasy', to: 'nausea' }, { from: 'threw up', to: 'vomiting' }, { from: 'the runs', to: 'diarrhoea' }],
    },
    {
      answer: "I felt a bit hot and shivery, but I didn't check.",
      understood: 'Felt feverish with chills. Temperature not measured.',
      terms: [{ from: 'shivery', to: 'chills' }],
    },
    {
      answer: "I'm allergic to penicillin. Nothing regular.",
      understood: 'Penicillin allergy. No regular medication.',
      terms: [],
    },
  ],
  zh: [
    {
      answer: '从昨天晚上开始肚子疼得要命，主要是这儿，右边肋骨下面。',
      understood: '从昨晚开始腹部剧烈疼痛，主要在右侧肋骨下方。',
      terms: [{ from: '肚子', to: '腹部' }, { from: '疼得要命', to: '剧烈疼痛' }],
    },
    {
      answer: '一阵一阵的，像针扎一样，吃了炸鸡以后更疼了。',
      understood: '阵发性刺痛，进食油腻食物后加重。',
      terms: [{ from: '一阵一阵的', to: '阵发性' }, { from: '像针扎一样', to: '刺痛' }, { from: '炸鸡', to: '油腻食物' }],
    },
    null,
    {
      answer: '老是想吐，吐了两回，没拉肚子。',
      understood: '恶心，呕吐两次，无腹泻。',
      terms: [{ from: '想吐', to: '恶心' }, { from: '拉肚子', to: '腹泻' }],
    },
    {
      answer: '感觉身上有点发热，还打冷战，没量体温。',
      understood: '自觉发热伴寒战，未测体温。',
      terms: [{ from: '打冷战', to: '寒战' }],
    },
    {
      answer: '我对青霉素过敏，平时不吃什么药。',
      understood: '青霉素过敏，无常用药。',
      terms: [],
    },
  ],
  // 南部の話し言葉（tui、ói など）。方言の正規化を見せるため
  vi: [
    {
      answer: 'Từ tối qua tới giờ bụng tui đau muốn xỉu, chủ yếu ở đây nè, dưới xương sườn bên phải.',
      understood: 'Đau bụng dữ dội từ tối qua, chủ yếu ở dưới xương sườn bên phải.',
      terms: [{ from: 'đau muốn xỉu', to: 'đau dữ dội' }],
    },
    {
      answer: 'Đau nhói nhói như kim đâm, lúc đau lúc không, ăn gà rán xong là đau dữ hơn.',
      understood: 'Đau nhói như kim đâm, từng cơn, tăng lên sau khi ăn đồ nhiều dầu mỡ.',
      terms: [{ from: 'lúc đau lúc không', to: 'đau từng cơn' }, { from: 'gà rán', to: 'đồ ăn nhiều dầu mỡ' }],
    },
    null,
    {
      answer: 'Tui thấy lợm giọng, ói hai lần rồi. Mà không có tiêu chảy.',
      understood: 'Buồn nôn, nôn hai lần. Không tiêu chảy.',
      terms: [{ from: 'lợm giọng', to: 'buồn nôn' }, { from: 'ói', to: 'nôn' }],
    },
    {
      answer: 'Thấy người hâm hấp, ớn lạnh, mà chưa đo nhiệt độ.',
      understood: 'Cảm thấy sốt nhẹ kèm rét run. Chưa đo nhiệt độ.',
      terms: [{ from: 'hâm hấp', to: 'sốt nhẹ' }, { from: 'ớn lạnh', to: 'rét run' }],
    },
    {
      answer: 'Tui bị dị ứng penicillin. Không có uống thuốc gì thường xuyên.',
      understood: 'Dị ứng penicillin. Không dùng thuốc thường xuyên.',
      terms: [],
    },
  ],
};

/** 回答まで通しのサンプルがある言語か */
export function hasFullCase(lang: LangId): boolean {
  return lang in ANSWERS;
}

/** 選んだ言語の問診。質問はその言語、回答はその言語のサンプル（無ければ英語） */
export function getTurns(lang: LangId): Turn[] {
  const t = UI[lang];
  const answers = ANSWERS[lang] ?? ANSWERS.en!;
  return TURN_BASE.map((b, i) => ({
    kind: b.kind,
    qJa: b.qJa,
    q: t.questions[i],
    reviewKey: t.reviewKeys[i],
    ...(answers[i] ?? {}),
  }));
}
