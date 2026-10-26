// ピッチ時に画面を行き来するための帯。スマホ幅では患者画面に重ならないよう隠す（styles.css）。
const ITEMS = [
  { route: '/', label: '患者スマホ' },
  { route: '/compare', label: '汎用翻訳との違い' },
  { route: '/clinician', label: '医療者向け問診票' },
];

export default function DemoNav({ route }: { route: string }) {
  return (
    <nav className={`demo-nav${route === '/' ? ' demo-nav--patient' : ''}`} aria-label="デモ画面の切り替え">
      <span className="demo-nav__brand">Tsutaeru モック</span>
      {ITEMS.map((it) => (
        <a key={it.route} href={`#${it.route}`} aria-current={route === it.route ? 'page' : undefined}>
          {it.label}
        </a>
      ))}
    </nav>
  );
}
