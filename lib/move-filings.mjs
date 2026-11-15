const day = 86400000;
function istDay(value) { return Math.floor((Date.parse(value) + 19800000) / day); }

export function filingsAroundMove(rows, symbol, observedAt, now = Date.now()) {
  const anchor = istDay(observedAt);
  if (!Number.isFinite(anchor)) return [];
  const seen = new Set();
  return rows.filter(row => row.symbol === symbol && Date.parse(row.publishedAt) <= now &&
    Math.abs(istDay(row.publishedAt) - anchor) <= 1)
    .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))
    .filter(row => { if(seen.has(row.url)) return false; seen.add(row.url); return true; });
}
