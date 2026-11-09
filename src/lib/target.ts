// 伝える言葉（医療者が読む言葉）。日本・中国・モンゴルでの実地検証に合わせて3つ。
// 既定は URL の ?to=（例 ?to=mn）。現地で配る QR コードの URL に付けておけば、患者は選ばなくてよい。
// 医療者画面には、患者が「話し始める」を押したときの言葉を同じタブの中で引き継ぐ。無ければ ?to=、それも無ければ日本語。
import { createContext, useContext } from 'react';
import type { LangId } from '../data/languages';

export type TargetLang = 'ja' | 'zh' | 'mn';
export const TARGET_LANGS: TargetLang[] = ['ja', 'zh', 'mn'];

export const isTargetLang = (v: unknown): v is TargetLang => v === 'ja' || v === 'zh' || v === 'mn';

/** URL の ?to= が正しければそれ、無ければ日本語 */
export function targetFromUrl(): TargetLang {
  const v = new URLSearchParams(window.location.search).get('to');
  return isTargetLang(v) ? v : 'ja';
}

/** 患者が話す言葉と同じなら訳す意味がない */
export const sameAsPatient = (target: TargetLang, patient: LangId) => target === patient;

const KEY = 'tsutaeru.target';

export function rememberTarget(t: TargetLang) {
  try { sessionStorage.setItem(KEY, t); } catch { /* 保存できなければ医療者画面は ?to= か日本語 */ }
}

export function recallTarget(): TargetLang {
  try {
    const v = sessionStorage.getItem(KEY);
    if (isTargetLang(v)) return v;
  } catch { /* 読めなければ URL か日本語 */ }
  return targetFromUrl();
}

/** 患者画面の中で、今の伝える言葉を参照する（日本語の補足訳を出すかどうか） */
export const TargetCtx = createContext<TargetLang>('ja');
export const useTarget = () => useContext(TargetCtx);
