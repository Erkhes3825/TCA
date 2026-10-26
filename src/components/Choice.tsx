import type { ReactNode } from 'react';

/** 選択式ボタン。shape=tile は2行カード、pill は丸ボタン */
export default function Choice({ selected, onClick, shape = 'pill', children, ariaLabel }: {
  selected: boolean;
  onClick: () => void;
  shape?: 'pill' | 'tile' | 'num';
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button type="button" className={`choice choice--${shape}`} aria-pressed={selected} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  );
}
