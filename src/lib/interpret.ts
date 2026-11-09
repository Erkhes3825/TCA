// 自由口述（音声認識の結果）を Azure OpenAI で問診票の項目に当てはめる（api/src/functions/interpret.js）。
// 使うのは本物の音声認識のときだけ。デモ（台本）では、台本に書いてある整えた内容をそのまま使う。
// 当てはまった項目は聞き足さない。当てはまらなかった項目だけを聞き足す。
import type { TermMap } from '../data/interview';
import type { FollowUpId } from '../data/followUps';
import type { LangId } from '../data/languages';
import type { TargetLang } from './target';

export interface InterpretedItem {
  found: boolean;
  /** 「ない」と明言した（アレルギーの警告を出さない判断に使う）。古い版の関数には無い */
  denied?: boolean;
  /** 医療者向けの訳（伝える言葉）。Azure の関数が古い版のときは ja に日本語で入る */
  translated?: string;
  /** 古い版の関数が返す日本語。新しい版では translated */
  ja?: string;
  /** 患者の言語での言い直し（確認画面に出す） */
  restated: string;
  /** 根拠になった患者の発話（原文のまま） */
  evidence: string;
  terms: TermMap[];
}

/** api/src/functions/interpret.js の FIELDS と同じキー・同じ並び（症状の強さはスケールで答えるので無い） */
export const INTERPRET_FIELDS = [
  { id: 'chiefComplaint', key: '主訴' },
  { id: 'onset', key: '発症時期', followUp: 'onset' },
  { id: 'symptomQuality', key: '症状の性質' },
  { id: 'aggravating', key: '増悪因子' },
  { id: 'associated', key: '随伴症状' },
  { id: 'fever', key: '発熱' },
  { id: 'drugAllergy', key: 'アレルギー' },
  { id: 'regularMeds', key: '常用薬' },
  { id: 'selfCare', key: '受診前の対処', followUp: 'selfCare' },
  { id: 'bloodThinner', key: '抗凝固薬・抗血小板薬', followUp: 'bloodThinner' },
  { id: 'pastIllness', key: '既往歴', followUp: 'illness' },
  { id: 'pregnancy', key: '妊娠の可能性', followUp: 'pregnancy' },
] as const satisfies readonly { id: string; key: string; followUp?: FollowUpId }[];

export type InterpretFieldId = (typeof INTERPRET_FIELDS)[number]['id'];
export type InterpretedItems = Record<InterpretFieldId, InterpretedItem>;

/** 口述から当てはまった（＝聞き足さなくてよい）聞き足し */
export function coveredFollowUps(items: InterpretedItems | null): Set<FollowUpId> {
  const out = new Set<FollowUpId>();
  if (!items) return out;
  for (const f of INTERPRET_FIELDS) {
    if ('followUp' in f && items[f.id]?.found) out.add(f.followUp);
  }
  return out;
}

/** 応答を待つ上限。超えたら失敗として扱い、聞き足しを全部聞く（問診を止めない） */
const TIMEOUT_MS = 20000;

/** 医療者向けの訳。関数の新旧どちらの返し方でも読む */
export const itemText = (it: InterpretedItem | undefined): string => it?.translated ?? it?.ja ?? '';

export async function interpret(url: string, body: { lang: LangId; target: TargetLang; locale: string; qa: { q: string; a: string }[] }): Promise<InterpretedItems> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`interpret ${res.status}`);
  const j = await res.json();
  if (!j || typeof j.items !== 'object') throw new Error('interpret: bad response');
  return j.items as InterpretedItems;
}

// 医療者画面に引き継ぐ（同じタブの中だけ。lib/uiLang.tsx の聞き足しと同じ）
const KEY = 'tsutaeru.interpretation';

export interface StoredInterpretation {
  lang: LangId;
  /** 訳した先の言葉。古い版の関数だと、選んでも日本語で返ってくる */
  target: TargetLang;
  locale: string;
  items: InterpretedItems;
  pain: number | null;
  /** UI.ages / UI.sexes の番号 */
  age: number | null;
  sex: number | null;
}

export function rememberInterpretation(v: StoredInterpretation | null) {
  try {
    if (v) sessionStorage.setItem(KEY, JSON.stringify(v));
    else sessionStorage.removeItem(KEY);
  } catch { /* 保存できなければ医療者画面はサンプルを出す */ }
}

export function recallInterpretation(): StoredInterpretation | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as StoredInterpretation | null;
    if (v && v.items && typeof v.items === 'object') return v;
  } catch { /* 読めなければサンプル */ }
  return null;
}
