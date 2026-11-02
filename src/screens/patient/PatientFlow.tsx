import { useEffect, useMemo, useRef, useState } from 'react';
import Gloss from '../../components/Gloss';
import Icon from '../../components/Icon';
import TextSizeControl from '../../components/TextSizeControl';
import { getLang, type LangId } from '../../data/languages';
import { DEPARTMENT_IDS, getTurns } from '../../data/interview';
import { FOLLOW_UPS, FOLLOW_UP_TEXT, ONSET_FOLLOW_UP, activeFollowUps, type FollowUpAnswer, type FollowUpAnswers, type FollowUpDef, type FollowUpId } from '../../data/followUps';
import type { DeptId } from '../../data/ui';
import { UI } from '../../data/ui';
import { UiLangProvider, rememberCaseLang, rememberFollowUps } from '../../lib/uiLang';
import { detectLocale, readDeviceLocales, readFormatCountry } from '../../lib/detectLocale';
import { SIMULATED_LOCALE } from '../../lib/params';
import { loadConfig } from '../../lib/config';
import { coveredFollowUps, interpret, rememberInterpretation, type InterpretedItems } from '../../lib/interpret';
import { SpeechError, speechLocale, startListening, type SpeechErrorKind, type SpeechSession } from '../../lib/speech';
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
  /**
   * 自由口述の AI 解釈（config.json の interpretUrl があり、本物の音声認識のときだけ）。
   * idle → narrative（口述を解釈中）→ asking（聞き足し中）→ final（聞き足しの声の回答も含めて解釈中）→ done
   */
  interpPhase: 'idle' | 'narrative' | 'asking' | 'final' | 'done';
  /** 最後に成功した解釈。失敗したら null のまま（聞き足しは全部聞く） */
  interp: InterpretedItems | null;
  /** 口述の解釈が終わった時点で決めた聞き足し。途中で変わらないよう固定する */
  fuIds: FollowUpId[] | null;
}

const INITIAL: FlowState = {
  screen: 0, userLang: null, userRegion: null, manual: false,
  dept: 'im', age: 2, sex: 0, step: 0, fu: 0, fuAnswers: {}, pain: null, recording: false,
  live: {}, interim: '', speechError: null,
  interpPhase: 'idle', interp: null, fuIds: null,
};

/** デモ用：マイクを押してから回答が入るまでの時間 */
const FAKE_LISTEN_MS = 1400;

