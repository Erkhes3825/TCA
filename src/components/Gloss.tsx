import type { ReactNode } from 'react';
import { SHOW_GLOSS } from '../lib/params';
import { useTarget } from '../lib/target';
import { useUiLang } from '../lib/uiLang';

/**
 * ピッチを見る人・日本の医療者向けの日本語補足。?gloss=0 で消える。
 * 画面自体が日本語のときと、伝える言葉が日本語でないとき（中国・モンゴルでの検証）は出さない
 */
export default function Gloss({ children }: { children: ReactNode }) {
  const lang = useUiLang();
  const target = useTarget();
  if (!SHOW_GLOSS || lang === 'ja' || target !== 'ja') return null;
  return <span className="gloss" lang="ja">{children}</span>;
}
