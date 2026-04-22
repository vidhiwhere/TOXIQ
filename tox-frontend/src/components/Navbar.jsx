import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import gsap from 'gsap'
import logo from '../assets/toxiq_logo.png'
import './Navbar.css'

const links = ['About', 'Features', 'Research', 'Assistant', 'How It Works']

export default function Navbar() {
  const navRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    gsap.fromTo(navRef.current,
      { y: -60, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.2 }
    )
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav ref={navRef} className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <img src={logo} alt="ToxIQ Logo" className="navbar__logo-img" />
        </Link>

        {/* Desktop links */}
        <ul className="navbar__links">
          {links.map(l => (
            <li key={l}>
              {l === 'Research' || l === 'Assistant' ? (
                <Link to={l === 'Research' ? '/research' : '/chat'} className="navbar__link">{l}</Link>
              ) : (
                <a href={location.pathname === '/' ? `#${l.toLowerCase().replace(/\s+/g, '-')}` : `/#${l.toLowerCase().replace(/\s+/g, '-')}`}
                   className="navbar__link">
                  {l}
                </a>
              )}
            </li>
          ))}
          <li>
            <Link to="/predict" className="navbar__cta">
              Launch App
            </Link>
          </li>
        </ul>

        {/* Mobile hamburger */}
        <button className={`navbar__burger ${menuOpen ? 'open' : ''}`}
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar__mobile">
          {links.map(l => (
            l === 'Research' || l === 'Assistant' ? (
              <Link key={l} to={l === 'Research' ? '/research' : '/chat'} className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                {l}
              </Link>
            ) : (
              <a key={l} href={location.pathname === '/' ? `#${l.toLowerCase().replace(/\s+/g, '-')}` : `/#${l.toLowerCase().replace(/\s+/g, '-')}`}
                 className="navbar__mobile-link"
                 onClick={() => setMenuOpen(false)}>
                {l}
              </a>
            )
          ))}
          <Link to="/predict" className="navbar__mobile-link navbar__mobile-cta" onClick={() => setMenuOpen(false)}>
            Launch App
          </Link>
        </div>
      )}
    </nav>
  )
}
