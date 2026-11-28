import { useCountUp } from '../../lib/useCountUp'

/** A whole-rupee figure that counts up, for the drawn illustrations (decorative, so not announced). */
export function CountFigure({ rupees }: { rupees: number }) {
  const shown = useCountUp(rupees, 1400)
  return <>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(shown)}</>
}
