import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './Features.css'

gsap.registerPlugin(ScrollTrigger)

const cards = [
  {
    icon: '⬡',
    title: 'Graph Neural Network',
    desc: 'Molecules are encoded as graphs. Every bond and atom contributes to the final toxicity score with full traceability.',
  },
  {
    icon: '◉',
    title: 'SHAP Explainability',
    desc: 'Atomic-level SHAP values highlight the exact substructures driving each prediction — not a black box.',
  },
  {
    icon: '◈',
    title: 'Multi-Endpoint Screening',
    desc: 'Simultaneously evaluate 12+ toxicity endpoints — from hepatotoxicity to mutagenicity — in a single inference.',
  },
  {
    icon: '⊕',
    title: 'SMILES + SDF Support',
    desc: 'Paste a SMILES string, upload an SDF file, or draw your molecule in the interactive sketcher.',
  },
  {
    icon: '◎',
    title: 'Confidence Scoring',
    desc: 'Every prediction ships with a calibrated confidence score, helping you triage compounds with precision.',
  },
  {
    icon: '⬢',
    title: 'Batch Processing',
    desc: 'Upload a library of thousands of molecules and receive toxicity reports in minutes — not days.',
  },
]

export default function Features() {
  const sectionRef = useRef(null)
  const cardsRef   = useRef([])

  useEffect(() => {
    cardsRef.current.forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 60 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 85%' },
          delay: (i % 3) * 0.1,
        }
      )
    })
  }, [])

  return (
    <section ref={sectionRef} className="features" id="features">
      {/* Section header */}
      <div className="features__header">
        <span className="section-tag">Core Capabilities</span>
        <h2 className="features__title">
          Built for scientists.<br />
          <span className="features__title-accent">Powered by AI.</span>
        </h2>
      </div>

      {/* Cards grid */}
      <div className="features__grid">
        {cards.map((c, i) => (
          <div key={c.title}
               className="features__card"
               ref={el => cardsRef.current[i] = el}>
            <div className="features__card-icon">{c.icon}</div>
            <h3 className="features__card-title">{c.title}</h3>
            <p className="features__card-desc">{c.desc}</p>
            <div className="features__card-line" />
          </div>
        ))}
      </div>
    </section>
  )
}
