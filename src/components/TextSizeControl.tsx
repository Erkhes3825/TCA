import Gloss from './Gloss';
import { TEXT_STEPS, setTextSize, useTextSize } from '../lib/textSize';
import { useUi } from '../lib/uiLang';

/** 文字の大きさを3段階から選ぶ。言語確認の前にも出すので、ボタンは「A」の大きさだけで示す */
export default function TextSizeControl() {
  const step = useTextSize();
  const t = useUi();
  return (
    <div className="text-size" role="group" aria-label={t.textSize}>
      <span className="text-size__label">{t.textSize}<Gloss>文字の大きさ</Gloss></span>
      <div className="text-size__opts">
        {TEXT_STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            className="text-size__opt"
            data-step={s}
            aria-pressed={step === s}
            aria-label={t.sizeNames[i]}
            onClick={() => setTextSize(s)}
          >A</button>
        ))}
      </div>
    </div>
  );
}
