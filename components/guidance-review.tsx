const base = 'https://www.wipro.com/content/dam/nexus/en/investor/quarterly-results/';
function transcript(quarter: string, page: number) {
  const year = quarter.endsWith('26') ? '2025-2026' : '2026-2027';
  return base + year + '/' + quarter + '/' + quarter + '-earnings-transcript.pdf#page=' + page;
}

// Transcribed from the linked calls. Compare sequential IT services revenue growth
// in constant currency for the same target quarter and acquisition scope.
const quarters = [
  {period: 'Q2 FY27', prior:'q1fy27', current:'q2fy27', guidePage:4, actualPage:3, low:-1.5, high:0.5, actual:0},
  {period: 'Q1 FY27', prior:'q4fy26', current:'q1fy27', guidePage:4, actualPage:4, low:-2, high:0, actual:-1.2},
  {period: 'Q4 FY26', prior:'q3fy26', current:'q4fy26', guidePage:6, actualPage:4, low:0, high:2, actual:0.2},
  {period: 'Q3 FY26', prior:'q2fy26', current:'q3fy26', guidePage:6, actualPage:3, low:-0.5, high:1.5, actual:0.6}
];
export default function GuidanceReview() {
  return <section className="panel" aria-label="Wipro guidance review">
    <h2>Wipro’s guidance versus delivery</h2>
    <p>Quarterly growth in IT services revenue, measured against the previous quarter at constant currency. Each row pairs management’s earlier forecast with its subsequent earnings call.</p>
    {quarters.map(row => <article className="guidance-row" key={row.period}>
      <h3>{row.period}</h3>
      <div className="guidance-scale" aria-hidden="true"><span style={{left:((row.low+2)/4*100)+'%',width:((row.high-row.low)/4*100)+'%'}}/><i style={{left:((row.actual+2)/4*100)+'%'}}/></div>
      <p>Guided {row.low}% to {row.high}% · Delivered <strong>{row.actual}%</strong> · {row.actual < row.low ? 'Below range' : row.actual > row.high ? 'Above range' : 'Within range'}</p>
      {row.period === 'Q3 FY26' && <p>The forecast excluded the HARMAN acquisition. Wipro reported 1.4% growth including HARMAN and 0.6% excluding it.</p>}
      <a href={transcript(row.prior,row.guidePage)} target="_blank" rel="noreferrer">Earlier guidance · p. {row.guidePage}</a>
      {' · '}<a href={transcript(row.current,row.actualPage)} target="_blank" rel="noreferrer">Reported result · p. {row.actualPage}</a>
    </article>)}
    <small>Manually verified transcript figures through September 2026.</small>
  </section>;
}
