import { useEffect, useLayoutEffect } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Check, Minus } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { trackPageView } from '../../lib/analytics'
import { applyTheme, loadPalette, loadTheme } from '../../lib/theme'
import '../../landing.css'
import { BENEFITS, COMPARE, HERO, INDIA_POINTS, PRIVACY_POINTS, STEPS, TRUST } from './content'
import { Faq } from './Faq'
import { HeroMock } from './HeroMock'
import { PhoneMock } from './PhoneMock'
import { useReveal } from './useReveal'

const PAGE_TITLE = 'Ledgerly · Personal finance tracker for India'

function Cta({ signedIn, large = false }: { signedIn: boolean; large?: boolean }) {
  const size = large ? ' button-lg' : ''
  return signedIn
    ? <Link className={`button button-primary${size}`} to="/overview">Open dashboard <ArrowRight size={18} /></Link>
    : <Link className={`button button-primary${size}`} to="/sign-up">Get started <ArrowRight size={18} /></Link>
}

/**
 * The home page shown in a browser. It always wears the Aurora palette (the visitor's saved light or dark mode still
 * applies) and puts their own palette back when they leave for the app.
 */
export function LandingPage({ signedIn }: { signedIn: boolean }) {
  useLayoutEffect(() => {
    applyTheme(loadTheme(), 'aurora')
    return () => applyTheme(loadTheme(), loadPalette())
  }, [])
  useEffect(() => {
    const previous = document.title
    document.title = PAGE_TITLE
    trackPageView('/', 'Home')
    return () => { document.title = previous }
  }, [])
  const ref = useReveal<HTMLDivElement>()

  return (
    <div className="landing" ref={ref}>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="landing-header">
        <div className="landing-wrap landing-header-row">
          <Link className="landing-brand" to="/" aria-label="Ledgerly home"><span className="brand-mark"><Logo /></span>Ledgerly</Link>
          <nav className="landing-nav" aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#privacy">Privacy</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="landing-actions">
            {!signedIn && <Link className="landing-login" to="/sign-in">Log in</Link>}
            <Cta signedIn={signedIn} />
          </div>
        </div>
      </header>

      <main id="main">
        <section className="landing-hero">
          <div className="landing-wrap landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">{HERO.eyebrow}</p>
              <h1>{HERO.title}</h1>
              <p className="landing-lead">{HERO.text}</p>
              <div className="landing-cta-row">
                <Cta signedIn={signedIn} large />
                {!signedIn && <Link className="button button-secondary button-lg" to="/sign-in">Log in</Link>}
              </div>
              {!signedIn && <p className="landing-micro">{HERO.microcopy}</p>}
            </div>
            <div className="landing-hero-art">
              <HeroMock />
              <PhoneMock />
            </div>
          </div>
        </section>

        <section className="landing-trust" aria-label="What Ledgerly never does">
          <div className="landing-wrap">
            <ul>{TRUST.map(({ icon: Icon, label }) => <li key={label}><Icon size={18} aria-hidden="true" />{label}</li>)}</ul>
          </div>
        </section>

        <section className="landing-section" id="how">
          <div className="landing-wrap">
            <h2 className="reveal">Up and running in three steps</h2>
            <ol className="landing-steps">
              {STEPS.map((step, index) => (
                <li key={step.title} className="reveal"><span className="step-number" aria-hidden="true">{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-section landing-alt" id="features">
          <div className="landing-wrap">
            <h2 className="reveal">Everything you need to understand your money</h2>
            <div className="landing-benefits">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <article key={title} className="landing-benefit reveal"><span className="benefit-icon"><Icon size={22} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-wrap landing-india">
            <div className="reveal">
              <p className="landing-eyebrow">Made for Indian households</p>
              <h2>Built around how you actually save</h2>
              <p className="landing-lead">Most trackers assume a US bank and a calendar year. Ledgerly starts from savings accounts, fixed deposits and the April–March year.</p>
            </div>
            <ul className="landing-checks reveal">{INDIA_POINTS.map((point) => <li key={point}><Check size={18} aria-hidden="true" />{point}</li>)}</ul>
          </div>
        </section>

        <section className="landing-band" aria-label="Get started">
          <div className="landing-wrap landing-band-row">
            <h2>Know where your money stands, starting today.</h2>
            <Cta signedIn={signedIn} large />
          </div>
        </section>

        <section className="landing-section" id="privacy">
          <div className="landing-wrap">
            <h2 className="reveal">Your data stays yours</h2>
            <p className="landing-lead reveal">Ledgerly never asks for your bank login or reads your messages. You decide what goes in, and you can take it out or delete it whenever you like.</p>
            <div className="landing-privacy">
              {PRIVACY_POINTS.map((point) => <article key={point.title} className="landing-fact reveal"><h3>{point.title}</h3><p>{point.text}</p></article>)}
            </div>
          </div>
        </section>

        <section className="landing-section landing-alt">
          <div className="landing-wrap">
            <h2 className="reveal">How Ledgerly compares</h2>
            <div className="landing-table-wrap reveal">
              <table className="landing-table">
                <thead><tr><th scope="col"><span className="visually-hidden">Feature</span></th>{COMPARE.columns.map((column) => <th scope="col" key={column} className={column === 'Ledgerly' ? 'us' : ''}>{column}</th>)}</tr></thead>
                <tbody>
                  {COMPARE.rows.map(([label, ...cells]) => (
                    <tr key={label}><th scope="row">{label}</th>{cells.map((cell, index) => <td key={index} className={index === 2 ? 'us' : ''}>{cell === 'No' && index === 2 ? <Minus size={14} aria-hidden="true" /> : null}{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="landing-note">{COMPARE.note}</p>
          </div>
        </section>

        <section className="landing-section" id="faq">
          <div className="landing-wrap landing-faq">
            <h2 className="reveal">Questions, answered</h2>
            <div className="reveal"><Faq /></div>
          </div>
        </section>

        <section className="landing-final">
          <div className="landing-wrap">
            <h2>Start tracking today.</h2>
            <p className="landing-lead">See your month, your savings and your deposits in one calm place.</p>
            <Cta signedIn={signedIn} large />
            {!signedIn && <p className="landing-micro">{HERO.microcopy}</p>}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap landing-footer-row">
          <span className="landing-brand"><span className="brand-mark"><Logo /></span>Ledgerly</span>
          <span>Your finances, kept private.</span>
          {signedIn ? <Link to="/overview">Open dashboard</Link> : <Link to="/sign-in">Log in</Link>}
        </div>
      </footer>
    </div>
  )
}
