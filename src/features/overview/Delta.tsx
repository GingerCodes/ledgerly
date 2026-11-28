/** "▲ 12% vs October". Arrow and words, not only colour, say which way it moved; `goodWhen` says which way is good news. */
export function Delta({ percent, against, goodWhen }: { percent: number | null; against: string; goodWhen: 'up' | 'down' }) {
  if (percent === null) return <small className="delta">Nothing recorded in {against}</small>
  if (percent === 0) return <small className="delta">Same as {against}</small>
  const up = percent > 0
  return <small className={`delta ${up === (goodWhen === 'up') ? 'good' : 'bad'}`}>{up ? '▲' : '▼'} {Math.abs(percent)}% vs {against}</small>
}
