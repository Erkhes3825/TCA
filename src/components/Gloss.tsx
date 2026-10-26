import type { ReactNode } from 'react';
import { SHOW_GLOSS } from '../lib/params';
import { useUiLang } from '../lib/uiLang';

/** ピッチを見る人向けの日本語補足。?gloss=0 で消える。画面自体が日本語のときも出さない */
export default function Gloss({ children }: { children: ReactNode }) {
  const lang = useUiLang();
  if (!SHOW_GLOSS || lang === 'ja') return null;
  return <span className="gloss" lang="ja">{children}</span>;
}
