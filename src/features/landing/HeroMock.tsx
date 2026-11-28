import { CategoryDonut } from '../../components/CategoryDonut'
import { sliceColor } from '../../lib/chart-colors'
import { NetWorthSparkline } from '../overview/NetWorthSparkline'
import { MOCK_POINTS, MOCK_ROWS, MOCK_SLICES } from './mock-data'

/** A drawn picture of the dashboard (not a real screen): decorative, so hidden from assistive technology. */
export function HeroMock() {
  return (
    <div className="mock-window" aria-hidden="true">
      <div className="mock-bar"><i /><i /><i /></div>
      <div className="mock-body">
        <div className="mock-side"><b /><span className="on" /><span /><span /><span /></div>
        <div className="mock-main">
          <div className="mock-cards">
            <div className="mock-card has-spark"><NetWorthSparkline points={MOCK_POINTS} /><small>Net worth</small><strong>₹5,52,000</strong><em className="good">▲ ₹22,000 vs last month</em></div>
            <div className="mock-card"><small>Income</small><strong>₹95,000</strong><em>Same as last month</em></div>
            <div className="mock-card"><small>Expenses</small><strong>₹24,810</strong><em className="bad">▲ 8% vs last month</em></div>
          </div>
          <div className="mock-panels">
            <div className="mock-panel">
              <small>Spending</small>
              <div className="mock-donut-row">
                <CategoryDonut slices={MOCK_SLICES.map((slice, index) => ({ amountPaise: slice.amountPaise, color: sliceColor(index) }))} label="">₹24,810</CategoryDonut>
                <ul>{MOCK_SLICES.slice(0, 4).map((slice, index) => <li key={slice.label}><i style={{ background: sliceColor(index) }} />{slice.label}</li>)}</ul>
              </div>
            </div>
            <div className="mock-panel">
              <small>Recent</small>
              {MOCK_ROWS.map((row) => <p key={row.name} className="mock-row"><span>{row.name}<em>{row.note}</em></span><b className={row.tone}>{row.amount}</b></p>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
