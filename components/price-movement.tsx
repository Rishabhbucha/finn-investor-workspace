export default function PriceMovement({ value }: { value?: number | null }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="movement unknown">Change unavailable</span>;
  }
  if (value === 0) return <span className="movement flat">0.00%</span>;

  const magnitude = Math.abs(value);
  const amount = magnitude < 0.005 ? '<0.01' : magnitude.toFixed(2);
  const up = value > 0;
  return <span className={up ? 'movement up' : 'movement down'}>
    {up ? '+' : '−'}{amount}%
  </span>;
}
