import Choice from '../../components/Choice';
import Gloss from '../../components/Gloss';
import { DEPARTMENT_IDS } from '../../data/interview';
import type { DeptId } from '../../data/ui';
import { useUi, useUiLang } from '../../lib/uiLang';
import { SHOW_GLOSS } from '../../lib/params';
import type { FlowState } from './PatientFlow';

interface Props {
  dept: DeptId;
  age: number;
  sex: number;
  onChange: (patch: Partial<FlowState>) => void;
  onNext: () => void;
}

export default function BasicsStep({ dept, age, sex, onChange, onNext }: Props) {
  const t = useUi();
  // 診療科の日本語名はタイルの2行目に出す（選択中の白文字でも読めるよう gloss ではなく choice__sub）
  const uiLang = useUiLang();
  const showJa = SHOW_GLOSS && uiLang !== 'ja';
  return (
    <div className="screen">
      <div className="screen__body stack-22">
        <div className="stack-6">
          <h1>{t.basicsTitle}</h1>
          <Gloss>はじめに基本情報を教えてください</Gloss>
        </div>
        <section className="stack-10">
          <div className="stack-2">
            <h2>{t.whichDept}</h2>
            <Gloss>受診する診療科（専門用語の辞書が切り替わります）</Gloss>
          </div>
          <div className="grid-2">
            {DEPARTMENT_IDS.map((d) => (
              <Choice key={d.id} shape="tile" selected={dept === d.id} onClick={() => onChange({ dept: d.id })}>
                <span className="choice__main">{t.departments[d.id]}</span>
                {showJa ? <span className="choice__sub" lang="ja">{d.ja}</span> : null}
              </Choice>
            ))}
          </div>
        </section>
        <section className="stack-10">
          <h2>{t.age}</h2>
          <div className="row-wrap">
            {t.ages.map((a, i) => <Choice key={i} selected={age === i} onClick={() => onChange({ age: i })}>{a}</Choice>)}
          </div>
        </section>
        <section className="stack-10">
          <h2>{t.sex}</h2>
          <div className="row-wrap">
            {t.sexes.map((x, i) => <Choice key={i} selected={sex === i} onClick={() => onChange({ sex: i })}>{x}</Choice>)}
          </div>
        </section>
      </div>
      <footer className="screen__foot">
        <button type="button" className="btn-primary" onClick={onNext}>{t.startTalking}</button>
      </footer>
    </div>
  );
}
