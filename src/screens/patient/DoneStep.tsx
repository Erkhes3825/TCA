import FakeQR from '../../components/FakeQR';
import Gloss from '../../components/Gloss';
import Icon from '../../components/Icon';
import { useUi } from '../../lib/uiLang';

export default function DoneStep({ onReset }: { onReset: () => void }) {
  const t = useUi();
  return (
    <div className="screen">
      <div className="screen__body done">
        <div className="done__badge"><Icon name="check" size={28} strokeWidth={2.4} /></div>
        <h1>{t.doneTitle}</h1>
        <p>{t.doneBody}</p>
        <Gloss>受付でこのコードを提示。医療者は日本語訳と原文を並べて読めます</Gloss>
        <div className="qr-card">
          <FakeQR />
          <span className="qr-card__code">MQ-4821</span>
          <span className="muted xsmall" lang="ja">サンプル表示（読み取りできません）</span>
        </div>
        <a className="link-strong" href="#/clinician">{t.previewClinic}</a>
      </div>
      <footer className="screen__foot">
        <button type="button" className="btn-secondary" onClick={onReset}>{t.startOver}</button>
      </footer>
    </div>
  );
}
