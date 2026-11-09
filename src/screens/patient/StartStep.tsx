import { useRef, useState } from 'react';
import Choice from '../../components/Choice';
import Gloss from '../../components/Gloss';
import Icon from '../../components/Icon';
import { LANGS, getLang, type LangId } from '../../data/languages';
import { hasFullCase } from '../../data/interview';
import { countryName, type Detection } from '../../lib/detectLocale';
import { SHOW_GLOSS } from '../../lib/params';
import { TARGET_LANGS, sameAsPatient, type TargetGuess, type TargetLang } from '../../lib/target';
import { useUi } from '../../lib/uiLang';

interface Props {
  detection: Detection;
  /** 本人が一覧から言語を選んだか（選んだら端末の判定は使わない） */
  picked: boolean;
  lang: LangId;
  region: string | null;
  target: TargetLang;
  /** 伝える言葉をどこから推測したか（詳細に出す） */
  targetGuess: TargetGuess;
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
  const [targetOpen, setTargetOpen] = useState(false);
  const targetName = (x: TargetLang) => (x === 'zh' ? '中文' : getLang(x).native);

  const fromPhone = detection.ok && !picked;
  // 方言を端末から決められず、選択肢が複数あるときは隠さない
  const askDialect = L.regions.length > 1 && (!fromPhone || detection.region === null);
  const same = sameAsPatient(target, lang);
  // 「話し始める」は押せない状態にしない。足りないものがあれば、そこまで動かして目立たせる
  // （小さいスマホや大きい文字では、年齢・性別が画面の外にあって気づけないため）
  const ageRef = useRef<HTMLElement>(null);
  const sexRef = useRef<HTMLElement>(null);
  const targetRef = useRef<HTMLElement>(null);
  const [attention, setAttention] = useState<'age' | 'sex' | 'target' | null>(null);
  const start = () => {
    const missing = same ? 'target' : age === null ? 'age' : sex === null ? 'sex' : null;
    if (!missing) { p.onStart(); return; }
    setAttention(missing);
    const el = { age: ageRef, sex: sexRef, target: targetRef }[missing].current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    el?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  };
  const flag = (k: 'age' | 'sex' | 'target') => (attention === k ? ' start__missing' : '');

  const dialectChips = (
    <div className="row-wrap">
      {L.regions.map((r) => <Choice key={r} selected={region === r} onClick={() => p.onPickRegion(r)}>{r}</Choice>)}
    </div>
  );

  // 年齢は数字だけの短い表記で1行に収める（読み上げには各言語の正式な表記を使う）
  const AGE_SHORT = ['0–14', '15–29', '30–49', '50–69', '70+'];

