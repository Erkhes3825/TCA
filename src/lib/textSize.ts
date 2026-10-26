import { useSyncExternalStore } from 'react';

/**
 * 文字の大きさ（標準 / 大 / 特大 の3段階）。
 * 無段階にすると想定外の倍率でレイアウトが崩れるので、端末の設定も一番近い段階に寄せる。
 * <html data-text="m|l|xl"> を付け、実際のサイズは styles.css が決める。
 */
export type TextStep = 'm' | 'l' | 'xl';
export const TEXT_STEPS: TextStep[] = ['m', 'l', 'xl'];

const KEY = 'tsutaeru.textSize';

/** 端末の文字サイズ設定を読んで段階に寄せる。iOS は Dynamic Type、それ以外はブラウザの既定文字サイズ */
function detectSystemStep(): TextStep {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  probe.style.font = '-apple-system-body';
  const apple = probe.style.font !== '';
  if (!apple) probe.style.fontSize = 'medium';
  document.body.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();
  const ratio = px / (apple ? 17 : 16);
  if (!Number.isFinite(ratio) || ratio < 1.12) return 'm';
  return ratio < 1.37 ? 'l' : 'xl';
}

function readStored(): TextStep | null {
  try {
    const v = localStorage.getItem(KEY);
    return TEXT_STEPS.includes(v as TextStep) ? (v as TextStep) : null;
  } catch {
    return null;
  }
}

let current: TextStep = 'm';
const listeners = new Set<() => void>();

function apply(step: TextStep) {
  current = step;
  document.documentElement.dataset.text = step;
  listeners.forEach((l) => l());
}

/** 描画前に呼ぶ（main.tsx）。本人が選んだ段階 > 端末設定 */
export function initTextSize() {
  apply(readStored() ?? detectSystemStep());
}

export function setTextSize(step: TextStep) {
  try { localStorage.setItem(KEY, step); } catch { /* 保存できなくても今回の表示には効く */ }
  apply(step);
}

export function useTextSize(): TextStep {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
  );
}
