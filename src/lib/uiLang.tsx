import { createContext, useContext, type ReactNode } from 'react';
import type { LangId } from '../data/languages';
import { UI, type UiStrings } from '../data/ui';
import type { CaseLang } from '../data/clinicianSheet';
import type { FollowUpAnswers, FollowUpId } from '../data/followUps';

/** 患者画面の表示言語。PatientFlow が選ばれた言語で包む */
const Ctx = createContext<LangId>('en');

export function UiLangProvider({ lang, children }: { lang: LangId; children: ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export function useUiLang(): LangId {
  return useContext(Ctx);
}

export function useUi(): UiStrings {
  return UI[useContext(Ctx)];
}

// 患者画面で選んだ言語を医療者画面に引き継ぐ（デモ用。同じ端末・同じタブの中だけ）
const CASE_KEY = 'tsutaeru.caseLang';

export function rememberCaseLang(lang: LangId) {
  try { sessionStorage.setItem(CASE_KEY, lang); } catch { /* 保存できなくても医療者画面で切り替えられる */ }
}

export function recallCaseLang(): CaseLang {
  try {
    const v = sessionStorage.getItem(CASE_KEY);
    if (v === 'zh' || v === 'vi') return v;
  } catch { /* 既定は英語 */ }
  return 'en';
}

// 聞き足しの回答も同じように引き継ぐ。まだ何も答えていなければ医療者画面はサンプルの回答を出す
const FOLLOW_UP_KEY = 'tsutaeru.followUps';

export interface StoredFollowUps { asked: FollowUpId[]; answers: FollowUpAnswers }

export function rememberFollowUps(v: StoredFollowUps) {
  try { sessionStorage.setItem(FOLLOW_UP_KEY, JSON.stringify(v)); } catch { /* 保存できなければサンプルを出す */ }
}

export function recallFollowUps(): StoredFollowUps | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(FOLLOW_UP_KEY) ?? 'null') as StoredFollowUps | null;
    if (v && Array.isArray(v.asked) && v.answers && Object.keys(v.answers).length > 0) return v;
  } catch { /* 読めなければサンプルを出す */ }
  return null;
}
