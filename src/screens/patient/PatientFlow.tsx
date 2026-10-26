import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon';
import TextSizeControl from '../../components/TextSizeControl';
import { getLang, type LangId } from '../../data/languages';
import { getTurns } from '../../data/interview';
import { activeFollowUps, type FollowUpAnswer, type FollowUpAnswers } from '../../data/followUps';
import type { DeptId } from '../../data/ui';
import { UI } from '../../data/ui';
import { UiLangProvider, rememberCaseLang, rememberFollowUps } from '../../lib/uiLang';
import { detectLocale, readDeviceLocales, readFormatCountry } from '../../lib/detectLocale';
import { SIMULATED_LOCALE } from '../../lib/params';
import { SpeechError, loadSpeechUrl, speechLocale, startListening, type SpeechErrorKind, type SpeechSession } from '../../lib/speech';
import LanguageStep from './LanguageStep';
import BasicsStep from './BasicsStep';
import InterviewStep from './InterviewStep';
import ReviewStep from './ReviewStep';
import DoneStep from './DoneStep';

export type Screen = 0 | 1 | 2 | 3 | 4;

export interface FlowState {
  screen: Screen;
  /** 本人が選び直した言語。null なら端末設定の判定結果を使う */
  userLang: LangId | null;
  userRegion: string | null;
  /** 判定結果を使わず一覧から選ぶモード */
  manual: boolean;
  dept: DeptId;
  /** UI.ages の番号 */
  age: number;
  /** UI.sexes の番号 */
  sex: number;
  /** 問診の進行（TURNS のインデックス） */
  step: number;
  /** 聞き足しの進行（activeFollowUps のインデックス）。TURNS が終わってから進む */
  fu: number;
  fuAnswers: FollowUpAnswers;
  pain: number | null;
  recording: boolean;
  /** 音声認識の結果（本物）。キーは 't<問診の番号>' と 'f<聞き足しのid>' */
  live: Record<string, string>;
  /** 話している途中の認識結果 */
  interim: string;
  speechError: SpeechErrorKind | null;
}

const INITIAL: FlowState = {
  screen: 0, userLang: null, userRegion: null, manual: false,
  dept: 'im', age: 2, sex: 0, step: 0, fu: 0, fuAnswers: {}, pain: null, recording: false,
  live: {}, interim: '', speechError: null,
};

/** デモ用：マイクを押してから回答が入るまでの時間 */
const FAKE_LISTEN_MS = 1400;

