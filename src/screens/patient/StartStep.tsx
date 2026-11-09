import { useState } from 'react';
import Choice from '../../components/Choice';
import Gloss from '../../components/Gloss';
import Icon from '../../components/Icon';
import { LANGS, getLang, type LangId } from '../../data/languages';
import { hasFullCase } from '../../data/interview';
import { countryName, type Detection } from '../../lib/detectLocale';
import { TARGET_LANGS, sameAsPatient, type TargetLang } from '../../lib/target';
import { useUi } from '../../lib/uiLang';

interface Props {
  detection: Detection;
  /** 本人が一覧から言語を選んだか（選んだら端末の判定は使わない） */
  picked: boolean;
  lang: LangId;
  region: string | null;
  target: TargetLang;
  age: number | null;
  sex: number | null;
  onPickLang: (id: LangId) => void;
  onPickRegion: (r: string) => void;
  onPickTarget: (t: TargetLang) => void;
  onPickAge: (i: number) => void;
  onPickSex: (i: number) => void;
  onStart: () => void;
}

/**
 * 会話を始める前の、ただ一つの画面。子どもから高齢者まで使うので、見せるのは
 * 「話す言葉」「伝える言葉」「年齢」「性別」だけ。地域・方言・判定の根拠は「詳細」に入れる。
 * ただし方言を端末から決められないときは、音声認識の設定に関わるのでその場で選ばせる。
 * 年齢・性別は既定値を置かない（そのまま進むと妊娠の質問の有無などを誤るため）。
 * 診療科は聞かない（患者には分からないことが多く、受付で決める）。
 */
export default function StartStep(p: Props) {
  const { detection, picked, lang, region, target, age, sex } = p;
  const t = useUi();
  const L = getLang(lang);
  // 端末から言語を判定できなければ、最初から一覧を開いておく
  const [listOpen, setListOpen] = useState(!detection.ok && !picked);
  const [details, setDetails] = useState(false);

  const fromPhone = detection.ok && !picked;
  // 方言を端末から決められず、選択肢が複数あるときは隠さない
  const askDialect = L.regions.length > 1 && (!fromPhone || detection.region === null);
  const same = sameAsPatient(target, lang);
  const ready = age !== null && sex !== null && !same;

  const dialectChips = (
    <div className="row-wrap">
      {L.regions.map((r) => <Choice key={r} selected={region === r} onClick={() => p.onPickRegion(r)}>{r}</Choice>)}
    </div>
  );

  return (
    <div className="screen">
      <div className="screen__body stack-22">
        {/* 話す言葉 */}
        <section className="stack-10" aria-labelledby="you-speak">
          <h2 id="you-speak" className="start__label">{t.youSpeak}</h2>
          {listOpen ? (
            <div className="stack-10">
              {!detection.ok && !picked ? (
                <p className="note" lang="ja">端末の言語設定（{detection.tag || '不明'}）は対応言語に当たらないため、一覧から選んでもらいます。</p>
              ) : null}
              <div className="grid-2">
                {LANGS.map((l) => (
                  <Choice key={l.id} shape="tile" selected={picked && lang === l.id} onClick={() => { p.onPickLang(l.id); setListOpen(false); }}>
                    <span className="choice__main">{l.native}</span>
                  </Choice>
                ))}
              </div>
            </div>
          ) : (
            <div className="start__lang">
              <span className="start__lang-name">{L.native}</span>
              <button type="button" className="btn-small" onClick={() => setListOpen(true)}>
                <Icon name="globe" size={16} />{t.chooseAnother}
              </button>
            </div>
          )}
          {!listOpen && fromPhone && lang === 'ja' ? (
            <p className="note" lang="en">Your phone is set to Japanese. If you speak another language, tap “{t.chooseAnother}”.</p>
          ) : null}
          {!listOpen && askDialect ? (
            <div className="stack-6">
              <span className="start__sub">{t.dialect}</span>
              {dialectChips}
            </div>
          ) : null}
          {!listOpen ? (
            <button type="button" className="details-toggle" aria-expanded={details} aria-controls="start-details" onClick={() => setDetails((d) => !d)}>
              {details ? t.hideDetails : t.details}
            </button>
          ) : null}
          {details && !listOpen ? (
            <dl id="start-details" className="settings">
              {fromPhone ? (
                <>
                  <div className="settings__row">
                    <dt>{t.region}</dt>
                    <dd>{detection.country ? countryName(detection.country, L.htmlLang) : t.notSet}</dd>
                  </div>
                  <div className="settings__row">
                    <dt>{t.phoneSetting}</dt>
                    <dd><code>{detection.tag || '—'}</code></dd>
                  </div>
                </>
              ) : null}
              {!askDialect && L.regions.length > 1 ? (
                <div className="settings__row settings__row--stack">
                  <dt>{t.dialect}</dt>
                  <dd>{dialectChips}</dd>
                </div>
              ) : null}
              {!hasFullCase(lang) ? (
                <p className="note" lang="ja">モック注記：この言語では画面の文言と質問を訳してあります。デモの回答（サンプル会話）は英語で表示します。回答まで通しで見られるのは英語・中国語・ベトナム語です。</p>
              ) : null}
              {fromPhone ? (
                <Gloss>
                  {detection.rank > 0 ? `端末の言語リストの${detection.rank + 1}番目にある言語です（先頭は日本語か対応外の言語）。` : ''}
                  {detection.country ? `国・地域は${detection.countrySource === 'format' ? '日付・数字の書式設定' : '言語設定'}から読み取りました` : '国・地域は端末から読み取れませんでした'}
                </Gloss>
              ) : null}
            </dl>
          ) : null}
        </section>

        {/* 伝える言葉 */}
        <section className="stack-10" aria-labelledby="tell-in">
          <h2 id="tell-in" className="start__label">{t.tellIn}</h2>
          <div className="seg" role="group" aria-labelledby="tell-in">
            {TARGET_LANGS.map((x) => (
              <Choice key={x} selected={target === x} onClick={() => p.onPickTarget(x)}>
                <span lang={getLang(x).htmlLang}>{x === 'zh' ? '中文' : getLang(x).native}</span>
              </Choice>
            ))}
          </div>
          {same ? <p className="note" role="alert">{t.sameLang}</p> : null}
        </section>

        {/* 年齢・性別（既定値なし） */}
        <section className="stack-10" aria-labelledby="age-h">
          <h2 id="age-h" className="start__label">{t.age}</h2>
          <div className="row-wrap">
            {t.ages.map((a, i) => <Choice key={i} selected={age === i} onClick={() => p.onPickAge(i)}>{a}</Choice>)}
          </div>
        </section>
        <section className="stack-10" aria-labelledby="sex-h">
          <h2 id="sex-h" className="start__label">{t.sex}</h2>
          <div className="row-wrap">
            {t.sexes.map((x, i) => <Choice key={i} selected={sex === i} onClick={() => p.onPickSex(i)}>{x}</Choice>)}
          </div>
        </section>

        <p className="version" lang="en">Tsutaeru mock v{__APP_VERSION__} · {__BUILD_DATE__}</p>
      </div>
      <footer className="screen__foot stack-8">
        {age === null || sex === null ? <p className="start__need">{t.needAgeSex}</p> : null}
        <button type="button" className="btn-primary" disabled={!ready} onClick={p.onStart}>{t.startTalking}</button>
      </footer>
    </div>
  );
}
