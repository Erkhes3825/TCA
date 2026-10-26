import { useState } from 'react';
import Icon from '../components/Icon';
import {
  CASE_LANGS, FOLLOW_UP_SKIPPED, SHEET_ALLERGY_LABEL, SHEET_CASES, SHEET_META_COMMON, followUpRows,
  type CaseLang, type SheetCase, type SheetRow,
} from '../data/clinicianSheet';
import { recallCaseLang, recallFollowUps } from '../lib/uiLang';

export default function Clinician() {
  const [showOriginal, setShowOriginal] = useState(true);
  // 既定は患者画面で選んだ言語（サンプルのある英語・中国語・ベトナム語のどれか）
  const [caseLang, setCaseLang] = useState<CaseLang>(recallCaseLang);
  const c = SHEET_CASES[caseLang];
  // 患者画面で聞き足しに答えていればその内容、無ければサンプル
  const [storedFollowUps] = useState(recallFollowUps);
  const fuRows = followUpRows(caseLang, storedFollowUps);
  const meta = [
    SHEET_META_COMMON[0],
    { k: '使用言語', v: c.meta.language },
    { k: '言語の判定', v: c.meta.detection },
    ...SHEET_META_COMMON.slice(1),
  ];
  return (
    <main className="page page--gray">
      <div className="sheet">
        <header className="sheet__head">
          <div className="stack-6">
            <span className="eyebrow">TSUTAERU｜医療者用ビュー</span>
            <h1 className="sheet__h1">問診票（翻訳済み）</h1>
          </div>
          <div className="row-wrap">
            <div className="case-switch" role="group" aria-label="サンプル症例の言語">
              {CASE_LANGS.map((l) => (
                <button key={l} type="button" className="btn-toggle" aria-pressed={caseLang === l} lang={SHEET_CASES[l].htmlLang} onClick={() => setCaseLang(l)}>
                  {SHEET_CASES[l].label}
                </button>
              ))}
            </div>
            <button type="button" className="btn-toggle" aria-pressed={showOriginal} onClick={() => setShowOriginal((v) => !v)}>
              原文を{showOriginal ? '隠す' : '表示'}
            </button>
            {import.meta.env.VITE_ARTIFACT === '1' ? null : (
              <button type="button" className="btn-outline" onClick={() => window.print()}>
                <Icon name="print" size={18} />印刷
              </button>
            )}
          </div>
        </header>

        <dl className="sheet__meta">
          {meta.map((m) => (
            <div key={m.k} className="stack-2">
              <dt>{m.k}</dt>
              <dd>{m.v}</dd>
            </div>
          ))}
        </dl>

        <div className="alert" role="alert">
          <Icon name="warn" size={22} />
          <strong>{SHEET_ALLERGY_LABEL}</strong>
          <span>患者申告（原文：<span lang={c.htmlLang}>{c.allergyOriginal}</span>）</span>
        </div>

        <div className="sheet__rows">
          {c.rows.map((r) => <Row key={r.key} r={r} c={c} showOriginal={showOriginal} />)}
          <div className="sheet__section">
            <h2>聞き足し（自由口述で拾えなかった必須項目）</h2>
            <p>口述で聞き取れたため聞き足していない項目：{FOLLOW_UP_SKIPPED}{storedFollowUps ? '' : '。以下はサンプルの回答（患者画面で答えると、その内容に替わります）'}</p>
          </div>
          {fuRows.map((r) => <Row key={r.key} r={r} c={c} showOriginal={showOriginal} />)}
        </div>

        <p className="sheet__foot">
          本票は患者本人の申告をAIで翻訳・整理したものです。診断や病名の推定は含みません。重要な項目は原文と併せて確認してください。黄色の表示は、患者の口語・方言を医療用語に置き換えた箇所です。
        </p>
      </div>
    </main>
  );
}

function Row({ r, c, showOriginal }: { r: SheetRow; c: SheetCase; showOriginal: boolean }) {
  return (
    <div className="sheet__row">
      <div className="sheet__key">
        <span>{r.key}</span>
        {r.flag ? <span className={`flag flag--${r.flag.tone}`}>{r.flag.label}</span> : null}
      </div>
      <div className="sheet__val">
        <strong>{r.value}</strong>
        {r.terms.length > 0 ? (
          <div className="row-wrap gap-6">
            {r.terms.map((t) => <span key={t.from} className="term"><span lang={c.htmlLang}>{t.from}</span> → {t.to}</span>)}
          </div>
        ) : null}
      </div>
      {showOriginal ? (
        <div className="sheet__orig">
          <span className="xsmall muted bold" lang={c.htmlLang}>{c.originalLabel}</span>
          <span lang={c.htmlLang}>{r.original}</span>
        </div>
      ) : null}
    </div>
  );
}
