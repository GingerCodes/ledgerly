import { formatRupees } from '../domain/models'
import { useCountUp } from '../lib/useCountUp'

/** An amount that counts up to its value. Screen readers get the final figure straight away. */
export function AnimatedRupees({ paise }: { paise: number }) {
  const shown = useCountUp(paise)
  return <span aria-label={formatRupees(paise)}><span aria-hidden="true">{formatRupees(shown)}</span></span>
}
