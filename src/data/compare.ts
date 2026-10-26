// ピッチ用の比較表。
// 「literal」は違いを説明するために作った例文で、特定の翻訳サービスの実際の出力ではない。
// 「Google 翻訳ではこうなる」と言うなら、実際にかけた結果に差し替えること。

export interface CompareRow { src: string; literal: string; ours: string; how: string }

export const COMPARE_ROWS: CompareRow[] = [
  { src: "I've had the runs since yesterday.", literal: '昨日から走っています。', ours: '昨日から下痢がある。', how: '口語・スラング辞書' },
  { src: "My tummy's been killing me.", literal: 'お腹が私を殺している。', ours: '強い腹痛がある。', how: '慣用表現の強さを変換' },
  { src: 'I feel a bit queasy.', literal: '少し気分が悪い。', ours: '軽い悪心（吐き気）がある。', how: '意味が広すぎる語を症状語に絞る' },
  { src: "I've got pins and needles in my feet.", literal: '足にピンと針がある。', ours: '両足にしびれ（ピリピリ感）がある。', how: '慣用表現の辞書' },
  { src: "I've been poorly all week.", literal: '一週間ずっと貧しい。', ours: '1週間ずっと体調が悪い。', how: '地域差（英国で「体調不良」）' },
];
