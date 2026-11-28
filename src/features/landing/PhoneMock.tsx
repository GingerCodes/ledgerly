import { NetWorthSparkline } from '../overview/NetWorthSparkline'
import { CountFigure } from './CountFigure'
import { MOCK_POINTS, MOCK_ROWS } from './mock-data'

/** A drawn picture of the phone layout (not a real screen): decorative, so hidden from assistive technology. */
export function PhoneMock() {
  return (
    <div className="mock-phone" aria-hidden="true">
      <div className="mock-notch" />
      <div className="mock-phone-body">
        <small>November</small>
        <div className="mock-card has-spark"><NetWorthSparkline points={MOCK_POINTS} /><small>Net worth</small><strong><CountFigure rupees={552000} /></strong><em className="good">▲ ₹22,000</em></div>
        {MOCK_ROWS.map((row) => <p key={row.name} className="mock-row"><span>{row.name}<em>{row.note}</em></span><b className={row.tone}>{row.amount}</b></p>)}
      </div>
      <div className="mock-tabs"><span className="on" /><span /><span /></div>
    </div>
  )
}
