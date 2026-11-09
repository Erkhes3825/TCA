import { useState } from 'react';
import Icon from '../components/Icon';
import {
  CASE_LANGS, FOLLOW_UP_SKIPPED, SHEET_ALLERGY_LABEL, SHEET_CASES, SHEET_META_SAMPLE, followUpRows, interpretedSheet, requiredStatus,
  type CaseLang, type SheetCase, type SheetRow,
} from '../data/clinicianSheet';
import { getLang } from '../data/languages';
import { SHEET_UI, tr } from '../data/sheetI18n';
import { UI } from '../data/ui';
import { itemText, recallInterpretation } from '../lib/interpret';
import { recallTarget, type TargetLang } from '../lib/target';
import { recallBasics, recallCaseLang, recallFollowUps } from '../lib/uiLang';

export default function Clinician() {
  const [showOriginal, setShowOriginal] = useState(true);
  // 患者画面で聞き足しに答えていればその内容、無ければサンプル
  const [storedFollowUps] = useState(recallFollowUps);
  // 本物の音声認識＋AI の解釈で答えていれば、その内容を最初に出す
  const [interpretation] = useState(recallInterpretation);
  const [showLive, setShowLive] = useState(interpretation !== null);
  // 伝える言葉（問診票を出す言葉）。今回の回答はその訳の言葉、サンプルは患者画面で選んだもの（無ければ URL の ?to=）
  const target: TargetLang = showLive && interpretation ? interpretation.target : recallTarget();
  const ui = SHEET_UI[target];
  const T = (s: string) => tr(target, s);
  // サンプル症例は、伝える言葉と同じ言語のものを出さない（中国語で伝えるときに中国語の患者は不要）
  const caseLangs = CASE_LANGS.filter((l) => l !== target);
  // 既定は患者画面で選んだ言語（サンプルのある英語・中国語・ベトナム語のどれか）
  const [pickedCase, setCaseLang] = useState<CaseLang>(recallCaseLang);
  const caseLang = caseLangs.includes(pickedCase) ? pickedCase : caseLangs[0];

  const liveSheet = interpretation ? interpretedSheet(interpretation, storedFollowUps) : null;
  const c = showLive && liveSheet ? liveSheet.c : SHEET_CASES[caseLang];
  // サンプルの口述と同じ項目（AI の解釈に失敗して聞き足した発症時期など）は重ねて出さない
  const fuRows = showLive && liveSheet ? [] : followUpRows(caseLang, storedFollowUps).filter((r) => !c.rows.some((x) => x.key === r.key));
  const required = requiredStatus([...c.rows, ...fuRows]);
  const applicable = required.filter((r) => r.state !== 'na');
  const missing = applicable.filter((r) => r.state === 'missing');

  // 患者画面で選んだ年齢・性別があればそれ、無ければサンプル症例の値
  const [basics] = useState(recallBasics);
  const ages = UI[target].ages;
  const sexes = UI[target].sexes;
  const meta = showLive && interpretation
    ? [
      { k: ui.language, v: c.meta.language },
      { k: ui.detection, v: T(c.meta.detection) },
      { k: ui.age, v: interpretation.age === null ? '—' : ages[interpretation.age] },
      { k: ui.sex, v: interpretation.sex === null ? '—' : sexes[interpretation.sex] },
    ]
    : [
      { k: ui.receipt, v: SHEET_META_SAMPLE.receipt },
      { k: ui.language, v: T(c.meta.language) },
      { k: ui.detection, v: T(c.meta.detection) },
      { k: ui.age, v: ages[basics?.age ?? SHEET_META_SAMPLE.age] },
      { k: ui.sex, v: sexes[basics?.sex ?? SHEET_META_SAMPLE.sex] },
    ];
  const allergyLabel = showLive && liveSheet
    ? `${T('アレルギー')}${target === 'ja' ? '：' : ': '}${itemText(interpretation?.items.drugAllergy)}`
    : T(SHEET_ALLERGY_LABEL);

  return (
    <main className="page page--gray" lang={getLang(target).htmlLang}>
      <div className="sheet">
        <header className="sheet__head">
          <div className="stack-6">
            <span className="eyebrow">{ui.eyebrow}</span>
            <h1 className="sheet__h1">{ui.title}</h1>
          </div>
          <div className="row-wrap">
            <div className="case-switch" role="group" aria-label={ui.caseGroup}>
              {liveSheet ? (
                <button type="button" className="btn-toggle" aria-pressed={showLive} onClick={() => setShowLive(true)}>{ui.thisTime}</button>
              ) : null}
              {caseLangs.map((l) => (
                <button key={l} type="button" className="btn-toggle" aria-pressed={!showLive && caseLang === l} lang={SHEET_CASES[l].htmlLang} onClick={() => { setCaseLang(l); setShowLive(false); }}>
                  {SHEET_CASES[l].label}
                </button>
              ))}
            </div>
            <button type="button" className="btn-toggle" aria-pressed={showOriginal} onClick={() => setShowOriginal((v) => !v)}>
              {showOriginal ? ui.hideOriginal : ui.showOriginal}
            </button>
            {import.meta.env.VITE_ARTIFACT === '1' ? null : (
              <button type="button" className="btn-outline" onClick={() => window.print()}>
                <Icon name="print" size={18} />{ui.print}
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

        {c.allergyOriginal ? (
          <div className="alert" role="alert">
            <Icon name="warn" size={22} />
            <strong>{allergyLabel}</strong>
            <span>{ui.reported[0]}<span lang={c.htmlLang}>{c.allergyOriginal}</span>{ui.reported[1]}</span>
          </div>
        ) : null}

        {/* 必須項目が空欄なく揃っているか。医療者が最初に見る */}
        <div className={`required-bar${missing.length ? ' required-bar--missing' : ''}`}>
          <strong>{ui.requiredBar(applicable.length - missing.length, applicable.length)}</strong>
          <span>{required.map((r) => `${T(r.label)}${r.state === 'na' ? ui.na : r.state === 'missing' ? ui.missing : ''}`).join(ui.listSep)}</span>
        </div>

        <div className="sheet__rows">
          {showLive && liveSheet ? (
            <div className="sheet__section">
              <h2>{ui.liveHeading}</h2>
              <p>{ui.liveNote}</p>
            </div>
          ) : null}
          {c.rows.map((r) => <Row key={r.key} r={r} c={c} target={target} showOriginal={showOriginal} />)}
          {showLive && liveSheet ? null : <div className="sheet__section">
            <h2>{ui.fuHeading}</h2>
            <p>{ui.fuSkipped}{T(FOLLOW_UP_SKIPPED)}{storedFollowUps ? '' : ui.sampleNote}</p>
          </div>}
          {fuRows.map((r) => <Row key={r.key} r={r} c={c} target={target} showOriginal={showOriginal} />)}
        </div>

        <p className="sheet__foot">{ui.mockNote}</p>
        <p className="sheet__foot">{ui.disclaimer}</p>
        {ui.unverified ? <p className="sheet__foot">{ui.unverified}</p> : null}
      </div>
    </main>
  );
}

function Row({ r, c, target, showOriginal }: { r: SheetRow; c: SheetCase; target: TargetLang; showOriginal: boolean }) {
  const T = (s: string) => tr(target, s);
  // 原文は患者の言葉なので訳さない。スケールで選んだことの説明だけは問診票の言葉にする
  const original = r.original.startsWith('0〜10のスケール') ? T(r.original) : r.original;
  return (
    <div className="sheet__row">
      <div className="sheet__key">
        <span>{T(r.key)}</span>
        {r.required ? <span className="flag flag--req">{T('必須')}</span> : null}
        {r.flag ? <span className={`flag flag--${r.flag.tone}`}>{T(r.flag.label)}</span> : null}
      </div>
      <div className="sheet__val">
        <strong>{T(r.value)}</strong>
        {r.terms.length > 0 ? (
          <div className="row-wrap gap-6">
            {r.terms.map((t) => <span key={t.from} className="term"><span lang={c.htmlLang}>{t.from}</span> → {T(t.to)}</span>)}
          </div>
        ) : null}
      </div>
      {showOriginal ? (
        <div className="sheet__orig">
          <span className="xsmall muted bold" lang={c.htmlLang}>{T(c.originalLabel)}</span>
          <span lang={c.htmlLang}>{original}</span>
        </div>
      ) : null}
    </div>
  );
}