export default function PatientFlow() {
  const [s, setS] = useState<FlowState>(INITIAL);
  const [sizeOpen, setSizeOpen] = useState(false);
  const update = (patch: Partial<FlowState>) => setS((prev) => ({ ...prev, ...patch }));
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // config.json に speechTokenUrl があれば本物の音声認識（Azure）、無ければデモ（台本再生）
  const [speechUrl, setSpeechUrl] = useState<string | null>(null);
  useEffect(() => { loadSpeechUrl().then(setSpeechUrl); }, []);
  const session = useRef<SpeechSession | null>(null);
  useEffect(() => () => { void session.current?.stop(); }, []);

  const detection = useMemo(
    // ?locale= で上書きしたときは、実機の書式設定の国を混ぜない
    () => SIMULATED_LOCALE ? detectLocale(SIMULATED_LOCALE.split(',')) : detectLocale(readDeviceLocales(), readFormatCountry()),
    [],
  );

  // 有効な言語・地域：本人の選択 > 端末設定の判定 > 既定
  const lang: LangId = s.userLang ?? detection.lang ?? 'en';
  const region: string | null =
    s.userRegion ?? (s.userLang ? getLang(lang).regions[0] : detection.ok ? detection.region : getLang(lang).regions[0]);

  const t = UI[lang];
  const baseTurns = useMemo(() => getTurns(lang), [lang]);
  // 本物の認識のときは、台本の回答を認識結果に差し替える（整える処理は AI を入れるまで無し）
  const turns = useMemo(() => (speechUrl
    ? baseTurns.map((turn, i) => (turn.kind === 'voice'
      ? { ...turn, answer: s.live[`t${i}`], understood: s.live[`t${i}`], terms: [] }
      : turn))
    : baseTurns), [baseTurns, speechUrl, s.live]);
  // 医療者画面のサンプルを、患者が選んだ言語に合わせる
  useEffect(() => { rememberCaseLang(lang); }, [lang]);
  // 聞き足す項目は年齢・性別で変わる（妊娠・授乳）
  const followUps = useMemo(() => activeFollowUps({ age: s.age, sex: s.sex }), [s.age, s.sex]);
  useEffect(() => { rememberFollowUps({ asked: followUps.map((f) => f.id), answers: s.fuAnswers }); }, [followUps, s.fuAnswers]);
  const stepLabel = s.screen < 4 ? t.step(s.screen + 1) : '';

  const go = (screen: Screen) => update({ screen });

  const commitSpeech = (text: string) => setS((p) => {
    if (!text.trim()) return { ...p, recording: false, interim: '', speechError: 'empty' };
    const base = { ...p, recording: false, interim: '', speechError: null };
    return p.step < turns.length
      ? { ...base, step: p.step + 1, live: { ...p.live, [`t${p.step}`]: text } }
      : { ...answered(base, 'voice'), live: { ...p.live, [`f${followUps[p.fu].id}`]: text } };
  });

  const tapMicLive = async (url: string) => {
    if (s.recording) {
      const cur = session.current;
      if (!cur) return; // まだ聞き取りの開始中
      session.current = null;
      commitSpeech(await cur.stop());
      return;
    }
    update({ recording: true, interim: '', speechError: null });
    try {
      session.current = await startListening({ url, locale: speechLocale(lang, region), onInterim: (interim) => update({ interim }) });
    } catch (e) {
      session.current = null;
      update({ recording: false, speechError: e instanceof SpeechError ? e.kind : 'mic' });
    }
  };

  const tapMic = () => {
    if (speechUrl) { void tapMicLive(speechUrl); return; }
    if (s.recording) return;
    update({ recording: true });
    timer.current = window.setTimeout(() => setS((p) => (p.step < turns.length
      ? { ...p, recording: false, step: p.step + 1 }
      : { ...answered(p, 'voice'), recording: false })), FAKE_LISTEN_MS);
  };

  const answered = (p: FlowState, a: FollowUpAnswer): FlowState =>
    ({ ...p, fu: p.fu + 1, fuAnswers: { ...p.fuAnswers, [followUps[p.fu].id]: a } });

  const reset = () => {
    window.clearTimeout(timer.current);
    void session.current?.stop();
    session.current = null;
    setS(INITIAL);
  };

  return (
    <UiLangProvider lang={lang}>
    <div className="phone" lang={getLang(lang).htmlLang}>
      <header className="phone__bar">
        {s.screen > 0 && s.screen < 4 ? (
          <button type="button" className="icon-btn" aria-label={t.back} onClick={() => go((s.screen - 1) as Screen)}>
            <Icon name="back" size={22} />
          </button>
        ) : null}
        <div className="phone__title">
          <strong>Tsutaeru</strong>
          <span>{t.appSubtitle}</span>
        </div>
        <span className="phone__step">{stepLabel}</span>
        <button
          type="button"
          className="icon-btn icon-btn--text"
          aria-label={t.textSize}
          aria-expanded={sizeOpen}
          aria-controls="text-size-panel"
          onClick={() => setSizeOpen((o) => !o)}
        >Aa</button>
        {s.screen < 4 ? (
          <div
            className="phone__progress"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={4}
            aria-valuenow={s.screen + 1}
            aria-valuetext={stepLabel}
          >
            <span style={{ width: `${((s.screen + 1) / 4) * 100}%` }} />
          </div>
        ) : null}
      </header>
      {sizeOpen ? (
        <div id="text-size-panel" className="text-size-panel"><TextSizeControl /></div>
      ) : null}

      {s.screen === 0 && (
        <LanguageStep
          detection={detection}
          manual={s.manual}
          lang={lang}
          region={region}
          onPickLang={(id) => update({ userLang: id, userRegion: getLang(id).regions[0] })}
          onPickRegion={(r) => update({ userRegion: r })}
          onOpenPicker={() => update({ manual: true })}
          onNext={() => go(1)}
        />
      )}
      {s.screen === 1 && (
        <BasicsStep
          dept={s.dept} age={s.age} sex={s.sex}
          onChange={update}
          onNext={() => go(2)}
        />
      )}
      {s.screen === 2 && (
        <InterviewStep
          turns={turns}
          followUps={followUps}
          lang={lang}
          step={s.step}
          fu={s.fu}
          fuAnswers={s.fuAnswers}
          pain={s.pain}
          recording={s.recording}
          live={speechUrl !== null}
          liveVoice={s.live}
          interim={s.interim}
          speechError={s.speechError}
          onTapMic={tapMic}
          onPickPain={(v) => setS((p) => ({ ...p, pain: v, step: p.step + 1 }))}
          onAnswer={(a) => setS((p) => answered(p, a))}
          onNext={() => go(3)}
        />
      )}
      {s.screen === 3 && (
        <ReviewStep turns={turns} followUps={followUps} fuAnswers={s.fuAnswers} liveVoice={speechUrl ? s.live : null} lang={lang} dept={s.dept} pain={s.pain} onConfirm={() => go(4)} onFix={() => go(2)} />
      )}
      {s.screen === 4 && <DoneStep onReset={reset} />}
    </div>
    </UiLangProvider>
  );
}
