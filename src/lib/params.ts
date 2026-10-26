/**
 * デモ用の URL パラメータ（? はハッシュの前に置く）。
 *   ?locale=en-GB   端末の言語設定を上書きしてシミュレート（未指定なら実機の navigator.languages を使う）
 *                   カンマ区切りで言語リストも渡せる（例 ?locale=ja,en-JP）
 *   ?gloss=0        患者画面の日本語の補足訳を消す
 * 例: http://localhost:5173/?locale=pt-BR#/
 */
const q = new URLSearchParams(window.location.search);

export const SIMULATED_LOCALE: string | null = q.get('locale');
export const SHOW_GLOSS: boolean = q.get('gloss') !== '0';
