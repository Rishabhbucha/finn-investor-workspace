// A discovery request and an EOD refresh may finish in either order.
export async function updateStoredSnapshot(bucket, key, seed, merge) {
  if (!bucket) throw new Error('Persistent storage is unavailable.');
  for (let attempt = 0; attempt < 6; attempt++) {
    const previous = await bucket.get(key);
    const current = previous ? await previous.json() : structuredClone(seed);
    const updated = merge(current);
    const onlyIf = previous ? {etagMatches: previous.etag} : {etagDoesNotMatch: '*'};
    const saved = await bucket.put(key, JSON.stringify(updated), {
      onlyIf, httpMetadata: {contentType: 'application/json'}
    });
    if (saved) return updated;
  }
  throw new Error('Another update is still saving. Please retry.');
}
export function mergeMarketUpdate(current, incoming) {
  const prices = new Map(current.prices.map(p => [p.symbol, p]));
  for (const p of incoming.prices) {
    const previous = prices.get(p.symbol);
    if (!previous || p.date > previous.date ||
        (p.date === previous.date && Date.parse(p.fetchedAt) >= Date.parse(previous.fetchedAt))) prices.set(p.symbol,p);
  }
  const filings = new Map();
  for (const row of [...current.announcements,...incoming.announcements]) {
    const key = row.symbol + '|' + row.url;
    if (!filings.has(key) || Date.parse(row.publishedAt) >= Date.parse(filings.get(key).publishedAt)) filings.set(key,row);
  }
  const isLatest = Date.parse(incoming.updatedAt) >= Date.parse(current.updatedAt);
  return {...current, prices:[...prices.values()], announcements:[...filings.values()],
    updatedAt:isLatest ? incoming.updatedAt : current.updatedAt,
    health:isLatest ? incoming.health : current.health};
}
