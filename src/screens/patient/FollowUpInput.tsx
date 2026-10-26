import { useState } from 'react';
import Choice from '../../components/Choice';
import { ILLNESS_IDS, type FollowUpAnswer, type FollowUpDef, type FollowUpText, type IllnessId } from '../../data/followUps';

interface Props {
  def: FollowUpDef;
  text: FollowUpText;
  onAnswer: (a: FollowUpAnswer) => void;
}

/** 聞き足しの答え方（ボタン・病気の複数選択・身長体重）。声で答えるものはボタンだけ出し、マイクは InterviewStep が出す */
export default function FollowUpInput({ def, text, onAnswer }: Props) {
  const [picks, setPicks] = useState<(IllnessId | 'none')[]>([]);
  const [h, setH] = useState('');
  const [w, setW] = useState('');

  if (def.kind === 'multi') {
    // 「なし」はほかの病気と同時に選べない
    const toggle = (x: IllnessId | 'none') => setPicks((p) =>
      p.includes(x) ? p.filter((y) => y !== x) : x === 'none' ? ['none'] : [...p.filter((y) => y !== 'none'), x]);
    return (
      <div className="stack-10 fu-input">
        <div className="row-wrap">
          {ILLNESS_IDS.map((x) => <Choice key={x} selected={picks.includes(x)} onClick={() => toggle(x)}>{text.illness[x]}</Choice>)}
          <Choice selected={picks.includes('none')} onClick={() => toggle('none')}>{text.opt.none}</Choice>
        </div>
        <button type="button" className="btn-primary" disabled={picks.length === 0} onClick={() => onAnswer(picks)}>{text.next}</button>
      </div>
    );
  }

  if (def.kind === 'measure') {
    return (
      <div className="stack-10 fu-input">
        <div className="grid-2">
          <label className="field">
            <span>{text.height}</span>
            <input inputMode="numeric" pattern="[0-9]*" maxLength={3} value={h} onChange={(e) => setH(e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="field">
            <span>{text.weight}</span>
            <input inputMode="numeric" pattern="[0-9]*" maxLength={3} value={w} onChange={(e) => setW(e.target.value.replace(/\D/g, ''))} />
          </label>
        </div>
        <div className="row-wrap">
          {def.options.map((o) => <Choice key={o} selected={false} onClick={() => onAnswer(o)}>{text.opt[o]}</Choice>)}
        </div>
        <button type="button" className="btn-primary" disabled={!h || !w} onClick={() => onAnswer({ h, w })}>{text.next}</button>
      </div>
    );
  }

  if (def.options.length === 0) return null;
  return (
    <div className="row-wrap fu-input">
      {def.options.map((o) => <Choice key={o} selected={false} onClick={() => onAnswer(o)}>{text.opt[o]}</Choice>)}
    </div>
  );
}