export default function PatientFlow() {
  const [s, setS] = useState<FlowState>(INITIAL);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const update = (patch: Partial<FlowState>) => setS((prev) => ({ ...prev, ...patch }));
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // config.json に speechTokenUrl があれば本物の音声認識（Azure）、無ければデモ（台本再生）。
  // interpretUrl もあれば、口述を AI で問診票の項目に当てはめ、当てはまらなかった項目だけを聞き足す
  const [speechUrl, setSpeechUrl] = useState<string | null>(null);
  const [interpretUrl, setInterpretUrl] = useState<string | null>(null);
  useEffect(() => { loadConfig().then((c) => { setSpeechUrl(c.speechTokenUrl); setInterpretUrl(c.interpretUrl); }); }, []);
  const useInterpret = speechUrl !== null && interpretUrl !== null;
  // 前の回の解釈が医療者画面に残らないようにする
  useEffect(() => { rememberInterpretation(null); }, []);
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
  // 聞き足す項目は年齢・性別で変わる（妊娠）。AI の解釈を使うときは、口述で当てはまった項目を除く
  const followUps = useMemo((): FollowUpDef[] => {
    if (s.fuIds) return s.fuIds.map((id) => [ONSET_FOLLOW_UP, ...FOLLOW_UPS].find((f) => f.id === id)!);
    // 口述の解釈が終わるまでは聞き足しを出さない
    if (useInterpret) return [];
    return activeFollowUps({ age: s.age, sex: s.sex });
  }, [s.fuIds, useInterpret, s.age, s.sex]);

  const speechQa = (p: FlowState, withFollowUps: boolean) => {
    const ft = FOLLOW_UP_TEXT[lang];
    const qa = baseTurns.flatMap((turn, i) => (turn.kind === 'voice' && p.live[`t${i}`] ? [{ q: turn.q, a: p.live[`t${i}`] }] : []));
    if (withFollowUps) {
      for (const f of followUps) if (p.live[`f${f.id}`]) qa.push({ q: ft.q[f.id], a: p.live[`f${f.id}`] });
    }
    return qa;
  };

  // 口述が終わったら解釈して、聞き足す項目を決める。失敗したら全部聞く
  useEffect(() => {
    if (!useInterpret || !interpretUrl || s.screen !== 2 || s.interpPhase !== 'idle' || s.step < turns.length) return;
    update({ interpPhase: 'narrative' });
    const base = activeFollowUps({ age: s.age, sex: s.sex });
    interpret(interpretUrl, { lang, locale: speechLocale(lang, region), qa: speechQa(s, false) })
      .then((items) => {
        const covered = coveredFollowUps(items);
        const ids = [...(items.onset?.found ? [] : [ONSET_FOLLOW_UP.id]), ...base.map((f) => f.id).filter((id) => !covered.has(id))];
        update({ interpPhase: 'asking', interp: items, fuIds: ids });
      })
      .catch(() => update({ interpPhase: 'asking', fuIds: [ONSET_FOLLOW_UP.id, ...base.map((f) => f.id)] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useInterpret, interpretUrl, s.screen, s.interpPhase, s.step, turns.length]);

  // 聞き足しが終わったら、声で答えた聞き足しも含めてもう一度解釈する（医療者画面の内容になる）
  useEffect(() => {
    if (!interpretUrl || s.interpPhase !== 'asking' || s.fu < followUps.length) return;
    const voiced = followUps.some((f) => s.live[`f${f.id}`]);
    if (!voiced) { update({ interpPhase: 'done' }); return; }
    update({ interpPhase: 'final' });
    interpret(interpretUrl, { lang, locale: speechLocale(lang, region), qa: speechQa(s, true) })
      .then((items) => update({ interpPhase: 'done', interp: items }))
      .catch(() => update({ interpPhase: 'done' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interpretUrl, s.interpPhase, s.fu, followUps.length]);

  useEffect(() => {
    if (s.interpPhase === 'done' && s.interp) rememberInterpretation({
      lang, locale: speechLocale(lang, region), items: s.interp, pain: s.pain,
      meta: [
        { k: '希望診療科', v: DEPARTMENT_IDS.find((d) => d.id === s.dept)?.ja ?? '' },
        { k: '年齢', v: UI.ja.ages[s.age] },
        { k: '性別', v: UI.ja.sexes[s.sex] },
      ],
    });
  }, [s.interpPhase, s.interp, s.pain, s.dept, s.age, s.sex, lang, region]);
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
    rememberInterpretation(null);
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
        {/* 話し方のヒントは問診の画面だけ。常に出すと会話の場所を取るので、押したときだけ出す */}
        {s.screen === 2 ? (
          <button
            type="button"
            className="icon-btn icon-btn--text"
            aria-label={t.hintLabel}
            aria-expanded={hintOpen}
            aria-controls="hint-panel"
            onClick={() => { setHintOpen((o) => !o); setSizeOpen(false); }}
          ><Icon name="help" size={22} /></button>
        ) : null}
        <button
          type="button"
          className="icon-btn icon-btn--text"
          aria-label={t.textSize}
          aria-expanded={sizeOpen}
          aria-controls="text-size-panel"
          onClick={() => { setSizeOpen((o) => !o); setHintOpen(false); }}
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
      {hintOpen && s.screen === 2 ? (
        <div id="hint-panel" className="hint-panel">
          <strong>{t.hint}</strong>
          <Gloss>普段の言葉・方言のままで大丈夫です。AIが医療者向けの言葉に整えます。</Gloss>
        </div>
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
          analyzing={s.interpPhase === 'narrative' || s.interpPhase === 'final'}
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
