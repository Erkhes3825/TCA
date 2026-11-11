import { useState } from 'react';
import Gloss from '../../components/Gloss';
import Icon from '../../components/Icon';
import type { Turn } from '../../data/interview';
import { FOLLOW_UP_TEXT, answerLabel, getVoiceAnswer, isVoiceId, type FollowUpAnswers, type FollowUpDef, type FollowUpId } from '../../data/followUps';
import type { LangId } from '../../data/languages';
import type { InterpretFieldId, InterpretedItems } from '../../lib/interpret';
import { useUi } from '../../lib/uiLang';

interface Props {
  turns: Turn[];
  followUps: FollowUpDef[];
  fuAnswers: FollowUpAnswers;
  /** 本物の音声認識の結果。null ならデモ */
  liveVoice: Record<string, string> | null;
  /** AI の解釈（本物の音声認識＋interpretUrl のとき）。あれば患者の言語での言い直しを出す */
  interp: InterpretedItems | null;
  lang: LangId;
  pain: number | null;
  /** 本人が書き直した内容。キーは項目名 */
  edits: Record<string, string>;
  onEdit: (key: string, text: string) => void;
  /** 書き直しを AI に反映している最中 */
  busy: boolean;
  onConfirm: () => void;
  onFix: () => void;
}

interface Row { k: string; v: string; editable: boolean }

export default function ReviewStep({ turns, followUps, fuAnswers, liveVoice, interp, lang, pain, edits, onEdit, busy, onConfirm, onFix }: Props) {
  const t = useUi();
  const ft = FOLLOW_UP_TEXT[lang];
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const fuValue = (f: FollowUpDef): string => {
    const a = fuAnswers[f.id];
    if (a === undefined) return '';
    if (a === 'voice') return liveVoice ? (liveVoice[`f${f.id}`] ?? '') : isVoiceId(f.id) ? getVoiceAnswer(lang, f.id).understood : '';
    return answerLabel(ft, f.id, a, true) ?? '';
  };

  const rows: Row[] = [];
  if (interp) {
    // AI が当てはめた内容を、患者の言語の言い直しで出す。当てはまらなかった項目は、話した言葉そのもの・ボタンの回答
    const said = (ids: InterpretFieldId[]) => ids.map((id) => (interp[id]?.found ? interp[id].restated : '')).filter(Boolean).join(' / ');
    const fu = (id: FollowUpId) => followUps.find((f) => f.id === id);
    const add = (k: string, ai: string, fallback: string) => { const v = ai || fallback; if (v) rows.push({ k, v, editable: true }); };
    add(turns[0].reviewKey, said(['chiefComplaint']), turns[0].answer ?? '');
    add(ft.keys.onset, said(['onset']), fu('onset') ? fuValue(fu('onset')!) : '');
    add(turns[1].reviewKey, said(['symptomQuality', 'aggravating']), turns[1].answer ?? '');
    add(turns[2].reviewKey, '', pain === null ? '' : `${pain} / 10`);
    add(turns[3].reviewKey, said(['associated']), turns[3].answer ?? '');
    add(turns[4].reviewKey, said(['fever']), turns[4].answer ?? '');
    add(turns[5].reviewKey, said(['drugAllergy', 'regularMeds']), turns[5].answer ?? '');
    add(ft.keys.selfCare, said(['selfCare']), fu('selfCare') ? fuValue(fu('selfCare')!) : '');
    add(ft.keys.bloodThinner, said(['bloodThinner']), fu('bloodThinner') ? fuValue(fu('bloodThinner')!) : '');
    add(ft.keys.illness, said(['pastIllness']), fu('illness') ? fuValue(fu('illness')!) : '');
    add(ft.keys.pregnancy, said(['pregnancy']), fu('pregnancy') ? fuValue(fu('pregnancy')!) : '');
  } else {
    for (const turn of turns) {
      rows.push({ k: turn.reviewKey, v: turn.kind === 'scale' ? (pain === null ? '—' : `${pain} / 10`) : (turn.understood ?? ''), editable: true });
    }
    // 聞き足しは答えたものだけ
    for (const f of followUps) {
      if (fuAnswers[f.id] !== undefined) rows.push({ k: ft.keys[f.id], v: fuValue(f), editable: true });
    }
  }

  const startEdit = (r: Row) => { setEditing(r.k); setDraft(edits[r.k] ?? r.v); };
  const save = () => {
    if (editing && draft.trim()) onEdit(editing, draft.trim());
    setEditing(null);
  };

  return (
    <div className="screen">
      <div className="screen__body stack-18">
        <div className="stack-6">
          <h1>{t.reviewTitle}</h1>
          <p className="muted">{ft.summary}</p>
          <Gloss>翻訳する前に、患者自身の言語で内容を確認します。違っていれば鉛筆のボタンで書き直せます</Gloss>
        </div>
        <dl className="review">
          {rows.map((r, i) => (
            <div key={r.k} className="review__row">
              <div className="stack-2 grow">
                <dt>{r.k}</dt>
                {editing === r.k ? (
                  <dd className="stack-8">
                    <label className="visually-hidden" htmlFor={`edit-${i}`}>{t.edit(r.k)}</label>
                    <textarea id={`edit-${i}`} className="review__input" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                    <div className="row-wrap">
                      <button type="button" className="btn-small btn-small--primary" onClick={save}>{t.save}</button>
                      <button type="button" className="btn-small" onClick={() => setEditing(null)}>{t.cancel}</button>
                    </div>
                  </dd>
                ) : (
                  <dd>{edits[r.k] ?? r.v}</dd>
                )}
              </div>
              {r.editable && editing !== r.k ? (
                <button type="button" className="icon-btn muted" aria-label={t.edit(r.k)} onClick={() => startEdit(r)}><Icon name="edit" size={18} /></button>
              ) : null}
            </div>
          ))}
        </dl>
      </div>
      <footer className="screen__foot stack-8">
        {busy ? (
          <div className="analyzing" role="status">
            <span>{t.analyzing}</span>
            <Gloss>書き直した内容をAIが問診票に反映しています</Gloss>
          </div>
        ) : (
          <>
            <div className="stack-2">
              <strong>{ft.consent}</strong>
              <Gloss>{FOLLOW_UP_TEXT.ja.consent}（要配慮個人情報の送信への同意）</Gloss>
            </div>
            <button type="button" className="btn-primary" disabled={editing !== null} onClick={onConfirm}>{t.confirm}</button>
            <button type="button" className="btn-secondary" onClick={onFix}>{t.fix}</button>
          </>
        )}
      </footer>
    </div>
  );
}
