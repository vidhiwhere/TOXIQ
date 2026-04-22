import './Footer.css'

const links = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Use',  href: '#' },
  { label: 'Documentation', href: '#' },
  { label: 'Research',      href: '#' },
  { label: 'Contact',       href: '#' },
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__glow" />

      <div className="footer__top">
        {/* Brand */}
        <div className="footer__brand">
          <span className="footer__logo">
            <span className="footer__logo-tox">TOX</span>
            <span className="footer__logo-iq">IQ</span>
          </span>
          <p className="footer__tagline">
            Molecular toxicity intelligence.<br />Explainable by design.
          </p>
        </div>

        {/* CTA */}
        <div className="footer__cta-wrap">
          <p className="footer__cta-label">Ready to analyse your molecules?</p>
          <a href="#launch-app" className="btn-primary">
            Launch ToxIQ →
          </a>
        </div>
      </div>

      <div className="footer__divider" />

      <div className="footer__bottom">
        <p className="footer__copy">
          © {new Date().getFullYear()} ToxIQ. All rights reserved.
        </p>
        <nav className="footer__links">
          {links.map(l => (
            <a key={l.label} href={l.href} className="footer__link">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}
