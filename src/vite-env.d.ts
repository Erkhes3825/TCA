/// <reference types="vite/client" />
/** package.json の version（vite.config.ts の define） */
declare const __APP_VERSION__: string;
/** ビルドした日（日本時間, YYYY-MM-DD） */
declare const __BUILD_DATE__: string;
interface ImportMetaEnv {
  /** Claude アーティファクト向けビルドのとき '1'（印刷など、アーティファクト内で動かない機能を隠す） */
  readonly VITE_ARTIFACT?: string;
  /** Web アプリ版（1枚の HTML＋オフライン対応）のビルドのとき '1' */
  readonly VITE_WEB?: string;
}
