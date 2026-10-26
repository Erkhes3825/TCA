// 見た目だけの QR 風パターン（読み取りできない）。実装時は QR ライブラリに置き換える。
function finder(x: number, y: number, ox: number, oy: number): boolean | null {
  const dx = x - ox, dy = y - oy;
  if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
  if (dx === 0 || dy === 0 || dx === 6 || dy === 6) return true;
  return dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
}

const N = 21;
const CELLS: boolean[] = (() => {
  const out: boolean[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const f = finder(x, y, 0, 0) ?? finder(x, y, 14, 0) ?? finder(x, y, 0, 14);
      if (f !== null) { out.push(f); continue; }
      const sep = (x === 7 && y < 8) || (y === 7 && x < 8) || (x === 13 && y < 8) || (y === 7 && x > 12) || (x === 7 && y > 12) || (y === 13 && x < 8);
      out.push(sep ? false : ((x * 7 + y * 13 + x * y) % 5) < 2);
    }
  }
  return out;
})();

export default function FakeQR({ cell = 8 }: { cell?: number }) {
  return (
    <svg width={N * cell} height={N * cell} viewBox={`0 0 ${N} ${N}`} role="img" aria-label="Sample QR code (not scannable)" shapeRendering="crispEdges">
      <rect width={N} height={N} fill="#FFFFFF" />
      {CELLS.map((on, i) => (on ? <rect key={i} x={i % N} y={Math.floor(i / N)} width="1" height="1" fill="#15201E" /> : null))}
    </svg>
  );
}
