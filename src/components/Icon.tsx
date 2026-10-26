// 線画アイコン（絵文字は使わない）
const PATHS = {
  back: <path d="M15 18l-6-6 6-6" />,
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></>),
  edit: (<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>),
  check: <path d="M5 12l5 5 9-10" />,
  phone: (<><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" /></>),
  warn: (<><path d="M12 3l10 18H2z" /><path d="M12 10v4" /><path d="M12 17.5v.5" /></>),
  print: (<><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 14h12v7H6z" /></>),
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 20, strokeWidth = 2 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    // 文字の大きさに合わせて拡大されるよう rem で指定する
    <svg style={{ width: `${size / 16}rem`, height: `${size / 16}rem`, flex: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