  return (
    <div className="screen">
      <div className="screen__body start">
        {/* 言葉：話す言葉 → 伝える言葉のカードと「詳細」を一つのまとまりにする */}
        <div className="start__group">
          <section className="start__lang" aria-labelledby="you-speak">
            {listOpen ? (
              <div className="stack-10 grow">
                <h2 id="you-speak" className="start__cap">{t.youSpeak}</h2>
                {SHOW_GLOSS && !detection.ok && !picked ? (
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
              <>
                <div className="start__lang-text">
                  <h2 id="you-speak" className="start__cap">{t.youSpeak}</h2>
                  <span className="start__lang-name">{L.native}</span>
                  {/* 方言を端末から決められないときだけ、カードの中で選ばせる（音声認識の設定に関わるため） */}
                  {askDialect ? (
                    <select className="start__dialect" aria-label={t.dialect} value={region ?? ''} onChange={(e) => p.onPickRegion(e.target.value)}>
                      {region === null ? <option value="" disabled>{t.dialect}</option> : null}
                      {L.regions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : null}
                </div>
                <button type="button" className="btn-small" onClick={() => setListOpen(true)}>
                  <Icon name="globe" size={16} />{t.change}
                </button>
              </>
            )}
          </section>
          {!listOpen && fromPhone && lang === 'ja' ? (
            <p className="note" lang="en">Your phone is set to Japanese. If you speak another language, tap “{t.change}”.</p>
          ) : null}

          <div className="start__arrow" aria-hidden="true"><Icon name="arrowDown" size={24} strokeWidth={2.4} /></div>

          {/* 伝える言葉（URL の ?to= か端末の時刻帯から推測。無ければ日本語） */}
          <section ref={targetRef} className={`start__lang${flag('target')}`} aria-labelledby="tell-in">
            {targetOpen ? (
              <div className="stack-10 grow">
                <h2 id="tell-in" className="start__cap">{t.tellIn}</h2>
                <div className="grid-2">
                  {TARGET_LANGS.map((x) => (
                    <Choice key={x} shape="tile" selected={target === x} onClick={() => { p.onPickTarget(x); setTargetOpen(false); setAttention(null); }}>
                      <span className="choice__main" lang={getLang(x).htmlLang}>{targetName(x)}</span>
                    </Choice>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="start__lang-text">
                  <h2 id="tell-in" className="start__cap">{t.tellIn}</h2>
                  <span className="start__lang-name" lang={getLang(target).htmlLang}>{targetName(target)}</span>
                </div>
                <button type="button" className="btn-small" onClick={() => setTargetOpen(true)}>
                  <Icon name="globe" size={16} />{t.change}
                </button>
              </>
            )}
          </section>
          {same ? <p className="note" role="alert">{t.sameLang}</p> : null}

          {/* 地域・方言、言葉の判定の根拠、バージョンは「詳細」の中。カードのすぐ下に置いてつながりを見せる */}
          {!listOpen ? (
            <button type="button" className="details-toggle start__details-toggle" aria-expanded={details} aria-controls="start-details" onClick={() => setDetails((d) => !d)}>
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
              {/* 伝える言葉の推測の根拠：URL の ?to= か、端末の時刻帯 */}
              <div className="settings__row">
                <dt>{t.tellIn}</dt>
                <dd><code>{p.targetGuess.source === 'url' ? `?to=${p.targetGuess.target}` : p.targetGuess.zone ?? '—'}</code></dd>
              </div>
              {!askDialect && L.regions.length > 1 ? (
                <div className="settings__row settings__row--stack">
                  <dt>{t.dialect}</dt>
                  <dd>{dialectChips}</dd>
                </div>
              ) : null}
              {SHOW_GLOSS && !hasFullCase(lang) ? (
                <p className="note" lang="ja">モック注記：この言語では画面の文言と質問を訳してあります。デモの回答（サンプル会話）は英語で表示します。回答まで通しで見られるのは英語・中国語・ベトナム語です。</p>
              ) : null}
              {fromPhone ? (
                <Gloss>
                  {detection.rank > 0 ? `端末の言語リストの${detection.rank + 1}番目にある言語です（先頭は日本語か対応外の言語）。` : ''}
                  {detection.country ? `国・地域は${detection.countrySource === 'format' ? '日付・数字の書式設定' : '言語設定'}から読み取りました` : '国・地域は端末から読み取れませんでした'}
                </Gloss>
              ) : null}
              <p className="version" lang="en">Tsutaeru mock v{__APP_VERSION__} · {__BUILD_DATE__}</p>
            </dl>
          ) : null}
        </div>

        {/* 年齢・性別（既定値なし）。見出しは小さく、選択肢はそれぞれ1行 */}
        <div className="start__group">
          <section ref={ageRef} className={`start__field${flag('age')}`} aria-labelledby="age-h">
            <h2 id="age-h" className="start__cap">{t.age}</h2>
            <div className="start__opts start__opts--5">
              {AGE_SHORT.map((a, i) => (
                <Choice key={i} selected={age === i} ariaLabel={t.ages[i]} onClick={() => { p.onPickAge(i); setAttention(null); }}>{a}</Choice>
              ))}
            </div>
          </section>
          <section ref={sexRef} className={`start__field${flag('sex')}`} aria-labelledby="sex-h">
            <h2 id="sex-h" className="start__cap">{t.sex}</h2>
            <div className="start__opts start__opts--3">
              {t.sexes.map((x, i) => <Choice key={i} selected={sex === i} onClick={() => { p.onPickSex(i); setAttention(null); }}>{x}</Choice>)}
            </div>
          </section>
        </div>
      </div>
      <footer className="screen__foot stack-8">
        {/* 案内は、足りないまま押したときだけ出す */}
        {attention === 'age' || attention === 'sex' ? <p className="start__need" role="status">{t.needAgeSex}</p> : null}
        <button type="button" className="btn-primary" onClick={start}>{t.startTalking}</button>
      </footer>
    </div>
  );
}
