import { FAQ } from './content'

/** Native disclosure elements: keyboard accessible and working without JavaScript. */
export function Faq() {
  return (
    <div className="faq-list">
      {FAQ.map((item) => (
        <details key={item.q} className="faq-item">
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  )
}
