import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './Highlights.css'

gsap.registerPlugin(ScrollTrigger)

const slides = [
  {
    id: 1,
    tag: 'Explainability Engine',
    title: ['SHAP-powered', 'atomic insights.'],
    desc: 'Understand exactly which atoms drive toxicity — with per-atom SHAP attribution visualized on the molecule.',
    accent: '#9b7fd4',
    icon: '⬡',
    bg: 'radial-gradient(ellipse at 30% 50%, rgba(155,127,212,0.18) 0%, transparent 70%)',
  },
  {
    id: 2,
    tag: 'Deep Architecture',
    title: ['Titanium-grade', 'neural backbone.'],
    desc: 'Built on graph neural networks trained on curated bioassay data — robust, interpretable, and production-ready.',
    accent: '#b09ae0',
    icon: '◈',
    bg: 'radial-gradient(ellipse at 70% 40%, rgba(176,154,224,0.18) 0%, transparent 70%)',
  },
  {
    id: 3,
    tag: 'Multi-Endpoint',
    title: ['12+ toxicity', 'endpoints covered.'],
    desc: 'From hepatotoxicity to cardiotoxicity — ToxIQ screens across all major safety endpoints in a single pass.',
    accent: '#c4a8ff',
    icon: '◎',
    bg: 'radial-gradient(ellipse at 50% 60%, rgba(196,168,255,0.15) 0%, transparent 70%)',
  },
  {
    id: 4,
    tag: 'Real-time Analysis',
    title: ['Sub-second', 'predictions.'],
    desc: 'Upload a SMILES string or draw a molecule — get toxicity predictions and explanations in under one second.',
    accent: '#7c5cbf',
    icon: '◉',
    bg: 'radial-gradient(ellipse at 40% 30%, rgba(124,92,191,0.2) 0%, transparent 70%)',
  },
]

export default function Highlights() {
  const sectionRef  = useRef(null)
  const headerRef   = useRef(null)
  const trackRef    = useRef(null)
  const [active, setActive]   = useState(0)
  const [progress, setProgress] = useState(0)
  const timers = useRef([])

  const startSlide = (idx) => {
    timers.current.forEach(clearInterval)
    setActive(idx)
    setProgress(0)
    let p = 0
    const interval = setInterval(() => {
      p += 100 / (40)       // 4 sec at 100ms tick
      setProgress(Math.min(p, 100))
      if (p >= 100) {
        clearInterval(interval)
        setActive(a => (a + 1) % slides.length)
      }
    }, 100)
    timers.current = [interval]
  }

  useEffect(() => {
    startSlide(0)
    return () => timers.current.forEach(clearInterval)
  }, [])

  useEffect(() => {
    startSlide(active)
  }, [active])   // eslint-disable-line

  // header entrance
  useEffect(() => {
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: headerRef.current, start: 'top 80%' } })
  }, [])

  const slide = slides[active]

  return (
    <section ref={sectionRef} className="highlights" id="features">
      <div ref={headerRef} className="highlights__header">
        <span className="section-tag">Get the highlights</span>
        <h2 className="highlights__title">Why ToxIQ?</h2>
        <p className="highlights__sub">
          Watch how each capability reshapes drug safety analysis.
        </p>
      </div>

      {/* Main stage */}
      <div ref={trackRef} className="highlights__stage">
        {/* Animated panel */}
        <div className="highlights__panel" key={active}
             style={{ background: slide.bg }}>
          {/* Animated molecule SVG */}
          <div className="highlights__visual">
            <MoleculeViz accent={slide.accent} icon={slide.icon} id={slide.id} />
          </div>

          <div className="highlights__text">
            <span className="section-tag" style={{ color: slide.accent }}>
              {slide.tag}
            </span>
            <h3 className="highlights__slide-title">
              {slide.title.map((l, i) => <span key={i}>{l}<br /></span>)}
            </h3>
            <p className="highlights__slide-desc">{slide.desc}</p>
          </div>
        </div>

        {/* Dot nav */}
        <div className="highlights__dots">
          {slides.map((s, i) => (
            <button key={s.id}
                    className={`highlights__dot ${i === active ? 'active' : ''}`}
                    onClick={() => { timers.current.forEach(clearInterval); setActive(i) }}>
              <span className="highlights__dot-fill"
                    style={i === active ? { width: `${progress}%` } : {}} />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* Molecule-style SVG animation inside each slide */
function MoleculeViz({ accent, icon, id }) {
  const nodes = [
    { cx: 200, cy: 160, r: 28 },
    { cx: 310, cy: 100, r: 20 },
    { cx: 340, cy: 220, r: 24 },
    { cx: 100, cy: 240, r: 22 },
    { cx: 160, cy: 300, r: 18 },
    { cx: 280, cy: 330, r: 16 },
  ]
  const bonds = [
    [0,1],[0,2],[0,3],[0,4],[2,5],[1,2]
  ]

  return (
    <div className="mol-viz">
      <svg viewBox="0 0 440 420" className="mol-svg">
        <defs>
          <radialGradient id={`ng-${id}`}>
            <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.2" />
          </radialGradient>
          <filter id={`glow-${id}`}>
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Bonds */}
        {bonds.map(([a,b], i) => (
          <line key={i}
            x1={nodes[a].cx} y1={nodes[a].cy}
            x2={nodes[b].cx} y2={nodes[b].cy}
            stroke={accent} strokeOpacity="0.3" strokeWidth="2"
            className="mol-bond" />
        ))}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.cx} cy={n.cy} r={n.r}
            fill={`url(#ng-${id})`}
            filter={`url(#glow-${id})`}
            className="mol-node"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}

        {/* SHAP heatmap rings on a few nodes */}
        {[0,2].map(i => (
          <circle key={`shap-${i}`} cx={nodes[i].cx} cy={nodes[i].cy}
            r={nodes[i].r + 10} fill="none"
            stroke={accent} strokeOpacity="0.25" strokeWidth="1.5"
            strokeDasharray="4 4"
            className="mol-ring"
            style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </svg>

      {/* Floating label */}
      <div className="mol-label" style={{ color: accent }}>
        <span className="mol-icon">{icon}</span>
        <span>SHAP Active</span>
      </div>
    </div>
  )
}
