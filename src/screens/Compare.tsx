import { COMPARE_ROWS } from '../data/compare';

const POINTS = [
  { n: '01', t: '診療科別の用語辞書', d: '内科・小児科・整形外科などで辞書を切り替え、症状語を医療者の用語に揃える' },
  { n: '02', t: '地域差・方言の正規化', d: '端末の言語設定と本人の選択から地域を決め、言い回しを標準的な表現に揃えてから翻訳する' },
  { n: '03', t: '原文を必ず併記・診断はしない', d: '訳と原文を並べ、医療者が誤訳に気づける。病名の推定は行わない' },
];

export default function Compare() {
  return (
    <main className="page">
      <div className="page__inner stack-28">
        <header className="stack-10">
          <span className="eyebrow">TSUTAERU｜医療特化の翻訳</span>
          <h1 className="page__h1">「直訳」ではなく、医療者に伝わる言葉へ</h1>
          <p className="lead">口語・スラング・地域差を、診療科ごとの医療用語辞書で整えてから日本語にする</p>
        </header>

        <div className="table-scroll">
          <table className="compare">
            <thead>
              <tr>
                <th>患者の発話（英語・イギリス）</th>
                <th className="muted">直訳した場合の例</th>
                <th className="accent">Tsutaeru（内科辞書）</th>
                <th>効いている仕組み</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((r) => (
                <tr key={r.src}>
                  <td lang="en">{r.src}</td>
                  <td className="literal">{r.literal}</td>
                  <td className="ours">{r.ours}</td>
                  <td><span className="term term--lg">{r.how}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid-3">
          {POINTS.map((p) => (
            <div key={p.n} className="point">
              <span className="eyebrow">{p.n}</span>
              <strong>{p.t}</strong>
              <span>{p.d}</span>
            </div>
          ))}
        </div>

        <p className="muted xsmall">※「直訳した場合の例」は違いを説明するために作成したもので、特定の翻訳サービスの実際の出力ではありません。</p>
      </div>
    </main>
  );
}
