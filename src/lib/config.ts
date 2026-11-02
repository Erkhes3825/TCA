// config.json（public/ → docs/）に書く、Azure Functions の URL。URL は秘密ではないので公開リポジトリに入れてよい。
//   speechTokenUrl  音声認識（Azure AI Speech）の一時トークン。空ならデモ（台本の再生）
//   interpretUrl    自由口述を問診票の項目に当てはめる（Azure OpenAI）。空なら当てはめず、聞き足しは全部聞く
export interface AppConfig {
  speechTokenUrl: string | null;
  interpretUrl: string | null;
}

let configPromise: Promise<AppConfig> | undefined;

const url = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** 無い・読めない（file:// で開いたとき等）ときは、どれも null */
export function loadConfig(): Promise<AppConfig> {
  configPromise ??= fetch(new URL('config.json', document.baseURI), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => ({ speechTokenUrl: url(j?.speechTokenUrl), interpretUrl: url(j?.interpretUrl) }))
    .catch(() => ({ speechTokenUrl: null, interpretUrl: null }));
  return configPromise;
}
