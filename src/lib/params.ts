/**
 * デモ用の URL パラメータ（? はハッシュの前に置く）。
 *   ?locale=en-GB   端末の言語設定を上書きしてシミュレート（未指定なら実機の navigator.languages を使う）
 *                   カンマ区切りで言語リストも渡せる（例 ?locale=ja,en-JP）
 *   ?gloss=1        患者画面に日本語の補足訳を出す（ピッチのデモ用。患者のスマホでは文字量が倍になるので既定では出さない）
 *   ?to=mn          伝える言葉（医療者が読む言葉）の既定。ja / zh / mn（lib/target.ts）
 * 例: http://localhost:5173/?locale=pt-BR#/
 */
const q = new URLSearchParams(window.location.search);

export const SIMULATED_LOCALE: string | null = q.get('locale');
export const SHOW_GLOSS: boolean = q.get('gloss') === '1';
