import { useEffect, useRef } from 'react';
import Choice from '../../components/Choice';
import Gloss from '../../components/Gloss';
import Icon from '../../components/Icon';
import { hasFullCase, type TermMap, type Turn } from '../../data/interview';
import {
  FOLLOW_UP_TEXT, answerLabel, getVoiceAnswer, isVoiceId,
  type FollowUpAnswer, type FollowUpAnswers, type FollowUpDef,
} from '../../data/followUps';
import type { LangId } from '../../data/languages';
import type { SpeechErrorKind } from '../../lib/speech';
import { useUi } from '../../lib/uiLang';
import FollowUpInput from './FollowUpInput';

interface Props {
  turns: Turn[];
  followUps: FollowUpDef[];
  lang: LangId;
  step: number;
  /** 聞き足しの進行（followUps のインデックス） */
  fu: number;
  fuAnswers: FollowUpAnswers;
  pain: number | null;
  recording: boolean;
  /** true なら本物の音声認識（Azure）、false ならデモ */
  live: boolean;
  /** 認識結果。キーは 't<番号>' と 'f<聞き足しのid>' */
  liveVoice: Record<string, string>;
  /** 話している途中の認識結果 */
  interim: string;
  speechError: SpeechErrorKind | null;
  onTapMic: () => void;
  onPickPain: (v: number) => void;
  onAnswer: (a: FollowUpAnswer) => void;
  onNext: () => void;
}

