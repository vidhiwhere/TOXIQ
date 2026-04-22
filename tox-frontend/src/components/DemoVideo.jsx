import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './DemoVideo.css'

gsap.registerPlugin(ScrollTrigger)

export default function DemoVideo() {
  const sectionRef = useRef(null)
  const headerRef = useRef(null)
  const frameWrapRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    // Header fade up
    gsap.fromTo(headerRef.current,
      { opacity: 0, y: 50 },
      { 
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: headerRef.current, start: 'top 80%' }
      }
    )

    // The signature Apple-style scale up of the frame
    gsap.fromTo(frameWrapRef.current,
      { scale: 0.8, opacity: 0.4 },
      {
        scale: 1, opacity: 1, duration: 1.5, ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          end: 'bottom 80%',
          scrub: true // ties the scale strictly to scroll progress
        }
      }
    )

    // Ensure video plays when in viewport
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top 80%',
      onEnter: () => videoRef.current?.play(),
      onLeaveBack: () => videoRef.current?.pause()
    })
  }, [])

  return (
    <section ref={sectionRef} className="demo-vid">
      <div ref={headerRef} className="demo-vid__header">
        <span className="section-tag">Platform Preview</span>
        <h2 className="demo-vid__title">
          ToxIQ in motion.
        </h2>
        <p className="demo-vid__sub">
          A seamless, hyper-responsive inference interface.
        </p>
      </div>

      <div className="demo-vid__frame-container">
        <div ref={frameWrapRef} className="demo-vid__frame-wrap">
          <img src="/frame.png" alt="Device Frame" className="demo-vid__img" />
          
          {/* The video sits physically behind the glass/bezels of the PNG */}
          <video 
            ref={videoRef}
            className="demo-vid__video" 
            playsInline 
            muted 
            loop
          >
            <source src="/frame.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  )
}
