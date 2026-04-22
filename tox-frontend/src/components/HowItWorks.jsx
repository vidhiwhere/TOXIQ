import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './HowItWorks.css'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    num: '01',
    title: 'Input Your Molecule',
    desc: 'Paste a SMILES string, draw in the sketcher, or upload an SDF file. ToxIQ accepts any standard molecular format.',
    detail: 'Supports SMILES · InChI · SDF · MOL2',
  },
  {
    num: '02',
    title: 'GNN Encoding',
    desc: 'The molecule is converted to a graph. The GNN propagates atomic features through bond edges to build a global representation.',
    detail: 'Graph Attention · Message Passing · Pooling',
  },
  {
    num: '03',
    title: 'Toxicity Prediction',
    desc: 'A multi-task classifier infers probabilities across 12+ endpoints simultaneously — one forward pass, all endpoints.',
    detail: 'Multi-head · Calibrated · Sub-second',
  },
  {
    num: '04',
    title: 'SHAP Attribution',
    desc: 'SHAP values are computed per-atom and rendered back onto the 2D structure — giving you atomic-level explanations.',
    detail: 'TreeSHAP · GradientSHAP · Force plots',
  },
]

export default function HowItWorks() {
  const sectionRef = useRef(null)
  const lineRef    = useRef(null)
  const stepsRef   = useRef([])

  useEffect(() => {
    // Animate the vertical progress line
    gsap.fromTo(lineRef.current,
      { scaleY: 0, transformOrigin: 'top' },
      {
        scaleY: 1, duration: 1.5, ease: 'power2.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' }
      }
    )

    stepsRef.current.forEach((step, i) => {
      gsap.fromTo(step,
        { opacity: 0, x: i % 2 === 0 ? -50 : 50 },
        {
          opacity: 1, x: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: step, start: 'top 80%' },
        }
      )
    })
  }, [])

  return (
    <section ref={sectionRef} className="hiw" id="how-it-works">
      <div className="hiw__header">
        <span className="section-tag">How It Works</span>
        <h2 className="hiw__title">
          From molecule to insight<br />
          <span className="hiw__accent">in four steps.</span>
        </h2>
      </div>

      <div className="hiw__timeline">
        {/* Vertical line */}
        <div ref={lineRef} className="hiw__line" />

        {steps.map((s, i) => (
          <div key={s.num}
               ref={el => stepsRef.current[i] = el}
               className={`hiw__step ${i % 2 === 0 ? 'hiw__step--left' : 'hiw__step--right'}`}>
            <div className="hiw__step-num">{s.num}</div>
            <div className="hiw__step-card">
              <h3 className="hiw__step-title">{s.title}</h3>
              <p className="hiw__step-desc">{s.desc}</p>
              <span className="hiw__step-detail">{s.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