/** 声の回答：話した内容と、AI が整えた内容 */
function VoiceAnswerView({ answer, understood, terms, answerLang }: { answer?: string; understood?: string; terms?: TermMap[]; answerLang?: string }) {
  const t = useUi();
  // understood が無いときは、認識結果だけを出す（本物の音声認識。整える AI はまだ）
  if (understood === undefined) return <div className="answer"><div className="bubble bubble--a" lang={answerLang}>{answer}</div></div>;
  return (
    <div className="answer">
      <div className="bubble bubble--a" lang={answerLang}>{answer}</div>
      <div className="understood">
        <span className="understood__label">{t.weUnderstood}</span>
        <span lang={answerLang}>{understood}</span>
        {terms && terms.length > 0 ? (
          <div className="row-wrap gap-6" lang={answerLang}>
            {terms.map((m) => <span key={m.from} className="term">{m.from} → {m.to}</span>)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const SPEECH_ERROR_TEXT: Record<SpeechErrorKind, { en: string; ja: string }> = {
  mic: { en: 'The microphone is not available. Please allow microphone access and try again.', ja: 'マイクを使えませんでした。ブラウザでマイクの使用を許可してください。' },
  network: { en: 'Could not connect. Please check your connection and try again.', ja: '接続できませんでした。通信状況を確認してもう一度お試しください。' },
  empty: { en: "We couldn't hear you. Please try again.", ja: '聞き取れませんでした。もう一度お試しください。' },
};

export default function InterviewStep({ turns, followUps, lang, step, fu, fuAnswers, pain, recording, live, liveVoice, interim, speechError, onTapMic, onPickPain, onAnswer, onNext }: Props) {
  const t = useUi();
  const ft = FOLLOW_UP_TEXT[lang];
  const ftJa = FOLLOW_UP_TEXT.ja;
  const inFollowUps = step >= turns.length;
  const done = inFollowUps && fu >= followUps.length;
  // 回答のサンプルが無い言語では、英語の回答を出す
  const answerLang = live || hasFullCase(lang) ? undefined : 'en';
  const current = turns[step];
  const currentFu = inFollowUps ? followUps[fu] : undefined;
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [step, fu, interim]);

  const mic = (
    <div className="mic-area">
      <button type="button" className={`mic${recording ? ' mic--live' : ''}`} aria-label={t.tapToSpeak} onClick={onTapMic}>
        <Icon name="mic" size={34} />
      </button>
      <strong>{recording ? t.listening : t.tapToSpeak}</strong>
      <Gloss>{live ? (recording ? '話し終わったら、もう一度タップします' : 'タップして話す。話し終わったら、もう一度タップします') : 'タップして話す（デモでは回答が自動で入ります）'}</Gloss>
      {speechError ? (
        <div role="alert" className="stack-2">
          <span>{SPEECH_ERROR_TEXT[speechError].en}</span>
          <Gloss>{SPEECH_ERROR_TEXT[speechError].ja}</Gloss>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="screen">
      <div className="screen__body chat">
        <div className="hint-box">
          <strong>{t.hint}</strong>
          <Gloss>普段の言葉・方言のままで大丈夫です。AIが医療者向けの言葉に整えます。</Gloss>
        </div>

        {turns.slice(0, step + 1).map((turn, i) => {
          const answered = i < step;
          return (
            <div key={i} className="stack-10">
              <div className="bubble bubble--q">
                <span>{turn.q}</span>
                <Gloss>{turn.qJa}</Gloss>
              </div>
              {answered && turn.kind === 'voice' ? (
                <VoiceAnswerView answer={turn.answer} understood={live ? undefined : turn.understood} terms={live ? undefined : turn.terms} answerLang={answerLang} />
              ) : null}
              {answered && turn.kind === 'scale' ? (
                <div className="bubble bubble--a bubble--strong">{pain === null ? '—' : t.painOutOf(pain)}</div>
              ) : null}
            </div>
          );
        })}

        {inFollowUps && followUps.length > 0 ? (
          <>
            <div className="bubble bubble--q">
              <span>{ft.intro}</span>
              <Gloss>{ftJa.intro}（ここから、最初の口述で拾えなかった必須項目の聞き足し）</Gloss>
            </div>
            {followUps.slice(0, fu + 1).map((f) => {
              const a = fuAnswers[f.id];
              const label = a === undefined ? null : answerLabel(ft, f.id, a);
              return (
                <div key={f.id} className="stack-10">
                  <div className="bubble bubble--q">
                    {f.id === 'pregnancy' ? <span className="bubble__lead">{ft.pregnancyLead}</span> : null}
                    <span>{ft.q[f.id]}</span>
                    <Gloss>{ftJa.q[f.id]}</Gloss>
                  </div>
                  {a === 'voice' && isVoiceId(f.id)
                    ? (live ? <VoiceAnswerView answer={liveVoice[`f${f.id}`]} answerLang={answerLang} /> : <VoiceAnswerView {...getVoiceAnswer(lang, f.id)} answerLang={answerLang} />)
                    : null}
                  {label !== null ? <div className="bubble bubble--a bubble--strong">{label}</div> : null}
                </div>
              );
            })}
          </>
        ) : null}
        {live && recording && interim ? <div className="bubble bubble--a" lang={answerLang}>{interim}…</div> : null}
        <div ref={endRef} />
      </div>

      <footer className="screen__foot screen__foot--white">
        {done ? (
          <button type="button" className="btn-primary" onClick={onNext}>{t.reviewAnswers}</button>
        ) : currentFu ? (
          <div className="stack-10">
            {/* key で質問ごとに入力欄の状態をリセットする */}
            <FollowUpInput key={currentFu.id} def={currentFu} text={ft} onAnswer={onAnswer} />
            {currentFu.kind === 'voice' ? mic : null}
          </div>
        ) : current.kind === 'scale' ? (
          <div className="stack-8">
            <div className="grid-6">
              {Array.from({ length: 11 }, (_, n) => (
                <Choice key={n} shape="num" selected={pain === n} onClick={() => onPickPain(n)} ariaLabel={t.painAria(n)}>{n}</Choice>
              ))}
            </div>
            <div className="scale-legend"><span>{t.scaleMin}</span><span>{t.scaleMax}</span></div>
          </div>
        ) : mic}
      </footer>
    </div>
  );
}
