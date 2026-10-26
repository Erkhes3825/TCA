import Gloss from '../../components/Gloss';
import Icon from '../../components/Icon';
import type { Turn } from '../../data/interview';
import { FOLLOW_UP_TEXT, answerLabel, getVoiceAnswer, isVoiceId, type FollowUpAnswers, type FollowUpDef } from '../../data/followUps';
import type { LangId } from '../../data/languages';
import type { DeptId } from '../../data/ui';
import { useUi } from '../../lib/uiLang';

interface Props {
  turns: Turn[];
  followUps: FollowUpDef[];
  fuAnswers: FollowUpAnswers;
  /** 本物の音声認識の結果。null ならデモ */
  liveVoice: Record<string, string> | null;
  lang: LangId;
  dept: DeptId;
  pain: number | null;
  onConfirm: () => void;
  onFix: () => void;
}

export default function ReviewStep({ turns, followUps, fuAnswers, liveVoice, lang, dept, pain, onConfirm, onFix }: Props) {
  const t = useUi();
  const ft = FOLLOW_UP_TEXT[lang];
  const rows = [
    { k: t.department, v: t.departments[dept] },
    ...turns.map((turn) => ({
      k: turn.reviewKey,
      v: turn.kind === 'scale' ? (pain === null ? '—' : `${pain} / 10`) : (turn.understood ?? ''),
    })),
    // 聞き足しは答えたものだけ
    ...followUps.flatMap((f) => {
      const a = fuAnswers[f.id];
      if (a === undefined) return [];
      const v = a === 'voice' && isVoiceId(f.id) ? (liveVoice ? (liveVoice[`f${f.id}`] ?? '') : getVoiceAnswer(lang, f.id).understood) : (answerLabel(ft, f.id, a, true) ?? '');
      return [{ k: ft.keys[f.id], v }];
    }),
  ];
  return (
    <div className="screen">
      <div className="screen__body stack-18">
        <div className="stack-6">
          <h1>{t.reviewTitle}</h1>
          <p className="muted">{ft.summary}</p>
          <Gloss>翻訳する前に、患者自身の言語で内容を確認します</Gloss>
        </div>
        <dl className="review">
          {rows.map((r) => (
            <div key={r.k} className="review__row">
              <div className="stack-2 grow">
                <dt>{r.k}</dt>
                <dd>{r.v}</dd>
              </div>
              <button type="button" className="icon-btn muted" aria-label={t.edit(r.k)}><Icon name="edit" size={18} /></button>
            </div>
          ))}
        </dl>
      </div>
      <footer className="screen__foot stack-8">
        <div className="stack-2">
          <strong>{ft.consent}</strong>
          <Gloss>{FOLLOW_UP_TEXT.ja.consent}（要配慮個人情報の送信への同意）</Gloss>
        </div>
        <button type="button" className="btn-primary" onClick={onConfirm}>{t.confirm}</button>
        <button type="button" className="btn-secondary" onClick={onFix}>{t.fix}</button>
      </footer>
    </div>
  );
}
