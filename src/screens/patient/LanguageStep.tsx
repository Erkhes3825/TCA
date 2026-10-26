import { useState } from 'react';
import Choice from '../../components/Choice';
import Gloss from '../../components/Gloss';
import Icon from '../../components/Icon';
import { LANGS, getLang, type LangId } from '../../data/languages';
import { hasFullCase } from '../../data/interview';
import { countryName, type Detection } from '../../lib/detectLocale';
import { useUi } from '../../lib/uiLang';

interface Props {
  detection: Detection;
  manual: boolean;
  lang: LangId;
  region: string | null;
  onPickLang: (id: LangId) => void;
  onPickRegion: (r: string) => void;
  onOpenPicker: () => void;
  onNext: () => void;
}

export default function LanguageStep({ detection, manual, lang, region, onPickLang, onPickRegion, onOpenPicker, onNext }: Props) {
  const showDetected = detection.ok && !manual;
  const L = getLang(lang);
  const t = useUi();
  const [details, setDetails] = useState(false);

  const regionChips = (
    <div className="row-wrap">
      {L.regions.map((r) => (
        <Choice key={r} selected={region === r} onClick={() => onPickRegion(r)}>{r}</Choice>
      ))}
    </div>
  );

  return (
    <div className="screen">
      <div className="screen__body">
        {showDetected ? (
          <section className="stack-18">
            {/* 既定では端末から読んだ値だけを見せる。読み取り元や日本語の補足は「Details」の中 */}
            <h1>{t.ask}</h1>
            <div className="detect-card">
              <div className="detect-card__head">
                <Icon name="phone" size={16} />
                <span>{t.fromPhone}</span>
              </div>
              <dl className="settings">
                <div className="settings__row">
                  <dt>{t.language}</dt>
                  <dd><span className="detect-card__lang">{L.native}</span></dd>
                </div>
                <div className="settings__row">
                  <dt>{t.region}</dt>
                  <dd>
                    <strong className="detect-card__region">
                      {detection.country ? countryName(detection.country, L.htmlLang) : t.notSet}
                    </strong>
                  </dd>
                </div>
                <div className="settings__row">
                  <dt>{t.dialect}</dt>
                  <dd>
                    {detection.region !== null ? <strong className="detect-card__region">{region}</strong> : regionChips}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                className="details-toggle"
                aria-expanded={details}
                aria-controls="detect-details"
                onClick={() => setDetails((d) => !d)}
              >
                {details ? t.hideDetails : t.details}
              </button>
              {details ? (
                <div id="detect-details" className="details">
                  <span>{t.phoneSetting}: <code>{detection.tag || '—'}</code></span>
                  {detection.rank > 0 ? <Gloss>端末の言語リストの{detection.rank + 1}番目にある言語です（先頭は対応外の言語）</Gloss> : null}
                  <Gloss>
                    言語：{L.ja}
                    {detection.country
                      ? ` ／ 国・地域：${countryName(detection.country, 'ja')}${detection.countrySource === 'format' ? '（日付・数字の書式設定から）' : '（言語設定から）'}`
                      : ' ／ 国・地域：端末から読み取れませんでした'}
                  </Gloss>
                  {detection.region === null ? (
                    <Gloss>端末の国・地域から言い回しの地域差を決められないため、方言は本人に選んでもらいます</Gloss>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button type="button" className="btn-secondary" onClick={onOpenPicker}>
              <Icon name="globe" size={18} />{t.chooseAnother}
            </button>
          </section>
        ) : (
          <section className="stack-22">
            {!detection.ok && !manual ? (
              <p className="note" lang="ja">
                端末の言語設定（{detection.tag || '不明'}）は対応言語に当たらないため、一覧から選んでもらいます。日本語設定の端末もこの扱いです。
              </p>
            ) : null}
            <div className="stack-6">
              <h1>{t.whichLanguage}</h1>
              <Gloss>話す言語を選んでください</Gloss>
            </div>
            <div className="grid-2">
              {LANGS.map((l) => (
                <Choice key={l.id} shape="tile" selected={lang === l.id} onClick={() => onPickLang(l.id)}>
                  <span className="choice__main">{l.native}</span>
                  <span className="choice__sub">{l.ja}</span>
                </Choice>
              ))}
            </div>
            <div className="stack-10">
              <div className="stack-4">
                <h2>{t.regionOrDialect}</h2>
                <Gloss>地域・方言 — 言い回しの違いを標準的な表現に揃えてから翻訳します</Gloss>
              </div>
              {regionChips}
            </div>
          </section>
        )}
        {!hasFullCase(lang) ? (
          <p className="note" lang="ja">モック注記：この言語では画面の文言と質問を訳してあります。患者の回答（サンプル会話）は英語で表示します。回答まで通しで見られるのは英語・中国語・ベトナム語です。</p>
        ) : null}
        <p className="version" lang="en">Tsutaeru mock v{__APP_VERSION__} · {__BUILD_DATE__}</p>
      </div>
      <footer className="screen__foot">
        <button type="button" className="btn-primary" onClick={onNext}>{showDetected ? t.yes : t.continue}</button>
      </footer>
    </div>
  );
}
