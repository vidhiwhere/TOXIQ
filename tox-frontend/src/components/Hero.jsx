import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './Hero.css'

gsap.registerPlugin(ScrollTrigger)

export default function Hero() {
  const sectionRef = useRef(null)
  const tagRef = useRef(null)
  const baseTitleRef = useRef(null)
  const sandTitleRef = useRef(null)
  const subRef = useRef(null)
  const ctaRef = useRef(null)
  const glowRef = useRef(null)

  useEffect(() => {
    // We delay slightly to allow loader to fade out
    const tl = gsap.timeline({ delay: 3.6 })

    // Tag and base Subtitle/CTA fade in
    tl.fromTo(tagRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })

    // --- The Sand Reveal Effect ---
    // The sand text starts fully visible, the base text starts hidden.
    // We animate the sand blowing away (blur + scale + clipPath + opacity)
    // while the shiny text reveals.

    // Base text appears word by word subtly
    tl.fromTo(baseTitleRef.current.querySelectorAll('.hero__word'),
      { opacity: 0 },
      { opacity: 1, duration: 2, ease: 'power2.inOut', stagger: 0.2 }, '-=0.4')

    // Sand text blows away simultaneously
    tl.fromTo(sandTitleRef.current.querySelectorAll('.hero__word'),
      { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0, x: 0 },
      {
        opacity: 0,
        filter: 'blur(12px)',
        scale: 1.05,
        y: -15,
        x: 20,
        duration: 2.5,
        ease: 'power3.inOut',
        stagger: 0.2
      },
      '<') // start at the same time as the base text reveal

    // Rest of elements
    tl.fromTo(subRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=1.5')
      .fromTo(ctaRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12 }, '-=1.2')

    // Parallax glow on scroll
    gsap.to(glowRef.current, {
      y: 120,
      ease: 'none',
      scrollTrigger: { trigger: sectionRef.current, scrub: true }
    })
  }, [])

  const words = ['Molecular', 'Toxicity', 'Intelligence.']

  return (
    <section ref={sectionRef} className="hero" id="about">
      <div ref={glowRef} className="hero__glows">
        <div className="hero__glow hero__glow--1" />
        <div className="hero__glow hero__glow--2" />
        <div className="hero__glow hero__glow--3" />
      </div>

      <div className="hero__grid" />

      <div className="hero__content">


        <div className="hero__titles-wrapper">
          {/* Base Shiny Text (Revealed) */}
          <h1 ref={baseTitleRef} className="hero__title hero__title--base">
            {words.map((w, i) => (
              <span key={`base-${i}`} className="hero__word-wrap">
                <span className="hero__word">{w}</span>
              </span>
            ))}
          </h1>

          {/* Sand Overlay Text (Disappears) */}
          <h1 ref={sandTitleRef} className="hero__title hero__title--sand" aria-hidden="true">
            {words.map((w, i) => (
              <span key={`sand-${i}`} className="hero__word-wrap">
                <span className="hero__word">{w}</span>
              </span>
            ))}
          </h1>
        </div>

        <p ref={subRef} className="hero__sub">
          ToxIQ predicts molecular toxicity with atomic-level explainability —<br />
          harnessing SHAP values to illuminate every prediction.
        </p>

        <div ref={ctaRef} className="hero__cta">
          <a href="#launch-app" className="btn-primary">
            Launch ToxIQ →
          </a>
          <a href="#how-it-works" className="btn-ghost">
            See how it works
          </a>
        </div>

        <div className="hero__stats">
          {[
            { val: '97.4%', label: 'Prediction Accuracy' },
            { val: '12+', label: 'Toxicity Endpoints' },
            { val: '<1s', label: 'Inference Time' },
          ].map(s => (
            <div key={s.label} className="hero__stat">
              <span className="hero__stat-val">{s.val}</span>
              <span className="hero__stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hero__scroll">
        <span />
      </div>

      {/* Embedded SVG filter for high-fidelity sand texture and edge displacement */}
      <svg width="0" height="0" className="hero__sand-filter-def">
        <filter id="sand-texture" x="-20%" y="-20%" width="140%" height="140%">
          {/* Generate very fine, high-contrast grit */}
          <feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="4" result="noise" />
          <feColorMatrix type="matrix" values="
            1 0 0 0 0
            1 0 0 0 0
            1 0 0 0 0
            0 0 0 8 -3.5
          " in="noise" result="highContrastNoise" />

          {/* Displace the text edges to make it look structurally granular */}
          <feDisplacementMap in="SourceGraphic" in2="highContrastNoise" scale="5" xChannelSelector="R" yChannelSelector="R" result="displacedText" />

          {/* Mask the noise to the displaced text shape for internal texture */}
          <feComposite operator="in" in="highContrastNoise" in2="displacedText" result="sandGrit" />

          {/* Colorize the sand (Titanium / warm grey tint) */}
          <feColorMatrix type="matrix" values="
            0.7 0 0 0 0.15
            0.6 0 0 0 0.15
            0.7 0 0 0 0.20
            0 0 0 1 0
          " in="sandGrit" result="coloredSand" />

          {/* Blend it over the displaced text to maintain volume but add massive texture */}
          <feBlend mode="multiply" in="coloredSand" in2="displacedText" />
        </filter>
      </svg>
    </section>
  )
}
