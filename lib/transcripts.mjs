// NSE may publish a one-page intimation in place of the actual call.
export function hasCallContent(chunks) {
  const sample = chunks.slice(0,24).map(c => c.text).join(' ').replace(/\s+/g,' ');
  return sample.length >= 2500 &&
    /moderator\s*:|(?:ladies and gentlemen|good (?:morning|evening|afternoon)).{0,200}(?:call|welcome)|question.and.answer|opening remarks|over to you|operator\s*:/i.test(sample);
}
export function isUsableDocument(doc) {
  return doc.type === 'annual_report' || (doc.type === 'transcript' && hasCallContent(doc.chunks));
}
