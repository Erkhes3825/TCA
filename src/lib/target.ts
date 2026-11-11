// 伝える言葉（医療者が読む言葉）。日本・中国・モンゴルでの実地検証に合わせて3つ。
// 既定は URL の ?to=（例 ?to=mn）、無ければ端末の時刻帯から推測する（guessTarget）。
// 医療者画面には、患者が「話し始める」を押したときの言葉を同じタブの中で引き継ぐ。無ければ ?to=、それも無ければ日本語。
import { createContext, useContext } from 'react';
import type { LangId } from '../data/languages';

export type TargetLang = 'ja' | 'zh' | 'mn';
export const TARGET_LANGS: TargetLang[] = ['ja', 'zh', 'mn'];

export const isTargetLang = (v: unknown): v is TargetLang => v === 'ja' || v === 'zh' || v === 'mn';

/**
 * 端末の時刻帯 → 伝える言葉。スマホは通常、今いる場所の電波から時刻帯を自動で合わせるので、
 * 位置情報の許可（確認のダイアログ）なしに、日本・中国・モンゴルのどこにいるかを推測できる。
 * 香港・マカオ・台湾は簡体字の中国語を読む医療者とは限らないので入れない
 */
const ZONE_TO_TARGET: Record<string, TargetLang> = {
  'Asia/Tokyo': 'ja', Japan: 'ja',
  'Asia/Shanghai': 'zh', 'Asia/Chongqing': 'zh', 'Asia/Chungking': 'zh', 'Asia/Harbin': 'zh', 'Asia/Urumqi': 'zh', 'Asia/Kashgar': 'zh', PRC: 'zh',
  'Asia/Ulaanbaatar': 'mn', 'Asia/Ulan_Bator': 'mn', 'Asia/Hovd': 'mn', 'Asia/Choibalsan': 'mn',
};

export interface TargetGuess {
  target: TargetLang;
  /** url = URL の ?to=、zone = 端末の時刻帯、default = どれにも当たらず日本語 */
  source: 'url' | 'zone' | 'default';
  zone: string | null;
}

function deviceZone(): string | null {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null; } catch { return null; }
}

/** 伝える言葉の推測：URL の ?to=（現地の QR コードで指定）> 端末の時刻帯 > 日本語 */
export function guessTarget(): TargetGuess {
  const zone = deviceZone();
  const v = new URLSearchParams(window.location.search).get('to');
  if (isTargetLang(v)) return { target: v, source: 'url', zone };
  const z = zone ? ZONE_TO_TARGET[zone] : undefined;
  if (z) return { target: z, source: 'zone', zone };
  return { target: 'ja', source: 'default', zone };
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
  return guessTarget().target;
}

/** 患者画面の中で、今の伝える言葉を参照する（日本語の補足訳を出すかどうか） */
export const TargetCtx = createContext<TargetLang>('ja');
export const useTarget = () => useContext(TargetCtx);
